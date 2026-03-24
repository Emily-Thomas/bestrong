import { randomUUID } from 'node:crypto';
import { type Request, type Response, Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import * as aiService from '../services/ai.service';
import * as clientService from '../services/client.service';
import * as inbodyScanService from '../services/inbody-scan.service';
import * as jobService from '../services/job.service';
import * as questionnaireService from '../services/questionnaire.service';
import * as recommendationService from '../services/recommendation.service';
import * as trainerService from '../services/trainer.service';
import * as weekGenerationJobService from '../services/week-generation-job.service';
import * as workoutService from '../services/workout.service';
import type {
  Client,
  CreateRecommendationInput,
  CreateWorkoutInput,
  InBodyScan,
  LLMWorkoutResponse,
  Questionnaire,
  UpdateRecommendationInput,
} from '../types';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

function mapLlmWorkoutsToInputs(
  workouts: LLMWorkoutResponse[],
  recommendationId: number
): CreateWorkoutInput[] {
  return workouts.map((w) => ({
    recommendation_id: recommendationId,
    week_number: w.week_number,
    session_number: w.session_number,
    workout_name: w.workout_name,
    workout_data: w.workout_data,
    workout_reasoning: w.workout_reasoning,
  }));
}

/** Optional `trainer_id` in JSON body; validates access and persona. */
async function resolveTrainerInjectionForGeneration(
  body: unknown,
  adminId: number
): Promise<{ trainerId?: number; injection?: string }> {
  if (!body || typeof body !== 'object') {
    return {};
  }
  const raw = (body as { trainer_id?: unknown }).trainer_id;
  if (raw === undefined || raw === null || raw === '') {
    return {};
  }
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  if (Number.isNaN(n) || n <= 0) {
    throw new Error('Invalid trainer_id');
  }
  const injection = await trainerService.getCoachPromptInjectionForPlan(
    n,
    adminId
  );
  return { trainerId: n, injection };
}

interface TrainerComparisonJobMeta {
  mode: 'trainer_comparison';
  trainer_ids: number[];
  comparison_batch_id: string;
}

async function processTrainerComparisonJob(
  jobId: number,
  job: jobService.RecommendationJob,
  questionnaire: Questionnaire,
  client: Client,
  latestScan: InBodyScan | null,
  meta: TrainerComparisonJobMeta
): Promise<void> {
  if (job.created_by == null) {
    await jobService.failJob(jobId, 'Job missing creator');
    return;
  }
  const createdBy = job.created_by;
  const batchId = meta.comparison_batch_id || randomUUID();
  const recommendationIds: number[] = [];
  const structuredData = aiService.parseQuestionnaireData(questionnaire);
  const total = meta.trainer_ids.length;

  for (let i = 0; i < total; i++) {
    const trainerId = meta.trainer_ids[i];
    await jobService.updateJobStatus(
      jobId,
      'processing',
      `Generating coach ${i + 1} of ${total}…`
    );
    const check = await jobService.getJobById(jobId);
    if (check?.status === 'cancelled') {
      return;
    }

    const injection = await trainerService.getCoachPromptInjectionForPlan(
      trainerId,
      createdBy
    );

    const structure = await aiService.generateRecommendationStructure(
      questionnaire,
      structuredData,
      latestScan,
      client,
      injection,
      { skipCoachRecommendation: true }
    );

    await jobService.updateJobStatus(
      jobId,
      'processing',
      `Generating workouts for coach ${i + 1} of ${total}…`
    );
    const checkW = await jobService.getJobById(jobId);
    if (checkW?.status === 'cancelled') {
      return;
    }

    const llmWorkouts = await aiService.generateWorkouts(
      structure,
      questionnaire,
      structuredData,
      latestScan,
      client,
      injection
    );

    await jobService.updateJobStatus(
      jobId,
      'processing',
      `Saving plan ${i + 1} of ${total}…`
    );

    const recommendationInput: CreateRecommendationInput = {
      client_id: questionnaire.client_id,
      questionnaire_id: job.questionnaire_id,
      client_type: structure.client_type,
      sessions_per_week: structure.sessions_per_week,
      session_length_minutes: structure.session_length_minutes,
      training_style: structure.training_style,
      plan_structure: structure.plan_structure,
      ai_reasoning: structure.ai_reasoning,
      inbody_scan_id: latestScan?.id,
      trainer_id: trainerId,
      comparison_batch_id: batchId,
    };

    const rec = await recommendationService.createRecommendation(
      recommendationInput,
      createdBy
    );
    await workoutService.createWorkouts(
      mapLlmWorkoutsToInputs(llmWorkouts, rec.id)
    );
    recommendationIds.push(rec.id);
  }

  await jobService.mergeJobMetadata(jobId, {
    comparison_batch_id: batchId,
    recommendation_ids: recommendationIds,
  });
  await jobService.completeJob(
    jobId,
    recommendationIds[recommendationIds.length - 1]
  );
}

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

    if (job.created_by == null) {
      await jobService.failJob(jobId, 'Job missing creator');
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
      const processingTime = job.updated_at
        ? Date.now() - new Date(job.updated_at).getTime()
        : 0;
      const fiveMinutes = 5 * 60 * 1000;

      if (processingTime < fiveMinutes) {
        console.warn(
          `Job ${jobId} is already being processed (${Math.round(processingTime / 1000)}s ago), skipping duplicate`
        );
        return;
      } else {
        console.warn(
          `Job ${jobId} appears stuck (processing for ${Math.round(processingTime / 1000)}s), retrying...`
        );
        // Continue processing - will update status below
      }
    }

    // Get questionnaire first (needed for client_id)
    const questionnaire = await questionnaireService.getQuestionnaireById(
      job.questionnaire_id
    );

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

    const rawMeta = job.metadata;
    const comparisonMeta =
      rawMeta &&
      typeof rawMeta === 'object' &&
      (rawMeta as { mode?: string }).mode === 'trainer_comparison' &&
      Array.isArray((rawMeta as { trainer_ids?: unknown }).trainer_ids)
        ? (rawMeta as unknown as TrainerComparisonJobMeta)
        : null;

    if (comparisonMeta && comparisonMeta.trainer_ids.length >= 2) {
      try {
        await processTrainerComparisonJob(
          jobId,
          job,
          questionnaire,
          client,
          latestScan,
          comparisonMeta
        );
        console.log(`✅ Trainer comparison job ${jobId} completed`);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        await jobService.failJob(jobId, message);
      }
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

    const structuredData = aiService.parseQuestionnaireData(questionnaire);

    const allTrainers = await trainerService.getTrainersByAdmin(job.created_by);
    const coachOptions =
      trainerService.trainersToCoachMatchOptions(allTrainers);

    let coachInjection: string | undefined;
    let singleTrainerId: number | undefined;
    if (
      rawMeta &&
      typeof rawMeta === 'object' &&
      typeof (rawMeta as { trainer_id?: number }).trainer_id === 'number'
    ) {
      singleTrainerId = (rawMeta as { trainer_id: number }).trainer_id;
      try {
        coachInjection = await trainerService.getCoachPromptInjectionForPlan(
          singleTrainerId,
          job.created_by
        );
      } catch (e) {
        const message =
          e instanceof Error ? e.message : 'Trainer persona not available';
        await jobService.failJob(jobId, message);
        return;
      }
    }

    const recommendationStructure =
      await aiService.generateRecommendationStructure(
        questionnaire,
        structuredData,
        latestScan,
        client,
        coachInjection ?? null,
        { coachMatchOptions: coachOptions }
      );

    await jobService.updateJobStatus(
      jobId,
      'processing',
      'Generating workouts...'
    );
    const checkJobW = await jobService.getJobById(jobId);
    if (checkJobW?.status === 'cancelled') {
      return;
    }

    const llmWorkouts = await aiService.generateWorkouts(
      recommendationStructure,
      questionnaire,
      structuredData,
      latestScan,
      client,
      coachInjection
    );

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
      trainer_id: singleTrainerId ?? null,
      comparison_batch_id: null,
    };

    const workoutInputs: CreateWorkoutInput[] = llmWorkouts.map((w) => ({
      recommendation_id: 0,
      week_number: w.week_number,
      session_number: w.session_number,
      workout_name: w.workout_name,
      workout_data: w.workout_data,
      workout_reasoning: w.workout_reasoning,
    }));

    const recommendation =
      await recommendationService.createOrUpdateRecommendationForQuestionnaire(
        recommendationInput,
        job.created_by,
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
      const hasScan = await inbodyScanService.hasInBodyScan(
        questionnaire.client_id
      );
      if (!hasScan) {
        res.status(400).json({
          success: false,
          error:
            'At least one InBody scan is required before generating recommendations',
        });
        return;
      }

      // Check if there's already a pending/processing job for this questionnaire
      const existingJob =
        await jobService.getLatestJobByQuestionnaireId(questionnaireId);
      if (
        existingJob &&
        (existingJob.status === 'pending' ||
          existingJob.status === 'processing')
      ) {
        res.json({
          success: true,
          data: { job_id: existingJob.id },
          message: 'Job already in progress',
        });
        return;
      }

      let trainerMeta: Record<string, unknown> = { mode: 'single_plan' };
      try {
        const resolved = await resolveTrainerInjectionForGeneration(
          req.body,
          req.user.userId
        );
        if (resolved.trainerId !== undefined) {
          trainerMeta = { mode: 'single_plan', trainer_id: resolved.trainerId };
        }
      } catch {
        res.status(400).json({
          success: false,
          error:
            'Invalid trainer_id, or that trainer does not have a generated persona yet.',
        });
        return;
      }

      const job = await jobService.createJob({
        questionnaire_id: questionnaireId,
        client_id: questionnaire.client_id,
        created_by: req.user.userId,
        metadata: trainerMeta,
      });

      res.status(202).json({
        success: true,
        data: { job_id: job.id },
        message:
          'Recommendation generation started. Job will be processed shortly.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  }
);

router.post(
  '/generate/:questionnaireId/compare',
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const questionnaireId = parseInt(req.params.questionnaireId, 10);
      if (Number.isNaN(questionnaireId)) {
        res
          .status(400)
          .json({ success: false, error: 'Invalid questionnaire ID' });
        return;
      }

      const rawIds = (req.body as { trainer_ids?: unknown })?.trainer_ids;
      if (!Array.isArray(rawIds) || rawIds.length < 2) {
        res.status(400).json({
          success: false,
          error:
            'Select at least two trainers with generated personas to compare.',
        });
        return;
      }

      const trainerIds = rawIds
        .map((x) => (typeof x === 'number' ? x : parseInt(String(x), 10)))
        .filter((n) => !Number.isNaN(n) && n > 0);

      const unique = [...new Set(trainerIds)];
      if (unique.length < 2) {
        res.status(400).json({
          success: false,
          error: 'Select at least two valid trainer IDs.',
        });
        return;
      }

      const questionnaire =
        await questionnaireService.getQuestionnaireById(questionnaireId);
      if (!questionnaire) {
        res
          .status(404)
          .json({ success: false, error: 'Questionnaire not found' });
        return;
      }

      const hasScan = await inbodyScanService.hasInBodyScan(
        questionnaire.client_id
      );
      if (!hasScan) {
        res.status(400).json({
          success: false,
          error:
            'At least one InBody scan is required before generating recommendations',
        });
        return;
      }

      for (const tid of unique) {
        try {
          await trainerService.getCoachPromptInjectionForPlan(
            tid,
            req.user.userId
          );
        } catch {
          res.status(400).json({
            success: false,
            error: `Trainer ${tid} needs a generated persona before comparison. Open Trainers and generate one.`,
          });
          return;
        }
      }

      const existingJob =
        await jobService.getLatestJobByQuestionnaireId(questionnaireId);
      if (
        existingJob &&
        (existingJob.status === 'pending' ||
          existingJob.status === 'processing')
      ) {
        res.json({
          success: true,
          data: { job_id: existingJob.id },
          message: 'Job already in progress',
        });
        return;
      }

      const batchId = randomUUID();
      const job = await jobService.createJob({
        questionnaire_id: questionnaireId,
        client_id: questionnaire.client_id,
        created_by: req.user.userId,
        metadata: {
          mode: 'trainer_comparison',
          trainer_ids: unique,
          comparison_batch_id: batchId,
        },
      });

      res.status(202).json({
        success: true,
        data: { job_id: job.id, comparison_batch_id: batchId },
        message:
          'Coach comparison started. Plans will be ready shortly. You can leave this page and return.',
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
      const existingJob = await jobService.getLatestJobByQuestionnaireId(
        questionnaire.id
      );
      if (
        existingJob &&
        (existingJob.status === 'pending' ||
          existingJob.status === 'processing')
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
        message:
          'Recommendation generation started. Job will be processed shortly.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  }
);

// Get latest job for a questionnaire (MUST come before /generate/job/:jobId to avoid route conflicts)
router.get(
  '/generate/questionnaire/:questionnaireId/job',
  async (req: Request, res: Response) => {
    try {
      const questionnaireId = parseInt(req.params.questionnaireId, 10);

      if (Number.isNaN(questionnaireId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid questionnaire ID',
        });
        return;
      }

      const job =
        await jobService.getLatestJobByQuestionnaireId(questionnaireId);

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
  }
);

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
router.post(
  '/generate/job/:jobId/cancel',
  async (req: Request, res: Response) => {
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
  }
);

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

      const coachOptions = trainerService.trainersToCoachMatchOptions(
        await trainerService.getTrainersByAdmin(req.user.userId)
      );
      const aiAnalysis = await aiService.generateRecommendationWithAI(
        questionnaire,
        latestScan,
        client,
        { coachMatchOptions: coachOptions }
      );

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

      const recommendation =
        await recommendationService.createOrUpdateRecommendationForQuestionnaire(
          recommendationInput,
          req.user.userId,
          []
        );

      // Fetch the created workouts to include in response
      const createdWorkouts =
        await workoutService.getWorkoutsByRecommendationId(recommendation.id);

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

      const coachOptions = trainerService.trainersToCoachMatchOptions(
        await trainerService.getTrainersByAdmin(req.user.userId)
      );
      const aiAnalysis = await aiService.generateRecommendationWithAI(
        questionnaire,
        latestScan,
        client,
        { coachMatchOptions: coachOptions }
      );

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

      const recommendation =
        await recommendationService.createOrUpdateRecommendationForQuestionnaire(
          recommendationInput,
          req.user.userId,
          []
        );

      // Fetch the created workouts to include in response
      const createdWorkouts =
        await workoutService.getWorkoutsByRecommendationId(recommendation.id);

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
router.get(
  '/questionnaire/:questionnaireId',
  async (req: Request, res: Response) => {
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
  }
);

// Generate next week workouts (async) - MUST come before /:id route
router.post('/:id/generate-week', async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }
  res.status(400).json({
    success: false,
    error:
      'AI week generation is not available. Add workouts manually from the training plan.',
  });
});

// Get week generation job status - MUST come before /:id route
router.get(
  '/:id/generate-week/job/:jobId',
  async (req: Request, res: Response) => {
    try {
      const jobId = parseInt(req.params.jobId, 10);

      if (Number.isNaN(jobId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid job ID',
        });
        return;
      }

      const job =
        await weekGenerationJobService.getWeekGenerationJobById(jobId);

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
  }
);

// Multi-coach comparison batch (static path before /:id)
router.get(
  '/comparison-batch/:batchId',
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }
      const batchId = req.params.batchId;
      const plans = await recommendationService.listComparisonBatch(
        batchId,
        req.user.userId
      );
      res.json({ success: true, data: { plans } });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  }
);

router.post(
  '/comparison-batch/:batchId/select',
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }
      const batchId = req.params.batchId;
      const raw = (req.body as { recommendation_id?: number | string })
        ?.recommendation_id;
      const recommendationId =
        typeof raw === 'number' ? raw : parseInt(String(raw ?? ''), 10);
      if (Number.isNaN(recommendationId)) {
        res.status(400).json({
          success: false,
          error: 'recommendation_id is required',
        });
        return;
      }
      const rec = await recommendationService.selectComparisonPlan(
        batchId,
        recommendationId,
        req.user.userId
      );
      if (!rec) {
        res
          .status(404)
          .json({ success: false, error: 'Plan not found in batch' });
        return;
      }
      res.json({ success: true, data: rec });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  }
);

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
router.get(
  '/:id/week/:weekNumber/workouts',
  async (req: Request, res: Response) => {
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
  }
);

