# InBody Scan Processing Fix

## Problem

InBody scans were getting stuck in `pending` status in production and never being processed.

### Root Cause

1. **Upload Behavior**: When an InBody scan was uploaded via `/api/inbody-scans/upload`, it triggered an async extraction process using `extractInBodyDataAsync()`
2. **Serverless Issue**: In Vercel's serverless environment, the async function might not complete before the function terminates, leaving scans stuck in pending status
3. **Missing Cron Processing**: The production cron job (`api/cron/process-jobs.ts`) only processed:
   - Recommendation generation jobs
   - Week generation jobs
   - **It did NOT process pending InBody scans**

## Solution

Added InBody scan processing to the existing cron job infrastructure.

### Changes Made

#### 1. Added `getPendingInBodyScans()` to `inbody-scan.service.ts`

New function to query for scans stuck in pending status:

```typescript
export async function getPendingInBodyScans(): Promise<InBodyScan[]> {
  const result = await pool.query<InBodyScan>(
    `SELECT * FROM inbody_scans 
     WHERE extraction_status = 'pending'
     ORDER BY created_at ASC
     LIMIT 10`,
    []
  );
  return result.rows;
}
```

#### 2. Added `processInBodyScan()` to `inbody-scan.routes.ts`

New exported function to process a pending scan by:
- Fetching the scan record from the database
- Downloading the file from storage (local or Vercel Blob)
- Extracting the data using the existing `extractInBodyDataAsync()` function
- Updating the database with extracted data or error status

```typescript
export async function processInBodyScan(scanId: number): Promise<void> {
  const scan = await inbodyScanService.getInBodyScanById(scanId);
  
  if (!scan) {
    throw new Error(`Scan ${scanId} not found`);
  }

  if (scan.extraction_status !== 'pending') {
    console.log(`Scan ${scanId} is not pending, skipping`);
    return;
  }

  const fileBuffer = await fileStorageService.readFileFromStorage(scan.file_path);
  await extractInBodyDataAsync(scanId, fileBuffer);
}
```

#### 3. Updated Production Cron Job (`api/cron/process-jobs.ts`)

Added InBody scan processing to the cron job:
- Queries for pending scans using `getPendingInBodyScans()`
- Processes each scan using `processInBodyScan()`
- Logs success/failure for each scan
- Returns count of processed scans in response

The cron job now processes:
1. Recommendation jobs
2. Week generation jobs
3. **InBody scan extractions** (NEW)

#### 4. Updated Local Development Script (`backend/scripts/process-jobs.ts`)

Added the same InBody scan processing logic to the local development job processor so that:
- `npm run process-jobs` processes pending InBody scans
- `npm run process-jobs:watch` continuously processes pending InBody scans every 10 seconds

#### 5. Updated Documentation (`README.md`)

Updated the background jobs section to mention InBody scan extraction processing.

## How It Works Now

### Production (Vercel)

1. User uploads an InBody scan
2. File is stored in Vercel Blob
3. Database record is created with `extraction_status = 'pending'`
4. The upload endpoint attempts async extraction (may or may not complete due to serverless timeout)
5. **Every 2 minutes**, the Vercel cron job runs and:
   - Queries for scans with `extraction_status = 'pending'`
   - For each pending scan:
     - Downloads the file from Vercel Blob
     - Extracts data using OpenAI Vision API
     - Updates the database with `extraction_status = 'completed'` (or `'failed'`)
6. Frontend polls the status and displays extracted data when ready

### Local Development

1. User uploads an InBody scan
2. File is stored locally
3. Database record is created with `extraction_status = 'pending'`
4. The upload endpoint attempts async extraction
5. Developer runs `npm run process-jobs` or `npm run process-jobs:watch` to process pending scans
6. Frontend polls the status and displays extracted data when ready

## Testing

### To Test Locally

1. Upload an InBody scan via the frontend
2. Run `npm run process-jobs` from the root directory
3. Check the console output - you should see:
   ```
   📋 Found 1 pending InBody scan(s)
   🔄 Processing InBody scan 123 (client 456)...
   ✅ Successfully processed InBody scan 123
   ```
4. Check the frontend - the scan should now show extracted data

### To Test in Production

1. Deploy the changes to Vercel
2. Upload an InBody scan
3. Wait up to 2 minutes for the cron job to run
4. Check Vercel logs to see the cron job processing the scan
5. Check the frontend - the scan should show extracted data

## Benefits

1. **Reliability**: Scans will no longer get stuck in pending status
2. **Consistency**: Uses the same pattern as other background jobs (recommendations, week generation)
3. **Visibility**: Logs show exactly which scans are being processed and any errors
4. **Scalability**: Processes up to 10 scans per cron run to avoid timeout issues
5. **Error Handling**: Failed extractions are logged and marked appropriately

## Error Handling

If a scan extraction fails:
1. The error is logged to the console
2. The scan's `extraction_status` is set to `'failed'`
3. The error message is stored in `extraction_raw_response`
4. The cron job continues processing other scans
5. Failed scans can be manually retried or edited by the user

## Monitoring

To monitor InBody scan processing in production:
1. Check Vercel logs for the cron job runs
2. Look for log messages like:
   - `Found X pending InBody scans`
   - `Processing InBody scan Y (client Z)`
   - `Successfully processed InBody scan Y`
   - `Error processing InBody scan Y: <error message>`
3. Query the database for scans stuck in pending:
   ```sql
   SELECT * FROM inbody_scans WHERE extraction_status = 'pending';
   ```

## Future Improvements

1. **Add retry logic**: Automatically retry failed extractions after a delay
2. **Add rate limiting**: Prevent processing too many scans at once to avoid API rate limits
3. **Add metrics**: Track success/failure rates, processing times
4. **Add notifications**: Alert admins when extractions fail
5. **Add manual retry button**: Allow users to manually trigger re-extraction from the UI
