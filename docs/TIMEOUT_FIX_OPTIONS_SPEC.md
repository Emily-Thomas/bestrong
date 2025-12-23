# Recommendation Generation Timeout Fix - Permanent Solutions Spec

## Problem Statement

You're experiencing timeout issues with recommendation generation despite:
- ✅ Async job processing already implemented
- ✅ `maxDuration: 300` configured in `api/index.ts`
- ✅ Jobs return 202 immediately and process in background

**Root Cause:** Even though you return 202 immediately, the background processing happens in the same serverless function context. Vercel counts the total function execution time (including background promises) against the timeout limit. If a job takes >300 seconds, Vercel kills the function, causing timeouts.

**Current Operation Time:** 30-60 seconds (can spike higher with OpenAI API delays)

## Vercel Timeout Limits by Plan

| Plan | Timeout Limit | Your Operation | Status |
|------|---------------|----------------|--------|
| Hobby | 10 seconds | 30-60s | ❌ Will fail |
| Pro | 60 seconds (default), 300s (with maxDuration) | 30-60s | ⚠️ Risky if >60s |
| Enterprise | 300 seconds (default), 900s (max) | 30-60s | ✅ Safe (if <300s) |

**Note:** Even with `maxDuration: 300`, if your operation takes longer than 300 seconds, it will timeout. Additionally, Vercel may kill functions that exceed limits even if they've returned a response.

---

## Solution Options (Ranked by Cost & Complexity)

### Option 1: Vercel Cron Jobs (RECOMMENDED - Lowest Cost) ⭐

**Cost:** FREE (included in Pro plan) or $20/month (Hobby plan upgrade)

**How It Works:**
- Create a Vercel Cron Job that runs every 1-2 minutes
- Cron job checks for pending jobs in database
- Processes jobs in separate function execution (not tied to user request)
- Each cron execution has its own 300s timeout

**Pros:**
- ✅ **FREE** (included in Pro plan)
- ✅ No additional infrastructure
- ✅ Reliable - runs independently of user requests
- ✅ Can process multiple jobs per execution
- ✅ Enterprise-ready (scales with Vercel)
- ✅ Simple implementation (1-2 hours)

**Cons:**
- ⚠️ Jobs processed every 1-2 minutes (not instant, but acceptable)
- ⚠️ Requires Pro plan (or $20/month for Hobby)

**Implementation:**
1. Create `api/cron/process-jobs.ts` - Vercel cron endpoint
2. Configure cron schedule in `vercel.json` (every 1-2 minutes)
3. Cron job queries database for pending jobs
4. Processes jobs using existing `processRecommendationJob()` function
5. Update route to NOT process immediately (just create job)

**Code Changes:**
- ~50 lines of new code
- Modify existing route to remove background processing
- Add cron configuration

**Estimated Cost:** $0/month (if on Pro plan) or $20/month (Hobby upgrade)

---

### Option 2: External Job Queue Service (Moderate Cost)

**Options:**

#### 2A. Inngest (Recommended for Vercel)
- **Cost:** FREE tier (100k events/month), then $20/month
- **Pros:** Built for serverless, Vercel-native, great DX
- **Cons:** External dependency, requires API key

#### 2B. Trigger.dev
- **Cost:** FREE tier (limited), then $20/month
- **Pros:** Open source, Vercel-friendly
- **Cons:** More setup complexity

#### 2C. QStash (Upstash)
- **Cost:** FREE tier (10k requests/month), then pay-per-use (~$0.20 per 1M requests)
- **Pros:** Very cheap, serverless-native
- **Cons:** Less features than Inngest

**How It Works:**
- Job queue service receives webhook when job created
- Service triggers separate Vercel function to process job
- Processing happens in isolated function (separate timeout)

**Pros:**
- ✅ Instant processing (no polling delay)
- ✅ Reliable retry mechanisms
- ✅ Good observability
- ✅ Scales automatically

**Cons:**
- ❌ Additional service dependency
- ❌ Monthly cost ($0-20/month)
- ❌ More complex setup (2-4 hours)

**Estimated Cost:** $0-20/month

---

### Option 3: Separate Worker Service (Higher Cost, Most Reliable)

**Options:**

#### 3A. Railway/Render Worker
- **Cost:** $5-10/month (always-on worker)
- **Pros:** Simple, reliable, can run indefinitely
- **Cons:** Always-on cost even when idle

#### 3B. AWS Lambda + EventBridge
- **Cost:** Pay-per-use (~$0.20 per 1M requests)
- **Pros:** Very scalable, enterprise-grade
- **Cons:** AWS complexity, more setup

