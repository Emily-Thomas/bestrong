import type { Exercise, ExerciseLibraryExercise } from '@/lib/api';

export function exerciseFromLibrary(
  lib: ExerciseLibraryExercise,
  prev: Partial<Exercise> = {}
): Exercise {
  return {
    name: lib.name,
    library_exercise_id: lib.id,
    library_exercise_name: lib.name,
    is_custom: false,
    sets: 'sets' in prev ? prev.sets : lib.default_sets ?? undefined,
    reps:
      'reps' in prev
        ? prev.reps
        : lib.default_reps != null
          ? String(lib.default_reps)
          : undefined,
    weight: prev.weight ?? lib.default_load ?? undefined,
    rest_seconds: prev.rest_seconds ?? lib.default_rest_seconds ?? undefined,
    tempo: prev.tempo ?? lib.default_tempo ?? undefined,
    rir: prev.rir,
    notes: prev.notes,
    library_metadata: {
      primary_muscle_group: lib.primary_muscle_group,
      secondary_muscle_groups: lib.secondary_muscle_groups,
      movement_pattern: lib.movement_pattern,
      equipment: lib.equipment,
      category: lib.category,
    },
  };
}

export function isLibraryLinkedExercise(exercise: Exercise): boolean {
  return (
    exercise.library_exercise_id != null && exercise.library_exercise_id > 0
  );
}
