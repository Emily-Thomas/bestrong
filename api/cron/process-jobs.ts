import type { VercelRequest, VercelResponse } from '@vercel/node';
import { processRecommendationJob, processWeekGenerationJob } from '../../backend/src/routes/recommendation.routes';
import { processInBodyScan } from '../../backend/src/routes/inbody-scan.routes';
import * as jobService from '../../backend/src/services/job.service';
import * as weekGenerationJobService from '../../backend/src/services/week-generation-job.service';
import * as inbodyScanService from '../../backend/src/services/inbody-scan.service';

export const config = {
  maxDuration: 300, // 5 minutes - Pro plan limit
};

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Verify cron secret (optional but recommended for security)
  // Vercel automatically includes CRON_SECRET in the Authorization header if set
  // If CRON_SECRET is not set, this check is skipped (cron jobs still work)
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret) {
    // If CRON_SECRET is set, verify the request is from Vercel
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.error('Unauthorized cron job request - CRON_SECRET mismatch');
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
  // Note: If CRON_SECRET is not set, the endpoint will still work
  // but it's recommended to set it in production for better security

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
    
    if (pendingWeekJobs.length > 0) {
      console.log(`Pending week job IDs: ${pendingWeekJobs.map(j => j.id).join(', ')}`);
    }
    
    let processedWeeks = 0;
    for (const job of pendingWeekJobs) {
      try {
        console.log(`Processing week generation job ${job.id} (recommendation ${job.recommendation_id}, week ${job.week_number})`);
        await processWeekGenerationJob(job.id);
        processedWeeks++;
        console.log(`✅ Successfully processed week generation job ${job.id}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        console.error(`❌ Error processing week generation job ${job.id}:`, errorMessage);
        if (errorStack) {
          console.error(`Stack trace for job ${job.id}:`, errorStack);
        }
        // Continue with next job - error is already logged in processWeekGenerationJob
      }
    }

    // Process pending InBody scans
    const pendingScans = await inbodyScanService.getPendingInBodyScans();
    console.log(`Found ${pendingScans.length} pending InBody scans`);
    
    if (pendingScans.length > 0) {
      console.log(`Pending InBody scan IDs: ${pendingScans.map(s => s.id).join(', ')}`);
    }
    
    let processedScans = 0;
    for (const scan of pendingScans) {
      try {
        console.log(`Processing InBody scan ${scan.id} (client ${scan.client_id})`);
        await processInBodyScan(scan.id);
        processedScans++;
        console.log(`✅ Successfully processed InBody scan ${scan.id}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorStack = error instanceof Error ? error.stack : undefined;
        console.error(`❌ Error processing InBody scan ${scan.id}:`, errorMessage);
        if (errorStack) {
          console.error(`Stack trace for scan ${scan.id}:`, errorStack);
        }
        // Continue with next scan - error is already logged in processInBodyScan
      }
    }

    res.json({
      success: true,
      processed: {
        recommendations: processedRecommendations,
        weekGenerations: processedWeeks,
        inbodyScans: processedScans,
      },
      found: {
        recommendations: pendingJobs.length,
        weekGenerations: pendingWeekJobs.length,
        inbodyScans: pendingScans.length,
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

