'use client';

import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  Loader2,
  Save,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  type ActualExercisePerformance,
  type ActualWorkoutPerformance,
  type CreateActualWorkoutInput,
  clientsApi,
  type Workout,
  workoutsApi,
} from '@/lib/api';
import { touchActionClass } from '@/lib/touch-targets';
import { cn } from '@/lib/utils';
import { hasLoggedData } from './components/ExerciseLogCard';
import {
  PreWorkoutSurvey,
  type PreWorkoutSurveyResponse,
} from './components/PreWorkoutSurvey';
import { WorkoutExecuteStickyFooter } from './components/WorkoutExecuteStickyFooter';
import { WorkoutRatingSection } from './components/WorkoutRatingSection';
import {
  EXECUTE_PAGE_CONTAINER,
  EXECUTE_PAGE_INNER,
  EXECUTE_PANEL_BODY,
  EXECUTE_PANEL_CLASS,
  EXECUTE_PANEL_HEADER,
} from './lib/execute-ui-classes';
import {
  serializeSessionSnapshot,
  type SessionFormSnapshot,
} from './lib/session-snapshot';
import {
  ExerciseGroupExecuteBlock,
  StandaloneExerciseExecuteBlock,
  WORKOUT_SEGMENT_LIST_CLASS,
} from './components/ExerciseGroupExecuteBlock';
import {
  buildInitialActualFromPrescription,
  mergeActualWithPrescriptionGroups,
  segmentExercises,
} from '@/lib/exercise-groups';

