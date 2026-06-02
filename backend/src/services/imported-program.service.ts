import pool from '../config/database';
import type {
  Client,
  CreateRecommendationInput,
  PlanGuidanceWeeklyDay,
  Questionnaire,
  Recommendation,
  Workout,
  WorkoutData,
} from '../types';
import * as questionnaireService from './questionnaire.service';
import * as recommendationService from './recommendation.service';
import * as workoutService from './workout.service';

export interface BootstrapImportedProgramInput {
  phase_weeks: number;
  sessions_per_week: number;
  session_length_minutes: number;
}

export interface BootstrapImportedProgramResult {
  questionnaire: Questionnaire;
  recommendation: Recommendation;
  workouts: Workout[];
}

export interface ProgramDimensions {
  phaseWeeks: number;
  sessionsPerWeek: number;
}

const IMPORTED_PROGRAM_NOTES =
  'Imported program — full intake and InBody skipped. Add exercises in each session.';

function buildWeeklySchedule(sessionsPerWeek: number): PlanGuidanceWeeklyDay[] {
  const dayNames = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];
  const step = Math.max(1, Math.floor(7 / Math.max(sessionsPerWeek, 1)));
  return Array.from({ length: sessionsPerWeek }, (_, i) => ({
    day: dayNames[Math.min(i * step, 6)],
    session_label: `Session ${i + 1}`,
    focus_theme: '',
  }));
}

export function getProgramDimensions(
  recommendation: Recommendation
): ProgramDimensions {
  const ps = recommendation.plan_structure as Record<string, unknown> | null;
  const fromPlan =
    typeof ps?.phase_1_weeks === 'number' ? ps.phase_1_weeks : null;
  const phaseWeeks = Math.min(12, Math.max(1, Math.floor(fromPlan ?? 4)));
  const sessionsPerWeek = Math.min(
    6,
    Math.max(1, Math.floor(recommendation.sessions_per_week ?? 3))
  );
  return { phaseWeeks, sessionsPerWeek };
}

function cloneWorkoutData(data: WorkoutData): WorkoutData {
  return JSON.parse(JSON.stringify(data)) as WorkoutData;
}

export async function resolveRecommendationForClient(
  clientId: number,
  recommendationId?: number
): Promise<Recommendation> {
  if (recommendationId != null) {
    const rec =
      await recommendationService.getRecommendationById(recommendationId);
    if (!rec || rec.client_id !== clientId) {
      throw new Error('Recommendation not found for this client');
    }
    return rec;
  }

  const recs =
    await recommendationService.getRecommendationsByClientId(clientId);
  const rec = recs[0];
  if (!rec) {
    throw new Error(
      'No program found for this client. Create sessions in setup first.'
    );
  }
  return rec;
}

export function parseCloneWeekRequest(body: Record<string, unknown>): {
  sourceWeek: number;
  targetWeeks: number[];
} {
  const sourceWeek =
    typeof body.source_week === 'number'
      ? body.source_week
      : parseInt(String(body.source_week ?? ''), 10);

  let targetWeeks: number[] = [];
  if (Array.isArray(body.target_weeks)) {
    targetWeeks = body.target_weeks
      .map((w) => (typeof w === 'number' ? w : parseInt(String(w), 10)))
      .filter((w) => !Number.isNaN(w));
  } else if (
    body.target_week_from !== undefined &&
    body.target_week_to !== undefined
  ) {
    const from =
      typeof body.target_week_from === 'number'
        ? body.target_week_from
        : parseInt(String(body.target_week_from), 10);
    const to =
      typeof body.target_week_to === 'number'
        ? body.target_week_to
        : parseInt(String(body.target_week_to), 10);
    if (!Number.isNaN(from) && !Number.isNaN(to)) {
      const lo = Math.min(from, to);
      const hi = Math.max(from, to);
      for (let w = lo; w <= hi; w++) targetWeeks.push(w);
    }
  }

  if (Number.isNaN(sourceWeek)) {
    throw new Error('source_week is required');
  }

  return { sourceWeek, targetWeeks };
}

/** Create any missing week × session slots for an imported recommendation */
export async function ensureAllSessionsForRecommendation(
  recommendation: Recommendation,
  phaseWeeks?: number,
  sessionsPerWeek?: number,
  weeklySchedule?: PlanGuidanceWeeklyDay[]
): Promise<Workout[]> {
  const dims = getProgramDimensions(recommendation);
  const weeks = Math.min(
    12,
    Math.max(1, Math.floor(phaseWeeks ?? dims.phaseWeeks))
  );
  const spw = Math.min(
    6,
    Math.max(1, Math.floor(sessionsPerWeek ?? dims.sessionsPerWeek))
  );
  const schedule = weeklySchedule ?? buildWeeklySchedule(spw);

  const existing = await workoutService.getWorkoutsByRecommendationId(
    recommendation.id
  );
  const existingKeys = new Set(
    existing.map((w) => `${w.week_number}:${w.session_number}`)
  );

  const toCreate = [];
  for (let week = 1; week <= weeks; week++) {
    for (let session = 1; session <= spw; session++) {
      const key = `${week}:${session}`;
      if (existingKeys.has(key)) continue;
      const label = schedule[session - 1]?.session_label;
      toCreate.push({
        recommendation_id: recommendation.id,
        week_number: week,
        session_number: session,
        workout_name: `Week ${week} · ${label ?? `Session ${session}`}`,
        workout_data: { exercises: [] },
        workout_reasoning: undefined,
      });
    }
  }

  if (toCreate.length > 0) {
    const created = await workoutService.createWorkouts(toCreate);
    for (const w of created) {
      await workoutService.updateWorkout(w.id, { status: 'scheduled' });
    }
  }

  return workoutService.getWorkoutsByRecommendationId(recommendation.id);
}

