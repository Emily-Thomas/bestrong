import type { ExerciseLibraryExercise } from '@/lib/api';

export interface ExerciseFormState {
  id?: number;
  name: string;
  primary_muscle_group: string;
  equipment: string;
  category: string;
  default_sets: string;
  default_reps: string;
  default_load: string;
  default_rest_seconds: string;
  default_tempo: string;
  notes: string;
}

export const EMPTY_EXERCISE_FORM: ExerciseFormState = {
  name: '',
  primary_muscle_group: '',
  equipment: '',
  category: '',
  default_sets: '',
  default_reps: '',
  default_load: '',
  default_rest_seconds: '',
  default_tempo: '',
  notes: '',
};

export function exerciseToFormState(
  exercise: ExerciseLibraryExercise
): ExerciseFormState {
  return {
    id: exercise.id,
    name: exercise.name,
    primary_muscle_group: exercise.primary_muscle_group || '',
    equipment: exercise.equipment || '',
    category: exercise.category || '',
    default_sets:
      exercise.default_sets !== undefined ? String(exercise.default_sets) : '',
    default_reps:
      exercise.default_reps !== undefined ? String(exercise.default_reps) : '',
    default_load: exercise.default_load || '',
    default_rest_seconds:
      exercise.default_rest_seconds !== undefined
        ? String(exercise.default_rest_seconds)
        : '',
    default_tempo: exercise.default_tempo || '',
    notes: exercise.notes || '',
  };
}

export function formStateToPayload(form: ExerciseFormState) {
  return {
    name: form.name.trim(),
    primary_muscle_group: form.primary_muscle_group.trim() || undefined,
    equipment: form.equipment.trim() || undefined,
    category: form.category.trim() || undefined,
    default_sets: form.default_sets
      ? parseInt(form.default_sets, 10)
      : undefined,
    default_reps: form.default_reps.trim() || undefined,
    default_load: form.default_load.trim() || undefined,
    default_rest_seconds: form.default_rest_seconds
      ? parseInt(form.default_rest_seconds, 10)
      : undefined,
    default_tempo: form.default_tempo.trim() || undefined,
    notes: form.notes.trim() || undefined,
  };
}

export function serializeExerciseForm(form: ExerciseFormState): string {
  return JSON.stringify(form);
}

export function formatExerciseDefaults(
  exercise: ExerciseLibraryExercise
): string | null {
  const parts: string[] = [];
  if (
    exercise.default_sets !== undefined &&
    exercise.default_reps !== undefined
  ) {
    parts.push(`${exercise.default_sets}×${exercise.default_reps}`);
  }
  if (exercise.default_load) parts.push(exercise.default_load);
  if (exercise.default_rest_seconds !== undefined) {
    parts.push(`Rest ${exercise.default_rest_seconds}s`);
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}
