import type { Exercise } from '@/lib/api';

/** Apply partial updates; `undefined` values remove optional fields. */
export function mergeExerciseUpdates(
  exercise: Exercise,
  updates: Partial<Exercise>
): Exercise {
  const merged: Exercise = { ...exercise, ...updates };
  for (const [key, value] of Object.entries(updates) as [
    keyof Exercise,
    Exercise[keyof Exercise],
  ][]) {
    if (value === undefined) {
      delete merged[key];
    }
  }
  return merged;
}
