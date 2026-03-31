import type { CreateQuestionnaireInput } from '@/lib/api';
import type { QuestionnaireData } from './types';

export const DEFAULT_QUESTIONNAIRE: QuestionnaireData = {
  schema_version: 2,
};

const PARQ_STORAGE_KEYS = [
  'parq_chest_pain',
  'parq_resting_bp',
  'parq_dizziness',
  'parq_bone_joint',
  'parq_heart_meds',
  'parq_other_reason',
  'parq_extra',
  'parq_health_note',
] as const satisfies readonly (keyof QuestionnaireData)[];

function questionnaireDataWithoutParq(d: QuestionnaireData): QuestionnaireData {
  const out = { ...d };
  for (const k of PARQ_STORAGE_KEYS) {
    delete out[k];
  }
  return out;
}

/** True when saved JSON is the legacy slider-based intake (v1). */
export function isLegacyV1Notes(parsed: unknown): boolean {
  if (!parsed || typeof parsed !== 'object') {
    return false;
  }
  const o = parsed as Record<string, unknown>;
  return typeof o.section1_energy_level === 'number';
}

function coerceSessionLengthMinutes(
  v: QuestionnaireData['preferred_session_length']
): number | undefined {
  if (v === undefined || v === null || v === '') {
    return undefined;
  }
  if (typeof v === 'number' && !Number.isNaN(v)) {
    return v;
  }
  const n = parseInt(String(v), 10);
  return Number.isNaN(n) ? undefined : n;
}

function injurySummary(d: QuestionnaireData): string | undefined {
  if (!d.has_pain_or_injury) {
    return undefined;
  }
  const parts: string[] = [];
  if (d.injury_region?.trim()) {
    parts.push(`Area: ${d.injury_region.trim()}`);
  }
  if (d.injury_timeline?.trim()) {
    parts.push(`Timeline: ${d.injury_timeline.trim()}`);
  }
  if (d.injury_notes?.trim()) {
    parts.push(d.injury_notes.trim());
  }
  if (d.injury_red_flags === true) {
    parts.push('Red-flag symptoms reported.');
  }
  return parts.length
    ? parts.join(' | ')
    : 'Current pain or injury (details in questionnaire JSON).';
}

function nutritionHabitsSummary(d: QuestionnaireData): string | undefined {
  const parts: string[] = [];
  if (d.meals_per_day) {
    parts.push(`Meals: ${d.meals_per_day}`);
  }
  if (d.protein_level) {
    parts.push(`Protein: ${d.protein_level}`);
  }
  if (d.vegetables_frequency) {
    parts.push(`Vegetables: ${d.vegetables_frequency}`);
  }
  if (d.alcohol_frequency) {
    parts.push(`Alcohol: ${d.alcohol_frequency}`);
  }
  if (d.nutrition_notes?.trim()) {
    parts.push(d.nutrition_notes.trim());
  }
  return parts.length ? parts.join('; ') : undefined;
}

/** Returns an error message or null when valid. */
export function validateQuestionnaire(d: QuestionnaireData): string | null {
  if (!d.goal_categories || d.goal_categories.length < 1) {
    return 'Select at least one training goal.';
  }

  if (
    d.available_days_per_week === undefined ||
    d.available_days_per_week === null ||
    d.available_days_per_week < 1 ||
    d.available_days_per_week > 7
  ) {
    return 'Enter how many days per week you can train (1–7).';
  }

  if (
    d.preferred_session_length === undefined ||
    d.preferred_session_length === null ||
    d.preferred_session_length === ''
  ) {
    return 'Select a preferred session length.';
  }

  if (
    d.readiness_confidence === undefined ||
    d.readiness_confidence < 1 ||
    d.readiness_confidence > 5
  ) {
    return 'Set your confidence to stick with the plan (1–5).';
  }

  return null;
}

export function buildQuestionnaireApiInput(
  clientId: number,
  d: QuestionnaireData
): CreateQuestionnaireInput {
  const preferred = coerceSessionLengthMinutes(d.preferred_session_length);
  const primaryGoal =
    d.primary_goal_label?.trim() ||
    (d.goal_categories?.length ? d.goal_categories.join(', ') : undefined);

  const stored = questionnaireDataWithoutParq({ ...d, schema_version: 2 });

  return {
    client_id: clientId,
    notes: JSON.stringify(stored),
    primary_goal: primaryGoal,
    secondary_goals: d.goal_categories?.length
      ? [...d.goal_categories]
      : undefined,
    available_days_per_week: d.available_days_per_week,
    preferred_session_length: preferred,
    fitness_equipment_access: ['trainer_gym'],
    injury_history: injurySummary(d),
    medical_conditions: '',
    stress_level: d.stress_level_bucket,
    sleep_quality: d.sleep_quality_bucket,
    nutrition_habits: nutritionHabitsSummary(d),
    activity_level: d.walking_frequency,
  };
}
