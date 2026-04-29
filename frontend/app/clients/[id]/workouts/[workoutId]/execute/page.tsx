'use client';

import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  Loader2,
  Save,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  type ActualExercisePerformance,
  type ActualWorkoutPerformance,
  type CreateActualWorkoutInput,
  clientsApi,
  type Workout,
  workoutsApi,
} from '@/lib/api';
import { cn } from '@/lib/utils';
import { ExerciseLogCard, hasLoggedData } from './components/ExerciseLogCard';
import {
  PreWorkoutSurvey,
  type PreWorkoutSurveyResponse,
} from './components/PreWorkoutSurvey';
import { WorkoutRatingSection } from './components/WorkoutRatingSection';

function getConcernLevel(
  response: PreWorkoutSurveyResponse
): 'high' | 'medium' | 'low' | 'none' {
  if (response.pain_or_injury || response.readiness === 'not_ready') {
    return 'high';
  }
  if (!response.rested_enough || response.elevated_soreness) {
    return 'medium';
  }
  if (response.readiness === 'somewhat') {
    return 'low';
  }
  return 'none';
}

function formatYesNo(value: boolean): string {
  return value ? 'Yes' : 'No';
}

function formatReadiness(value: PreWorkoutSurveyResponse['readiness']): string {
  switch (value) {
    case 'ready':
      return 'Ready';
    case 'somewhat':
      return 'Somewhat';
    case 'not_ready':
      return 'Not ready';
    default:
      return String(value);
  }
}

function getExerciseStatus(
  exercise: ActualExercisePerformance
): 'completed' | 'pending' {
  return hasLoggedData(exercise) ? 'completed' : 'pending';
}

