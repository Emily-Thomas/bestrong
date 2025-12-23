import { type Request, type Response, Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import * as aiService from '../services/ai.service';
import * as clientService from '../services/client.service';
import * as inbodyScanService from '../services/inbody-scan.service';
import * as questionnaireService from '../services/questionnaire.service';
import * as recommendationService from '../services/recommendation.service';
import * as workoutService from '../services/workout.service';
import * as actualWorkoutService from '../services/actual-workout.service';
import * as jobService from '../services/job.service';
import * as weekGenerationJobService from '../services/week-generation-job.service';
import type {
  CreateRecommendationInput,
  UpdateRecommendationInput,
  CreateWorkoutInput,
  ActualWorkout,
  Workout,
} from '../types';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * Background processor for recommendation generation
 * This runs asynchronously and updates the job status
 * Exported so it can be called from cron jobs
 */
export async function processRecommendationJob(jobId: number): Promise<void> {
  try {
    const job = await jobService.getJobById(jobId);
    if (!job) {
      console.error(`Job ${jobId} not found`);
      return;
    }

    // Prevent duplicate processing - if job is already completed or cancelled, skip
    if (job.status === 'completed') {
      console.log(`Job ${jobId} already completed, skipping`);
      return;
    }

    if (job.status === 'cancelled') {
      console.log(`Job ${jobId} was cancelled, skipping`);
      return;
    }

    // If already processing, check if it's been stuck (processing for more than 5 minutes)
    // This allows retry of stuck jobs
    if (job.status === 'processing') {
      const processingTime = job.updated_at ? Date.now() - new Date(job.updated_at).getTime() : 0;
      const fiveMinutes = 5 * 60 * 1000;
      
      if (processingTime < fiveMinutes) {
        console.warn(`Job ${jobId} is already being processed (${Math.round(processingTime / 1000)}s ago), skipping duplicate`);
        return;
      } else {
        console.warn(`Job ${jobId} appears stuck (processing for ${Math.round(processingTime / 1000)}s), retrying...`);
        // Continue processing - will update status below
      }
    }

    // Get questionnaire first (needed for client_id)
    const questionnaire =
      await questionnaireService.getQuestionnaireById(job.questionnaire_id);

    if (!questionnaire) {
      await jobService.failJob(jobId, 'Questionnaire not found');
      return;
    }

    // Parallelize independent database queries
    const [client, latestScan] = await Promise.all([
      clientService.getClientById(questionnaire.client_id),
      inbodyScanService.getLatestInBodyScanByClientIdWithFallback(
        questionnaire.client_id
      ),
    ]);

    if (!client) {
      await jobService.failJob(jobId, 'Client not found');
      return;
    }

    // Step 1: Generate recommendation structure
    await jobService.updateJobStatus(
      jobId,
      'processing',
      'Generating plan structure...'
    );
    
    // Check if cancelled before expensive AI call
    const checkJob = await jobService.getJobById(jobId);
    if (checkJob?.status === 'cancelled') {
      console.log(`Job ${jobId} was cancelled before generating structure`);
      return;
    }
    
    const recommendationStructure =
      await aiService.generateRecommendationStructure(questionnaire, null, latestScan, client);

    // Step 2: Generate workouts
    await jobService.updateJobStatus(
      jobId,
      'processing',
      'Generating workouts...'
    );
    
    // Check if cancelled before expensive AI call
    const checkJob2 = await jobService.getJobById(jobId);
    if (checkJob2?.status === 'cancelled') {
      console.log(`Job ${jobId} was cancelled before generating workouts`);
      return;
    }
    
    const workouts = await aiService.generateWorkouts(
      recommendationStructure,
      questionnaire,
      null,
      latestScan,
      client
    );

    // Step 3: Save to database
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

    const recommendation =
      await recommendationService.createOrUpdateRecommendationForQuestionnaire(
        recommendationInput,
        job.created_by || 0,
        workoutInputs
      );

    // Complete the job
    await jobService.completeJob(jobId, recommendation.id);
    console.log(`✅ Job ${jobId} completed successfully`);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Job ${jobId} failed:`, errorMessage);
    await jobService.failJob(jobId, errorMessage);
  }
}

// Start async recommendation generation from questionnaire
router.post(
  '/generate/:questionnaireId/start',
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const questionnaireId = parseInt(req.params.questionnaireId, 10);

      if (Number.isNaN(questionnaireId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid questionnaire ID',
        });
        return;
      }

      // Get questionnaire to get client_id
      const questionnaire =
        await questionnaireService.getQuestionnaireById(questionnaireId);

      if (!questionnaire) {
        res.status(404).json({
          success: false,
          error: 'Questionnaire not found',
        });
        return;
      }

      // Check if client has at least one InBody scan
      const hasScan = await inbodyScanService.hasInBodyScan(questionnaire.client_id);
      if (!hasScan) {
        res.status(400).json({
          success: false,
          error: 'At least one InBody scan is required before generating recommendations',
        });
        return;
      }

      // Check if there's already a pending/processing job for this questionnaire
      const existingJob =
        await jobService.getLatestJobByQuestionnaireId(questionnaireId);
      if (
        existingJob &&
        (existingJob.status === 'pending' || existingJob.status === 'processing')
      ) {
        res.json({
          success: true,
          data: { job_id: existingJob.id },
          message: 'Job already in progress',
        });
        return;
      }

      // Create new job
      const job = await jobService.createJob({
        questionnaire_id: questionnaireId,
        client_id: questionnaire.client_id,
        created_by: req.user.userId,
      });

      // Job will be processed by cron job (runs every 2 minutes)
      // No need to process here - just create the job and return
      res.status(202).json({
        success: true,
        data: { job_id: job.id },
        message: 'Recommendation generation started. Job will be processed shortly.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  }
);

// Start async recommendation generation from client ID
router.post(
  '/generate/client/:clientId/start',
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const clientId = parseInt(req.params.clientId, 10);

      if (Number.isNaN(clientId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid client ID',
        });
        return;
      }

      // Get latest questionnaire for client
      const questionnaire =
        await questionnaireService.getQuestionnaireByClientId(clientId);

      if (!questionnaire) {
        res.status(404).json({
          success: false,
          error: 'No questionnaire found for this client',
        });
        return;
      }

      // Check if there's already a pending/processing job for this questionnaire
      const existingJob =
        await jobService.getLatestJobByQuestionnaireId(questionnaire.id);
      if (
        existingJob &&
        (existingJob.status === 'pending' || existingJob.status === 'processing')
      ) {
        res.json({
          success: true,
          data: { job_id: existingJob.id },
          message: 'Job already in progress',
        });
        return;
      }

      // Create new job
      const job = await jobService.createJob({
        questionnaire_id: questionnaire.id,
        client_id: clientId,
        created_by: req.user.userId,
      });

      // Job will be processed by cron job (runs every 2 minutes)
      // No need to process here - just create the job and return
      res.status(202).json({
        success: true,
        data: { job_id: job.id },
        message: 'Recommendation generation started. Job will be processed shortly.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  }
);

// Get latest job for a questionnaire (MUST come before /generate/job/:jobId to avoid route conflicts)
router.get('/generate/questionnaire/:questionnaireId/job', async (req: Request, res: Response) => {
  try {
    const questionnaireId = parseInt(req.params.questionnaireId, 10);

    if (Number.isNaN(questionnaireId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid questionnaire ID',
      });
      return;
    }

    const job = await jobService.getLatestJobByQuestionnaireId(questionnaireId);

    if (!job) {
      // Return success with null data instead of 404, so frontend can handle gracefully
      res.json({
        success: true,
        data: null,
      });
      return;
    }

    res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Get job status by job ID (MUST come after /generate/questionnaire/:questionnaireId/job)
router.get('/generate/job/:jobId', async (req: Request, res: Response) => {
  try {
    const jobId = parseInt(req.params.jobId, 10);

    if (Number.isNaN(jobId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid job ID',
      });
      return;
    }

    const job = await jobService.getJobById(jobId);

    if (!job) {
      res.status(404).json({
        success: false,
        error: 'Job not found',
      });
      return;
    }

    res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Cancel a recommendation generation job (MUST come after GET /generate/job/:jobId)
router.post('/generate/job/:jobId/cancel', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const jobId = parseInt(req.params.jobId, 10);

    if (Number.isNaN(jobId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid job ID',
      });
      return;
    }

    const job = await jobService.getJobById(jobId);

    if (!job) {
      res.status(404).json({
        success: false,
        error: 'Job not found',
      });
      return;
    }

    // Can only cancel pending or processing jobs
    if (job.status === 'completed') {
      res.status(400).json({
        success: false,
        error: 'Cannot cancel a completed job',
      });
      return;
    }

    if (job.status === 'cancelled') {
      res.json({
        success: true,
        message: 'Job is already cancelled',
        data: job,
      });
      return;
    }

    if (job.status === 'failed') {
      res.status(400).json({
        success: false,
        error: 'Cannot cancel a failed job',
      });
      return;
    }

    // Optional cancellation reason from request body
    const reason = req.body?.reason || 'Cancelled by user';

    // Cancel the job
    await jobService.cancelJob(jobId, reason);

    // Get updated job
    const updatedJob = await jobService.getJobById(jobId);

    res.json({
      success: true,
      message: 'Job cancelled successfully',
      data: updatedJob,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});


// Legacy blocking endpoint (kept for backward compatibility, but deprecated)
router.post(
  '/generate/:questionnaireId',
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const questionnaireId = parseInt(req.params.questionnaireId, 10);

      if (Number.isNaN(questionnaireId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid questionnaire ID',
        });
        return;
      }

      // Get questionnaire first (needed for client_id)
      const questionnaire =
        await questionnaireService.getQuestionnaireById(questionnaireId);

      if (!questionnaire) {
        res.status(404).json({
          success: false,
          error: 'Questionnaire not found',
        });
        return;
      }

      // Parallelize independent database queries
      const [client, latestScan] = await Promise.all([
        clientService.getClientById(questionnaire.client_id),
        inbodyScanService.getLatestInBodyScanByClientIdWithFallback(
          questionnaire.client_id
        ),
      ]);

      if (!client) {
        res.status(404).json({
          success: false,
          error: 'Client not found',
        });
        return;
      }

      // Generate AI recommendation with workouts
      const aiAnalysis =
        await aiService.generateRecommendationWithAI(questionnaire, latestScan, client);

      // Create or update recommendation record (1:1 with questionnaire)
      const recommendationInput: CreateRecommendationInput = {
        client_id: questionnaire.client_id,
        questionnaire_id: questionnaireId,
        client_type: aiAnalysis.client_type,
        sessions_per_week: aiAnalysis.sessions_per_week,
        session_length_minutes: aiAnalysis.session_length_minutes,
        training_style: aiAnalysis.training_style,
        plan_structure: aiAnalysis.plan_structure,
        ai_reasoning: aiAnalysis.ai_reasoning,
        inbody_scan_id: latestScan?.id,
      };

      // Convert LLM workout responses to CreateWorkoutInput format
      const workouts: CreateWorkoutInput[] = aiAnalysis.workouts.map((w) => ({
        recommendation_id: 0, // Will be set after recommendation is created
        week_number: w.week_number,
        session_number: w.session_number,
        workout_name: w.workout_name,
        workout_data: w.workout_data,
        workout_reasoning: w.workout_reasoning,
      }));

      const recommendation =
        await recommendationService.createOrUpdateRecommendationForQuestionnaire(
          recommendationInput,
          req.user.userId,
          workouts
        );

      // Fetch the created workouts to include in response
      const createdWorkouts = await workoutService.getWorkoutsByRecommendationId(
        recommendation.id
      );

      res.status(201).json({
        success: true,
        data: {
          ...recommendation,
          workouts: createdWorkouts,
        },
        message: 'Recommendation generated successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  }
);

// Generate recommendation from client ID (uses latest questionnaire)
router.post(
  '/generate/client/:clientId',
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const clientId = parseInt(req.params.clientId, 10);

      if (Number.isNaN(clientId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid client ID',
        });
        return;
      }

      // Get latest questionnaire for client first (needed for validation)
      const questionnaire =
        await questionnaireService.getQuestionnaireByClientId(clientId);

      if (!questionnaire) {
        res.status(404).json({
          success: false,
          error: 'No questionnaire found for this client',
        });
        return;
      }

      // Parallelize independent database queries
      const [client, latestScan] = await Promise.all([
        clientService.getClientById(clientId),
        inbodyScanService.getLatestInBodyScanByClientIdWithFallback(clientId),
      ]);

      if (!client) {
        res.status(404).json({
          success: false,
          error: 'Client not found',
        });
        return;
      }

      // Generate AI recommendation with workouts
      const aiAnalysis =
        await aiService.generateRecommendationWithAI(questionnaire, latestScan, client);

      // Create or update recommendation record (1:1 with questionnaire)
      const recommendationInput: CreateRecommendationInput = {
        client_id: clientId,
        questionnaire_id: questionnaire.id,
        client_type: aiAnalysis.client_type,
        sessions_per_week: aiAnalysis.sessions_per_week,
        session_length_minutes: aiAnalysis.session_length_minutes,
        training_style: aiAnalysis.training_style,
        plan_structure: aiAnalysis.plan_structure,
        ai_reasoning: aiAnalysis.ai_reasoning,
        inbody_scan_id: latestScan?.id,
      };

      // Convert LLM workout responses to CreateWorkoutInput format
      const workouts: CreateWorkoutInput[] = aiAnalysis.workouts.map((w) => ({
        recommendation_id: 0, // Will be set after recommendation is created
        week_number: w.week_number,
        session_number: w.session_number,
        workout_name: w.workout_name,
        workout_data: w.workout_data,
        workout_reasoning: w.workout_reasoning,
      }));

      const recommendation =
        await recommendationService.createOrUpdateRecommendationForQuestionnaire(
          recommendationInput,
          req.user.userId,
          workouts
        );

      // Fetch the created workouts to include in response
      const createdWorkouts = await workoutService.getWorkoutsByRecommendationId(
        recommendation.id
      );

      res.status(201).json({
        success: true,
        data: {
          ...recommendation,
          workouts: createdWorkouts,
        },
        message: 'Recommendation generated successfully',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  }
);

// Get all recommendations for a client
router.get('/client/:clientId', async (req: Request, res: Response) => {
  try {
    const clientId = parseInt(req.params.clientId, 10);

    if (Number.isNaN(clientId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid client ID',
      });
      return;
    }

    const recommendations =
      await recommendationService.getRecommendationsByClientId(clientId);

    res.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Get recommendation by questionnaire ID (must be before /:id route)
router.get('/questionnaire/:questionnaireId', async (req: Request, res: Response) => {
  try {
    const questionnaireId = parseInt(req.params.questionnaireId, 10);

    if (Number.isNaN(questionnaireId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid questionnaire ID',
      });
      return;
    }

    const recommendation =
      await recommendationService.getRecommendationByQuestionnaireId(
        questionnaireId
      );

    if (!recommendation) {
      res.status(404).json({
        success: false,
        error: 'Recommendation not found for this questionnaire',
      });
      return;
    }

    // Fetch workouts for this recommendation
    const workouts = await workoutService.getWorkoutsByRecommendationId(
      recommendation.id
    );

    res.json({
      success: true,
      data: {
        ...recommendation,
        workouts,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Generate next week workouts (async) - MUST come before /:id route
router.post('/:id/generate-week', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const id = parseInt(req.params.id, 10);
    const { week_number } = req.body;

    if (Number.isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid recommendation ID',
      });
      return;
    }

    if (!week_number || typeof week_number !== 'number') {
      res.status(400).json({
        success: false,
        error: 'week_number is required',
      });
      return;
    }

    // Verify recommendation exists
    const recommendation = await recommendationService.getRecommendationById(id);
    if (!recommendation) {
      res.status(404).json({
        success: false,
        error: 'Recommendation not found',
      });
      return;
    }

    // Validate week number
    if (week_number < 2 || week_number > 6) {
      res.status(400).json({
        success: false,
        error: 'Week number must be between 2 and 6',
      });
      return;
    }

    // Check if previous week is complete
    const previousWeek = week_number - 1;
    const previousWeekStatus = await workoutService.getWeekCompletionStatus(
      id,
      previousWeek
    );
    if (!previousWeekStatus.is_complete) {
      res.status(400).json({
        success: false,
        error: `Week ${previousWeek} must be completed (all workouts completed or skipped) before generating Week ${week_number}`,
        data: {
          previous_week_status: previousWeekStatus,
        },
      });
      return;
    }

    // Check if week is already generated
    const existingWorkouts = await workoutService.getWorkoutsByWeek(id, week_number);
    if (existingWorkouts.length > 0) {
      res.status(400).json({
        success: false,
        error: `Week ${week_number} workouts already exist`,
      });
      return;
    }

    // Check if there's already a pending/processing job for this week
    const existingJob = await weekGenerationJobService.getWeekGenerationJobByRecommendationAndWeek(
      id,
      week_number
    );
    if (
      existingJob &&
      (existingJob.status === 'pending' || existingJob.status === 'processing')
    ) {
      res.json({
        success: true,
        data: { job_id: existingJob.id },
        message: 'Week generation already in progress',
      });
      return;
    }

    // Create new job
    const job = await weekGenerationJobService.createWeekGenerationJob(
      {
        recommendation_id: id,
        week_number,
      },
      req.user.userId
    );

    // Job will be processed by cron job (runs every 2 minutes)
    // No need to process here - just create the job and return
    res.status(202).json({
      success: true,
      data: { job_id: job.id },
      message: 'Week generation started. Job will be processed shortly.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Get week generation job status - MUST come before /:id route
router.get('/:id/generate-week/job/:jobId', async (req: Request, res: Response) => {
  try {
    const jobId = parseInt(req.params.jobId, 10);

    if (Number.isNaN(jobId)) {
      res.status(400).json({
        success: false,
        error: 'Invalid job ID',
      });
      return;
    }

    const job = await weekGenerationJobService.getWeekGenerationJobById(jobId);

    if (!job) {
      res.status(404).json({
        success: false,
        error: 'Job not found',
      });
      return;
    }

    res.json({
      success: true,
      data: job,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Get recommendation by ID (must be last to avoid route conflicts)
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid recommendation ID',
      });
      return;
    }

    const recommendation =
      await recommendationService.getRecommendationById(id);

    if (!recommendation) {
      res.status(404).json({
        success: false,
        error: 'Recommendation not found',
      });
      return;
    }

    // Fetch workouts for this recommendation
    const workouts = await workoutService.getWorkoutsByRecommendationId(id);

    res.json({
      success: true,
      data: {
        ...recommendation,
        workouts,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Update/edit recommendation
router.put('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid recommendation ID',
      });
      return;
    }

    const input: UpdateRecommendationInput = req.body;
    const recommendation = await recommendationService.updateRecommendation(
      id,
      input,
      req.user.userId
    );

    if (!recommendation) {
      res.status(404).json({
        success: false,
        error: 'Recommendation not found',
      });
      return;
    }

    res.json({
      success: true,
      data: recommendation,
      message: 'Recommendation updated successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Delete recommendation
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid recommendation ID',
      });
      return;
    }

    const deleted = await recommendationService.deleteRecommendation(id);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: 'Recommendation not found',
      });
      return;
    }

    res.json({
      success: true,
      message: 'Recommendation deleted successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Get workouts for a recommendation
router.get('/:id/workouts', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid recommendation ID',
      });
      return;
    }

    // Verify recommendation exists
    const recommendation =
      await recommendationService.getRecommendationById(id);

    if (!recommendation) {
      res.status(404).json({
        success: false,
        error: 'Recommendation not found',
      });
      return;
    }

    const workouts = await workoutService.getWorkoutsByRecommendationId(id);

    res.json({
      success: true,
      data: workouts,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Get workouts for a specific week
router.get('/:id/week/:weekNumber/workouts', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const weekNumber = parseInt(req.params.weekNumber, 10);

    if (Number.isNaN(id) || Number.isNaN(weekNumber)) {
      res.status(400).json({
        success: false,
        error: 'Invalid recommendation ID or week number',
      });
      return;
    }

    const workouts = await workoutService.getWorkoutsByWeek(id, weekNumber);

    res.json({
      success: true,
      data: workouts,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

// Get week completion status
router.get('/:id/week/:weekNumber/status', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const weekNumber = parseInt(req.params.weekNumber, 10);

    if (Number.isNaN(id) || Number.isNaN(weekNumber)) {
      res.status(400).json({
        success: false,
        error: 'Invalid recommendation ID or week number',
      });
      return;
    }

    const workouts = await workoutService.getWorkoutsByWeek(id, weekNumber);
    const weekStatus = await workoutService.getWeekCompletionStatus(id, weekNumber);

    res.json({
      success: true,
      data: {
        week_number: weekNumber,
        total_workouts: weekStatus.total,
        completed_workouts: weekStatus.completed,
        skipped_workouts: weekStatus.skipped,
        in_progress_workouts: weekStatus.in_progress,
        scheduled_workouts: weekStatus.scheduled,
        cancelled_workouts: weekStatus.cancelled || 0,
        is_complete: weekStatus.is_complete,
        workouts,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * Background processor for week generation
 * Exported so it can be called from cron jobs
 */
export async function processWeekGenerationJob(jobId: number): Promise<void> {
  try {
    const job = await weekGenerationJobService.getWeekGenerationJobById(jobId);
    if (!job) {
      console.error(`Week generation job ${jobId} not found`);
      return;
    }

    // Get recommendation
    const recommendation = await recommendationService.getRecommendationById(
      job.recommendation_id
    );
    if (!recommendation) {
      await weekGenerationJobService.failWeekGenerationJob(
        jobId,
        'Recommendation not found'
      );
      return;
    }

    // Get questionnaire
    let questionnaire = null;
    if (recommendation.questionnaire_id) {
      questionnaire = await questionnaireService.getQuestionnaireById(
        recommendation.questionnaire_id
      );
    }

    if (!questionnaire) {
      await weekGenerationJobService.failWeekGenerationJob(
        jobId,
        'Questionnaire not found'
      );
      return;
    }

    // Step 1: Collect previous weeks' performance data
    await weekGenerationJobService.updateWeekGenerationJobStatus(
      jobId,
      'processing',
      'Collecting performance data...'
    );

    // Get all previous weeks in parallel (1 to targetWeek - 1)
    const weekNumbers = Array.from(
      { length: job.week_number - 1 },
      (_, i) => i + 1
    );
    const weekWorkoutPromises = weekNumbers.map((week) =>
      workoutService.getWorkoutsByWeek(recommendation.id, week)
    );
    const allWeekWorkouts = await Promise.all(weekWorkoutPromises);

    // Get all actual workouts in a single batch query
    const allWorkoutIds = allWeekWorkouts.flat().map((w) => w.id);
    const allActualWorkouts =
      await actualWorkoutService.getActualWorkoutsByWorkoutIds(allWorkoutIds);

    // Create a map of workout_id -> actual_workout for efficient lookup
    const actualWorkoutMap = new Map<number, ActualWorkout>();
    for (const actualWorkout of allActualWorkouts) {
      actualWorkoutMap.set(actualWorkout.workout_id, actualWorkout);
    }

    // Build previousWeeksData array matching the original structure
    const previousWeeksData: {
      week_number: number;
      workouts: Workout[];
      actual_workouts: ActualWorkout[];
    }[] = [];

    for (let i = 0; i < weekNumbers.length; i++) {
      const week = weekNumbers[i];
      const workouts = allWeekWorkouts[i];
      const validActualWorkouts = workouts
        .map((w) => actualWorkoutMap.get(w.id))
        .filter((aw): aw is ActualWorkout => aw !== null);

      previousWeeksData.push({
        week_number: week,
        workouts,
        actual_workouts: validActualWorkouts,
      });
    }

    // Step 2: Generate workouts for target week
    await weekGenerationJobService.updateWeekGenerationJobStatus(
      jobId,
      'processing',
      'Generating workouts...'
    );

    // Parse structured data from questionnaire
    let structuredData = null;
    if (questionnaire.notes) {
      try {
        const parsed = JSON.parse(questionnaire.notes);
        if (parsed.section1_energy_level !== undefined) {
          structuredData = parsed;
        }
      } catch {
        // Not JSON or not structured format, use null
      }
    }

    // Parallelize client and InBody scan queries
    const [client, latestScan] = await Promise.all([
      clientService.getClientById(recommendation.client_id),
      inbodyScanService.getLatestInBodyScanByClientIdWithFallback(
        recommendation.client_id
      ),
    ]);

    const workouts = await aiService.generateWeekWorkouts(
      recommendation,
      previousWeeksData,
      questionnaire,
      structuredData,
      job.week_number,
      latestScan,
      client
    );

    // Step 3: Save workouts
    await weekGenerationJobService.updateWeekGenerationJobStatus(
      jobId,
      'processing',
      'Saving workouts...'
    );

    const workoutsToCreate: CreateWorkoutInput[] = workouts.map((w) => ({
      recommendation_id: recommendation.id,
      week_number: w.week_number,
      session_number: w.session_number,
      workout_name: w.workout_name,
      workout_data: w.workout_data,
      workout_reasoning: w.workout_reasoning,
    }));

    await workoutService.createWorkouts(workoutsToCreate);

    // Step 4: Update recommendation current_week
    await recommendationService.updateRecommendation(
      recommendation.id,
      { current_week: job.week_number },
      job.created_by || 0
    );

    // Complete job
    await weekGenerationJobService.completeWeekGenerationJob(jobId);
    console.log(`✅ Week ${job.week_number} generation completed for recommendation ${recommendation.id}`);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Week generation job ${jobId} failed:`, errorMessage);
    await weekGenerationJobService.failWeekGenerationJob(jobId, errorMessage);
  }
}


// Get all week generation jobs for a recommendation
router.get('/:id/week-jobs', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (Number.isNaN(id)) {
      res.status(400).json({
        success: false,
        error: 'Invalid recommendation ID',
      });
      return;
    }

    const jobs = await weekGenerationJobService.getWeekGenerationJobsByRecommendationId(id);

    res.json({
      success: true,
      data: jobs,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
