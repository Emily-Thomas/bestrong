# InBody Scan Upload & Integration Feature Specification

## Overview

This feature enables trainers to upload InBody scan PDFs for clients, extract critical body composition data using LLM-based parsing, store both the PDF and structured data, and integrate this information into the recommendation generation process. The system requires at least one InBody scan before generating recommendations and supports tracking multiple scans over time to monitor client progress.

## Table of Contents

1. [Feature Goals](#feature-goals)
2. [User Workflows](#user-workflows)
3. [Database Schema Changes](#database-schema-changes)
4. [Data Models](#data-models)
5. [API Endpoints](#api-endpoints)
6. [File Storage Strategy](#file-storage-strategy)
7. [LLM Integration](#llm-integration)
8. [UI/UX Requirements](#uiux-requirements)
9. [Implementation Phases](#implementation-phases)
10. [Technical Decisions](#technical-decisions)

---

## Feature Goals

1. **PDF Upload**: Allow trainers to upload InBody scan PDFs for clients
2. **Data Extraction**: Use LLM to extract structured data from InBody scan PDFs
3. **Data Verification**: Allow trainers to review and verify extracted data before saving
4. **Data Storage**: Store both the PDF file and extracted structured data
5. **Multiple Scans**: Support uploading and tracking multiple InBody scans per client over time
6. **Requirement Enforcement**: Require at least one InBody scan before generating recommendations
7. **Recommendation Integration**: Pass InBody scan data to the LLM during recommendation generation
8. **Historical Tracking**: Enable viewing all scans for a client, with ability to identify first/latest/any scan

---

## User Workflows

### Workflow 1: Upload Initial InBody Scan (New Client)

1. Trainer creates a new client
2. Trainer navigates to client profile page
3. Trainer sees "InBody Scans" section with message: "No InBody scans uploaded yet"
4. Trainer clicks "Upload InBody Scan" button
5. Trainer selects PDF file from their device
6. System uploads PDF and shows loading state: "Processing InBody scan..."
7. System uses LLM to extract data from PDF
8. System displays extracted data in a review form:
   - Weight (kg)
   - SMM (Skeletal Muscle Mass) (kg)
   - Body Fat Mass (kg)
   - BMI
   - Percent Body Fat (%)
   - Analysis by Segment (JSON structure with segment data)
   - Scan Date (extracted from PDF or manually entered)
9. Trainer reviews extracted data
10. Trainer can:
    - Edit any field if extraction was incorrect
    - Click "Save" to confirm and save
    - Click "Cancel" to discard and try again
11. Upon saving:
    - PDF is stored in file storage
    - Structured data is saved to database
    - Scan is marked as "verified" (or "unverified" if user didn't review)
    - Client profile now shows "1 InBody scan uploaded"

### Workflow 2: Upload Additional InBody Scan (Existing Client)

1. Trainer navigates to client profile with existing scans
2. Trainer sees list of previous scans (date, weight, body fat %)
3. Trainer clicks "Upload New Scan" button
4. Steps 5-11 from Workflow 1 repeat
5. New scan is added to the list
6. System can identify:
   - First scan (oldest by date)
   - Latest scan (newest by date)
   - All scans (for trend analysis)

### Workflow 3: Generate Recommendation (With InBody Requirement)

1. Trainer has completed:
   - Client creation
   - At least one InBody scan upload
   - Client questionnaire
2. Trainer navigates to recommendation generation
3. System checks:
   - ✅ Questionnaire exists
   - ✅ At least one InBody scan exists
4. If both requirements met:
   - "Generate Recommendation" button is enabled
   - System proceeds with generation
5. If InBody scan missing:
   - "Generate Recommendation" button is disabled
   - Message shown: "Please upload at least one InBody scan before generating recommendations"
   - Link to upload scan provided

### Workflow 4: Recommendation Generation with InBody Data

1. Trainer clicks "Generate Recommendation"
2. System collects:
   - Client questionnaire data
   - **Latest InBody scan data** (structured format)
   - Client profile information
3. System builds LLM prompt including:
   - Questionnaire responses
   - InBody scan metrics (weight, SMM, body fat %, BMI, segment analysis)
   - Instructions to consider body composition in training plan design
4. LLM generates recommendation considering:
   - Client goals from questionnaire
   - Current body composition from InBody scan
   - Appropriate training intensity based on muscle mass and body fat
   - Exercise selection considering body composition metrics
5. Recommendation is saved with reference to the InBody scan used

### Workflow 5: Viewing InBody Scan History

1. Trainer navigates to client profile
2. Trainer sees "InBody Scans" section
3. Section displays:
   - List of all scans (chronologically, newest first)
   - For each scan:
     - Date
     - Weight
     - Body Fat %
     - BMI
     - "View Details" button
     - "Download PDF" button
4. Trainer clicks "View Details" on a scan
5. Modal or expanded view shows:
   - All extracted metrics
   - Segment analysis breakdown
   - PDF preview (if possible) or download link
   - Date uploaded
   - Verification status

---

## Database Schema Changes

### 1. Create InBody Scans Table

```sql
-- Migration: 010_create_inbody_scans_table
-- Description: Creates table for storing InBody scan PDFs and extracted data
-- Created: 2024-12-XX

BEGIN;

CREATE TABLE IF NOT EXISTS inbody_scans (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  uploaded_by INTEGER NOT NULL REFERENCES admin_users(id),
  
  -- File storage
  file_path VARCHAR(500) NOT NULL, -- Path to stored PDF file
  file_name VARCHAR(255) NOT NULL, -- Original filename
  file_size_bytes INTEGER, -- File size in bytes
  mime_type VARCHAR(100) DEFAULT 'application/pdf',
  
  -- Extracted data (structured)
  scan_date DATE, -- Date of the scan (extracted or manually entered)
  weight_kg DECIMAL(5,2), -- Weight in kilograms
  smm_kg DECIMAL(5,2), -- Skeletal Muscle Mass in kilograms
  body_fat_mass_kg DECIMAL(5,2), -- Body Fat Mass in kilograms
  bmi DECIMAL(4,2), -- Body Mass Index
  percent_body_fat DECIMAL(5,2), -- Percent Body Fat
  segment_analysis JSONB, -- Analysis by segment (flexible structure)
  
  -- Extraction metadata
  extraction_status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed, verified
  extraction_raw_response TEXT, -- Raw LLM response for debugging
  verified BOOLEAN DEFAULT false, -- Whether user has verified the extracted data
  verified_at TIMESTAMP,
  verified_by INTEGER REFERENCES admin_users(id),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT valid_weight CHECK (weight_kg IS NULL OR weight_kg > 0),
  CONSTRAINT valid_bmi CHECK (bmi IS NULL OR bmi > 0 AND bmi < 100),
  CONSTRAINT valid_body_fat_percent CHECK (percent_body_fat IS NULL OR (percent_body_fat >= 0 AND percent_body_fat <= 100))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_inbody_scans_client_id ON inbody_scans(client_id);
CREATE INDEX IF NOT EXISTS idx_inbody_scans_scan_date ON inbody_scans(client_id, scan_date DESC);
CREATE INDEX IF NOT EXISTS idx_inbody_scans_uploaded_by ON inbody_scans(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_inbody_scans_extraction_status ON inbody_scans(extraction_status);
CREATE INDEX IF NOT EXISTS idx_inbody_scans_verified ON inbody_scans(client_id, verified, scan_date DESC);

-- Trigger for updated_at
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_inbody_scans_updated_at ON inbody_scans;
    CREATE TRIGGER update_inbody_scans_updated_at BEFORE UPDATE ON inbody_scans
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

COMMIT;
```

### 2. Add InBody Scan Reference to Recommendations (Optional)

```sql
-- Migration: 011_add_inbody_scan_to_recommendations
-- Description: Adds reference to InBody scan used during recommendation generation
-- Created: 2024-12-XX

BEGIN;

ALTER TABLE recommendations 
ADD COLUMN IF NOT EXISTS inbody_scan_id INTEGER REFERENCES inbody_scans(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_recommendations_inbody_scan_id ON recommendations(inbody_scan_id);

COMMIT;
```

---

## Data Models

### InBodyScan (Backend TypeScript)

```typescript
export interface InBodyScan {
  id: number;
  client_id: number;
  uploaded_by: number;
  
  // File storage
  file_path: string;
  file_name: string;
  file_size_bytes?: number;
  mime_type: string;
  
  // Extracted data
  scan_date?: Date | string;
  weight_kg?: number;
  smm_kg?: number;
  body_fat_mass_kg?: number;
  bmi?: number;
  percent_body_fat?: number;
  segment_analysis?: SegmentAnalysis; // JSONB structure
  
  // Extraction metadata
  extraction_status: 'pending' | 'completed' | 'failed' | 'verified';
  extraction_raw_response?: string;
  verified: boolean;
  verified_at?: Date | string;
  verified_by?: number;
  
  // Timestamps
  created_at: Date | string;
  updated_at: Date | string;
}

export interface SegmentAnalysis {
  // Structure will depend on InBody scan format
  // Example structure:
  right_arm?: {
    muscle_mass_kg?: number;
    fat_mass_kg?: number;
    percent_fat?: number;
  };
  left_arm?: {
    muscle_mass_kg?: number;
    fat_mass_kg?: number;
    percent_fat?: number;
  };
  trunk?: {
    muscle_mass_kg?: number;
    fat_mass_kg?: number;
    percent_fat?: number;
  };
  right_leg?: {
    muscle_mass_kg?: number;
    fat_mass_kg?: number;
    percent_fat?: number;
  };
  left_leg?: {
    muscle_mass_kg?: number;
    fat_mass_kg?: number;
    percent_fat?: number;
  };
  // Additional fields as needed
}

export interface CreateInBodyScanInput {
  client_id: number;
  file: File | Buffer; // PDF file
  file_name: string;
}

export interface UpdateInBodyScanInput {
  scan_date?: Date | string;
  weight_kg?: number;
  smm_kg?: number;
  body_fat_mass_kg?: number;
  bmi?: number;
  percent_body_fat?: number;
  segment_analysis?: SegmentAnalysis;
  verified?: boolean;
}
```

### InBodyScan (Frontend TypeScript)

```typescript
export interface InBodyScan {
  id: number;
  client_id: number;
  uploaded_by: number;
  
  file_path: string;
  file_name: string;
  file_size_bytes?: number;
  
  scan_date?: string;
  weight_kg?: number;
  smm_kg?: number;
  body_fat_mass_kg?: number;
  bmi?: number;
  percent_body_fat?: number;
  segment_analysis?: SegmentAnalysis;
  
  extraction_status: 'pending' | 'completed' | 'failed' | 'verified';
  verified: boolean;
  verified_at?: string;
  
  created_at: string;
  updated_at: string;
}
```

---

## API Endpoints

### 1. Upload InBody Scan

**POST** `/api/inbody-scans/upload`

**Request:**
- Content-Type: `multipart/form-data`
- Body:
  - `client_id` (number, required)
  - `file` (File, required) - PDF file

**Response:**
```json
{
  "success": true,
  "data": {
    "scan_id": 123,
    "extraction_status": "pending",
    "message": "File uploaded successfully. Extracting data..."
  }
}
```

**Behavior:**
1. Validate file (PDF, max size ~10MB)
2. Store PDF file
3. Create database record with `extraction_status: 'pending'`
4. Queue/trigger async extraction job
5. Return scan ID immediately

### 2. Get Extraction Status

**GET** `/api/inbody-scans/:id/status`

**Response:**
```json
{
  "success": true,
  "data": {
    "extraction_status": "completed",
    "scan": {
      "id": 123,
      "weight_kg": 75.5,
      "smm_kg": 32.1,
      "body_fat_mass_kg": 15.2,
      "bmi": 24.5,
      "percent_body_fat": 20.1,
      "segment_analysis": { ... },
      "verified": false
    }
  }
}
```

### 3. Get Extracted Data (For Review)

**GET** `/api/inbody-scans/:id`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "client_id": 456,
    "scan_date": "2024-12-15",
    "weight_kg": 75.5,
    "smm_kg": 32.1,
    "body_fat_mass_kg": 15.2,
    "bmi": 24.5,
    "percent_body_fat": 20.1,
    "segment_analysis": { ... },
    "extraction_status": "completed",
    "verified": false,
    "file_name": "inbody_scan_2024_12_15.pdf"
  }
}
```

### 4. Verify/Update Extracted Data

**PUT** `/api/inbody-scans/:id`

**Request:**
```json
{
  "scan_date": "2024-12-15",
  "weight_kg": 75.5,
  "smm_kg": 32.1,
  "body_fat_mass_kg": 15.2,
  "bmi": 24.5,
  "percent_body_fat": 20.1,
  "segment_analysis": { ... },
  "verified": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "verified": true,
    "verified_at": "2024-12-15T10:30:00Z",
    ...
  }
}
```

### 5. Get All Scans for Client

**GET** `/api/inbody-scans/client/:clientId`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "scan_date": "2024-12-15",
      "weight_kg": 75.5,
      "percent_body_fat": 20.1,
      "bmi": 24.5,
      "verified": true,
      "created_at": "2024-12-15T10:00:00Z"
    },
    {
      "id": 122,
      "scan_date": "2024-11-15",
      "weight_kg": 76.2,
      "percent_body_fat": 20.5,
      "bmi": 24.7,
      "verified": true,
      "created_at": "2024-11-15T10:00:00Z"
    }
  ]
}
```

### 6. Get Latest Scan for Client

**GET** `/api/inbody-scans/client/:clientId/latest`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 123,
    "scan_date": "2024-12-15",
    "weight_kg": 75.5,
    "smm_kg": 32.1,
    "body_fat_mass_kg": 15.2,
    "bmi": 24.5,
    "percent_body_fat": 20.1,
    "segment_analysis": { ... },
    "verified": true
  }
}
```

### 7. Download PDF

**GET** `/api/inbody-scans/:id/download`

**Response:**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="inbody_scan_2024_12_15.pdf"`
- Body: PDF file bytes

### 8. Delete Scan

**DELETE** `/api/inbody-scans/:id`

**Response:**
```json
{
  "success": true,
  "message": "InBody scan deleted successfully"
}
```

### 9. Check If Client Has InBody Scan (For Validation)

**GET** `/api/inbody-scans/client/:clientId/has-scan`

**Response:**
```json
{
  "success": true,
  "data": {
    "has_scan": true,
    "scan_count": 2,
    "latest_scan_id": 123
  }
}
```

---

## File Storage Strategy

### Option 1: Vercel Blob Storage (Recommended for Vercel Deployment)

**Pros:**
- Native Vercel integration
- Simple API
- Automatic CDN
- Good for serverless functions

**Implementation:**
- Use `@vercel/blob` package
- Store files in `inbody-scans/{client_id}/{scan_id}.pdf`
- Store blob URL in database `file_path` field

### Option 2: AWS S3 / Cloud Storage

**Pros:**
- More control
- Better for large files
- Can use with any hosting

**Cons:**
- More setup required
- Additional service to manage

### Option 3: Database Storage (Not Recommended)

**Pros:**
- Simple (no external service)

**Cons:**
- Database bloat
- Performance issues
- Not scalable

### Recommendation

**Use Vercel Blob Storage** for simplicity and native integration. If migrating away from Vercel later, can switch to S3.

---

## LLM Integration

### Data Extraction from PDF

**Service:** `backend/src/services/inbody-extraction.service.ts`

**Function:** `extractInBodyData(pdfBuffer: Buffer): Promise<InBodyScanData>`

**Process:**
1. Convert PDF to text/images (use `pdf-parse` or similar)
2. If text extraction fails, use vision model (GPT-4 Vision) to read PDF
3. Build prompt for LLM:
   ```
   Extract the following data from this InBody scan:
   - Weight (kg)
   - SMM - Skeletal Muscle Mass (kg)
   - Body Fat Mass (kg)
   - BMI
   - Percent Body Fat (%)
   - Analysis by Segment (right arm, left arm, trunk, right leg, left leg)
     For each segment, extract:
     - Muscle Mass (kg)
     - Fat Mass (kg)
     - Percent Fat (%)
   - Scan Date (if available in document)
   
   Return as JSON with this structure:
   {
     "weight_kg": number,
     "smm_kg": number,
     "body_fat_mass_kg": number,
     "bmi": number,
     "percent_body_fat": number,
     "scan_date": "YYYY-MM-DD" or null,
     "segment_analysis": {
       "right_arm": { "muscle_mass_kg": number, "fat_mass_kg": number, "percent_fat": number },
       ...
     }
   }
   ```
4. Call OpenAI API (GPT-4 or GPT-4 Turbo)
5. Parse JSON response
6. Validate extracted data (ranges, required fields)
7. Return structured data

**Error Handling:**
- If extraction fails, mark `extraction_status: 'failed'`
- Store raw response for debugging
- Allow manual entry as fallback

### Integration with Recommendation Generation

**Modify:** `backend/src/services/ai.service.ts`

**Function:** `formatQuestionnaireForPrompt()` - Add InBody data section

**Function:** `buildLLMPrompt()` - Include InBody scan data

**Updated Prompt Section:**
```
## Client Body Composition (InBody Scan)

The client's latest InBody scan shows:
- Weight: {weight_kg} kg
- Skeletal Muscle Mass (SMM): {smm_kg} kg
- Body Fat Mass: {body_fat_mass_kg} kg
- BMI: {bmi}
- Percent Body Fat: {percent_body_fat}%

Segment Analysis:
- Right Arm: {muscle_mass} kg muscle, {fat_mass} kg fat ({percent_fat}% fat)
- Left Arm: ...
- Trunk: ...
- Right Leg: ...
- Left Leg: ...

Consider this body composition when:
- Selecting appropriate training intensity
- Choosing exercises that match current muscle mass distribution
- Setting realistic progression goals
- Adjusting volume based on body composition metrics
```

**Function:** `generateRecommendationWithAI()` - Fetch latest InBody scan

**Updated Flow:**
1. Get questionnaire
2. **Get latest verified InBody scan for client**
3. If scan exists, include in prompt
4. If no scan, throw error (enforced requirement)

---

## UI/UX Requirements

### Client Profile Page - InBody Scans Section

**Location:** `frontend/app/clients/[id]/components/InBodyScansSection.tsx`

**Components:**
1. **Scan List Component**
   - Shows all scans (newest first)
   - Each scan shows: date, weight, body fat %, BMI
   - "View Details" button
   - "Download PDF" button
   - Badge for "Latest" scan
   - Badge for "First" scan

2. **Upload Component**
   - Drag-and-drop or file picker
   - File validation (PDF only, max 10MB)
   - Upload progress indicator
   - Error handling

3. **Extraction Review Modal**
   - Form with all extracted fields
   - Editable fields
   - "Save" and "Cancel" buttons
   - Shows extraction confidence (if available)

4. **Scan Details Modal**
   - Full scan information
   - Segment analysis breakdown
   - PDF preview or download link
   - Edit button (if not verified)
   - Delete button (with confirmation)

### Recommendation Generation - Validation

**Location:** `frontend/app/clients/[id]/components/TrainingPlansSection.tsx`

**Updates:**
- Check for InBody scan before enabling "Generate Recommendation"
- Show clear message if scan missing
- Link to upload scan
- Show which scan will be used (latest verified scan)

### Visual Indicators

- ✅ Green checkmark: Verified scan
- ⏳ Clock icon: Extraction pending
- ❌ Red X: Extraction failed
- 📊 Chart icon: View trends (future feature)

---

## Implementation Phases

### Phase 1: Core Upload & Storage (MVP)

**Goal:** Basic PDF upload and storage

**Tasks:**
1. Create database migration for `inbody_scans` table
2. Set up file storage (Vercel Blob)
3. Create upload API endpoint
4. Create frontend upload component
5. Store PDF and basic metadata
6. Display uploaded scans list

**Deliverables:**
- ✅ Can upload PDF
- ✅ PDF is stored
- ✅ Can view list of scans
- ✅ Can download PDF

### Phase 2: Data Extraction

**Goal:** Extract structured data from PDFs

**Tasks:**
1. Create `inbody-extraction.service.ts`
2. Implement PDF text extraction
3. Implement LLM-based data extraction
4. Create extraction status endpoint
5. Update upload endpoint to trigger extraction
6. Store extracted data in database
7. Handle extraction errors

**Deliverables:**
- ✅ PDFs are automatically processed
- ✅ Data is extracted and stored
- ✅ Extraction status is trackable

### Phase 3: Data Verification

**Goal:** Allow users to review and verify extracted data

**Tasks:**
1. Create review/verification UI
2. Create update API endpoint
3. Add verification workflow
4. Show verification status in UI

**Deliverables:**
- ✅ Users can review extracted data
- ✅ Users can edit incorrect data
- ✅ Users can mark data as verified

### Phase 4: Recommendation Integration

**Goal:** Require InBody scan and include in recommendation generation

**Tasks:**
1. Add validation check in recommendation routes
2. Update `ai.service.ts` to include InBody data
3. Update LLM prompts
4. Update frontend to show requirement
5. Add reference to scan in recommendations table (optional)

**Deliverables:**
- ✅ InBody scan is required before generation
- ✅ InBody data is included in LLM prompt
- ✅ Recommendations consider body composition

### Phase 5: Enhanced Features

**Goal:** Additional functionality

**Tasks:**
1. Scan comparison view (show changes over time)
2. Trend charts (weight, body fat % over time)
3. Export scan data
4. Bulk upload (if needed)
5. Scan date validation and sorting

**Deliverables:**
- ✅ Can compare scans
- ✅ Can view trends
- ✅ Better data visualization

---

## Technical Decisions

### Decision 1: PDF Storage vs. Structured Data Storage

**Question:** Should we store PDF and send PDF to LLM, or extract data and send structured data?

**Decision:** **Extract and store structured data, keep PDF for reference**

**Rationale:**
1. **Cost Efficiency**: Structured data is much smaller than PDFs (fewer tokens)
2. **Reliability**: Structured data is more reliable than re-parsing PDFs each time
3. **Queryability**: Can query, filter, and analyze structured data
4. **Trend Analysis**: Can easily compare scans over time
5. **User Verification**: Users can verify and correct extraction errors
6. **Performance**: Faster to send structured data to LLM
7. **Fallback**: PDF is still stored if re-extraction is needed

**Implementation:**
- Extract data once during upload
- Store structured data in database
- Send structured data to recommendation LLM
- Keep PDF for reference/download

### Decision 2: Extraction Timing

**Question:** Extract immediately on upload or async?

**Decision:** **Async extraction with status polling**

**Rationale:**
1. PDF processing can take time (10-30 seconds)
2. Better UX (don't block upload)
3. Can show progress
4. Handles failures gracefully

**Implementation:**
1. Upload PDF → return immediately with `extraction_status: 'pending'`
2. Trigger async extraction job
3. Frontend polls status endpoint
4. When complete, show review form

### Decision 3: Which Scan to Use for Recommendations

**Question:** Use first scan, latest scan, or let user choose?

**Decision:** **Use latest verified scan by default**

**Rationale:**
1. Latest scan reflects current body composition
2. Most relevant for current training plan
3. Can add "use different scan" option later if needed

**Implementation:**
- Query: `SELECT * FROM inbody_scans WHERE client_id = ? AND verified = true ORDER BY scan_date DESC LIMIT 1`
- If no verified scans, use latest unverified
- Show which scan is being used in UI

### Decision 4: Required vs. Optional

**Question:** Make InBody scan required or optional?

**Decision:** **Required before recommendation generation**

**Rationale:**
1. User explicitly requested this requirement
2. Body composition is critical for personalized training
3. Ensures quality recommendations

**Implementation:**
- Check in recommendation generation endpoints
- Return 400 error if no scan exists
- Show clear message in UI
- Disable generation button until scan uploaded

### Decision 5: Verification Workflow

**Question:** Require verification or auto-verify?

**Decision:** **Optional verification with clear indicators**

**Rationale:**
1. Allows flexibility (some users may trust extraction)
2. Verification adds confidence
3. Can still use unverified scans (with warning)

**Implementation:**
- Extraction completes → `verified: false`
- User reviews → can mark `verified: true`
- Show verification status in UI
- Recommend verification but don't require it

---

## Error Handling

### Upload Errors
- File too large → Show error, suggest compression
- Invalid file type → Show error, require PDF
- Upload failure → Retry option

### Extraction Errors
- LLM extraction fails → Mark as failed, allow manual entry
- Partial extraction → Store what was extracted, allow completion
- Timeout → Retry extraction

### Validation Errors
- Missing required fields → Highlight in review form
- Invalid data ranges → Show validation errors
- Database errors → Log and show user-friendly message

---

## Security Considerations

1. **File Upload Validation**
   - Validate file type (PDF only)
   - Validate file size (max 10MB)
   - Scan for malware (if service available)
   - Sanitize filenames

2. **Access Control**
   - Only authenticated users can upload
   - Users can only upload for clients they have access to
   - Verify client ownership before operations

3. **File Storage**
   - Store files in private storage (not public URLs)
   - Use signed URLs for downloads
   - Set appropriate expiration on URLs

4. **Data Privacy**
   - InBody scans contain sensitive health data
   - Ensure compliance with health data regulations
   - Encrypt files at rest (if required)
   - Log access to sensitive data

---

## Testing Considerations

### Unit Tests
- Data extraction service
- Validation logic
- Database queries

### Integration Tests
- Upload flow
- Extraction flow
- Recommendation generation with InBody data

### E2E Tests
- Complete upload → extraction → verification → generation flow

### Manual Testing
- Test with various InBody scan PDF formats
- Test extraction accuracy
- Test error scenarios

---

## Future Enhancements

1. **Trend Analysis**
   - Charts showing weight, body fat % over time
   - Muscle mass changes
   - Body composition trends

2. **Scan Comparison**
   - Side-by-side comparison of two scans
   - Highlight changes (gains/losses)

3. **Automated Insights**
   - LLM-generated insights from scan data
   - Recommendations based on body composition changes

4. **Integration with Other Metrics**
   - Combine with workout performance data
   - Correlate body composition with training outcomes

5. **Export/Reporting**
   - Export scan history as PDF/CSV
   - Generate progress reports

---

## Summary

This specification defines a comprehensive InBody scan upload and integration feature that:

- ✅ Allows uploading InBody scan PDFs
- ✅ Extracts structured data using LLM
- ✅ Stores both PDF and structured data
- ✅ Supports multiple scans per client
- ✅ Requires at least one scan before recommendations
- ✅ Integrates InBody data into recommendation generation
- ✅ Provides verification workflow
- ✅ Enables historical tracking

The implementation follows the existing codebase patterns and integrates seamlessly with the current recommendation generation system.

