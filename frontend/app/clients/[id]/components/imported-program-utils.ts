import type { Recommendation, Workout } from '@/lib/api';

export function getProgramDimensions(recommendation: Recommendation) {
  const ps = recommendation.plan_structure as Record<string, unknown> | null;
  const fromPlan =
    typeof ps?.phase_1_weeks === 'number' ? ps.phase_1_weeks : null;
  return {
    phaseWeeks: Math.min(12, Math.max(1, Math.floor(fromPlan ?? 4))),
    sessionsPerWeek: Math.min(
      6,
      Math.max(1, Math.floor(recommendation.sessions_per_week ?? 3))
    ),
  };
}

export function exerciseCount(workout: Workout): number {
  return workout.workout_data?.exercises?.length ?? 0;
}

export function isSessionReady(workout: Workout): boolean {
  return exerciseCount(workout) > 0;
}

export function sortWorkoutsForBuilder(workouts: Workout[]): Workout[] {
  return [...workouts].sort(
    (a, b) =>
      a.week_number - b.week_number || a.session_number - b.session_number
  );
}

export function findWorkoutInGrid(
  workouts: Workout[],
  week: number,
  session: number
): Workout | undefined {
  return workouts.find(
    (w) => w.week_number === week && w.session_number === session
  );
}

export function findNextEmptyWorkout(workouts: Workout[]): Workout | undefined {
  return sortWorkoutsForBuilder(workouts).find((w) => !isSessionReady(w));
}

export function builderProgress(workouts: Workout[]) {
  const total = workouts.length;
  const ready = workouts.filter(isSessionReady).length;
  return { ready, total, percent: total > 0 ? (ready / total) * 100 : 0 };
}
