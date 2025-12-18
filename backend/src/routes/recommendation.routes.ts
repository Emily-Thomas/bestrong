import { type Request, type Response, Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import * as aiService from '../services/ai.service';
import * as questionnaireService from '../services/questionnaire.service';
import * as recommendationService from '../services/recommendation.service';
import * as workoutService from '../services/workout.service';
import * as jobService from '../services/job.service';
import type {
  CreateRecommendationInput,
  UpdateRecommendationInput,
  CreateWorkoutInput,
} from '../types';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

/**
 * Background processor for recommendation generation
 * This runs asynchronously and updates the job status
 */
async function processRecommendationJob(jobId: number): Promise<void> {
  try {
    const job = await jobService.getJobById(jobId);
    if (!job) {
      console.error(`Job ${jobId} not found`);
      return;
    }

    // Get questionnaire
    const questionnaire =
      await questionnaireService.getQuestionnaireById(job.questionnaire_id);

    if (!questionnaire) {
      await jobService.failJob(jobId, 'Questionnaire not found');
      return;
    }

    // Step 1: Generate recommendation structure
    await jobService.updateJobStatus(
      jobId,
      'processing',
      'Generating plan structure...'
    );
    const recommendationStructure =
      await aiService.generateRecommendationStructure(questionnaire, null);

    // Step 2: Generate workouts
    await jobService.updateJobStatus(
      jobId,
      'processing',
      'Generating workouts...'
    );
    const workouts = await aiService.generateWorkouts(
      recommendationStructure,
      questionnaire,
      null
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

      // Start processing in background (don't await)
      processRecommendationJob(job.id).catch((error) => {
        console.error(`Error processing job ${job.id}:`, error);
      });

      res.status(202).json({
        success: true,
        data: { job_id: job.id },
        message: 'Recommendation generation started',
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

      // Start processing in background (don't await)
      processRecommendationJob(job.id).catch((error) => {
        console.error(`Error processing job ${job.id}:`, error);
      });

      res.status(202).json({
        success: true,
        data: { job_id: job.id },
        message: 'Recommendation generation started',
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

      // Get questionnaire
      const questionnaire =
        await questionnaireService.getQuestionnaireById(questionnaireId);

      if (!questionnaire) {
        res.status(404).json({
          success: false,
          error: 'Questionnaire not found',
        });
        return;
      }

      // Generate AI recommendation with workouts
      const aiAnalysis =
        await aiService.generateRecommendationWithAI(questionnaire);

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

      // Generate AI recommendation with workouts
      const aiAnalysis =
        await aiService.generateRecommendationWithAI(questionnaire);

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

export default router;