#### 3C. Google Cloud Run Jobs
- **Cost:** Pay-per-use (very cheap)
- **Pros:** Serverless, scales to zero
- **Cons:** GCP complexity

**How It Works:**
- Separate worker service (not Vercel) polls database for jobs
- Processes jobs independently
- No timeout limits (or very high limits)

**Pros:**
- ✅ No timeout issues (or very high limits)
- ✅ Most reliable
- ✅ Can handle long-running jobs
- ✅ Enterprise-ready

**Cons:**
- ❌ Additional infrastructure to manage
- ❌ Monthly cost ($5-20/month)
- ❌ More complex deployment (4-6 hours)

**Estimated Cost:** $5-20/month

---

### Option 4: Optimize AI Calls (May Not Fully Solve)

**Cost:** $0 (code changes only)

**How It Works:**
- Reduce prompt sizes (see `AI_SERVICE_PERFORMANCE_ANALYSIS.md`)
- Parallelize operations where possible
- Cache common responses
- Use faster OpenAI models

**Pros:**
- ✅ No infrastructure changes
- ✅ Reduces costs (fewer tokens)
- ✅ Faster user experience

**Cons:**
- ⚠️ May not fully solve timeout (still depends on OpenAI API speed)
- ⚠️ Requires significant refactoring (4-8 hours)
- ⚠️ Doesn't address root cause (Vercel timeout limits)

**Expected Impact:**
- 20-40% reduction in generation time
- Still risky if OpenAI API is slow

**Estimated Cost:** $0/month (but may reduce OpenAI costs)

---

### Option 5: Vercel Background Functions (If Available)

**Cost:** Included in Pro/Enterprise plan

**How It Works:**
- Use Vercel's Background Functions feature
- Functions can run longer than regular functions
- Triggered via API, run independently

**Pros:**
- ✅ No additional infrastructure
- ✅ Native Vercel solution
- ✅ Reliable

**Cons:**
- ❌ May not be available on your plan
- ❌ Still subject to Vercel limits
- ❌ Requires Vercel-specific implementation

**Note:** Check if this feature is available on your Vercel plan. It may require Enterprise plan.

**Estimated Cost:** $0/month (if available)

---

## Recommended Solution: Option 1 (Vercel Cron Jobs)

**Why:**
1. **Lowest Cost:** FREE (included in Pro plan)
2. **Simple:** Minimal code changes (1-2 hours)
3. **Reliable:** Independent of user requests
4. **Enterprise-Ready:** Scales with Vercel
5. **No External Dependencies:** Everything stays in your stack

**Trade-off:** Jobs processed every 1-2 minutes instead of instantly (acceptable for 30-60s operations)

---

## Implementation Plan for Option 1 (Vercel Cron Jobs)

### Step 1: Create Cron Job Endpoint

Create `api/cron/process-jobs.ts`:

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { processRecommendationJob, processWeekGenerationJob } from '../../backend/src/routes/recommendation.routes';
import * as jobService from '../../backend/src/services/job.service';
import * as weekGenerationJobService from '../../backend/src/services/week-generation-job.service';

export const config = {
  maxDuration: 300, // 5 minutes
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Verify cron secret (security)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Process recommendation jobs
    const pendingJobs = await jobService.getPendingJobs();
    console.log(`Found ${pendingJobs.length} pending recommendation jobs`);
    
    for (const job of pendingJobs) {
      try {
        await processRecommendationJob(job.id);
      } catch (error) {
        console.error(`Error processing job ${job.id}:`, error);
        // Continue with next job
      }
    }

    // Process week generation jobs
    const pendingWeekJobs = await weekGenerationJobService.getPendingWeekGenerationJobs();
    console.log(`Found ${pendingWeekJobs.length} pending week generation jobs`);
    
    for (const job of pendingWeekJobs) {
      try {
        await processWeekGenerationJob(job.id);
      } catch (error) {
        console.error(`Error processing week job ${job.id}:`, error);
        // Continue with next job
      }
    }

    res.json({
      success: true,
      processed: {
        recommendations: pendingJobs.length,
        weekGenerations: pendingWeekJobs.length,
      },
    });
  } catch (error) {
    console.error('Cron job error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
```

### Step 2: Update vercel.json

```json
{
  "version": 2,
  "buildCommand": "turbo run build && turbo run migrate:vercel --filter=backend",
  "framework": "nextjs",
  "outputDirectory": "frontend/.next",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api"
    }
  ],
  "crons": [
    {
      "path": "/api/cron/process-jobs",
      "schedule": "*/2 * * * *"
    }
  ]
}
```

**Schedule:** `*/2 * * * *` = Every 2 minutes

### Step 3: Add CRON_SECRET Environment Variable

In Vercel dashboard:
- Add `CRON_SECRET` environment variable (random string)
- Vercel automatically includes this in cron requests

### Step 4: Update Recommendation Routes

Modify `backend/src/routes/recommendation.routes.ts`:

**Before:**
```typescript
// Start processing in background (don't await - return immediately)
processRecommendationJob(job.id).catch((error) => {
  console.error(`Error processing job ${job.id}:`, error);
});
```

**After:**
```typescript
// Job will be processed by cron job (runs every 2 minutes)
// No need to process here - just create the job
```

### Step 5: Add Helper Method to Week Generation Job Service

Add to `backend/src/services/week-generation-job.service.ts`:

```typescript
/**
 * Get all pending week generation jobs (for cron processing)
 */
