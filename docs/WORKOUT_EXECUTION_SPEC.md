# Workout Execution & Progressive Training Feature Specification

## Overview

This feature enables trainers to execute AI-proposed workouts, track actual client performance, and progressively generate future weeks based on real-world results. The system transitions clients from prospect to active status, accepts AI recommendations, tracks workout execution, and uses performance data to inform future workout generation.

## Table of Contents

1. [Feature Goals](#feature-goals)
2. [User Workflows](#user-workflows)
3. [Database Schema Changes](#database-schema-changes)
4. [Data Models](#data-models)
5. [API Endpoints](#api-endpoints)
6. [State Management](#state-management)
7. [AI Integration](#ai-integration)
8. [UI/UX Requirements](#uiux-requirements)
9. [Implementation Phases](#implementation-phases)

---

## Feature Goals

1. **Client Status Management**: Transition clients from "prospect" to "active" when they sign up
2. **Recommendation Acceptance**: Accept AI-proposed recommendations when client becomes active
3. **Workout Execution**: Track when workouts are run and record actual performance data
4. **Performance Tracking**: Store actual reps, RIR, rounds, and feedback notes for each workout
5. **Progressive Generation**: Generate next week's workouts based on original plan + actual performance data
6. **Week Management**: Complete all workouts in a week before generating the next week

---

## User Workflows

### Workflow 1: Client Activation & Recommendation Acceptance

1. Client has completed questionnaire and has an AI-generated recommendation (status: `draft`)
2. Trainer decides client is ready to sign up
3. Trainer clicks "Activate Client" button
4. System:
   - Updates client status: `prospect` → `active`
   - Updates recommendation status: `draft` → `active` (or `approved`)
   - Workouts in the recommendation become "upcoming workouts" (status: `scheduled`)
5. Client is now active and workouts are ready to be executed

### Workflow 2: Executing a Workout

1. Trainer views upcoming workouts for an active client
2. Trainer selects a workout to run (e.g., "Week 1, Session 1")
3. Trainer clicks "Run Workout" or "Start Session"
4. System displays the proposed workout plan
5. During/after the workout, trainer inputs:
   - **Actual reps** for each exercise (may differ from proposed)
   - **Actual RIR** (Reps in Reserve, 0-5 scale) for each exercise
   - **Actual rounds** (if applicable, e.g., circuit training)
   - **Actual weight/load** used (if applicable)
   - **Feedback notes** about the session (e.g., "Client struggled with form on squats", "Great energy today")
6. Trainer saves the workout execution
7. System:
   - Creates an "actual workout" record linked to the proposed workout
   - Updates proposed workout status: `scheduled` → `completed`
   - Stores all actual performance data

### Workflow 3: Week Completion & Next Week Generation

1. Trainer completes all workouts for Week 1 (all sessions marked as completed)
2. System detects that all workouts in Week 1 are completed
3. Trainer sees option to "Generate Next Week" or system auto-prompts
4. Trainer clicks "Generate Week 2 Workouts"
5. System:
   - Collects context:
     - Original recommendation (plan structure, goals, AI reasoning)
     - All actual workout data from Week 1 (performance, feedback, RIR, etc.)
     - Client's original questionnaire data
   - Calls AI service to generate Week 2 workouts
   - Creates new workout records for Week 2 (status: `scheduled`)
   - Updates recommendation to track current week
6. Week 2 workouts are now available for execution
7. Process repeats for subsequent weeks

### Workflow 4: Modifying Upcoming Workouts

1. After completing a workout, trainer may want to adjust remaining workouts in the week
2. Trainer views upcoming workouts for the current week
3. Trainer can edit/modify proposed workouts before they're run
4. Changes are saved to the workout record
5. When workout is executed, trainer inputs actual data (which may differ from both original and modified proposals)

---

## Database Schema Changes

### 1. Add Client Status Field

```sql
-- Migration: Add status field to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'prospect';

-- Status values: 'prospect', 'active', 'inactive', 'archived'
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
```

### 2. Add Workout Status and Execution Tracking

```sql
-- Migration: Add status and execution tracking to workouts table
ALTER TABLE workouts 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'scheduled',
ADD COLUMN IF NOT EXISTS scheduled_date DATE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Status values: 'scheduled', 'in_progress', 'completed', 'skipped', 'cancelled'
CREATE INDEX IF NOT EXISTS idx_workouts_status ON workouts(status);
CREATE INDEX IF NOT EXISTS idx_workouts_scheduled_date ON workouts(scheduled_date);
```

### 3. Create Actual Workouts Table

```sql
-- Migration: Create actual_workouts table to store executed workout data
CREATE TABLE IF NOT EXISTS actual_workouts (
  id SERIAL PRIMARY KEY,
  workout_id INTEGER NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  completed_by INTEGER REFERENCES admin_users(id),
  
  -- Actual performance data (stored as JSONB for flexibility)
  actual_performance JSONB NOT NULL,
  
  -- Session feedback
  session_notes TEXT,
  overall_rir INTEGER, -- Overall session RIR (Reps in Reserve, 0-5 scale)
  client_energy_level INTEGER, -- 1-10 scale
  trainer_observations TEXT,
  
  -- Timestamps
  started_at TIMESTAMP,
  completed_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure one actual workout per proposed workout
  UNIQUE(workout_id)
);

CREATE INDEX IF NOT EXISTS idx_actual_workouts_workout_id ON actual_workouts(workout_id);
CREATE INDEX IF NOT EXISTS idx_actual_workouts_completed_by ON actual_workouts(completed_by);
CREATE INDEX IF NOT EXISTS idx_actual_workouts_completed_at ON actual_workouts(completed_at);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_actual_workouts_updated_at ON actual_workouts;
CREATE TRIGGER update_actual_workouts_updated_at BEFORE UPDATE ON actual_workouts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 4. Add Current Week Tracking to Recommendations

```sql
-- Migration: Add current week tracking to recommendations
ALTER TABLE recommendations 
ADD COLUMN IF NOT EXISTS current_week INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Update started_at when recommendation becomes active
CREATE INDEX IF NOT EXISTS idx_recommendations_current_week ON recommendations(current_week);
```

### 5. Create Week Generation Jobs Table

```sql
-- Migration: Create table for tracking progressive week generation jobs
CREATE TABLE IF NOT EXISTS week_generation_jobs (
  id SERIAL PRIMARY KEY,
  recommendation_id INTEGER NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  created_by INTEGER REFERENCES admin_users(id),
  
  -- Job status
  status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
  current_step VARCHAR(255),
  
  -- Results
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure one job per week per recommendation
  UNIQUE(recommendation_id, week_number)
);

CREATE INDEX IF NOT EXISTS idx_week_generation_jobs_status ON week_generation_jobs(status);
CREATE INDEX IF NOT EXISTS idx_week_generation_jobs_recommendation_id ON week_generation_jobs(recommendation_id);
CREATE INDEX IF NOT EXISTS idx_week_generation_jobs_week_number ON week_generation_jobs(week_number);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_week_generation_jobs_updated_at ON week_generation_jobs;
CREATE TRIGGER update_week_generation_jobs_updated_at BEFORE UPDATE ON week_generation_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Data Models

### Client Status

```typescript
// backend/src/types/index.ts

export interface Client {
  id: number;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  date_of_birth?: Date;
  status: 'prospect' | 'active' | 'inactive' | 'archived'; // NEW
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface UpdateClientInput {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  status?: 'prospect' | 'active' | 'inactive' | 'archived'; // NEW
}
```

### Workout Status

```typescript
// backend/src/types/index.ts

export interface Workout {
  id: number;
  recommendation_id: number;
  week_number: number;
  session_number: number;
  workout_name?: string;
  workout_data: WorkoutData;
  workout_reasoning?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'skipped' | 'cancelled'; // NEW
  scheduled_date?: Date; // NEW
  completed_at?: Date; // NEW
  created_at: Date;
  updated_at: Date;
  actual_workout?: ActualWorkout; // NEW - populated when fetched with actual data
}

export interface UpdateWorkoutInput {
  workout_name?: string;
  workout_data?: WorkoutData;
  workout_reasoning?: string;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'skipped' | 'cancelled';
  scheduled_date?: string;
}
```

### Actual Workout Performance

```typescript
// backend/src/types/index.ts

export interface ActualExercisePerformance {
  exercise_name: string; // Matches proposed exercise name
  sets_completed?: number;
  reps_completed?: number | string; // Actual reps (may be range like "8-10")
  weight_used?: string; // Actual weight/load used
  rir?: number; // Actual RIR (Reps in Reserve, 0-5 scale: 0=failure, 1-5=reps remaining)
  rounds_completed?: number; // For circuit/round-based exercises
  notes?: string; // Exercise-specific notes
  rest_taken_seconds?: number; // Actual rest time
}

export interface ActualWorkoutPerformance {
  exercises: ActualExercisePerformance[];
  warmup_completed?: boolean;
  cooldown_completed?: boolean;
  total_duration_minutes?: number;
  modifications_made?: string; // What was changed from the plan
}

export interface ActualWorkout {
  id: number;
  workout_id: number;
  completed_by?: number;
  actual_performance: ActualWorkoutPerformance;
  session_notes?: string;
  overall_rir?: number; // Overall session RIR (Reps in Reserve, 0-5 scale: 0=failure, 1-5=reps remaining)
  client_energy_level?: number; // 1-10 scale
  trainer_observations?: string;
  started_at?: Date;
  completed_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateActualWorkoutInput {
  workout_id: number;
  actual_performance: ActualWorkoutPerformance;
  session_notes?: string;
  overall_rir?: number;
  client_energy_level?: number;
  trainer_observations?: string;
  started_at?: string;
  completed_at: string;
}
```

### Recommendation Updates

```typescript
// backend/src/types/index.ts

export interface Recommendation {
  id: number;
  client_id: number;
  questionnaire_id?: number;
  created_by?: number;
  client_type: string;
  sessions_per_week: number;
  session_length_minutes: number;
  training_style: string;
  plan_structure: Record<string, unknown>;
  ai_reasoning?: string;
  status: 'draft' | 'approved' | 'active' | 'completed';
  is_edited: boolean;
  current_week: number; // NEW - tracks which week we're on
  started_at?: Date; // NEW
  completed_at?: Date; // NEW
  created_at: Date;
  updated_at: Date;
}
```

### Week Generation Job

```typescript
// backend/src/types/index.ts

export interface WeekGenerationJob {
  id: number;
  recommendation_id: number;
  week_number: number;
  created_by?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  current_step?: string;
  error_message?: string;
  created_at: Date;
  started_at?: Date;
  completed_at?: Date;
  updated_at: Date;
}

export interface CreateWeekGenerationJobInput {
  recommendation_id: number;
  week_number: number;
}
```

---

## API Endpoints

### Client Management

#### Update Client Status
```
PATCH /api/clients/:id/status
Body: { status: 'active' }
Response: { success: true, data: Client }
```

#### Activate Client (with recommendation acceptance)
```
POST /api/clients/:id/activate
Body: { recommendation_id: number }
Response: { success: true, data: { client: Client, recommendation: Recommendation } }
```
This endpoint:
- Updates client status to 'active'
- Updates recommendation status to 'active'
- Sets recommendation.started_at
- Sets all workouts status to 'scheduled'

### Workout Management

#### Get Workouts for Client/Recommendation
```
GET /api/recommendations/:id/workouts
Query params: ?week_number=1&status=scheduled
Response: { success: true, data: Workout[] }
```

#### Get Single Workout with Actual Data
```
GET /api/workouts/:id
Response: { success: true, data: Workout (with actual_workout populated) }
```

#### Update Workout (modify proposed workout)
```
PATCH /api/workouts/:id
Body: UpdateWorkoutInput
Response: { success: true, data: Workout }
```

#### Start Workout Session
```
POST /api/workouts/:id/start
Response: { success: true, data: Workout }
```
Updates workout status to 'in_progress' and sets started_at timestamp.

#### Complete Workout (save actual performance)
```
POST /api/workouts/:id/complete
Body: CreateActualWorkoutInput
Response: { success: true, data: { workout: Workout, actual_workout: ActualWorkout } }
```
This endpoint:
- Creates actual_workout record
- Updates workout status to 'completed'
- Sets workout.completed_at
- Returns both workout and actual_workout

#### Get Week Completion Status
```
GET /api/recommendations/:id/week/:weekNumber/status
Response: { 
  success: true, 
  data: { 
    week_number: number,
    total_workouts: number,
    completed_workouts: number,
    is_complete: boolean,
    workouts: Workout[]
  }
}
```

### Week Generation

#### Generate Next Week Workouts
```
POST /api/recommendations/:id/generate-week
Body: { week_number: number }
Response: { success: true, data: { job_id: number } }
```
Returns immediately with job ID (async processing).

#### Get Week Generation Job Status
```
GET /api/recommendations/:id/generate-week/job/:jobId
Response: { success: true, data: WeekGenerationJob }
```

#### Get All Week Generation Jobs for Recommendation
```
GET /api/recommendations/:id/week-jobs
Response: { success: true, data: WeekGenerationJob[] }
```

---

## State Management

### Workout States

```
scheduled → in_progress → completed
    ↓           ↓
  skipped    cancelled
```

**State Transitions:**
- `scheduled`: Workout is planned but not started
- `in_progress`: Trainer has started the workout session
- `completed`: Workout has been executed and actual data recorded
- `skipped`: Workout was skipped (no actual data)
- `cancelled`: Workout was cancelled (no actual data)

### Recommendation States

```
draft → approved → active → completed
```

**State Transitions:**
- `draft`: AI has generated recommendation, not yet accepted
- `approved`: Recommendation has been reviewed and approved (optional intermediate state)
- `active`: Client is active and recommendation is being executed
- `completed`: All weeks have been completed

### Client States

```
prospect → active → inactive
              ↓
          archived
```

**State Transitions:**
- `prospect`: Client is a lead, not yet signed up
- `active`: Client has signed up and is actively training
- `inactive`: Client is temporarily inactive (e.g., on hold)
- `archived`: Client is no longer active (historical record)

---

## AI Integration

### Progressive Week Generation

The AI service needs a new function to generate workouts for a specific week based on:
1. Original recommendation context
2. Previous weeks' actual performance data
3. Client's original questionnaire

#### New AI Service Function

```typescript
// backend/src/services/ai.service.ts

export async function generateWeekWorkouts(
  recommendation: Recommendation,
  previousWeeksData: {
    week_number: number;
    workouts: Workout[];
    actual_workouts: ActualWorkout[];
  }[],
  questionnaire: Questionnaire,
  structuredData: StructuredQuestionnaireData | null,
  targetWeek: number
): Promise<LLMWorkoutResponse[]>
```

#### AI Prompt Structure for Progressive Generation

The prompt should include:

1. **Original Context:**
   - Client persona/type
   - Original plan structure and goals
   - Training style and approach
   - Original AI reasoning

2. **Performance History:**
   - For each previous week:
     - Proposed workouts
     - Actual performance data (reps, RIR, rounds, notes)
     - Trainer observations
     - Client energy levels
     - What worked well / what didn't

3. **Progression Logic:**
   - How to adjust based on performance
   - When to increase difficulty
   - When to maintain or reduce load
   - How to address issues noted in feedback

4. **Target Week Context:**
   - What week we're generating
   - Expected progression from previous weeks
   - Specific focus areas for this week

#### Example Prompt Structure

```
## Client Context
[Original persona, goals, training style]

## Original Plan Structure
[6-week plan overview, progression strategy]

## Performance History

### Week 1 Results:
- Session 1: [Actual performance summary]
  - Client struggled with [exercise], RIR was lower than expected
  - Trainer notes: [observations]
- Session 2: [Actual performance summary]
  - Client exceeded expectations on [exercise]
  - Energy level: 8/10

[Repeat for all completed weeks]

## Instructions
Generate Week [X] workouts that:
1. Build on the progression from previous weeks
2. Address any issues noted in performance feedback
3. Adjust difficulty based on actual RIR and performance
4. Maintain client engagement and motivation
5. Follow the original plan structure while adapting to real-world results

## Output Format
[Same JSON structure as initial workout generation]
```

---

## UI/UX Requirements

### Client Detail Page Updates

1. **Client Status Badge**
   - Display current status (prospect/active/inactive)
   - "Activate Client" button when status is 'prospect'
   - Status change confirmation modal

2. **Recommendation Section**
   - Show recommendation status
   - "Accept Recommendation" button (when client is activated)
   - Display current week progress
   - Show week completion status

### Workout Execution Interface

1. **Upcoming Workouts View**
   - List of scheduled workouts grouped by week
   - Show week number, session number, workout name
   - Status indicators (scheduled/in_progress/completed)
   - "Start Workout" button for scheduled workouts

2. **Workout Execution Form**
   - Display proposed workout plan
   - For each exercise, input fields for:
     - Actual reps (number input)
     - Actual RIR (0-5 slider or number input)
     - Actual weight/load (text input)
     - Actual rounds (if applicable)
     - Exercise-specific notes (textarea)
   - Session-level inputs:
     - Overall session RIR (0-5)
     - Client energy level (1-10)
     - Trainer observations (textarea)
     - Session notes (textarea)
   - "Save & Complete" button
   - "Save Draft" button (for in-progress sessions)

3. **Workout History View**
   - List of completed workouts
   - Show proposed vs actual comparison
   - Filter by week
   - View detailed actual performance data

### Week Management Interface

1. **Week Progress Indicator**
   - Visual progress bar showing completed vs total workouts
   - Week completion status
   - "Generate Next Week" button (enabled when current week is complete)

2. **Week Generation Progress**
   - Job status display (similar to recommendation generation)
   - Progress steps: "Analyzing performance...", "Generating workouts...", "Saving..."
   - Polling for job completion

### Navigation Flow

```
Client Detail Page
  ├── Client Information (with status)
  ├── Recommendation Section
  │   ├── View Recommendation
  │   └── Accept Recommendation (when activating client)
  └── Workouts Section
      ├── Upcoming Workouts
      │   └── [Workout Card] → Start Workout → Execution Form
      ├── In Progress Workouts
      │   └── [Workout Card] → Continue Workout → Execution Form
      ├── Completed Workouts
      │   └── [Workout Card] → View Details
      └── Week Management
          ├── Current Week Progress
          └── Generate Next Week (when ready)
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Database migrations for client status
- [ ] Database migrations for workout status and execution tracking
- [ ] Create actual_workouts table
- [ ] Update TypeScript types
- [ ] Client activation endpoint
- [ ] Recommendation acceptance logic
- [ ] Basic workout status management

### Phase 2: Workout Execution (Week 3-4)
- [ ] Workout execution UI components
- [ ] Actual workout creation endpoint
- [ ] Workout completion workflow
- [ ] Workout history view
- [ ] Proposed vs actual comparison display
- [ ] Week completion detection logic

### Phase 3: Progressive Generation (Week 5-6)
- [ ] Week generation job table and service
- [ ] AI service function for progressive week generation
- [ ] Week generation API endpoints
- [ ] Week generation UI and polling
- [ ] Performance data aggregation for AI context
- [ ] Testing with multiple weeks

### Phase 4: Polish & Edge Cases (Week 7-8)
- [ ] Workout modification/editing
- [ ] Skipped/cancelled workout handling
- [ ] Error handling and validation
- [ ] UI/UX refinements
- [ ] Performance optimization
- [ ] Documentation updates

---

## Edge Cases & Considerations

### 1. Partial Week Completion
- What if trainer wants to generate next week before completing current week?
  - **Decision**: Require all workouts in current week to be completed (or explicitly skipped)
  - Show clear messaging about incomplete workouts

### 2. Workout Modifications
- Trainer modifies proposed workout before execution
  - Store modified workout_data
  - When executing, compare actual to modified (not original)
  - Track that workout was modified

### 3. Multiple Recommendations
- Client may have multiple recommendations over time
  - Each recommendation is independent
  - Track which recommendation is "active"
  - Archive old recommendations

### 4. Week Generation Failures
- AI generation fails for next week
  - Job status shows "failed"
  - Trainer can retry
  - Option to manually create workouts

### 5. Backdating Workouts
- Trainer wants to record a workout from yesterday
  - Allow setting `completed_at` timestamp
  - Validate that date is reasonable (not in future, not too far in past)

### 6. Workout Re-execution
- What if trainer wants to run the same workout again?
  - Create new workout record (copy of original)
  - Or allow multiple actual_workout records per workout?
  - **Decision**: One actual_workout per workout (1:1 relationship)
  - If re-running, create new workout record

### 7. Client Deactivation
- What happens to active workouts when client becomes inactive?
  - Workouts remain in database
  - Status shows client is inactive
  - Can reactivate and continue where left off

---

## Testing Considerations

### Unit Tests
- Client status transitions
- Workout status transitions
- Week completion detection
- Actual workout data validation

### Integration Tests
- Client activation + recommendation acceptance flow
- Workout execution + completion flow
- Week generation with performance data
- API endpoint error handling

### E2E Tests
- Complete workflow: prospect → active → execute workouts → generate next week
- Multiple weeks progression
- Workout modification flow

---

## Future Enhancements (Out of Scope)

1. **Auto-scheduling**: Automatically schedule workouts based on client availability
2. **Client App**: Allow clients to view their workouts and log some data
3. **Analytics Dashboard**: Performance trends, progress tracking
4. **Workout Templates**: Save and reuse workout structures
5. **Collaborative Notes**: Multiple trainers can add notes
6. **Photo/Video Attachments**: Attach media to workout sessions
7. **Nutrition Tracking**: Integrate nutrition data with workout performance

---

## Questions for Clarification

1. **Client Activation Trigger**: Should client activation and recommendation acceptance be a single action, or separate?
   - **Proposed**: Single action ("Activate Client & Accept Recommendation")

2. **Workout Scheduling**: Should workouts have specific scheduled dates, or just week/session numbers?
   - **Proposed**: Optional scheduled_date, but week/session is primary

3. **Week Generation Timing**: Auto-generate when week completes, or manual trigger?
   - **Proposed**: Manual trigger with clear UI prompt when week is complete

4. **Actual Workout Editing**: Can trainers edit actual workout data after saving?
   - **Proposed**: Yes, allow editing with audit trail (updated_at timestamp)

5. **Multiple Active Recommendations**: Can a client have multiple active recommendations simultaneously?
   - **Proposed**: No, one active recommendation at a time. Others are archived.

---

## Appendix: Example Data Flows

### Example: Week 1 Execution

**Proposed Workout (Week 1, Session 1):**
```json
{
  "workout_name": "Upper Body Strength",
  "workout_data": {
    "exercises": [
      {
        "name": "Barbell Bench Press",
        "sets": 4,
        "reps": "6-8",
        "weight": "RIR 2",
        "rir": 2
      },
      {
        "name": "Pull-ups",
        "sets": 3,
        "reps": "8-10",
        "weight": "Bodyweight"
      }
    ]
  }
}
```

**Actual Workout Performance:**
```json
{
  "actual_performance": {
    "exercises": [
      {
        "exercise_name": "Barbell Bench Press",
        "sets_completed": 4,
        "reps_completed": "6, 6, 7, 6",
        "weight_used": "185 lbs",
        "rir": 1,
        "notes": "Client struggled on last set, form broke down slightly"
      },
      {
        "exercise_name": "Pull-ups",
        "sets_completed": 3,
        "reps_completed": "8, 7, 6",
        "weight_used": "Bodyweight + 10 lbs assistance",
        "rir": 2,
        "notes": "Used assistance band for last set"
      }
    ],
    "total_duration_minutes": 65,
    "modifications_made": "Reduced rest time between sets to fit schedule"
  },
  "session_notes": "Great session overall. Client is progressing well on bench press. Pull-ups need more work.",
  "overall_rir": 2,
  "client_energy_level": 7,
  "trainer_observations": "Client showed good form on bench press but fatigued quickly. Need to focus on pull-up strength."
}
```

### Example: Week 2 Generation Context

When generating Week 2, the AI receives:

1. **Original Context**: Client persona, 6-week plan structure, training style
2. **Week 1 Performance Summary**:
   - Bench press: Completed 4 sets, RIR 1 (lower than planned 2), form broke down on last set
   - Pull-ups: Needed assistance, completed 3 sets, RIR 2
   - Overall: Client energy 7/10, session went well but client fatigued quickly
   - Trainer observation: Need to focus on pull-up strength

3. **AI Adjustments for Week 2**:
   - Slightly reduce bench press intensity (RIR 2-3 instead of 2)
   - Add pull-up assistance work or alternative exercises
   - Maintain overall volume but adjust based on fatigue patterns
   - Continue progression but at adjusted pace

---

## Conclusion

This specification provides a comprehensive foundation for implementing the workout execution and progressive training feature. The system enables trainers to track real-world performance and use that data to inform future workout generation, creating a feedback loop that improves program effectiveness over time.

