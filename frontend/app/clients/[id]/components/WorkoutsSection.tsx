'use client';

import {
  Activity,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  Dumbbell,
  Edit,
  Loader2,
  Play,
  SkipForward,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  type Recommendation,
  recommendationsApi,
  type Workout,
  workoutsApi,
} from '@/lib/api';
import { cn } from '@/lib/utils';
import { GenerateWorkoutsPanel } from './GenerateWorkoutsPanel';

function groupWorkoutsByWeek(list: Workout[]): [number, Workout[]][] {
  const m = new Map<number, Workout[]>();
  for (const w of list) {
    const arr = m.get(w.week_number) ?? [];
    arr.push(w);
    m.set(w.week_number, arr);
  }
  for (const arr of m.values()) {
    arr.sort((a, b) => a.session_number - b.session_number);
  }
  return [...m.entries()].sort((a, b) => a[0] - b[0]);
}

function WeekProgressRing({ percent }: { percent: number }) {
  const size = 76;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = c - (clamped / 100) * c;

  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      aria-hidden
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <title>Week progress</title>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted/35"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="stroke-primary transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <span className="absolute text-center text-[11px] font-bold tabular-nums leading-none text-foreground">
        {Math.round(clamped)}%
      </span>
    </div>
  );
}

interface WorkoutsSectionProps {
  clientId: number;
  recommendation: Recommendation | null;
  onWorkoutUpdate?: () => void;
}

