# AI Service & Recommendation Service Performance Analysis

## Executive Summary

This document analyzes the AI service and recommendation service to identify performance bottlenecks and optimization opportunities. The analysis focuses on reducing response times and improving efficiency.

## Current Architecture

### Flow Overview

1. **Initial Recommendation Generation** (Week 1):
   - Database queries (questionnaire, client, InBody scan)
   - Step 1: Generate recommendation structure (OpenAI API call)
   - Step 2: Generate Week 1 workouts (OpenAI API call)
   - Database writes (recommendation + workouts)

2. **Week Generation** (Weeks 2-6):
   - Collect previous weeks' performance data
   - Generate workouts for target week (OpenAI API call)
   - Database writes (workouts)

## Performance Bottlenecks

### 1. Sequential OpenAI API Calls ⚠️ **HIGH IMPACT**

**Location**: `ai.service.ts` - `generateRecommendationWithAI()`

**Current Flow**:
```typescript
// Step 1: Generate structure (~2-5 seconds)
const recommendation = await generateRecommendationStructure(...);

// Step 2: Generate workouts (~3-8 seconds)
const workouts = await generateWorkouts(...);
```

**Problem**: Two sequential API calls that could potentially be optimized or parallelized.

**Impact**: Adds 5-13 seconds to total generation time.

**Recommendations**:
- ✅ **Already optimized**: The two-step approach is actually good - structure informs workouts
- Consider caching common structures if same questionnaire types repeat
- Could potentially generate structure and first workout in parallel, but structure is needed for workout context

### 2. Large Prompt Sizes ⚠️ **HIGH IMPACT**

**Location**: `ai.service.ts` - `generateRecommendationStructure()` and `generateWorkouts()`

**Current Issues**:
- Full client archetypes list (10 personas) included in every prompt (~2000+ tokens)
- Full questionnaire data (structured or old format)
- Full InBody scan data with segment analysis
- Full client information
- Verbose instructions and examples

**Estimated Token Usage**:
- Structure generation: ~3000-5000 input tokens
- Workout generation: ~4000-6000 input tokens
- Total per recommendation: ~7000-11000 input tokens

**Impact**: 
- Higher costs
- Slower API responses (more tokens to process)
- Higher risk of truncation

**Recommendations**:
1. **Reduce archetype verbosity**: Only include the 2-3 most relevant archetypes instead of all 10
2. **Simplify InBody data**: Only include key metrics (weight, SMM, body fat %) unless segment analysis is critical
3. **Condense questionnaire formatting**: Use more compact format
4. **Remove redundant instructions**: Consolidate system and user prompts

### 3. Database Query Inefficiencies ⚠️ **MEDIUM IMPACT**

**Location**: `recommendation.routes.ts` - `processRecommendationJob()`

**Current Flow**:
```typescript
// Sequential queries
const questionnaire = await questionnaireService.getQuestionnaireById(...);
const client = await clientService.getClientById(...);
const inbodyScan = await inbodyScanService.getLatestVerifiedInBodyScanByClientId(...);
const latestScan = inbodyScan || await inbodyScanService.getLatestInBodyScanByClientId(...);
```

**Problems**:
- 3-4 sequential database queries
- Two InBody scan queries (verified, then fallback)
- No parallelization

**Impact**: Adds 50-200ms per request

**Recommendations**:
1. **Parallelize independent queries**:
   ```typescript
   const [questionnaire, client, verifiedScan] = await Promise.all([
     questionnaireService.getQuestionnaireById(...),
     clientService.getClientById(...),
     inbodyScanService.getLatestVerifiedInBodyScanByClientId(...)
   ]);
   const latestScan = verifiedScan || await inbodyScanService.getLatestInBodyScanByClientId(...);
   ```

2. **Combine InBody queries**: Create a single service method that tries verified first, then unverified

### 4. Week Generation Data Collection ⚠️ **MEDIUM IMPACT**

**Location**: `recommendation.routes.ts` - `processWeekGenerationJob()`

**Current Flow**:
```typescript
// Sequential loop for each previous week
for (let week = 1; week < job.week_number; week++) {
  const workouts = await workoutService.getWorkoutsByWeek(...);
  const actualWorkoutPromises = workouts.map(...);
  const actualWorkoutResults = await Promise.all(actualWorkoutPromises);
}
```

