import type {
  Client,
  CreateWorkoutInput,
  InBodyScan,
  Questionnaire,
} from '../types';
import {
  formatClientInfoForPrompt,
  formatInBodyScanForPrompt,
} from './ai-prompt-formatters.service';
import { callOpenAIWithRetry } from './openai-client.service';
import { parseJSONWithRepair } from './llm-json-parse.service';
import {
  formatQuestionnaireForPrompt,
  parseQuestionnaireData,
} from './questionnairePrompt.service';

interface LoadAdjustment {
  week_number: number;
  session_number: number;
  exercise_index: number;
  weight?: string;
  rir?: number;
  notes?: string;
}

/**
 * Adjusts template default load / RPE / RIR lines using client, InBody, and coach persona.
 * Does not change exercise selection, sets, reps, or mesocycle structure.
 */
export async function refineLibraryTemplateLoads(
  workouts: Omit<CreateWorkoutInput, 'recommendation_id'>[],
  questionnaire: Questionnaire,
  client: Client,
  latestScan: InBodyScan | null,
  coachInjection?: string
): Promise<Omit<CreateWorkoutInput, 'recommendation_id'>[]> {
  if (!process.env.OPENAI_API_KEY || workouts.length === 0) {
    return workouts;
  }

  const structuredData = parseQuestionnaireData(questionnaire);
  const qText = `${formatQuestionnaireForPrompt(questionnaire, structuredData)}\n${formatClientInfoForPrompt(client)}\n${formatInBodyScanForPrompt(latestScan)}`;

  const compact = workouts.map((w) => ({
    week_number: w.week_number,
    session_number: w.session_number,
    workout_name: w.workout_name,
    exercises: (w.workout_data.exercises ?? []).map((ex, exercise_index) => ({
      exercise_index,
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      weight: ex.weight,
      rir: ex.rir,
      notes: ex.notes,
    })),
  }));

  const system = `You are a strength coach assistant. The mesocycle was built from a library template with default loads and RPE. Your ONLY job is to adjust per-exercise weight (load prescription), RIR, and brief coaching notes for this client and coach style.

Rules:
- Do NOT rename exercises, change sets, reps, week/session structure, or add/remove exercises.
- Return strict JSON: {"adjustments": [{"week_number": number, "session_number": number, "exercise_index": number, "weight"?: string, "rir"?: number, "notes"?: string}]}
- Include ONLY exercises you change; omit unchanged rows.
- Prefer realistic RPE/RIR language (e.g. "RPE 6–7", "2–3 RIR") over invented poundages unless the template already used pounds.`;

  const user = `${coachInjection?.trim() ? `## Coach style\n${coachInjection.trim()}\n\n` : ''}${qText}\n\n## Workouts (from template)\n${JSON.stringify(compact)}`;

  let content: string;
  try {
    content = await callOpenAIWithRetry(
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      { maxTokens: 4000, temperature: 0.35 }
    );
  } catch {
    return workouts;
  }

  let parsed: { adjustments?: LoadAdjustment[] };
  try {
    parsed = parseJSONWithRepair<{ adjustments?: LoadAdjustment[] }>(content);
  } catch {
    return workouts;
  }

  const adjustments = parsed.adjustments;
  if (!Array.isArray(adjustments) || adjustments.length === 0) {
    return workouts;
  }

  const out = workouts.map((w) => ({
    ...w,
    workout_data: {
      ...w.workout_data,
      exercises: [...(w.workout_data.exercises ?? [])],
    },
  }));

  for (const adj of adjustments) {
    const w = out.find(
      (x) =>
        x.week_number === adj.week_number &&
        x.session_number === adj.session_number
    );
    if (!w?.workout_data.exercises) continue;
    const ex = w.workout_data.exercises[adj.exercise_index];
    if (!ex) continue;
    if (adj.weight !== undefined) ex.weight = adj.weight;
    if (adj.rir !== undefined) ex.rir = adj.rir;
    if (adj.notes !== undefined) ex.notes = adj.notes;
  }

  return out;
}