export function WorkoutsSection({
  clientId,
  recommendation,
  onWorkoutUpdate,
}: WorkoutsSectionProps) {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [currentWeek, setCurrentWeek] = useState(1);
  const [weekStatus, setWeekStatus] = useState<{
    total_workouts: number;
    completed_workouts: number;
    skipped_workouts?: number;
    in_progress_workouts?: number;
    scheduled_workouts?: number;
    is_complete: boolean;
  } | null>(null);
  const [startingWorkout, setStartingWorkout] = useState<number | null>(null);

  const loadWorkouts = useCallback(async () => {
    if (!recommendation) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await recommendationsApi.getWorkouts(recommendation.id);
      if (response.success && response.data) {
        setWorkouts(response.data);
        const currentWeekNum = recommendation.current_week || 1;
        setCurrentWeek(currentWeekNum);

        const weekResponse = await recommendationsApi.getWeekStatus(
          recommendation.id,
          currentWeekNum
        );
        if (weekResponse.success && weekResponse.data) {
          setWeekStatus(weekResponse.data);
        } else {
          setWeekStatus(null);
        }
      } else {
        setError(response.error || 'Failed to load workouts');
      }
    } catch {
      setError('Failed to load workouts');
    } finally {
      setLoading(false);
    }
  }, [recommendation]);

  useEffect(() => {
    loadWorkouts();
  }, [loadWorkouts]);

  const handleStartWorkout = async (workoutId: number) => {
    setStartingWorkout(workoutId);
    setError('');
    try {
      const response = await workoutsApi.start(workoutId);
      if (response.success) {
        await loadWorkouts();
        onWorkoutUpdate?.();
        router.push(`/clients/${clientId}/workouts/${workoutId}/execute`);
      } else {
        setError(response.error || 'Failed to start workout');
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to start workout';
      setError(errorMessage);
    } finally {
      setStartingWorkout(null);
    }
  };

  const handleContinueWorkout = (workoutId: number) => {
    router.push(`/clients/${clientId}/workouts/${workoutId}/execute`);
  };

  const handleViewWorkout = (workoutId: number) => {
    router.push(`/clients/${clientId}/workouts/${workoutId}`);
  };

  const handleEditWorkout = (workoutId: number) => {
    router.push(`/clients/${clientId}/workouts/${workoutId}/edit`);
  };

  const [skippingWorkout, setSkippingWorkout] = useState<number | null>(null);
  const [cancellingWorkout, setCancellingWorkout] = useState<number | null>(
    null
  );

  const handleSkipWorkout = async (workoutId: number) => {
    setSkippingWorkout(workoutId);
    setError('');
    setSuccessMessage('');
    try {
      const response = await workoutsApi.update(workoutId, {
        status: 'skipped',
      });
      if (response.success) {
        setSuccessMessage('Workout skipped successfully');
        await loadWorkouts();
        onWorkoutUpdate?.();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(response.error || 'Failed to skip workout');
      }
    } catch {
      setError('Failed to skip workout');
    } finally {
      setSkippingWorkout(null);
    }
  };

  const handleCancelWorkout = async (workoutId: number) => {
    setCancellingWorkout(workoutId);
    setError('');
    setSuccessMessage('');
    try {
      const response = await workoutsApi.update(workoutId, {
        status: 'cancelled',
      });
      if (response.success) {
        setSuccessMessage('Workout cancelled successfully');
        await loadWorkouts();
        onWorkoutUpdate?.();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(response.error || 'Failed to cancel workout');
      }
    } catch {
      setError('Failed to cancel workout');
    } finally {
      setCancellingWorkout(null);
    }
  };

  const scheduledWorkouts = workouts.filter((w) => w.status === 'scheduled');
  const inProgressWorkouts = workouts.filter((w) => w.status === 'in_progress');
  const completedWorkouts = workouts.filter((w) => w.status === 'completed');
  const skippedWorkouts = workouts.filter(
    (w) => w.status === 'skipped' || w.status === 'cancelled'
  );

  const scheduledByWeek = useMemo(
    () => groupWorkoutsByWeek(scheduledWorkouts),
    [scheduledWorkouts]
  );
  const inProgressByWeek = useMemo(
    () => groupWorkoutsByWeek(inProgressWorkouts),
    [inProgressWorkouts]
  );
  const completedByWeek = useMemo(
    () => groupWorkoutsByWeek(completedWorkouts),
    [completedWorkouts]
  );
  const skippedByWeek = useMemo(
    () => groupWorkoutsByWeek(skippedWorkouts),
    [skippedWorkouts]
  );

  const weekProgressPercent = useMemo(() => {
    if (!weekStatus || weekStatus.total_workouts <= 0) return 0;
    return (weekStatus.completed_workouts / weekStatus.total_workouts) * 100;
  }, [weekStatus]);

  const getStatusBadge = (status: Workout['status']) => {
    switch (status) {
      case 'scheduled':
        return (
          <Badge
            variant="outline"
            className="border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
          >
            Scheduled
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge className="bg-amber-500/90 text-amber-50 hover:bg-amber-500/90">
            In progress
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="secondary" className="bg-muted">
            Completed
          </Badge>
        );
      case 'skipped':
        return <Badge variant="secondary">Skipped</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelled</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const cardAccent = (status: Workout['status']) => {
    switch (status) {
      case 'scheduled':
        return 'border-l-emerald-500';
      case 'in_progress':
        return 'border-l-amber-500';
      case 'completed':
        return 'border-l-primary/50';
      default:
        return 'border-l-muted-foreground/30';
    }
  };

  const WorkoutCard = ({ workout }: { workout: Workout }) => (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-border/80 bg-card shadow-sm transition-colors hover:bg-muted/20',
        'border-l-4',
        cardAccent(workout.status)
      )}
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              W{workout.week_number} · S{workout.session_number}
            </span>
            {getStatusBadge(workout.status)}
          </div>
          <h4 className="text-base font-semibold leading-snug text-foreground">
            {workout.workout_name ||
              `Week ${workout.week_number}, Session ${workout.session_number}`}
          </h4>
          {workout.workout_data.focus_areas &&
            workout.workout_data.focus_areas.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {workout.workout_data.focus_areas.map((area) => (
                  <span
                    key={area}
                    className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                  >
                    {area}
                  </span>
                ))}
              </div>
            )}
          {workout.scheduled_date && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              {new Date(workout.scheduled_date).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:w-[min(100%,12rem)] sm:items-stretch">
          {workout.status === 'scheduled' && (
            <>
              <Button
                size="default"
                className="w-full gap-2 font-semibold shadow-sm"
                onClick={() => handleStartWorkout(workout.id)}
                disabled={startingWorkout === workout.id}
              >
                {startingWorkout === workout.id ? (
                  <>
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    Starting…
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 shrink-0 fill-current" />
                    Start session
                  </>
                )}
              </Button>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleEditWorkout(workout.id)}
                >
                  <Edit className="mr-1.5 h-3.5 w-3.5" />
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      disabled={skippingWorkout === workout.id}
                    >
                      {skippingWorkout === workout.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <SkipForward className="mr-1.5 h-3.5 w-3.5" />
                          Skip
                        </>
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Skip workout</AlertDialogTitle>
                      <AlertDialogDescription>
                        Skipped workouts still count toward week completion when
                        that applies to your program.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel
                        disabled={skippingWorkout === workout.id}
                      >
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleSkipWorkout(workout.id)}
                        disabled={skippingWorkout === workout.id}
                      >
                        {skippingWorkout === workout.id
                          ? 'Skipping…'
                          : 'Skip workout'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          )}
          {workout.status === 'in_progress' && (
            <>
              <Button
                size="default"
                variant="default"
                className="w-full gap-2 bg-amber-600 font-semibold hover:bg-amber-600/90"
                onClick={() => handleContinueWorkout(workout.id)}
              >
                <Clock className="h-4 w-4 shrink-0" />
                Continue session
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground"
                    disabled={cancellingWorkout === workout.id}
                  >
                    {cancellingWorkout === workout.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Cancelling…
                      </>
                    ) : (
                      <>
                        <X className="mr-2 h-4 w-4" />
                        Cancel session
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel session?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cancelled sessions do not count toward week completion.
                      You can start this workout again later.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel
                      disabled={cancellingWorkout === workout.id}
                    >
                      Keep going
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleCancelWorkout(workout.id)}
                      disabled={cancellingWorkout === workout.id}
                    >
                      {cancellingWorkout === workout.id
                        ? 'Cancelling…'
                        : 'Cancel session'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          {workout.status === 'completed' && (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => handleViewWorkout(workout.id)}
            >
              <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              View log
            </Button>
          )}
          {(workout.status === 'skipped' || workout.status === 'cancelled') && (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => handleViewWorkout(workout.id)}
            >
              View details
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  const WeekGroups = ({
    groups,
    emptyLabel,
  }: {
    groups: [number, Workout[]][];
    emptyLabel: string;
  }) => {
    if (groups.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 px-6 py-12 text-center">
          <Dumbbell className="h-10 w-10 text-muted-foreground/50" />
          <p className="mt-3 text-sm font-medium text-foreground">
            {emptyLabel}
          </p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Sessions appear here as you generate them from the plan above.
          </p>
        </div>
      );
    }
    return (
      <div className="space-y-8">
        {groups.map(([week, items]) => (
          <div key={week} className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Week {week}
              </span>
              {week === currentWeek && (
                <Badge
                  variant="secondary"
                  className="h-5 text-[10px] font-semibold uppercase"
                >
                  Current phase
                </Badge>
              )}
              <Separator className="hidden min-w-[2rem] flex-1 sm:block" />
            </div>
            <div className="space-y-3">
              {items.map((workout) => (
                <WorkoutCard key={workout.id} workout={workout} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (!recommendation) {
    return (
      <Card className="overflow-hidden border-dashed">
        <CardHeader>
          <CardTitle>Workouts</CardTitle>
          <CardDescription>
            Training sessions for the locked plan — after coach &amp; initial
            plan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Lock an initial plan in Coach &amp; plan first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm ring-1 ring-border/40">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-primary/[0.07] via-transparent to-transparent dark:from-primary/15"
        aria-hidden
      />
      <div className="relative">
        <CardHeader className="space-y-6 pb-2">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
                  <Activity className="h-3 w-3" />
                  Training
                </span>
                {recommendation.status === 'active' ? (
                  <Badge variant="outline" className="text-xs">
                    Active client
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    Draft plan
                  </Badge>
                )}
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight">
                Workouts
              </CardTitle>
              <CardDescription className="max-w-xl text-base leading-relaxed">
                {recommendation.status === 'active'
                  ? 'Run sessions from the locked plan and track week-by-week progress.'
                  : 'Generate sessions from the plan, then activate the client when they should start training.'}
              </CardDescription>
            </div>

            {weekStatus && weekStatus.total_workouts > 0 && (
              <div className="flex w-full flex-col gap-4 rounded-2xl border border-border/60 bg-muted/30 p-4 sm:max-w-md lg:max-w-sm">
                <div className="flex items-center gap-4">
                  <WeekProgressRing percent={weekProgressPercent} />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Week {currentWeek}
                    </p>
                    <p className="text-lg font-bold leading-tight text-foreground">
                      {weekStatus.completed_workouts} of{' '}
                      {weekStatus.total_workouts} sessions done
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {weekStatus.is_complete
                        ? 'Nice work — this week is complete.'
                        : 'Finish scheduled sessions to close the week.'}
                    </p>
                  </div>
                </div>
                <Progress value={weekProgressPercent} className="h-2" />
              </div>
            )}
          </div>

          {workouts.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/80 p-3 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/15 text-violet-600 dark:text-violet-400">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Upcoming
                  </p>
                  <p className="text-xl font-bold tabular-nums">
                    {scheduledWorkouts.length}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/80 p-3 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    In progress
                  </p>
                  <p className="text-xl font-bold tabular-nums">
                    {inProgressWorkouts.length}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/80 p-3 shadow-sm">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Completed
                  </p>
                  <p className="text-xl font-bold tabular-nums">
                    {completedWorkouts.length}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-8 pt-0">
          <GenerateWorkoutsPanel
            clientId={clientId}
            recommendation={recommendation}
            onSaved={async () => {
              await loadWorkouts();
              onWorkoutUpdate?.();
            }}
          />

          {recommendation.status !== 'active' && (
            <Alert>
              <AlertDescription className="text-sm leading-relaxed">
                Activate this client when they should start executing sessions.
                You can still generate and edit workouts while the plan is in
                draft.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert className="border-emerald-500/40 bg-emerald-500/5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="text-emerald-800 dark:text-emerald-300">
                {successMessage}
              </AlertDescription>
            </Alert>
          )}

          {inProgressWorkouts.length > 0 && (
            <Alert className="border-amber-500/35 bg-amber-500/[0.06]">
              <Clock className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm text-amber-950 dark:text-amber-100">
                You have a session in progress — use{' '}
                <span className="font-semibold">Continue session</span> below or
                open the Active tab.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              Your schedule
            </h3>
            <p className="text-xs text-muted-foreground">
              Organized by week. Start from the top when you are ready to train.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-9 w-9 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs defaultValue="upcoming" className="w-full">
              <TabsList className="grid h-auto w-full grid-cols-2 gap-1.5 rounded-xl bg-muted/80 p-1.5 sm:grid-cols-4">
                <TabsTrigger
                  value="upcoming"
                  className="gap-1.5 rounded-lg py-2.5 text-xs font-semibold data-[state=active]:shadow-sm sm:text-sm"
                >
                  <Calendar className="hidden h-3.5 w-3.5 sm:inline" />
                  Upcoming
                  <span className="tabular-nums text-muted-foreground">
                    ({scheduledWorkouts.length})
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="in-progress"
                  className="gap-1.5 rounded-lg py-2.5 text-xs font-semibold data-[state=active]:shadow-sm sm:text-sm"
                >
                  <Activity className="hidden h-3.5 w-3.5 sm:inline" />
                  Active
                  <span className="tabular-nums text-muted-foreground">
                    ({inProgressWorkouts.length})
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="completed"
                  className="gap-1.5 rounded-lg py-2.5 text-xs font-semibold data-[state=active]:shadow-sm sm:text-sm"
                >
                  <CheckCircle2 className="hidden h-3.5 w-3.5 sm:inline" />
                  Done
                  <span className="tabular-nums text-muted-foreground">
                    ({completedWorkouts.length})
                  </span>
                </TabsTrigger>
                <TabsTrigger
                  value="skipped"
                  className="gap-1.5 rounded-lg py-2.5 text-xs font-semibold data-[state=active]:shadow-sm sm:text-sm"
                >
                  <SkipForward className="hidden h-3.5 w-3.5 sm:inline" />
                  Skipped
                  <span className="tabular-nums text-muted-foreground">
                    ({skippedWorkouts.length})
                  </span>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="upcoming" className="mt-6 space-y-4">
                <WeekGroups
                  groups={scheduledByWeek}
                  emptyLabel="No upcoming workouts"
                />
              </TabsContent>
              <TabsContent value="in-progress" className="mt-6 space-y-4">
                <WeekGroups
                  groups={inProgressByWeek}
                  emptyLabel="No session in progress"
                />
              </TabsContent>
              <TabsContent value="completed" className="mt-6 space-y-4">
                <WeekGroups
                  groups={completedByWeek}
                  emptyLabel="No completed workouts yet"
                />
              </TabsContent>
              <TabsContent value="skipped" className="mt-6 space-y-4">
                <WeekGroups
                  groups={skippedByWeek}
                  emptyLabel="No skipped or cancelled workouts"
                />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </div>
    </div>
  );
}