**Problems**:
- Sequential week queries (could be parallelized)
- Multiple database round-trips per week
- N+1 query pattern for actual workouts

**Impact**: For week 6, this means 5 sequential week queries + N queries for actual workouts

**Recommendations**:
1. **Parallelize week queries**:
   ```typescript
   const weekQueries = Array.from({ length: job.week_number - 1 }, (_, i) => i + 1)
     .map(week => workoutService.getWorkoutsByWeek(recommendation.id, week));
   const allWeekWorkouts = await Promise.all(weekQueries);
   ```

2. **Batch actual workout queries**: Get all actual workouts in one query with WHERE IN clause

### 5. Excessive JSON Parsing/Repair Logic ⚠️ **LOW IMPACT**

**Location**: `ai.service.ts` - `parseJSONWithRepair()`

**Current Issues**:
- Very complex JSON repair logic (600+ lines)
- Extensive error logging (can be verbose)
- Multiple repair strategies attempted

**Impact**: Minimal - this is defensive code that prevents failures, but adds ~10-50ms

**Recommendations**:
- ✅ **Keep as-is**: This prevents production failures
- Consider reducing verbosity of error logs in production
- Could add a flag to disable detailed logging in production

### 6. Redundant Data Formatting ⚠️ **LOW IMPACT**

**Location**: `ai.service.ts` - Formatting functions called multiple times

**Current Issues**:
- `formatQuestionnaireForPrompt()` called in both structure and workout generation
- `formatInBodyScanForPrompt()` called in both
- `formatClientInfoForPrompt()` called in both

**Impact**: Minimal CPU overhead (~5-10ms), but could be optimized

**Recommendations**:
- Cache formatted strings if same data is used multiple times
- Or pass formatted strings as parameters instead of raw data

### 7. Database Write Operations ⚠️ **LOW-MEDIUM IMPACT**

**Location**: `recommendation.service.ts` - `createOrUpdateRecommendationForQuestionnaire()`

**Current Flow**:
1. Check if recommendation exists
2. If exists: Delete old workouts, update recommendation
3. If not: Create recommendation
4. Create all workouts (potentially sequential)

**Problems**:
- Multiple database round-trips
- Workout creation might be sequential

**Impact**: 100-500ms depending on number of workouts

**Recommendations**:
1. **Batch workout creation**: Ensure `workoutService.createWorkouts()` uses batch insert
2. **Use transactions**: Wrap recommendation + workout creation in a transaction
3. **Optimize update path**: Use single UPDATE with conditional logic instead of delete + insert

## Optimization Priority Matrix

### High Priority (Quick Wins)

1. **Reduce Prompt Sizes** (30-60 minutes)
   - Remove full archetype list, only include top matches
   - Simplify InBody scan formatting
   - Condense questionnaire format
   - **Expected Impact**: 20-40% reduction in input tokens, 10-30% faster API responses

2. **Parallelize Database Queries** (15-30 minutes)
   - Parallelize questionnaire, client, and InBody queries
   - **Expected Impact**: 50-150ms faster per request

3. **Optimize Week Generation Data Collection** (30-60 minutes)
   - Parallelize week queries
   - Batch actual workout queries
   - **Expected Impact**: 200-500ms faster for week 6 generation

### Medium Priority (Moderate Effort)

4. **Combine InBody Scan Queries** (15-30 minutes)
   - Create single method that handles verified/unverified logic
   - **Expected Impact**: 1 less database query, cleaner code

5. **Cache Formatted Prompt Strings** (30-60 minutes)
   - Cache questionnaire, InBody, and client formatting
   - **Expected Impact**: 5-10ms per request, cleaner code

### Low Priority (Nice to Have)

6. **Optimize Database Writes** (60-120 minutes)
   - Batch workout inserts
   - Use transactions
   - **Expected Impact**: 50-200ms faster writes

7. **Reduce JSON Repair Verbosity** (30 minutes)
   - Add production flag to reduce logging
   - **Expected Impact**: Cleaner logs, minimal performance gain

## Detailed Recommendations

