import type { VercelRequest, VercelResponse } from '@vercel/node';
import { processRecommendationJob, processWeekGenerationJob } from '../../backend/src/routes/recommendation.routes';
import * as jobService from '../../backend/src/services/job.service';
import * as weekGenerationJobService from '../../backend/src/services/week-generation-job.service';

export const config = {
  maxDuration: 300, // 5 minutes - Pro plan limit
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Verify cron secret (security)
  // Vercel automatically includes CRON_SECRET in the Authorization header
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.error('Unauthorized cron job request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Process recommendation jobs
    const pendingJobs = await jobService.getPendingJobs();
    console.log(`Found ${pendingJobs.length} pending recommendation jobs`);
    
    let processedRecommendations = 0;
    for (const job of pendingJobs) {
      try {
        await processRecommendationJob(job.id);
        processedRecommendations++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error processing recommendation job ${job.id}:`, errorMessage);
        // Continue with next job - error is already logged in processRecommendationJob
      }
    }

    // Process week generation jobs
    const pendingWeekJobs = await weekGenerationJobService.getPendingWeekGenerationJobs();
    console.log(`Found ${pendingWeekJobs.length} pending week generation jobs`);
    
    let processedWeeks = 0;
    for (const job of pendingWeekJobs) {
      try {
        await processWeekGenerationJob(job.id);
        processedWeeks++;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Error processing week generation job ${job.id}:`, errorMessage);
        // Continue with next job - error is already logged in processWeekGenerationJob
      }
    }

    res.json({
      success: true,
      processed: {
        recommendations: processedRecommendations,
        weekGenerations: processedWeeks,
      },
      found: {
        recommendations: pendingJobs.length,
        weekGenerations: pendingWeekJobs.length,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Cron job error:', errorMessage);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error',
      message: errorMessage 
    });
  }
}