const DEFAULT_FOOTER_PADDING = 120;

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
  const [saveSuccess, setSaveSuccess] = useState(false);
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
  const [clientName, setClientName] = useState('');
  const [footerPadding, setFooterPadding] = useState(DEFAULT_FOOTER_PADDING);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [pendingLeaveHref, setPendingLeaveHref] = useState<string | null>(null);
  const [sessionRevision, setSessionRevision] = useState(0);

  const baselineRef = useRef('');
  const baselineWorkoutIdRef = useRef<number | null>(null);

  const clientBackHref = `/clients/${clientId}`;

  const buildSnapshot = useCallback(
    (): SessionFormSnapshot => ({
      performance: actualPerformance,
      sessionNotes,
      trainerObservations,
      workoutRating,
      surveyResponse,
      surveySkipped,
    }),
    [
      actualPerformance,
      sessionNotes,
      trainerObservations,
      workoutRating,
      surveyResponse,
      surveySkipped,
    ]
  );

  const isDirty = useMemo(() => {
    if (!baselineRef.current) return false;
    return (
      serializeSessionSnapshot(buildSnapshot()) !== baselineRef.current
    );
  }, [buildSnapshot, sessionRevision]);

  const bumpSession = useCallback(() => {
    setSessionRevision((r) => r + 1);
  }, []);

  const handleFooterHeight = useCallback((heightPx: number) => {
    setFooterPadding(heightPx + 16);
  }, []);

  const loadWorkout = useCallback(async () => {
    setLoading(true);
    setError('');
    setSaveSuccess(false);

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

        if (w.workout_data.exercises?.length) {
          if (w.actual_workout) {
            setActualPerformance({
              ...w.actual_workout.actual_performance,
              exercises: mergeActualWithPrescriptionGroups(
                w.workout_data.exercises,
                w.actual_workout.actual_performance.exercises
              ),
            });
          } else {
            setActualPerformance({
              exercises: buildInitialActualFromPrescription(
                w.workout_data.exercises
              ),
            });
          }
        }

        if (w.actual_workout && !w.workout_data.exercises?.length) {
          setActualPerformance(w.actual_workout.actual_performance);
        }

        if (w.actual_workout) {
          setSessionNotes(w.actual_workout.session_notes || '');
          setTrainerObservations(w.actual_workout.trainer_observations || '');
          setWorkoutRating(w.actual_workout.workout_rating);
        } else {
          setSessionNotes('');
          setTrainerObservations('');
          setWorkoutRating(undefined);
        }
      } else {
        setError(
          response.error || 'Scout could not load this session. Try again.'
        );
      }
    } catch {
      setError('Scout could not load this session. Try again.');
    } finally {
      setLoading(false);
    }
  }, [workoutId, clientId]);

  useEffect(() => {
    if (workoutId) {
      void loadWorkout();
    }
  }, [workoutId, loadWorkout]);

  useEffect(() => {
    baselineWorkoutIdRef.current = null;
    setSurveySkipped(false);
    setSurveyResponse(null);
    expandInitRef.current = false;
    setExpandedExerciseIndex(null);
    baselineRef.current = '';
    setSessionRevision(0);
  }, [workoutId]);

  useEffect(() => {
    if (loading || !workout) return;
    if (baselineWorkoutIdRef.current === workout.id) return;
    baselineWorkoutIdRef.current = workout.id;
    baselineRef.current = serializeSessionSnapshot({
      performance: actualPerformance,
      sessionNotes,
      trainerObservations,
      workoutRating,
      surveyResponse,
      surveySkipped,
    });
    setSessionRevision(0);
  }, [
    loading,
    workout,
    actualPerformance,
    sessionNotes,
    trainerObservations,
    workoutRating,
    surveyResponse,
    surveySkipped,
  ]);

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
    bumpSession();
  };

  const completedCount = actualPerformance.exercises.filter((ex) =>
    hasLoggedData(ex)
  ).length;
  const totalExercises = actualPerformance.exercises.length;
  const progressPct =
    totalExercises > 0 ? (completedCount / totalExercises) * 100 : 0;

  const performanceSegments = useMemo(
    () => segmentExercises(actualPerformance.exercises),
    [actualPerformance.exercises]
  );

  const proposedExercises = workout?.workout_data.exercises ?? [];

  const requestLeave = useCallback(
    (href: string) => {
      if (saving || saveSuccess) return;
      if (isDirty) {
        setPendingLeaveHref(href);
        setLeaveDialogOpen(true);
        return;
      }
      router.push(href);
    },
    [isDirty, router, saving, saveSuccess]
  );

  const confirmLeave = useCallback(() => {
    if (pendingLeaveHref) {
      router.push(pendingLeaveHref);
    }
    setLeaveDialogOpen(false);
    setPendingLeaveHref(null);
  }, [pendingLeaveHref, router]);

  const handleSave = useCallback(async () => {
    if (!workout || saving || saveSuccess) return;

    const loggedExercises = actualPerformance.exercises.filter(hasLoggedData);
    if (loggedExercises.length === 0) {
      setError('Log reps or weight for at least one exercise before saving.');
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
        baselineRef.current = serializeSessionSnapshot(buildSnapshot());
        setSessionRevision(0);
        setSaveSuccess(true);
        window.setTimeout(() => {
          router.push(clientBackHref);
        }, 900);
      } else {
        setError(
          response.error || 'Could not save this session. Try again.'
        );
      }
    } catch {
      setError('Something went wrong while saving. Try again.');
    } finally {
      setSaving(false);
    }
  }, [
    workout,
    saving,
    saveSuccess,
    actualPerformance,
    sessionNotes,
    trainerObservations,
    workoutRating,
    buildSnapshot,
    router,
    clientBackHref,
  ]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key !== 's') return;
      e.preventDefault();
      if (!saving && !saveSuccess && workout) void handleSave();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSave, saving, saveSuccess, workout]);

  const handleSurveyComplete = (responses: PreWorkoutSurveyResponse) => {
    setSurveyResponse(responses);
    setShowSurvey(false);
    bumpSession();
  };

  const handleSurveySkip = () => {
    setSurveySkipped(true);
    setShowSurvey(false);
    bumpSession();
  };

  const hasWarmupCooldown =
    (workout?.workout_data.warmup?.length ?? 0) > 0 ||
    (workout?.workout_data.cooldown?.length ?? 0) > 0;

  if (loading) {
    return (
      <ProtectedRoute>
        <AppShell title="Session" description="Getting your workout ready">
          <div className={EXECUTE_PAGE_CONTAINER}>
            <output
              className={cn(EXECUTE_PANEL_CLASS, 'block w-full')}
              aria-live="polite"
            >
              <div className="flex flex-col items-center justify-center px-6 py-20">
                <Loader2
                  className="mb-3 h-9 w-9 animate-spin text-primary"
                  aria-hidden
                />
                <p className="text-sm text-muted-foreground">
                  Scout is loading this session…
                </p>
              </div>
            </output>
          </div>
        </AppShell>
      </ProtectedRoute>
    );
  }

  if (!workout) {
    return (
      <ProtectedRoute>
        <AppShell title="Session" description={"We couldn't find that workout"}>
          <div
            className={cn(
              EXECUTE_PANEL_CLASS,
              EXECUTE_PANEL_BODY,
              'max-w-md text-center text-muted-foreground'
            )}
          >
            Workout not found. It may have been removed.
          </div>
        </AppShell>
      </ProtectedRoute>
    );
  }

  const sessionTitle =
    workout.workout_name ||
    `Week ${workout.week_number} · Session ${workout.session_number}`;

  if (workout.status === 'completed' || workout.status === 'skipped') {
    return (
      <ProtectedRoute>
        <AppShell
          title={sessionTitle}
          description={
            workout.status === 'completed'
              ? 'This session is already logged'
              : 'This session was skipped'
          }
          backAction={
            <Button
              variant="ghost"
              size="sm"
              className={touchActionClass}
              type="button"
              onClick={() => router.push(clientBackHref)}
            >
              <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
              Back to client
            </Button>
          }
        >
          <div
            className={cn(
              EXECUTE_PANEL_CLASS,
              EXECUTE_PANEL_BODY,
              'max-w-md space-y-4 text-center'
            )}
          >
            <p className="text-muted-foreground">
              {workout.status === 'completed'
                ? 'This workout is already complete. Open it to see what was logged.'
                : 'This session was marked skipped and cannot be logged here.'}
            </p>
            {workout.status === 'completed' ? (
              <Button
                variant="default"
                className={touchActionClass}
                onClick={() =>
                  router.push(`/clients/${clientId}/workouts/${workoutId}`)
                }
              >
                View logged session
              </Button>
            ) : (
              <Button
                variant="outline"
                className={touchActionClass}
                onClick={() => router.push(clientBackHref)}
              >
                Back to client
              </Button>
            )}
          </div>
        </AppShell>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppShell
        title={sessionTitle}
        description="Log sets as you go. Built for phone or tablet on the gym floor."
        backAction={
          <Button
            variant="ghost"
            size="sm"
            type="button"
            className={touchActionClass}
            onClick={() => requestLeave(clientBackHref)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
            Back to client
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
          className={EXECUTE_PAGE_CONTAINER}
          style={{ paddingBottom: footerPadding }}
        >
          {error ? (
            <Alert variant="destructive" role="alert" aria-live="assertive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {saveSuccess ? (
            <Alert variant="success" aria-live="polite">
              <AlertDescription>
                Session saved. Taking you back to the client…
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="sticky top-0 z-20 rounded-xl border border-border bg-background/95 px-4 py-3 shadow-sm backdrop-blur-sm supports-[backdrop-filter]:bg-background/80">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">
                  Progress
                </p>
                <p className="truncate text-sm font-bold text-foreground">
                  {completedCount} / {totalExercises} with reps or load logged
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0 tabular-nums">
                {Math.round(progressPct)}%
              </Badge>
            </div>
            <Progress
              value={progressPct}
              className="mt-2 h-2"
              aria-label="Exercise logging progress"
            />
            <p className="sr-only" aria-live="polite" aria-atomic="true">
              {completedCount} of {totalExercises} exercises have reps or load
              logged
            </p>
          </div>

          {surveyResponse ? (
            <details
              className="group overflow-hidden rounded-xl border border-scout-info/25 bg-scout-info/15"
              aria-label="Pre-workout check-in summary"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold touch-manipulation [&::-webkit-details-marker]:hidden">
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
                  <ChevronDown className="h-4 w-4 shrink-0 transition group-open:rotate-180 motion-reduce:transition-none" />
                </div>
              </summary>
              <div className="space-y-2 border-t border-scout-info/20 px-4 py-3 text-sm">
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
                {surveyResponse.injury_notes ? (
                  <p className="pt-1 text-xs">{surveyResponse.injury_notes}</p>
                ) : null}
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
          ) : null}

          {hasWarmupCooldown ? (
            <details className="overflow-hidden rounded-xl border border-border bg-muted/20">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold touch-manipulation [&::-webkit-details-marker]:hidden">
                Warm-up and cool-down ({workout.workout_data.warmup?.length ?? 0}{' '}
                + {workout.workout_data.cooldown?.length ?? 0} movements)
              </summary>
              <div className="space-y-3 border-t border-border px-4 py-3 text-sm text-muted-foreground">
                {workout.workout_data.warmup &&
                  workout.workout_data.warmup.length > 0 && (
                    <div>
                      <p className="mb-1 font-medium text-foreground">Warm-up</p>
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

          <section className={EXECUTE_PANEL_CLASS} aria-labelledby="exercises-heading">
            <div className={EXECUTE_PANEL_HEADER}>
              <h2
                id="exercises-heading"
                className="text-sm font-semibold text-foreground"
              >
                Exercises
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground text-pretty">
                Tap a row to log reps or load. Linked blocks are supersets,
                trisets, or circuits. Mood and notes are optional.
              </p>
            </div>

            {actualPerformance.exercises.length === 0 ? (
              <div className={cn(EXECUTE_PANEL_BODY, 'text-center text-sm')}>
                <p className="text-muted-foreground">
                  No exercises in this session. Edit the workout to add
                  movements first.
                </p>
              </div>
            ) : (
              <ul
                className={WORKOUT_SEGMENT_LIST_CLASS}
                aria-label="Exercises in this session"
              >
                {performanceSegments.map((segment, segmentIndex) => {
                  const toggleAt = (idx: number) =>
                    setExpandedExerciseIndex((cur) =>
                      cur === idx ? null : idx
                    );
                  const goPrev = (_idx: number) =>
                    setExpandedExerciseIndex((i) =>
                      i !== null && i > 0 ? i - 1 : i
                    );
                  const goNext = (idx: number) => {
                    if (idx < totalExercises - 1) {
                      setExpandedExerciseIndex(idx + 1);
                    } else {
                      setExpandedExerciseIndex(null);
                    }
                  };

                  if (segment.kind === 'group') {
                    return (
                      <ExerciseGroupExecuteBlock
                        key={segment.groupId}
                        segment={segment}
                        segmentIndex={segmentIndex}
                        proposedExercises={proposedExercises}
                        totalExercises={totalExercises}
                        expandedExerciseIndex={expandedExerciseIndex}
                        onToggle={toggleAt}
                        onUpdate={updateExercisePerformance}
                        onGoPrev={goPrev}
                        onGoNext={goNext}
                        getStatus={getExerciseStatus}
                      />
                    );
                  }

                  const { exercise, index: idx } = segment.items[0];
                  const proposed = proposedExercises[idx];
                  return (
                    <StandaloneExerciseExecuteBlock
                      key={
                        exercise.exercise_instance_id ??
                        `${workout.id}-ex-${idx}-${exercise.exercise_name}`
                      }
                      exercise={exercise}
                      proposed={proposed}
                      index={idx}
                      totalExercises={totalExercises}
                      expanded={expandedExerciseIndex === idx}
                      status={getExerciseStatus(exercise)}
                      onToggle={() => toggleAt(idx)}
                      onUpdate={(updates) =>
                        updateExercisePerformance(idx, updates)
                      }
                      onGoPrev={() => goPrev(idx)}
                      onGoNext={() => goNext(idx)}
                    />
                  );
                })}
              </ul>
            )}
          </section>

          <WorkoutRatingSection
            workoutRating={workoutRating}
            trainerObservations={trainerObservations}
            sessionNotes={sessionNotes}
            onRatingChange={(rating) => {
              setWorkoutRating(rating);
              bumpSession();
            }}
            onObservationsChange={(value) => {
              setTrainerObservations(value);
              bumpSession();
            }}
            onSessionNotesChange={(value) => {
              setSessionNotes(value);
              bumpSession();
            }}
          />
        </div>

        <WorkoutExecuteStickyFooter onHeightChange={handleFooterHeight}>
          <div
            className={cn(
              EXECUTE_PAGE_INNER,
              'flex flex-col gap-2 py-3 sm:flex-row sm:items-center'
            )}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
              {isDirty ? (
                <Badge variant="outline" className="font-normal">
                  Unsaved changes
                </Badge>
              ) : (
                <span className="text-muted-foreground">Ready to save</span>
              )}
              <span className="sr-only">
                Press Control+S or Command+S to save
              </span>
              <span
                className="hidden text-muted-foreground md:inline"
                aria-hidden
              >
                · Ctrl+S / ⌘S
              </span>
            </div>
            <div className="flex w-full gap-2 sm:w-auto sm:shrink-0">
              <Button
                type="button"
                variant="outline"
                className="h-14 min-h-[56px] flex-1 touch-manipulation text-base sm:min-w-[7rem]"
                onClick={() => requestLeave(clientBackHref)}
                disabled={saving || saveSuccess}
              >
                Exit
              </Button>
              <Button
                type="button"
                className="h-14 min-h-[56px] flex-[2] touch-manipulation text-base font-semibold sm:min-w-[12rem]"
                onClick={() => void handleSave()}
                disabled={saving || saveSuccess}
                aria-keyshortcuts="Control+s Meta+s"
                aria-busy={saving}
              >
                {saving ? (
                  <>
                    <Loader2
                      className="mr-2 h-5 w-5 animate-spin"
                      aria-hidden
                    />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-5 w-5" aria-hidden />
                    Save and complete
                  </>
                )}
              </Button>
            </div>
          </div>
        </WorkoutExecuteStickyFooter>

        <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Leave without saving?</AlertDialogTitle>
              <AlertDialogDescription>
                You have session logs that are not saved yet. Save first or
                your work will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setPendingLeaveHref(null);
                }}
              >
                Keep logging
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={confirmLeave}
              >
                Leave without saving
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </AppShell>
    </ProtectedRoute>
  );
}
