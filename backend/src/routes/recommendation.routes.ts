import { randomUUID } from 'node:crypto';
import { type Request, type Response, Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import * as aiService from '../services/ai.service';
import * as clientService from '../services/client.service';
import * as exerciseLibraryService from '../services/exercise-library.service';
import * as inbodyScanService from '../services/inbody-scan.service';
import { refineLibraryTemplateLoads } from '../services/library-load-refinement-ai.service';
import * as jobService from '../services/job.service';
import { buildWorkoutInputsFromPlanTemplate } from '../services/plan-template-workout-builder.service';
import * as questionnaireService from '../services/questionnaire.service';
import * as recommendationService from '../services/recommendation.service';
import * as trainerService from '../services/trainer.service';
import * as weekGenerationJobService from '../services/week-generation-job.service';
import * as workoutService from '../services/workout.service';
import {
  getPlanTemplateById,
  getPlanTemplateSummaries,
} from '../data/plan-template-library';
import { clientErrorMessage } from '../utils/client-error-message';
import type {
  Client,
  CreateRecommendationInput,
  CreateWorkoutInput,
  InBodyScan,
  LLMRecommendationResponse,
  LLMWorkoutResponse,
  PlanGuidanceStructure,
  Questionnaire,
  UpdateRecommendationInput,
} from '../types';

const router = Router();

/** Fields saved from the manual plan builder (before client / questionnaire ids are applied). */
type ManualPlanFields = Omit<
  CreateRecommendationInput,
  'client_id' | 'questionnaire_id' | 'inbody_scan_id' | 'comparison_batch_id'
>;

function isWeeklyDay(
  x: unknown
): x is PlanGuidanceStructure['weekly_repeating_schedule'][number] {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.day === 'string' &&
    typeof o.session_label === 'string' &&
    typeof o.focus_theme === 'string'
  );
}

function parseManualPlanPayload(
  body: Record<string, unknown>
): ManualPlanFields | null {
  const client_type = body.client_type;
  const sessions_per_week = body.sessions_per_week;
  const session_length_minutes = body.session_length_minutes;
  const training_style = body.training_style;
  const plan_structure = body.plan_structure;
  const ai_reasoning = body.ai_reasoning;

  if (typeof client_type !== 'string' || !client_type.trim()) return null;
  const spw =
    typeof sessions_per_week === 'number'
      ? sessions_per_week
      : parseInt(String(sessions_per_week ?? ''), 10);
  if (Number.isNaN(spw) || spw < 1 || spw > 6) return null;
  const slen =
    typeof session_length_minutes === 'number'
      ? session_length_minutes
      : parseInt(String(session_length_minutes ?? ''), 10);
  if (Number.isNaN(slen) || slen < 15 || slen > 180) return null;
  if (typeof training_style !== 'string' || !training_style.trim()) return null;
  if (!plan_structure || typeof plan_structure !== 'object') return null;
  const ps = plan_structure as Record<string, unknown>;
  const phaseWeeks = ps.phase_1_weeks;
  const pw =
    typeof phaseWeeks === 'number'
      ? phaseWeeks
      : parseInt(String(phaseWeeks ?? ''), 10);
  if (Number.isNaN(pw) || pw < 1 || pw > 12) return null;
  const sched = ps.weekly_repeating_schedule;
  if (!Array.isArray(sched) || sched.length < 1) return null;
  if (!sched.every(isWeeklyDay)) return null;
  if (sched.length !== spw) return null;

  const archetype = ps.archetype;
  const description = ps.description;
  const training_methods = ps.training_methods;
  const progression_guidelines = ps.progression_guidelines;
  const intensity_load_progression = ps.intensity_load_progression;
  if (typeof archetype !== 'string' || !archetype.trim()) return null;
  if (typeof description !== 'string') return null;
  if (
    !Array.isArray(training_methods) ||
    !training_methods.every((t) => typeof t === 'string')
  ) {
    return null;
  }
  if (typeof progression_guidelines !== 'string') return null;
  if (typeof intensity_load_progression !== 'string') return null;

  const fullStructure: PlanGuidanceStructure = {
    archetype: archetype.trim(),
    description: description.trim(),
    phase_1_weeks: pw,
    training_methods: training_methods as string[],
    weekly_repeating_schedule: sched,
    progression_guidelines: progression_guidelines.trim(),
    intensity_load_progression: intensity_load_progression.trim(),
    ...(typeof ps.periodization_approach === 'string'
      ? { periodization_approach: ps.periodization_approach }
      : {}),
  };

  return {
    client_type: client_type.trim(),
    sessions_per_week: spw,
    session_length_minutes: slen,
    training_style: training_style.trim(),
    plan_structure: fullStructure,
    ...(typeof ai_reasoning === 'string' && ai_reasoning.trim()
      ? { ai_reasoning: ai_reasoning.trim() }
      : {}),
  };
}