### Recommendation 1: Reduce Prompt Sizes

**Current**: All 10 client archetypes included in every prompt (~2000 tokens)

**Optimized**: 
1. Use a lightweight archetype selection step first (or do it in code based on questionnaire)
2. Only include the selected archetype + 1-2 alternatives in the workout generation prompt

**Implementation**:
```typescript
// In generateRecommendationStructure, after getting response:
// Store selected archetype
const selectedArchetype = recommendation.client_type;

// In generateWorkouts, only include relevant archetypes:
const relevantArchetypes = getRelevantArchetypes(selectedArchetype);
// Only include these in prompt
```

**Expected Savings**: ~1500-2000 tokens per request

### Recommendation 2: Simplify InBody Scan Formatting

**Current**: Full segment analysis with all metrics

**Optimized**: Only include key metrics unless segment analysis is critical

**Implementation**:
```typescript
function formatInBodyScanForPrompt(scan: InBodyScan | null, includeSegments = false): string {
  // Always include: weight, SMM, body fat %
  // Only include segments if includeSegments = true
}
```

**Expected Savings**: ~200-500 tokens per request

### Recommendation 3: Parallelize Database Queries

**Current**:
```typescript
const questionnaire = await questionnaireService.getQuestionnaireById(...);
const client = await clientService.getClientById(...);
const inbodyScan = await inbodyScanService.getLatestVerifiedInBodyScanByClientId(...);
```

**Optimized**:
```typescript
const [questionnaire, client, verifiedScan] = await Promise.all([
  questionnaireService.getQuestionnaireById(job.questionnaire_id),
  clientService.getClientById(questionnaire.client_id),
  inbodyScanService.getLatestVerifiedInBodyScanByClientId(questionnaire.client_id)
]);
```

**Expected Savings**: 50-150ms per request

### Recommendation 4: Optimize Week Generation

**Current**: Sequential week queries

**Optimized**: Parallel week queries + batched actual workout queries

**Implementation**:
```typescript
// Get all weeks in parallel
const weekNumbers = Array.from({ length: job.week_number - 1 }, (_, i) => i + 1);
const weekWorkoutPromises = weekNumbers.map(week => 
  workoutService.getWorkoutsByWeek(recommendation.id, week)
);
const allWeekWorkouts = await Promise.all(weekWorkoutPromises);

// Get all actual workouts in one query
const allWorkoutIds = allWeekWorkouts.flat().map(w => w.id);
const allActualWorkouts = await actualWorkoutService.getActualWorkoutsByWorkoutIds(allWorkoutIds);
```

**Expected Savings**: 200-500ms for week 6 generation

## Performance Metrics to Track

1. **API Response Times**:
   - Structure generation time
   - Workout generation time
   - Total recommendation generation time

2. **Token Usage**:
   - Input tokens per request
   - Output tokens per request
   - Total tokens per recommendation

3. **Database Query Times**:
   - Time to fetch questionnaire, client, InBody scan
   - Time to save recommendation and workouts
   - Time to collect week data

4. **End-to-End Times**:
   - Time from request to job completion
   - Time for week generation

## Expected Overall Impact

After implementing high-priority optimizations:

- **Token Reduction**: 20-40% fewer input tokens
- **API Response Time**: 10-30% faster
- **Database Query Time**: 50-200ms faster per request
- **Week Generation**: 200-500ms faster for later weeks
- **Total Improvement**: 15-25% faster end-to-end

## Implementation Plan

### Phase 1: Quick Wins (1-2 hours)
1. Parallelize database queries in `processRecommendationJob()`
2. Optimize week generation data collection
3. Combine InBody scan queries

### Phase 2: Prompt Optimization (2-3 hours)
1. Reduce archetype verbosity
2. Simplify InBody scan formatting
3. Condense questionnaire formatting

### Phase 3: Additional Optimizations (1-2 hours)
1. Cache formatted prompt strings
2. Optimize database writes
3. Add performance logging

## Notes

- The current two-step approach (structure then workouts) is actually optimal - structure is needed for workout context
- JSON repair logic should be kept - it prevents production failures
- Async job processing is already well-implemented
- Consider adding request-level caching for identical questionnaires (future optimization)