export default function WorkoutExecutionPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = Number(params.id);
  const workoutId = Number(params.workoutId);

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [actualPerformance, setActualPerformance] =
    useState<ActualWorkoutPerformance>({
      exercises: [],
    });
  const [sessionNotes, setSessionNotes] = useState('');
  const [trainerObservations, setTrainerObservations] = useState('');
  const [workoutRating, setWorkoutRating] = useState<
    'happy' | 'meh' | 'sad' | undefined
  >();
  const [expandedExerciseIndex, setExpandedExerciseIndex] = useState<
    number | null
  >(null);
  const expandInitRef = useRef(false);
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveySkipped, setSurveySkipped] = useState(false);
  const [surveyResponse, setSurveyResponse] =
    useState<PreWorkoutSurveyResponse | null>(null);
  const [clientName, setClientName] = useState<string>('');

  const loadWorkout = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const clientResponse = await clientsApi.getById(clientId);
      if (clientResponse.success && clientResponse.data) {
        const client = clientResponse.data;
        setClientName(`${client.first_name} ${client.last_name}`);
      }

      const response = await workoutsApi.getById(workoutId);
      if (response.success && response.data) {
        const w = response.data;
        setWorkout(w);

        if (w.workout_data.exercises) {
          const exercises: ActualExercisePerformance[] =
            w.workout_data.exercises.map((ex) => ({
              exercise_name: ex.name,
            }));
          setActualPerformance({ exercises });
        }

        if (w.actual_workout) {
          setActualPerformance(w.actual_workout.actual_performance);
          setSessionNotes(w.actual_workout.session_notes || '');
          setTrainerObservations(w.actual_workout.trainer_observations || '');
          setWorkoutRating(w.actual_workout.workout_rating);
        }
      } else {
        setError(response.error || 'Failed to load workout');
      }
    } catch (_err) {
      setError('Failed to load workout');
    } finally {
      setLoading(false);
    }
  }, [workoutId, clientId]);

  useEffect(() => {
    if (workoutId) {
      loadWorkout();
    }
  }, [workoutId, loadWorkout]);

  useEffect(() => {
    void workoutId;
    setSurveySkipped(false);
    setSurveyResponse(null);
    expandInitRef.current = false;
    setExpandedExerciseIndex(null);
  }, [workoutId]);

  useEffect(() => {
    if (!workout) return;
    const eligible =
      workout.status !== 'completed' && workout.status !== 'skipped';
    if (!eligible) {
      setShowSurvey(false);
      return;
    }
    if (surveyResponse || surveySkipped) {
      setShowSurvey(false);
      return;
    }
    setShowSurvey(true);
  }, [workout, surveyResponse, surveySkipped]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Run once when load completes; expandInitRef prevents repeats.
  useEffect(() => {
    if (expandInitRef.current || loading || !workout) return;
    if (actualPerformance.exercises.length === 0) return;
    expandInitRef.current = true;
    const firstPending = actualPerformance.exercises.findIndex(
      (ex) => !hasLoggedData(ex)
    );
    setExpandedExerciseIndex(firstPending >= 0 ? firstPending : 0);
  }, [loading, workout, actualPerformance.exercises.length]);

  const updateExercisePerformance = (
    index: number,
    updates: Partial<ActualExercisePerformance>
  ) => {
    const newExercises = [...actualPerformance.exercises];
    newExercises[index] = { ...newExercises[index], ...updates };
    setActualPerformance({ ...actualPerformance, exercises: newExercises });
  };

  const completedCount = actualPerformance.exercises.filter(
    (ex) => getExerciseStatus(ex) === 'completed'
  ).length;
  const totalExercises = actualPerformance.exercises.length;
  const progressPct =
    totalExercises > 0 ? (completedCount / totalExercises) * 100 : 0;

  const handleSave = async () => {
    if (!workout) return;

    if (actualPerformance.exercises.length === 0) {
      setError('Please record performance for at least one exercise');
      return;
    }

    setSaving(true);
    setError('');

    const input: CreateActualWorkoutInput = {
      workout_id: workout.id,
      actual_performance: actualPerformance,
      session_notes: sessionNotes,
      trainer_observations: trainerObservations,
      workout_rating: workoutRating,
      completed_at: new Date().toISOString(),
    };

    try {
      const response = await workoutsApi.complete(workout.id, input);
      if (response.success) {
        router.push(`/clients/${clientId}`);
      } else {
        setError(response.error || 'Failed to save workout');
      }
    } catch (_err) {
      setError('Failed to save workout');
    } finally {
      setSaving(false);
    }
  };

  const handleSurveyComplete = (responses: PreWorkoutSurveyResponse) => {
    setSurveyResponse(responses);
    setShowSurvey(false);
  };

  const handleSurveySkip = () => {
    setSurveySkipped(true);
    setShowSurvey(false);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <AppShell title="Session" description="Getting your workout ready">
          <Card className="shadow-md">
            <CardContent className="flex flex-col items-center justify-center py-20">
              <Loader2 className="mb-3 h-9 w-9 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                Loading session...
              </p>
            </CardContent>
          </Card>
        </AppShell>
      </ProtectedRoute>
    );
  }

  if (!workout) {
    return (
      <ProtectedRoute>
        <AppShell title="Session" description={"We couldn't find that workout"}>
          <Card className="max-w-md shadow-md">
            <CardContent className="py-12 text-center text-muted-foreground">
              Workout not found. It may have been removed.
            </CardContent>
          </Card>
        </AppShell>
      </ProtectedRoute>
    );
  }

  const sessionTitle =
    workout.workout_name ||
    `Week ${workout.week_number} · Session ${workout.session_number}`;

  return (
    <ProtectedRoute>
      <AppShell
        title={sessionTitle}
        description="Log sets as you go — great on a phone or tablet at the gym"
        backAction={
          <Button variant="ghost" size="sm" className="min-h-[44px]" asChild>
            <Link href={`/clients/${clientId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Client
            </Link>
          </Button>
        }
      >
        <PreWorkoutSurvey
          open={showSurvey}
          onComplete={handleSurveyComplete}
          onSkip={handleSurveySkip}
          clientName={clientName}
        />

        <div
          className={cn('mx-auto max-w-2xl space-y-4 pb-32', 'lg:max-w-3xl')}
        >
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="sticky top-0 z-20 -mx-2 rounded-xl border border-border/60 bg-background/90 px-3 py-3 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/75 sm:-mx-0 sm:px-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Progress
                </p>
                <p className="truncate text-sm font-bold text-foreground">
                  {completedCount} / {totalExercises} exercises logged
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0 tabular-nums">
                {Math.round(progressPct)}%
              </Badge>
            </div>
            <Progress value={progressPct} className="mt-2 h-2" />
          </div>

          {surveyResponse && (
            <details className="group rounded-2xl border border-milo-info/25 bg-milo-info/[0.06] dark:bg-milo-info/15">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 font-semibold touch-manipulation [&::-webkit-details-marker]:hidden">
                <span>Check-in summary</span>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      getConcernLevel(surveyResponse) === 'high'
                        ? 'destructive'
                        : getConcernLevel(surveyResponse) === 'medium'
                          ? 'default'
                          : getConcernLevel(surveyResponse) === 'low'
                            ? 'secondary'
                            : 'outline'
                    }
                  >
                    {getConcernLevel(surveyResponse) === 'high'
                      ? 'High'
                      : getConcernLevel(surveyResponse) === 'medium'
                        ? 'Moderate'
                        : getConcernLevel(surveyResponse) === 'low'
                          ? 'Low'
                          : 'Good'}
                  </Badge>
                  <ChevronDown className="h-4 w-4 shrink-0 transition group-open:rotate-180" />
                </div>
              </summary>
              <div className="space-y-2 border-t border-milo-info/20 px-4 py-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Rested: </span>
                  {formatYesNo(surveyResponse.rested_enough)}
                </div>
                <div>
                  <span className="text-muted-foreground">Soreness: </span>
                  {formatYesNo(surveyResponse.elevated_soreness)}
                </div>
                <div>
                  <span className="text-muted-foreground">Pain concern: </span>
                  {formatYesNo(surveyResponse.pain_or_injury)}
                </div>
                <div>
                  <span className="text-muted-foreground">Ready: </span>
                  {formatReadiness(surveyResponse.readiness)}
                </div>
                {surveyResponse.injury_notes && (
                  <p className="pt-1 text-xs">{surveyResponse.injury_notes}</p>
                )}
                {(getConcernLevel(surveyResponse) === 'medium' ||
                  getConcernLevel(surveyResponse) === 'high') && (
                  <Alert variant="destructive" className="mt-2">
                    <AlertDescription className="text-xs">
                      Consider scaling load or volume today.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </details>
          )}

          {workout.workout_data.warmup?.length ||
          workout.workout_data.cooldown?.length ? (
            <details className="rounded-2xl border border-border/80 bg-muted/20">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold touch-manipulation [&::-webkit-details-marker]:hidden">
                Warm-up &amp; cool-down
              </summary>
              <div className="space-y-3 border-t px-4 py-3 text-sm text-muted-foreground">
                {workout.workout_data.warmup &&
                  workout.workout_data.warmup.length > 0 && (
                    <div>
                      <p className="mb-1 font-medium text-foreground">
                        Warm-up
                      </p>
                      <ul className="list-inside list-disc space-y-1">
                        {workout.workout_data.warmup.map((ex) => (
                          <li key={`w-${ex.name}`}>{ex.name}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                {workout.workout_data.cooldown &&
                  workout.workout_data.cooldown.length > 0 && (
                    <div>
                      <p className="mb-1 font-medium text-foreground">
                        Cool-down
                      </p>
                      <ul className="list-inside list-disc space-y-1">
                        {workout.workout_data.cooldown.map((ex) => (
                          <li key={`c-${ex.name}`}>{ex.name}</li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            </details>
          ) : null}

          <div className="space-y-3">
            <div className="flex items-end justify-between gap-2 px-1">
              <div>
                <h2 className="text-lg font-bold tracking-tight sm:text-xl">
                  Exercises
                </h2>
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Tap to expand. Use quick totals or log each set.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {actualPerformance.exercises.map((exercise, idx) => {
                const proposed = workout.workout_data.exercises[idx];
                const status = getExerciseStatus(exercise);
                const expanded = expandedExerciseIndex === idx;

                return (
                  <ExerciseLogCard
                    key={`${workout.id}-ex-${idx}-${exercise.exercise_name}`}
                    exercise={exercise}
                    proposedExercise={proposed}
                    exerciseIndex={idx}
                    totalExercises={totalExercises}
                    expanded={expanded}
                    status={status}
                    onToggle={() =>
                      setExpandedExerciseIndex((cur) =>
                        cur === idx ? null : idx
                      )
                    }
                    onUpdate={(updates) =>
                      updateExercisePerformance(idx, updates)
                    }
                    onGoPrev={() =>
                      setExpandedExerciseIndex((i) =>
                        i !== null && i > 0 ? i - 1 : i
                      )
                    }
                    onGoNext={() => {
                      if (idx < totalExercises - 1) {
                        setExpandedExerciseIndex(idx + 1);
                      } else {
                        setExpandedExerciseIndex(null);
                      }
                    }}
                  />
                );
              })}
            </div>
          </div>

          <WorkoutRatingSection
            variant="compact"
            workoutRating={workoutRating}
            trainerObservations={trainerObservations}
            sessionNotes={sessionNotes}
            onRatingChange={setWorkoutRating}
            onObservationsChange={setTrainerObservations}
            onSessionNotesChange={setSessionNotes}
          />
        </div>

        <div
          className={cn(
            'fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-md',
            'pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3',
            'lg:left-64'
          )}
        >
          <div className="mx-auto flex max-w-2xl flex-col gap-2 px-4 sm:flex-row sm:items-center lg:max-w-3xl">
            <Button
              type="button"
              variant="outline"
              className="h-14 min-h-[56px] w-full touch-manipulation text-base sm:flex-1"
              onClick={() => router.push(`/clients/${clientId}`)}
              disabled={saving}
            >
              Exit
            </Button>
            <Button
              type="button"
              className="h-14 min-h-[56px] w-full touch-manipulation text-base font-semibold sm:flex-[2]"
              onClick={() => handleSave()}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="mr-2 h-5 w-5" />
                  Save &amp; complete session
                </>
              )}
            </Button>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