/** Copy exercises and names from one week to other weeks (same session numbers) */
export async function cloneWeekWorkouts(
  recommendationId: number,
  sourceWeek: number,
  targetWeeks: number[]
): Promise<{ updated: number; workouts: Workout[] }> {
  const sourceWeekNum = Math.max(1, Math.floor(sourceWeek));
  const targets = [
    ...new Set(
      targetWeeks
        .map((w) => Math.floor(w))
        .filter((w) => w >= 1 && w !== sourceWeekNum)
    ),
  ];

  if (targets.length === 0) {
    throw new Error('Select at least one target week different from the source');
  }

  const sourceSessions = await workoutService.getWorkoutsByWeek(
    recommendationId,
    sourceWeekNum
  );
  if (sourceSessions.length === 0) {
    throw new Error(`Week ${sourceWeekNum} has no sessions to copy`);
  }

  const hasContent = sourceSessions.some(
    (w) =>
      Array.isArray(w.workout_data?.exercises) &&
      w.workout_data.exercises.length > 0
  );
  if (!hasContent) {
    throw new Error(
      `Add exercises to week ${sourceWeekNum} before copying to other weeks`
    );
  }

  let updated = 0;
  for (const targetWeek of targets) {
    for (const src of sourceSessions) {
      const target = await workoutService.getWorkoutByWeekAndSession(
        recommendationId,
        targetWeek,
        src.session_number
      );
      if (!target) continue;

      await workoutService.updateWorkout(target.id, {
        workout_name: src.workout_name,
        workout_data: cloneWorkoutData(src.workout_data),
      });
      updated += 1;
    }
  }

  const workouts =
    await workoutService.getWorkoutsByRecommendationId(recommendationId);
  return { updated, workouts };
}

export async function bootstrapImportedProgram(
  clientId: number,
  input: BootstrapImportedProgramInput,
  createdBy: number
): Promise<BootstrapImportedProgramResult> {
  const phaseWeeks = Math.min(12, Math.max(1, Math.floor(input.phase_weeks)));
  const sessionsPerWeek = Math.min(
    6,
    Math.max(1, Math.floor(input.sessions_per_week))
  );
  const sessionLength = Math.min(
    180,
    Math.max(15, Math.floor(input.session_length_minutes))
  );
  const weeklySchedule = buildWeeklySchedule(sessionsPerWeek);

  const clientResult = await pool.query<Client>(
    'SELECT * FROM clients WHERE id = $1',
    [clientId]
  );
  const client = clientResult.rows[0];
  if (!client) {
    throw new Error('Client not found');
  }

  let questionnaire =
    await questionnaireService.getQuestionnaireByClientId(clientId);
  if (!questionnaire) {
    questionnaire = await questionnaireService.createQuestionnaire(
      {
        client_id: clientId,
        primary_goal: 'Imported program',
        experience_level: 'Not collected',
        available_days_per_week: sessionsPerWeek,
        preferred_session_length: sessionLength,
        notes: IMPORTED_PROGRAM_NOTES,
      },
      createdBy
    );
  }

  let recommendation =
    await recommendationService.getRecommendationByQuestionnaireId(
      questionnaire.id
    );

  if (!recommendation) {
    const planStructure = {
      phase_1_weeks: phaseWeeks,
      weekly_repeating_schedule: weeklySchedule,
      plan_origin: 'imported_program',
      imported_program: true,
    };

    const recInput: CreateRecommendationInput = {
      client_id: clientId,
      questionnaire_id: questionnaire.id,
      client_type: 'Imported program',
      sessions_per_week: sessionsPerWeek,
      session_length_minutes: sessionLength,
      training_style: 'Coach-authored',
      plan_structure: planStructure,
      ai_reasoning:
        'Program scaffold for a client ported from another system. Sessions are empty until the coach adds exercises.',
      inbody_scan_id: undefined,
      trainer_id: undefined,
      comparison_batch_id: undefined,
    };

    recommendation = await recommendationService.createRecommendation(
      recInput,
      createdBy
    );
  }

  const workouts = await ensureAllSessionsForRecommendation(
    recommendation,
    phaseWeeks,
    sessionsPerWeek,
    weeklySchedule
  );

  await recommendationService.activateClientAndRecommendation(
    clientId,
    recommendation.id
  );

  const activatedRec =
    (await recommendationService.getRecommendationById(recommendation.id)) ??
    recommendation;

  await pool.query(
    `UPDATE clients SET onboarding_track = 'imported_program' WHERE id = $1`,
    [clientId]
  );

  const refreshedWorkouts =
    await workoutService.getWorkoutsByRecommendationId(recommendation.id);

  return {
    questionnaire,
    recommendation: activatedRec,
    workouts: refreshedWorkouts,
  };
}
