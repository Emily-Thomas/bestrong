'use client';

import {
  ArrowLeft,
  CalendarDays,
  Dumbbell,
  Layers,
  LayoutGrid,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  type Exercise,
  type Recommendation,
  recommendationsApi,
  type Workout,
  workoutsApi,
} from '@/lib/api';
import { MesocycleWeekRail } from './components/MesocycleWeekRail';
import { SessionWorkoutCard } from './components/SessionWorkoutCard';
import { ExerciseSwapDialog } from './ExerciseSwapDialog';
import { totalExerciseCount } from './workout-review-utils';

export default function WorkoutsReviewPage() {
  const params = useParams();
  const clientId = Number(params.id);
  const recId = Number(params.recId);

  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [swapTarget, setSwapTarget] = useState<{
    workoutId: number;
    exerciseIndex: number;
    exercise: Exercise;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const [wRes, rRes] = await Promise.all([
      recommendationsApi.getWorkouts(recId),
      recommendationsApi.getById(recId),
    ]);
    if (wRes.success && wRes.data) {
      setWorkouts(wRes.data);
    } else {
      setError(wRes.error || 'Could not load workouts');
    }
    if (rRes.success && rRes.data) {
      setRecommendation(rRes.data);
    }
    setLoading(false);
  }, [recId]);

  useEffect(() => {
    void load();
  }, [load]);

  const byWeek = useMemo(() => {
    const m = new Map<number, Workout[]>();
    for (const w of workouts) {
      const arr = m.get(w.week_number) ?? [];
      arr.push(w);
      m.set(w.week_number, arr);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => a.session_number - b.session_number);
    }
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [workouts]);

  const weekNumbers = useMemo(() => byWeek.map(([w]) => w), [byWeek]);

  useEffect(() => {
    if (weekNumbers.length && selectedWeek === null) {
      setSelectedWeek(weekNumbers[0]);
    }
  }, [weekNumbers, selectedWeek]);

  const phaseWeeksPlanned = useMemo(() => {
    const ps = recommendation?.plan_structure;
    if (
      ps &&
      typeof ps === 'object' &&
      'phase_1_weeks' in ps &&
      typeof (ps as { phase_1_weeks?: unknown }).phase_1_weeks === 'number'
    ) {
      return (ps as { phase_1_weeks: number }).phase_1_weeks;
    }
    return weekNumbers.length ? Math.max(...weekNumbers) : 1;
  }, [recommendation, weekNumbers]);

  const selectedWeekWorkouts = useMemo(() => {
    if (selectedWeek === null) return [];
    const found = byWeek.find(([w]) => w === selectedWeek);
    return found ? found[1] : [];
  }, [byWeek, selectedWeek]);

  const stats = useMemo(() => {
    const sessions = workouts.length;
    const weeks = weekNumbers.length;
    const exercises = totalExerciseCount(workouts);
    return { sessions, weeks, exercises };
  }, [workouts, weekNumbers.length]);

  const handleSwapConfirm = async (updated: Exercise) => {
    if (!swapTarget) return;
    const w = workouts.find((x) => x.id === swapTarget.workoutId);
    if (!w) return;
    const exercises = [...(w.workout_data.exercises ?? [])];
    exercises[swapTarget.exerciseIndex] = updated;
    const res = await workoutsApi.update(w.id, {
      workout_data: { ...w.workout_data, exercises },
    });
    if (res.success && res.data) {
      const next = res.data;
      setWorkouts((prev) => prev.map((x) => (x.id === w.id ? next : x)));
    }
    setSwapTarget(null);
  };

  return (
    <ProtectedRoute>
      <TooltipProvider delayDuration={250}>
        <AppShell
          title="Review workouts"
          description="Walk the mesocycle, tweak sessions, and keep the plan in sync with your client."
          backAction={
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/clients/${clientId}/recommendations/${recId}`}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                Plan
              </Link>
            </Button>
          }
        >
          <div className="relative min-h-[calc(100vh-8rem)]">
            <div
              className="pointer-events-none absolute inset-x-0 -top-px h-48 bg-gradient-to-b from-amber-500/12 via-transparent to-transparent dark:from-amber-500/20"
              aria-hidden
            />
            <div className="relative mx-auto max-w-6xl space-y-8 px-4 pb-16 pt-2 sm:px-6 lg:px-8">
              {loading ? (
                <div className="space-y-6">
                  <Skeleton className="h-36 w-full rounded-2xl" />
                  <div className="grid gap-4 sm:grid-cols-3">
                    <Skeleton className="h-24 rounded-xl" />
                    <Skeleton className="h-24 rounded-xl" />
                    <Skeleton className="h-24 rounded-xl" />
                  </div>
                  <Skeleton className="h-14 w-full max-w-md rounded-full" />
                  <Skeleton className="h-96 w-full rounded-2xl" />
                </div>
              ) : error ? (
                <div
                  className="rounded-2xl border border-destructive/35 bg-destructive/5 px-5 py-4 text-sm text-destructive shadow-sm"
                  role="alert"
                >
                  {error}
                </div>
              ) : workouts.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/80 bg-muted/30 px-6 py-16 text-center shadow-sm">
                  <LayoutGrid className="mx-auto h-10 w-10 text-muted-foreground/60" />
                  <p className="mt-4 text-sm font-medium text-foreground">
                    No workouts in this plan yet
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Generate from the Workouts tab or apply a library template
                    with an exercise blueprint.
                  </p>
                </div>
              ) : (
                <>
                  <header className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                        <Sparkles className="h-3.5 w-3.5" />
                        Coach review
                      </span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                      Mesocycle workout review
                    </h1>
                    <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                      Browse by week to see how volume and focus evolve. Each
                      session shows muscle emphasis, timing, and quick swaps
                      from your exercise library.
                    </p>
                  </header>

                  <section className="grid gap-3 sm:grid-cols-3">
                    <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card/90 p-4 shadow-md ring-1 ring-border/30 backdrop-blur-sm">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 text-amber-800 dark:text-amber-200">
                        <CalendarDays className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Weeks
                        </p>
                        <p className="text-2xl font-bold tabular-nums text-foreground">
                          {stats.weeks}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card/90 p-4 shadow-md ring-1 ring-border/30 backdrop-blur-sm">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                        <Layers className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Sessions
                        </p>
                        <p className="text-2xl font-bold tabular-nums text-foreground">
                          {stats.sessions}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card/90 p-4 shadow-md ring-1 ring-border/30 backdrop-blur-sm">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                        <Dumbbell className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Exercises
                        </p>
                        <p className="text-2xl font-bold tabular-nums text-foreground">
                          {stats.exercises}
                        </p>
                      </div>
                    </div>
                  </section>

                  {weekNumbers.length > 0 && selectedWeek !== null ? (
                    <MesocycleWeekRail
                      weekNumbers={weekNumbers}
                      selectedWeek={selectedWeek}
                      onSelectWeek={setSelectedWeek}
                      phaseWeeksPlanned={phaseWeeksPlanned}
                    />
                  ) : null}

                  <section className="space-y-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h2 className="text-lg font-semibold tracking-tight text-foreground">
                          Week {selectedWeek ?? '—'} · sessions
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {selectedWeekWorkouts.length} training blocks this
                          week
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-6 lg:gap-8">
                      {selectedWeekWorkouts.map((w) => (
                        <SessionWorkoutCard
                          key={w.id}
                          workout={w}
                          sessionsInWeek={selectedWeekWorkouts.length}
                          onSwap={(exerciseIndex, exercise) =>
                            setSwapTarget({
                              workoutId: w.id,
                              exerciseIndex,
                              exercise,
                            })
                          }
                        />
                      ))}
                    </div>
                  </section>
                </>
              )}
            </div>
          </div>

          {swapTarget ? (
            <ExerciseSwapDialog
              open
              onOpenChange={(o) => {
                if (!o) setSwapTarget(null);
              }}
              currentExercise={swapTarget.exercise}
              onSelect={(ex) => void handleSwapConfirm(ex)}
            />
          ) : null}
        </AppShell>
      </TooltipProvider>
    </ProtectedRoute>
  );
}