// Get week completion status
router.get(
  '/:id/week/:weekNumber/status',
  async (req: Request, res: Response) => {
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
      const weekStatus = await workoutService.getWeekCompletionStatus(
        id,
        weekNumber
      );

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
  }
);

/**
 * Background processor for week generation (disabled — fails fast).
 * Exported so it can be called from cron jobs.
 */
export async function processWeekGenerationJob(jobId: number): Promise<void> {
  await weekGenerationJobService.failWeekGenerationJob(
    jobId,
    'AI week generation is disabled. Build workouts from your training plan instead.'
  );
}

// Manually trigger processing of a week generation job (for debugging/stuck jobs)
router.post(
  '/:id/generate-week/job/:jobId/process',
  async (req: Request, res: Response) => {
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

      const job =
        await weekGenerationJobService.getWeekGenerationJobById(jobId);

      if (!job) {
        res.status(404).json({
          success: false,
          error: 'Job not found',
        });
        return;
      }

      // Process the job (don't await - let it run in background)
      processWeekGenerationJob(jobId).catch((error) => {
        console.error(
          `Error manually processing week generation job ${jobId}:`,
          error
        );
      });

      res.json({
        success: true,
        message: 'Week generation job processing started',
        data: { job_id: jobId },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  }
);

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

    const jobs =
      await weekGenerationJobService.getWeekGenerationJobsByRecommendationId(
        id
      );

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
