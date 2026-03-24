import type {
  Exercise,
  ExerciseLibraryExercise,
  ExerciseLibraryMetadataSnapshot,
  LLMWorkoutResponse,
  WorkoutData,
} from '../types';

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function buildLibraryMap(
  exercises: ExerciseLibraryExercise[]
): Map<string, ExerciseLibraryExercise> {
  const map = new Map<string, ExerciseLibraryExercise>();
  for (const ex of exercises) {
    const key = normalizeName(ex.name);
    if (!map.has(key)) {
      map.set(key, ex);
    }
  }
  return map;
}

function toMetadataSnapshot(
  lib: ExerciseLibraryExercise
): ExerciseLibraryMetadataSnapshot {
  return {
    primary_muscle_group: lib.primary_muscle_group,
    secondary_muscle_groups: lib.secondary_muscle_groups,
    movement_pattern: lib.movement_pattern,
    equipment: lib.equipment,
    category: lib.category,
  };
}

function enrichExerciseFromLibrary(
  exercise: Exercise,
  libraryMap: Map<string, ExerciseLibraryExercise>
): Exercise {
  const key = normalizeName(exercise.name);
  const lib = libraryMap.get(key);

  if (!lib) {
    // No match: mark as custom (but don't override if caller already set explicit flags)
    return {
      ...exercise,
      is_custom: exercise.is_custom ?? true,
    };
  }

  const metadata = toMetadataSnapshot(lib);

  const defaultReps = lib.default_reps ?? undefined;
  return {
    ...exercise,
    // Preserve explicit overrides from the workout; fall back to library defaults where missing
    sets: exercise.sets ?? lib.default_sets ?? undefined,
    reps:
      exercise.reps !== undefined
        ? exercise.reps
        : defaultReps !== undefined
          ? defaultReps
          : exercise.reps,
    weight:
      exercise.weight !== undefined
        ? exercise.weight
        : (lib.default_load ?? exercise.weight),
    rest_seconds:
      exercise.rest_seconds !== undefined
        ? exercise.rest_seconds
        : (lib.default_rest_seconds ?? exercise.rest_seconds),
    tempo:
      exercise.tempo !== undefined
        ? exercise.tempo
        : (lib.default_tempo ?? exercise.tempo),
    notes:
      exercise.notes !== undefined
        ? exercise.notes
        : (lib.notes ?? exercise.notes),
    library_exercise_id: lib.id,
    library_exercise_name: lib.name,
    library_metadata: metadata,
    is_custom: false,
  };
}

export function enrichWorkoutDataWithLibrary(
  workoutData: WorkoutData,
  libraryExercises: ExerciseLibraryExercise[]
): WorkoutData {
  if (!libraryExercises.length) {
    return workoutData;
  }

  const libraryMap = buildLibraryMap(libraryExercises);

  const enrichList = (list?: Exercise[]): Exercise[] | undefined =>
    list ? list.map((ex) => enrichExerciseFromLibrary(ex, libraryMap)) : list;

  return {
    ...workoutData,
    exercises: enrichList(workoutData.exercises) ?? [],
    warmup: enrichList(workoutData.warmup),
    cooldown: enrichList(workoutData.cooldown),
  };
}

export function enrichAIWorkoutsWithLibrary(
  workouts: LLMWorkoutResponse[],
  libraryExercises: ExerciseLibraryExercise[]
): LLMWorkoutResponse[] {
  if (!libraryExercises.length || !workouts.length) {
    return workouts;
  }

  return workouts.map((w) => ({
    ...w,
    workout_data: enrichWorkoutDataWithLibrary(
      w.workout_data,
      libraryExercises
    ),
  }));
}
