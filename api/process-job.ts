import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as jobService from '../backend/src/services/job.service';
import * as aiService from '../backend/src/services/ai.service';
import * as clientService from '../backend/src/services/client.service';
import * as inbodyScanService from '../backend/src/services/inbody-scan.service';
import * as questionnaireService from '../backend/src/services/questionnaire.service';
import * as recommendationService from '../backend/src/services/recommendation.service';
import type {
  CreateRecommendationInput,
  CreateWorkoutInput,
  Questionnaire,
  Client,
  InBodyScan,
} from '../backend/src/types';

// Configure longer timeout for this function (up to 300s on Pro plan)
export const config = {
  maxDuration: 300, // 5 minutes
};

/**
 * Background processor for recommendation generation
 * This runs as a separate serverless function with extended timeout
 */
async function processRecommendationJob(jobId: number): Promise<void> {
  const startTime = Date.now();
  const logContext = { jobId, timestamp: new Date().toISOString() };
  
  console.log(`[Job ${jobId}] Starting recommendation generation`, logContext);

  try {
    // Step 0: Fetch job details
    console.log(`[Job ${jobId}] Fetching job details...`);
    const job = await jobService.getJobById(jobId);
    if (!job) {
      const errorMsg = `Job ${jobId} not found in database`;
      console.error(`[Job ${jobId}] ${errorMsg}`, logContext);
      await jobService.failJob(jobId, errorMsg);
      return;
    }
    console.log(`[Job ${jobId}] Job found: questionnaire_id=${job.questionnaire_id}, client_id=${job.client_id}`, logContext);

    // Step 0.1: Get questionnaire
    console.log(`[Job ${jobId}] Fetching questionnaire (ID: ${job.questionnaire_id})...`);
    let questionnaire: Questionnaire | null;
    try {
      questionnaire = await questionnaireService.getQuestionnaireById(job.questionnaire_id);
      if (!questionnaire) {
        const errorMsg = `Questionnaire ${job.questionnaire_id} not found`;
        console.error(`[Job ${jobId}] ${errorMsg}`, logContext);
        await jobService.failJob(jobId, errorMsg);
        return;
      }
      console.log(`[Job ${jobId}] Questionnaire found for client_id=${questionnaire.client_id}`, logContext);
    } catch (error) {
      const errorMsg = `Failed to fetch questionnaire ${job.questionnaire_id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`[Job ${jobId}] ${errorMsg}`, { ...logContext, error: error instanceof Error ? error.stack : error });
      await jobService.failJob(jobId, errorMsg);
      return;
    }

    // Step 0.2: Get client data
    console.log(`[Job ${jobId}] Fetching client data (ID: ${questionnaire.client_id})...`);
    let client: Client | null;
    try {
      client = await clientService.getClientById(questionnaire.client_id);
      if (!client) {
        const errorMsg = `Client ${questionnaire.client_id} not found`;
        console.error(`[Job ${jobId}] ${errorMsg}`, logContext);
        await jobService.failJob(jobId, errorMsg);
        return;
      }
      console.log(`[Job ${jobId}] Client found: ${client.first_name} ${client.last_name}`, logContext);
    } catch (error) {
      const errorMsg = `Failed to fetch client ${questionnaire.client_id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`[Job ${jobId}] ${errorMsg}`, { ...logContext, error: error instanceof Error ? error.stack : error });
      await jobService.failJob(jobId, errorMsg);
      return;
    }

    // Step 0.3: Get InBody scan
    console.log(`[Job ${jobId}] Fetching InBody scan for client ${questionnaire.client_id}...`);
    let latestScan: InBodyScan | null = null;
    try {
      const inbodyScan = await inbodyScanService.getLatestVerifiedInBodyScanByClientId(
        questionnaire.client_id
      );
      if (inbodyScan) {
        latestScan = inbodyScan;
        console.log(`[Job ${jobId}] Found verified InBody scan (ID: ${inbodyScan.id})`, logContext);
      } else {
        const unverifiedScan = await inbodyScanService.getLatestInBodyScanByClientId(
          questionnaire.client_id
        );
        if (unverifiedScan) {
          latestScan = unverifiedScan;
          console.log(`[Job ${jobId}] Found unverified InBody scan (ID: ${unverifiedScan.id})`, logContext);
        } else {
          console.log(`[Job ${jobId}] No InBody scan found for client`, logContext);
        }
      }
    } catch (error) {
      console.warn(`[Job ${jobId}] Error fetching InBody scan (continuing without it): ${error instanceof Error ? error.message : 'Unknown error'}`, logContext);
      // Continue without InBody scan - it's optional
    }

    // Step 1: Generate recommendation structure
    const step1StartTime = Date.now();
    console.log(`[Job ${jobId}] Step 1: Generating recommendation structure...`, logContext);
    await jobService.updateJobStatus(
      jobId,
      'processing',
      'Generating plan structure...'
    );
    
    let recommendationStructure: Awaited<ReturnType<typeof aiService.generateRecommendationStructure>>;
    try {
      recommendationStructure = await aiService.generateRecommendationStructure(
        questionnaire,
        null,
        latestScan,
        client
      );
      const step1Duration = Date.now() - step1StartTime;
      console.log(`[Job ${jobId}] Step 1 completed in ${step1Duration}ms`, {
        ...logContext,
        duration: step1Duration,
        client_type: recommendationStructure.client_type,
        sessions_per_week: recommendationStructure.sessions_per_week,
      });
    } catch (error) {
      const errorMsg = `Failed to generate recommendation structure: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`[Job ${jobId}] Step 1 failed: ${errorMsg}`, {
        ...logContext,
        error: error instanceof Error ? error.stack : error,
        duration: Date.now() - step1StartTime,
      });
      await jobService.failJob(jobId, errorMsg);
      return;
    }

    // Validate recommendation structure
    if (!recommendationStructure.client_type || !recommendationStructure.sessions_per_week) {
      const errorMsg = 'Generated recommendation structure is missing required fields';
      console.error(`[Job ${jobId}] Validation failed: ${errorMsg}`, {
        ...logContext,
        structure: JSON.stringify(recommendationStructure),
      });
      await jobService.failJob(jobId, errorMsg);
      return;
    }

    // Step 2: Generate workouts
    const step2StartTime = Date.now();
    console.log(`[Job ${jobId}] Step 2: Generating workouts...`, {
      ...logContext,
      expected_workouts: recommendationStructure.sessions_per_week,
    });
    await jobService.updateJobStatus(
      jobId,
      'processing',
      'Generating workouts...'
    );
    
    let workouts: Awaited<ReturnType<typeof aiService.generateWorkouts>>;
    try {
      workouts = await aiService.generateWorkouts(
        recommendationStructure,
        questionnaire,
        null,
        latestScan,
        client
      );
      const step2Duration = Date.now() - step2StartTime;
      console.log(`[Job ${jobId}] Step 2 completed in ${step2Duration}ms`, {
        ...logContext,
        duration: step2Duration,
        workouts_generated: workouts.length,
        expected_workouts: recommendationStructure.sessions_per_week,
      });
    } catch (error) {
      const errorMsg = `Failed to generate workouts: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`[Job ${jobId}] Step 2 failed: ${errorMsg}`, {
        ...logContext,
        error: error instanceof Error ? error.stack : error,
        duration: Date.now() - step2StartTime,
      });
      await jobService.failJob(jobId, errorMsg);
      return;
    }

    // Validate workouts
    if (!workouts || workouts.length === 0) {
      const errorMsg = 'No workouts were generated';
      console.error(`[Job ${jobId}] Validation failed: ${errorMsg}`, logContext);
      await jobService.failJob(jobId, errorMsg);
      return;
    }

    if (workouts.length !== recommendationStructure.sessions_per_week) {
      console.warn(`[Job ${jobId}] Workout count mismatch: expected ${recommendationStructure.sessions_per_week}, got ${workouts.length}`, logContext);
    }

    // Validate each workout has required fields
    const invalidWorkouts = workouts.filter(
      (w) => !w.week_number || !w.session_number || !w.workout_data
    );
    if (invalidWorkouts.length > 0) {
      const errorMsg = `Generated ${invalidWorkouts.length} workouts with missing required fields`;
      console.error(`[Job ${jobId}] Validation failed: ${errorMsg}`, {
        ...logContext,
        invalid_workouts: invalidWorkouts.map((w) => ({
          week_number: w.week_number,
          session_number: w.session_number,
          has_data: !!w.workout_data,
        })),
      });
      await jobService.failJob(jobId, errorMsg);
      return;
    }

    // Step 3: Save to database
    const step3StartTime = Date.now();
    console.log(`[Job ${jobId}] Step 3: Saving recommendation and workouts to database...`, {
      ...logContext,
      workouts_count: workouts.length,
    });
    await jobService.updateJobStatus(
      jobId,
      'processing',
      'Saving recommendation...'
    );

    const recommendationInput: CreateRecommendationInput = {
      client_id: questionnaire.client_id,
      questionnaire_id: job.questionnaire_id,
      client_type: recommendationStructure.client_type,
      sessions_per_week: recommendationStructure.sessions_per_week,
      session_length_minutes: recommendationStructure.session_length_minutes,
      training_style: recommendationStructure.training_style,
      plan_structure: recommendationStructure.plan_structure,
      ai_reasoning: recommendationStructure.ai_reasoning,
      inbody_scan_id: latestScan?.id,
    };

    // Convert LLM workout responses to CreateWorkoutInput format
    const workoutInputs: CreateWorkoutInput[] = workouts.map((w) => ({
      recommendation_id: 0, // Will be set after recommendation is created
      week_number: w.week_number,
      session_number: w.session_number,
      workout_name: w.workout_name,
      workout_data: w.workout_data,
      workout_reasoning: w.workout_reasoning,
    }));

    let recommendation: Awaited<ReturnType<typeof recommendationService.createOrUpdateRecommendationForQuestionnaire>>;
    try {
      recommendation = await recommendationService.createOrUpdateRecommendationForQuestionnaire(
        recommendationInput,
        job.created_by || 0,
        workoutInputs
      );
      const step3Duration = Date.now() - step3StartTime;
      console.log(`[Job ${jobId}] Step 3 completed in ${step3Duration}ms`, {
        ...logContext,
        duration: step3Duration,
        recommendation_id: recommendation.id,
        workouts_saved: workoutInputs.length,
      });
    } catch (error) {
      const errorMsg = `Failed to save recommendation to database: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`[Job ${jobId}] Step 3 failed: ${errorMsg}`, {
        ...logContext,
        error: error instanceof Error ? error.stack : error,
        duration: Date.now() - step3StartTime,
        recommendation_input: JSON.stringify(recommendationInput),
      });
      await jobService.failJob(jobId, errorMsg);
      return;
    }

    // Complete the job
    const totalDuration = Date.now() - startTime;
    await jobService.completeJob(jobId, recommendation.id);
    console.log(`[Job ${jobId}] ✅ Job completed successfully in ${totalDuration}ms`, {
      ...logContext,
      total_duration: totalDuration,
      recommendation_id: recommendation.id,
      workouts_count: workouts.length,
    });
  } catch (error) {
    const totalDuration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error(`[Job ${jobId}] ❌ Job failed after ${totalDuration}ms: ${errorMessage}`, {
      ...logContext,
      total_duration: totalDuration,
      error: errorStack,
      error_message: errorMessage,
    });
    
    try {
      await jobService.failJob(jobId, errorMessage);
    } catch (failError) {
      console.error(`[Job ${jobId}] ❌ Failed to update job status to failed: ${failError instanceof Error ? failError.message : 'Unknown error'}`, {
        ...logContext,
        original_error: errorMessage,
        fail_error: failError instanceof Error ? failError.stack : failError,
      });
    }
  }
}

// Vercel serverless function handler
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const requestStartTime = Date.now();
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[${requestId}] Process job request received`, {
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Only allow POST requests
  if (req.method !== 'POST') {
    console.warn(`[${requestId}] Invalid method: ${req.method}`, { method: req.method });
    res.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  // Get job ID from request body
  const { jobId } = req.body;

  if (!jobId) {
    console.error(`[${requestId}] Missing jobId in request body`, { body: req.body });
    res.status(400).json({
      success: false,
      error: 'jobId is required in request body',
    });
    return;
  }

  if (typeof jobId !== 'number') {
    console.error(`[${requestId}] Invalid jobId type: expected number, got ${typeof jobId}`, {
      jobId,
      jobIdType: typeof jobId,
    });
    res.status(400).json({
      success: false,
      error: 'jobId must be a number',
    });
    return;
  }

  console.log(`[${requestId}] Processing job ${jobId}`, { jobId, requestId });

  // Process the job (await to ensure it completes within the extended timeout)
  // This function has maxDuration: 300s configured, so it can run longer
  try {
    await processRecommendationJob(jobId);
    const duration = Date.now() - requestStartTime;
    console.log(`[${requestId}] Job ${jobId} processing completed in ${duration}ms`, {
      jobId,
      requestId,
      duration,
    });
    res.status(200).json({
      success: true,
      message: 'Job processing completed',
      data: { job_id: jobId },
    });
  } catch (error) {
    const duration = Date.now() - requestStartTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error(`[${requestId}] Error processing job ${jobId} after ${duration}ms: ${errorMessage}`, {
      jobId,
      requestId,
      duration,
      error: errorStack,
      error_message: errorMessage,
    });
    
    res.status(500).json({
      success: false,
      error: errorMessage,
      data: { job_id: jobId },
    });
  }
}

