# LLM Integration for Recommendations

This document describes the new LLM-based recommendation system that generates personalized training plans and workouts using OpenAI.

## Overview

The recommendation system now uses OpenAI's GPT models to:
1. Analyze questionnaire responses and select the appropriate client persona
2. Generate a complete 6-week training plan with sessions per week, session length, training style, and plan structure
3. Create detailed workouts for every session in the 6-week program

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

This will install the `openai` package that was added to `package.json`.

### 2. Environment Variables

Add the following environment variable to your `.env` file:

```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-5-mini  # Optional, defaults to gpt-5-mini if not set
```

You can get an API key from [OpenAI](https://platform.openai.com/api-keys).

## Database Changes

A new `workouts` table has been added to store individual workout sessions:

- `id`: Primary key
- `recommendation_id`: Foreign key to recommendations table
- `week_number`: Week number (1-6)
- `session_number`: Session number within the week
- `workout_name`: Optional name for the workout
- `workout_data`: JSONB containing exercise details (exercises, sets, reps, weight, rest, etc.)
- `workout_reasoning`: AI reasoning for this specific workout
- `created_at`, `updated_at`: Timestamps

Run migrations to create the table:
```bash
npm run migrate
```

## API Changes

### Generate Recommendation

The existing endpoints now return workouts as part of the recommendation:

**POST `/api/recommendations/generate/:questionnaireId`**
**POST `/api/recommendations/generate/client/:clientId`**

Response now includes:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "client_id": 1,
    "client_type": "The Midlife Transformer",
    "sessions_per_week": 3,
    "session_length_minutes": 60,
    "training_style": "...",
    "plan_structure": {...},
    "ai_reasoning": "...",
    "workouts": [
      {
        "id": 1,
        "week_number": 1,
        "session_number": 1,
        "workout_name": "Upper Body Strength",
        "workout_data": {
          "exercises": [
            {
              "name": "Barbell Bench Press",
              "sets": 4,
              "reps": "6-8",
              "weight": "RPE 8",
              "rest_seconds": 180,
              "notes": "...",
              "rpe": 8
            }
          ],
          "warmup": [...],
          "cooldown": [...]
        },
        "workout_reasoning": "..."
      }
    ]
  }
}
```

### Get Workouts

**GET `/api/recommendations/:id/workouts`**

Returns all workouts for a specific recommendation, ordered by week and session number.

## Client Personas

The system uses 10 predefined client personas that the LLM selects from:

1. **The Rebuilder** - 40+, post-injury, cautious
2. **The Serial Athlete** - Lifelong competitor
3. **The Midlife Transformer** - Career-driven, seeking vitality
4. **The Golden Grinder** - 60+, longevity-focused
5. **The Functionalist** - Movement-minded, practical strength
6. **The Transformation Seeker** - Short-term goal, high emotion
7. **The Maintenance Pro** - Advanced, consistent, data-driven
8. **The Overwhelmed Beginner** - Inexperienced, anxious
9. **The Burnout Comeback** - Ex-athlete, rediscovering joy
10. **The Data-Driven Devotee** - Analytical, optimization-focused

## LLM Prompt Structure

The prompt includes:
- All 10 client personas with descriptions and training methods
- Complete questionnaire data (structured or legacy format)
- Instructions for persona selection
- Instructions for training plan design
- Instructions for workout generation
- JSON schema for structured output

## Workout Structure

Each workout includes:
- **Exercises**: Array of exercises with:
  - Name
  - Sets
  - Reps (can be range like "8-10" or number)
  - Weight/load guidance (RPE, percentage, bodyweight, etc.)
  - Rest periods in seconds
  - Notes on form, tempo, etc.
  - RPE (Rate of Perceived Exertion) when applicable
- **Warmup**: Optional warmup exercises
- **Cooldown**: Optional cooldown exercises
- **Focus Areas**: Array of focus areas (e.g., ["upper body", "push", "strength"])
- **Total Duration**: Estimated workout duration
- **Workout Reasoning**: Why this specific workout was designed

## TypeScript Types

New types have been added in `backend/src/types/index.ts`:

- `Exercise`: Individual exercise structure
- `WorkoutData`: Complete workout structure
- `Workout`: Database workout record
- `CreateWorkoutInput`: Input for creating workouts
- `LLMRecommendationResponse`: LLM response structure
- `LLMWorkoutResponse`: Individual workout in LLM response

## Services

### AI Service (`ai.service.ts`)

- `generateRecommendationWithAI()`: Main function that calls OpenAI and returns structured recommendation with workouts
- Uses gpt-5-mini by default (configurable via `OPENAI_MODEL`)
- Returns JSON with structured output format
- Includes comprehensive prompt with client personas and questionnaire data

### Workout Service (`workout.service.ts`)

New service for managing workouts:
- `createWorkout()`: Create a single workout
- `createWorkouts()`: Create multiple workouts
- `getWorkoutById()`: Get workout by ID
- `getWorkoutsByRecommendationId()`: Get all workouts for a recommendation
- `getWorkoutByWeekAndSession()`: Get specific workout
- `deleteWorkout()`: Delete a workout
- `deleteWorkoutsByRecommendationId()`: Delete all workouts for a recommendation

### Recommendation Service Updates

- `createOrUpdateRecommendationForQuestionnaire()` now accepts optional `workouts` parameter
- Automatically creates/deletes workouts when recommendations are updated

## Error Handling

- If `OPENAI_API_KEY` is not set, the service will throw a clear error
- LLM errors are caught and re-thrown with descriptive messages
- Invalid response structures are validated and errors thrown

## Cost Considerations

- Each recommendation generation makes one API call to OpenAI
- The prompt is comprehensive and may use significant tokens
- Using gpt-5-mini by default provides good quality results at lower cost
- You can switch to `gpt-4o` or `gpt-5` for higher quality if needed (set `OPENAI_MODEL` env var)

## Testing

To test the integration:

1. Ensure environment variables are set
2. Run database migrations
3. Create a client and questionnaire
4. Call the generate recommendation endpoint
5. Verify the response includes workouts for all weeks and sessions

## Future Enhancements

Potential improvements:
- Caching LLM responses for similar questionnaires
- Fine-tuning a custom model on training data
- Adding workout modification endpoints
- Progressive workout generation (generate week by week)
- Exercise library integration
- Video/form demonstration links for exercises