export async function getPendingWeekGenerationJobs(): Promise<WeekGenerationJob[]> {
  const result = await pool.query<WeekGenerationJob>(
    `SELECT * FROM week_generation_jobs 
     WHERE status = 'pending'
     ORDER BY created_at ASC
     LIMIT 10`,
    []
  );
  return result.rows;
}
```

### Step 6: Export processWeekGenerationJob

Update `backend/src/routes/recommendation.routes.ts` to export the function:

**Find this line (around line 1116):**
```typescript
async function processWeekGenerationJob(jobId: number): Promise<void> {
```

**Change to:**
```typescript
export async function processWeekGenerationJob(jobId: number): Promise<void> {
```

---

## Alternative: Option 2A (Inngest) - If You Need Instant Processing

If 1-2 minute delay is unacceptable, use Inngest:

### Setup:
1. Sign up for Inngest (free tier)
2. Install: `npm install inngest`
3. Create Inngest function for job processing
4. Trigger from your route

### Cost: FREE (100k events/month) or $20/month

### Implementation Time: 2-4 hours

---

## Cost Comparison Summary

| Option | Monthly Cost | Setup Time | Reliability | Instant Processing |
|-------|--------------|------------|-------------|-------------------|
| **1. Vercel Cron** | **$0** (Pro) | 1-2 hours | ⭐⭐⭐⭐⭐ | ⚠️ 1-2 min delay |
| 2A. Inngest | $0-20 | 2-4 hours | ⭐⭐⭐⭐⭐ | ✅ Instant |
| 2B. Trigger.dev | $0-20 | 2-4 hours | ⭐⭐⭐⭐ | ✅ Instant |
| 2C. QStash | $0-5 | 2-3 hours | ⭐⭐⭐⭐ | ✅ Instant |
| 3A. Railway Worker | $5-10 | 4-6 hours | ⭐⭐⭐⭐⭐ | ✅ Instant |
| 4. Optimize Only | $0 | 4-8 hours | ⭐⭐ | N/A |

---

## Recommendation

**For Enterprise-Ready, Low-Cost Solution:** Choose **Option 1 (Vercel Cron Jobs)**

**Reasons:**
1. ✅ **FREE** (included in Pro plan)
2. ✅ **Simple** (1-2 hours implementation)
3. ✅ **Reliable** (independent execution)
4. ✅ **No External Dependencies**
5. ✅ **Enterprise-Ready** (scales with Vercel)
6. ✅ **1-2 minute delay is acceptable** for 30-60s operations

**If you need instant processing:** Choose **Option 2A (Inngest)** - still very affordable and reliable.

---

## Next Steps

1. **Decide on option** (recommended: Option 1)
2. **Implement chosen solution**
3. **Test thoroughly** (create test jobs, verify processing)
4. **Monitor** (check cron logs, job completion rates)
5. **Optimize** (consider Option 4 in parallel to reduce costs)

---

## Questions to Consider

1. **Is 1-2 minute delay acceptable?** If yes → Option 1
2. **Do you need instant processing?** If yes → Option 2A (Inngest)
3. **What's your Vercel plan?** Pro plan includes free cron jobs
4. **Budget constraints?** Option 1 is free, Option 2A is $0-20/month

---

## Additional Notes

- **Combine Options:** You can implement Option 1 (cron) AND Option 4 (optimize) together for best results
- **Monitoring:** Add logging/metrics to track job processing times
- **Error Handling:** Cron jobs should handle errors gracefully and continue processing other jobs
- **Rate Limiting:** Consider processing max 5-10 jobs per cron execution to avoid timeouts