// All routes require authentication
router.use(authenticateToken);

// Prebuilt plan library — register before any /:id routes so "plan-templates" is never parsed as an ID
router.get('/plan-templates', (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: getPlanTemplateSummaries() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

/** Full template (plan structure, blueprints, progression) for UI detail modal */
router.get('/plan-templates/:templateId', (req: Request, res: Response) => {
  try {
    const templateId = req.params.templateId;
    const template = getPlanTemplateById(templateId);
    if (!template) {
      res.status(404).json({
        success: false,
        error: 'Plan template not found',
      });
      return;
    }
    res.json({ success: true, data: template });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

router.post(
  '/plan-templates/:templateId/apply',
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const templateId = req.params.templateId;
      const template = getPlanTemplateById(templateId);
      if (!template) {
        res.status(404).json({
          success: false,
          error: 'Plan template not found',
        });
        return;
      }

      const rawQid = (req.body as { questionnaire_id?: unknown })
        ?.questionnaire_id;
      const questionnaireId =
        typeof rawQid === 'number' ? rawQid : parseInt(String(rawQid ?? ''), 10);
      if (Number.isNaN(questionnaireId)) {
        res.status(400).json({
          success: false,
          error: 'questionnaire_id is required',
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

      const client = await clientService.getClientById(questionnaire.client_id);
      if (!client || client.created_by !== req.user.userId) {
        res.status(403).json({
          success: false,
          error: 'You do not have access to this client',
        });
        return;
      }

      const hasVerifiedScan =
        await inbodyScanService.hasVerifiedInBodyScan(questionnaire.client_id);
      if (!hasVerifiedScan) {
        res.status(400).json({
          success: false,
          error:
            'Upload and verify at least one InBody scan before applying a plan',
        });
        return;
      }

      const trainersWithPersonas = (
        await trainerService.getTrainersByAdmin(req.user.userId)
      ).filter((t) => t.structured_persona?.ai_prompt_injection?.trim());
      if (trainersWithPersonas.length > 0) {
        try {
          const resolved = await resolveTrainerInjectionForGeneration(
            req.body,
            req.user.userId
          );
          if (resolved.trainerId === undefined) {
            res.status(400).json({
              success: false,
              error:
                'Select a coach with a generated persona before applying a library plan.',
            });
            return;
          }
        } catch {
          res.status(400).json({
            success: false,
            error:
              'Invalid trainer_id, or that trainer does not have a generated persona yet.',
          });
          return;
        }
      } else {
        try {
          await resolveTrainerInjectionForGeneration(req.body, req.user.userId);
        } catch {
          res.status(400).json({
            success: false,
            error:
              'Invalid trainer_id, or that trainer does not have a generated persona yet.',
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
        res.status(202).json({
          success: true,
          data: { job_id: existingJob.id },
          message: 'Job already in progress',
        });
        return;
      }

      let trainerMeta: Record<string, unknown>;
      try {
        const resolved = await resolveTrainerInjectionForGeneration(
          req.body,
          req.user.userId
        );
        trainerMeta = {
          mode: 'library_template',
          template_id: templateId,
          ...(resolved.trainerId !== undefined
            ? { trainer_id: resolved.trainerId }
            : {}),
        };
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
          'Mesocycle plan is being saved. Generate workouts from the Workouts tab when ready.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  }
);

/** Manual mesocycle definition — async job saves plan + optional AI workouts */
router.post('/manual-plan/start', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const body = req.body as Record<string, unknown>;
    const rawQid = body.questionnaire_id;
    const questionnaireId =
      typeof rawQid === 'number' ? rawQid : parseInt(String(rawQid ?? ''), 10);
    if (Number.isNaN(questionnaireId)) {
      res.status(400).json({
        success: false,
        error: 'questionnaire_id is required',
      });
      return;
    }

    const questionnaire =
      await questionnaireService.getQuestionnaireById(questionnaireId);
    if (!questionnaire) {
      res.status(404).json({ success: false, error: 'Questionnaire not found' });
      return;
    }

    const client = await clientService.getClientById(questionnaire.client_id);
    if (!client || client.created_by !== req.user.userId) {
      res.status(403).json({
        success: false,
        error: 'You do not have access to this client',
      });
      return;
    }

    const hasVerifiedScan =
      await inbodyScanService.hasVerifiedInBodyScan(questionnaire.client_id);
    if (!hasVerifiedScan) {
      res.status(400).json({
        success: false,
        error:
          'Upload and verify at least one InBody scan before saving a manual plan',
      });
      return;
    }

    const trainersWithPersonas = (
      await trainerService.getTrainersByAdmin(req.user.userId)
    ).filter((t) => t.structured_persona?.ai_prompt_injection?.trim());
    if (trainersWithPersonas.length > 0) {
      try {
        const resolved = await resolveTrainerInjectionForGeneration(
          body,
          req.user.userId
        );
        if (resolved.trainerId === undefined) {
          res.status(400).json({
            success: false,
            error:
              'Select a coach with a generated persona before saving a manual plan.',
          });
          return;
        }
      } catch {
        res.status(400).json({
          success: false,
          error:
            'Invalid trainer_id, or that trainer does not have a generated persona yet.',
        });
        return;
      }
    } else {
      try {
        await resolveTrainerInjectionForGeneration(body, req.user.userId);
      } catch {
        res.status(400).json({
          success: false,
          error:
            'Invalid trainer_id, or that trainer does not have a generated persona yet.',
        });
        return;
      }
    }

    const parsed = parseManualPlanPayload(body);
    if (!parsed) {
      res.status(400).json({
        success: false,
        error:
          'Invalid manual plan: need client_type, sessions_per_week (1–6), session_length_minutes, training_style, and plan_structure with phase_1_weeks and weekly_repeating_schedule.',
      });
      return;
    }

    const existingJob =
      await jobService.getLatestJobByQuestionnaireId(questionnaireId);
    if (
      existingJob &&
      (existingJob.status === 'pending' || existingJob.status === 'processing')
    ) {
      res.status(202).json({
        success: true,
        data: { job_id: existingJob.id },
        message: 'Job already in progress',
      });
      return;
    }

    let trainerMeta: Record<string, unknown>;
    try {
      const resolved = await resolveTrainerInjectionForGeneration(
        body,
        req.user.userId
      );
      trainerMeta = {
        mode: 'manual_plan',
        manual_plan: parsed,
        ...(resolved.trainerId !== undefined
          ? { trainer_id: resolved.trainerId }
          : {}),
      };
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
        'Manual mesocycle is being saved. Generate workouts from the Workouts tab when ready.',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ success: false, error: message });
  }
});

/** Quick AI: best coach among three roster trainers + structured rationale (no full plans) */
router.post(
  '/questionnaire/:questionnaireId/coach-fit',
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

      const questionnaire =
        await questionnaireService.getQuestionnaireById(questionnaireId);
      if (!questionnaire) {
        res
          .status(404)
          .json({ success: false, error: 'Questionnaire not found' });
        return;
      }

      const client = await clientService.getClientById(questionnaire.client_id);
      if (!client || client.created_by !== req.user.userId) {
        res.status(403).json({
          success: false,
          error: 'You do not have access to this client',
        });
        return;
      }

      const hasVerifiedScan =
        await inbodyScanService.hasVerifiedInBodyScan(questionnaire.client_id);
      if (!hasVerifiedScan) {
        res.status(400).json({
          success: false,
          error:
            'Upload and verify at least one InBody scan before running coach fit analysis',
        });
        return;
      }

      const allTrainers = await trainerService.getTrainersByAdmin(
        req.user.userId
      );
      const withPersona = allTrainers.filter((t) =>
        Boolean(t.structured_persona?.ai_prompt_injection?.trim())
      );
      const three = withPersona.slice(0, 3);
      if (three.length < 3) {
        res.status(400).json({
          success: false,
          error:
            'Coach fit needs at least three trainers with generated personas. Add coaches or generate personas in Trainers.',
        });
        return;
      }

      const structuredData = aiService.parseQuestionnaireData(questionnaire);
      const latestScan =
        await inbodyScanService.getLatestVerifiedInBodyScanByClientId(
          questionnaire.client_id
        );

      const analysis = await aiService.generateCoachFitAnalysis(
        questionnaire,
        structuredData,
        latestScan,
        client,
        three
      );

      const trainerIdsEvaluated = three.map((t) => t.id);
      await questionnaireService.setQuestionnaireCoachFit(
        questionnaireId,
        analysis,
        trainerIdsEvaluated
      );

      try {
        res.json({
          success: true,
          data: {
            analysis,
            trainer_ids_evaluated: trainerIdsEvaluated,
          },
        });
      } catch (serializeErr) {
        console.error('[coach-fit] response serialization failed', serializeErr);
        res.status(500).json({
          success: false,
          error: 'Failed to send coach fit result. Try again.',
        });
      }
    } catch (error) {
      const message = clientErrorMessage(error);
      console.error('[coach-fit]', error);
      res.status(500).json({ success: false, error: message });
    }
  }
);

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

async function processLibraryTemplateJob(
  jobId: number,
  job: jobService.RecommendationJob,
  questionnaire: Questionnaire,
  client: Client,
  latestScan: InBodyScan | null,
  meta: Record<string, unknown>
): Promise<void> {
  if (job.created_by == null) {
    await jobService.failJob(jobId, 'Job missing creator');
    return;
  }
  const templateId = meta.template_id;
  if (typeof templateId !== 'string') {
    await jobService.failJob(jobId, 'Job missing template_id');
    return;
  }
  const template = getPlanTemplateById(templateId);
  if (!template) {
    await jobService.failJob(jobId, 'Plan template not found');
    return;
  }
  const trainerId =
    typeof meta.trainer_id === 'number' && meta.trainer_id > 0
      ? meta.trainer_id
      : null;

  let coachInjection: string | undefined;
  if (trainerId != null) {
    try {
      coachInjection = await trainerService.getCoachPromptInjectionForPlan(
        trainerId,
        job.created_by
      );
    } catch {
      coachInjection = undefined;
    }
  }

  await jobService.updateJobStatus(jobId, 'processing', 'Saving mesocycle plan…');

  let workoutsForCreate: CreateWorkoutInput[] = [];

  if (template.session_blueprints?.length) {
    await jobService.updateJobStatus(
      jobId,
      'processing',
      'Building workouts from template…'
    );
    const libraryExercises = await exerciseLibraryService.getExercises({
      status: 'active',
    });
    let built = buildWorkoutInputsFromPlanTemplate(template, libraryExercises);
    if (built.length > 0 && process.env.OPENAI_API_KEY) {
      await jobService.updateJobStatus(
        jobId,
        'processing',
        'Refining loads for client and coach…'
      );
      built = await refineLibraryTemplateLoads(
        built,
        questionnaire,
        client,
        latestScan,
        coachInjection
      );
    }
    workoutsForCreate = built.map((w) => ({
      ...w,
      recommendation_id: 0,
    }));
  }

  const libraryBuilt =
    Boolean(template.session_blueprints?.length) && workoutsForCreate.length > 0;

  const input: CreateRecommendationInput = {
    client_id: questionnaire.client_id,
    questionnaire_id: questionnaire.id,
    client_type: template.client_type,
    sessions_per_week: template.sessions_per_week,
    session_length_minutes: template.session_length_minutes,
    training_style: template.training_style,
    plan_structure: {
      ...(template.plan_structure as unknown as Record<string, unknown>),
      plan_origin: 'library',
      plan_template_id: templateId,
      plan_template_name: template.name,
      library_built_workouts: libraryBuilt,
    },
    ai_reasoning: template.ai_reasoning,
    inbody_scan_id: latestScan?.id,
    trainer_id: trainerId,
    comparison_batch_id: null,
  };

  const rec =
    await recommendationService.createOrUpdateRecommendationForQuestionnaire(
      input,
      job.created_by,
      workoutsForCreate
    );

  if (template.session_blueprints?.length && workoutsForCreate.length > 0) {
    await jobService.mergeJobMetadata(jobId, {
      template_library_built_workouts: true,
    });
  }

  await jobService.completeJob(jobId, rec.id);
}

async function processManualPlanJob(
  jobId: number,
  job: jobService.RecommendationJob,
  questionnaire: Questionnaire,
  _client: Client,
  latestScan: InBodyScan | null,
  meta: Record<string, unknown>
): Promise<void> {
  if (job.created_by == null) {
    await jobService.failJob(jobId, 'Job missing creator');
    return;
  }
  const manual = meta.manual_plan as ManualPlanFields | undefined;
  if (!manual || typeof manual !== 'object') {
    await jobService.failJob(jobId, 'Invalid manual plan');
    return;
  }
  const trainerId =
    typeof meta.trainer_id === 'number' && meta.trainer_id > 0
      ? meta.trainer_id
      : null;

  const input: CreateRecommendationInput = {
    client_id: questionnaire.client_id,
    questionnaire_id: questionnaire.id,
    client_type: manual.client_type,
    sessions_per_week: manual.sessions_per_week,
    session_length_minutes: manual.session_length_minutes,
    training_style: manual.training_style,
    plan_structure: {
      ...(manual.plan_structure as Record<string, unknown>),
      plan_origin: 'manual',
    },
    ai_reasoning: manual.ai_reasoning,
    inbody_scan_id: latestScan?.id,
    trainer_id: trainerId,
    comparison_batch_id: null,
  };

  await jobService.updateJobStatus(jobId, 'processing', 'Saving mesocycle plan…');
  const rec =
    await recommendationService.createOrUpdateRecommendationForQuestionnaire(
      input,
      job.created_by,
      []
    );
  await jobService.completeJob(jobId, rec.id);
}

async function processWorkoutGenerationJob(
  jobId: number,
  job: jobService.RecommendationJob,
  questionnaire: Questionnaire,
  client: Client,
  latestScan: InBodyScan | null,
  meta: Record<string, unknown>
): Promise<void> {
  if (job.created_by == null) {
    await jobService.failJob(jobId, 'Job missing creator');
    return;
  }
  const recommendationId = meta.recommendation_id;
  if (typeof recommendationId !== 'number' || recommendationId <= 0) {
    await jobService.failJob(jobId, 'Invalid recommendation_id');
    return;
  }
  const recommendation =
    await recommendationService.getRecommendationById(recommendationId);
  if (
    !recommendation ||
    recommendation.questionnaire_id !== questionnaire.id ||
    recommendation.client_id !== questionnaire.client_id
  ) {
    await jobService.failJob(jobId, 'Recommendation not found');
    return;
  }

  let coachInjection: string | undefined;
  if (recommendation.trainer_id != null) {
    try {
      coachInjection = await trainerService.getCoachPromptInjectionForPlan(
        recommendation.trainer_id,
        job.created_by
      );
    } catch (e) {
      await jobService.failJob(
        jobId,
        e instanceof Error ? e.message : 'Trainer persona not available'
      );
      return;
    }
  }

  const structuredData = aiService.parseQuestionnaireData(questionnaire);
  const recStructure: Omit<LLMRecommendationResponse, 'workouts'> = {
    client_type: recommendation.client_type,
    client_type_reasoning: '',
    sessions_per_week: recommendation.sessions_per_week,
    session_length_minutes: recommendation.session_length_minutes,
    training_style: recommendation.training_style,
    plan_structure: recommendation.plan_structure as LLMRecommendationResponse['plan_structure'],
    ai_reasoning: recommendation.ai_reasoning ?? '',
  };

  await jobService.updateJobStatus(
    jobId,
    'processing',
    'Generating mesocycle workouts (preview)…'
  );
  const check = await jobService.getJobById(jobId);
  if (check?.status === 'cancelled') {
    return;
  }

  const llmWorkouts = await aiService.generateMesocycleWorkouts(
    recStructure,
    questionnaire,
    structuredData,
    latestScan,
    client,
    coachInjection
  );

  await jobService.mergeJobMetadata(jobId, {
    preview_workouts: llmWorkouts,
  });
  await jobService.completeJob(jobId, recommendation.id);
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
      `Saving plan ${i + 1} of ${total}…`
    );
    const checkW = await jobService.getJobById(jobId);
    if (checkW?.status === 'cancelled') {
      return;
    }

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
      await jobService.failJob(
        jobId,
        'Multi-plan coach comparison is no longer supported. Use Coach fit analysis on the client page, then generate a single plan.'
      );
      return;
    }

    const metaMode =
      rawMeta && typeof rawMeta === 'object'
        ? (rawMeta as { mode?: string }).mode
        : undefined;

    if (metaMode === 'library_template') {
      await processLibraryTemplateJob(
        jobId,
        job,
        questionnaire,
        client,
        latestScan,
        rawMeta as Record<string, unknown>
      );
      return;
    }

    if (metaMode === 'manual_plan') {
      await processManualPlanJob(
        jobId,
        job,
        questionnaire,
        client,
        latestScan,
        rawMeta as Record<string, unknown>
      );
      return;
    }

    if (metaMode === 'generate_workouts') {
      await processWorkoutGenerationJob(
        jobId,
        job,
        questionnaire,
        client,
        latestScan,
        rawMeta as Record<string, unknown>
      );
      return;
    }

    const trainersWithPersonas = (
      await trainerService.getTrainersByAdmin(job.created_by)
    ).filter((t) => t.structured_persona?.ai_prompt_injection?.trim());
    if (trainersWithPersonas.length > 0) {
      const tid =
        rawMeta &&
        typeof rawMeta === 'object' &&
        typeof (rawMeta as { trainer_id?: number }).trainer_id === 'number'
          ? (rawMeta as { trainer_id: number }).trainer_id
          : undefined;
      if (tid === undefined) {
        await jobService.failJob(
          jobId,
          'Select a coach before generating an AI plan.'
        );
        return;
      }
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
      'Saving recommendation (workouts: use Generate workouts when ready)…'
    );
    const checkJobW = await jobService.getJobById(jobId);
    if (checkJobW?.status === 'cancelled') {
      return;
    }

    const recommendationInput: CreateRecommendationInput = {
      client_id: questionnaire.client_id,
      questionnaire_id: job.questionnaire_id,
      client_type: recommendationStructure.client_type,
      sessions_per_week: recommendationStructure.sessions_per_week,
      session_length_minutes: recommendationStructure.session_length_minutes,
      training_style: recommendationStructure.training_style,
      plan_structure: {
        ...(recommendationStructure.plan_structure as Record<string, unknown>),
        plan_origin: 'ai',
      },
      ai_reasoning: recommendationStructure.ai_reasoning,
      inbody_scan_id: latestScan?.id,
      trainer_id: singleTrainerId ?? null,
      comparison_batch_id: null,
    };

    const recommendation =
      await recommendationService.createOrUpdateRecommendationForQuestionnaire(
        recommendationInput,
        job.created_by,
        []
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

      const hasVerifiedScan =
        await inbodyScanService.hasVerifiedInBodyScan(questionnaire.client_id);
      if (!hasVerifiedScan) {
        res.status(400).json({
          success: false,
          error:
            'Upload and verify at least one InBody scan before generating recommendations',
        });
        return;
      }

      const trainersWithPersonas = (
        await trainerService.getTrainersByAdmin(req.user.userId)
      ).filter((t) => t.structured_persona?.ai_prompt_injection?.trim());
      if (trainersWithPersonas.length > 0) {
        const rawTid = (req.body as { trainer_id?: unknown })?.trainer_id;
        if (rawTid === undefined || rawTid === null || rawTid === '') {
          res.status(400).json({
            success: false,
            error:
              'Select a coach with a generated persona before generating an AI plan.',
          });
          return;
        }
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

/** @deprecated Multi-plan comparison removed — use POST .../questionnaire/:id/coach-fit */
router.post(
  '/generate/:questionnaireId/compare',
  (_req: Request, res: Response) => {
    res.status(410).json({
      success: false,
      error:
        'Multi-plan coach comparison is no longer available. Use Coach fit on the client page, pick a coach, then generate one plan.',
    });
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

/** AI mesocycle workouts (preview in job metadata; save via apply) */
router.post(
  '/:id/workouts/generate/start',
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const recommendationId = parseInt(req.params.id, 10);
      if (Number.isNaN(recommendationId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid recommendation ID',
        });
        return;
      }

      const recommendation =
        await recommendationService.getRecommendationById(recommendationId);
      if (!recommendation?.questionnaire_id) {
        res.status(404).json({
          success: false,
          error: 'Recommendation not found',
        });
        return;
      }

      const client = await clientService.getClientById(
        recommendation.client_id
      );
      if (!client || client.created_by !== req.user.userId) {
        res.status(403).json({
          success: false,
          error: 'You do not have access to this client',
        });
        return;
      }

      const hasVerifiedScan =
        await inbodyScanService.hasVerifiedInBodyScan(
          recommendation.client_id
        );
      if (!hasVerifiedScan) {
        res.status(400).json({
          success: false,
          error:
            'Upload and verify at least one InBody scan before generating workouts',
        });
        return;
      }

      const questionnaire =
        await questionnaireService.getQuestionnaireById(
          recommendation.questionnaire_id
        );
      if (!questionnaire) {
        res.status(404).json({
          success: false,
          error: 'Questionnaire not found',
        });
        return;
      }

      const existingJob =
        await jobService.getLatestJobByQuestionnaireId(questionnaire.id);
      if (
        existingJob &&
        (existingJob.status === 'pending' ||
          existingJob.status === 'processing')
      ) {
        const mode = (existingJob.metadata as { mode?: string } | null)?.mode;
        if (mode === 'generate_workouts') {
          res.status(202).json({
            success: true,
            data: { job_id: existingJob.id },
            message: 'Workout generation already in progress',
          });
          return;
        }
        res.status(409).json({
          success: false,
          error:
            'Wait for the current plan job to finish, then generate workouts.',
        });
        return;
      }

      const job = await jobService.createJob({
        questionnaire_id: questionnaire.id,
        client_id: recommendation.client_id,
        created_by: req.user.userId,
        metadata: {
          mode: 'generate_workouts',
          recommendation_id: recommendationId,
        },
      });

      res.status(202).json({
        success: true,
        data: { job_id: job.id },
        message:
          'Workout generation started. Poll the job; when complete, apply or edit the preview.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ success: false, error: message });
    }
  }
);

router.post(
  '/:id/workouts/generate/apply',
  async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      const recommendationId = parseInt(req.params.id, 10);
      if (Number.isNaN(recommendationId)) {
        res.status(400).json({
          success: false,
          error: 'Invalid recommendation ID',
        });
        return;
      }

      const recommendation =
        await recommendationService.getRecommendationById(recommendationId);
      if (!recommendation) {
        res.status(404).json({
          success: false,
          error: 'Recommendation not found',
        });
        return;
      }

      const client = await clientService.getClientById(
        recommendation.client_id
      );
      if (!client || client.created_by !== req.user.userId) {
        res.status(403).json({
          success: false,
          error: 'You do not have access to this client',
        });
        return;
      }

      const body = req.body as {
        job_id?: unknown;
        workouts?: LLMWorkoutResponse[] | unknown;
      };
      const rawJobId = body.job_id;
      const jobId =
        typeof rawJobId === 'number'
          ? rawJobId
          : parseInt(String(rawJobId ?? ''), 10);
      if (Number.isNaN(jobId)) {
        res.status(400).json({
          success: false,
          error: 'job_id is required (from the completed generate job)',
        });
        return;
      }

      const job = await jobService.getJobById(jobId);
      if (!job || job.created_by !== req.user.userId) {
        res.status(404).json({
          success: false,
          error: 'Job not found',
        });
        return;
      }
      if (job.status !== 'completed') {
        res.status(400).json({
          success: false,
          error: 'Workout generation is not finished yet',
        });
        return;
      }

      const meta = job.metadata as {
        mode?: string;
        preview_workouts?: LLMWorkoutResponse[];
        recommendation_id?: number;
      } | null;
      if (
        !meta ||
        meta.mode !== 'generate_workouts' ||
        meta.recommendation_id !== recommendationId
      ) {
        res.status(400).json({
          success: false,
          error: 'This job does not contain a preview for this recommendation',
        });
        return;
      }

      let workouts: LLMWorkoutResponse[] | undefined;
      if (Array.isArray(body.workouts) && body.workouts.length > 0) {
        workouts = body.workouts as LLMWorkoutResponse[];
      } else if (
        Array.isArray(meta.preview_workouts) &&
        meta.preview_workouts.length > 0
      ) {
        workouts = meta.preview_workouts;
      } else {
        res.status(400).json({
          success: false,
          error: 'No preview workouts on this job',
        });
        return;
      }

      await workoutService.deleteWorkoutsByRecommendationId(recommendationId);
      await workoutService.createWorkouts(
        mapLlmWorkoutsToInputs(workouts, recommendationId)
      );

      const updated =
        await recommendationService.getRecommendationById(recommendationId);
      res.json({
        success: true,
        data: updated,
        message: 'Workouts saved for this mesocycle',
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
