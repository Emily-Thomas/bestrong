'use client';

import { CheckCircle2, Copy, Loader2, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  clientsApi,
  type Recommendation,
  recommendationsApi,
  type Workout,
} from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  builderProgress,
  findNextEmptyWorkout,
  findWorkoutInGrid,
  getProgramDimensions,
  isSessionReady,
} from './imported-program-utils';
import { ImportedProgramRunSessions } from './ImportedProgramRunSessions';

interface ImportedProgramBuilderProps {
  clientId: number;
  recommendation: Recommendation;
  onWorkoutsPresenceChange?: (hasWorkouts: boolean) => void;
  onWorkoutsUpdated?: (workouts: Workout[]) => void;
  onBuilderProgressChange?: (progress: { ready: number; total: number }) => void;
}

export function ImportedProgramBuilder({
  clientId,
  recommendation,
  onWorkoutsPresenceChange,
  onWorkoutsUpdated,
  onBuilderProgressChange,
}: ImportedProgramBuilderProps) {
  const progressLabelId = useId();
  const gridCaptionId = useId();
  const { phaseWeeks, sessionsPerWeek } = getProgramDimensions(recommendation);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [ensuringSlots, setEnsuringSlots] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [copyOpen, setCopyOpen] = useState(false);
  const [copySourceWeek, setCopySourceWeek] = useState(1);
  const [copyTargets, setCopyTargets] = useState<Record<number, boolean>>({});
  const [copying, setCopying] = useState(false);
  const sessionsEnsuredRef = useRef(false);
  const lastProgressSent = useRef({ ready: -1, total: -1 });
  const [focusWeek, setFocusWeek] = useState(1);

  const editHref = (workoutId: number) =>
    `/clients/${clientId}/workouts/${workoutId}/edit?tab=workouts&imported=1`;

  const fetchWorkouts = useCallback(async () => {
    const res = await recommendationsApi.getWorkouts(recommendation.id);
    if (res.success && res.data) {
      setWorkouts(res.data);
      onWorkoutsUpdated?.(res.data);
      onWorkoutsPresenceChange?.(res.data.length > 0);
      return true;
    }
    setError(res.error || 'Could not load sessions');
    return false;
  }, [recommendation.id, onWorkoutsPresenceChange, onWorkoutsUpdated]);

  const ensureAndLoadWorkouts = useCallback(
    async (options?: { forceEnsure?: boolean }) => {
      setLoading(true);
      setError('');
      try {
        if (options?.forceEnsure || !sessionsEnsuredRef.current) {
          const ensureRes = await clientsApi.ensureImportedProgramSessions(
            clientId,
            recommendation.id
          );
          if (!ensureRes.success) {
            setError(ensureRes.error || 'Could not create program sessions');
            return;
          }
          sessionsEnsuredRef.current = true;
        }
        await fetchWorkouts();
      } catch {
        setError('Could not load sessions');
      } finally {
        setLoading(false);
      }
    },
    [clientId, recommendation.id, fetchWorkouts]
  );

  const refreshWorkouts = useCallback(async () => {
    setError('');
    try {
      await fetchWorkouts();
    } catch {
      setError('Could not load sessions');
    }
  }, [fetchWorkouts]);

  useEffect(() => {
    sessionsEnsuredRef.current = false;
    void ensureAndLoadWorkouts();
  }, [ensureAndLoadWorkouts]);

  useEffect(() => {
    const refreshOnReturn = () => {
      if (document.visibilityState === 'visible') {
        void refreshWorkouts();
      }
    };
    document.addEventListener('visibilitychange', refreshOnReturn);
    return () =>
      document.removeEventListener('visibilitychange', refreshOnReturn);
  }, [refreshWorkouts]);

  const progress = useMemo(() => builderProgress(workouts), [workouts]);

  useEffect(() => {
    if (
      lastProgressSent.current.ready === progress.ready &&
      lastProgressSent.current.total === progress.total
    ) {
      return;
    }
    lastProgressSent.current = {
      ready: progress.ready,
      total: progress.total,
    };
    onBuilderProgressChange?.({
      ready: progress.ready,
      total: progress.total,
    });
  }, [progress.ready, progress.total, onBuilderProgressChange]);
  const nextEmpty = useMemo(() => findNextEmptyWorkout(workouts), [workouts]);
  const weekNumbers = useMemo(
    () => Array.from({ length: phaseWeeks }, (_, i) => i + 1),
    [phaseWeeks]
  );
  const sessionNumbers = useMemo(
    () => Array.from({ length: sessionsPerWeek }, (_, i) => i + 1),
    [sessionsPerWeek]
  );

  const handleEnsureMissingSlots = async () => {
    setEnsuringSlots(true);
    setError('');
    await ensureAndLoadWorkouts({ forceEnsure: true });
    setEnsuringSlots(false);
  };

  const defaultCopySourceWeek =
    nextEmpty?.week_number ?? copySourceWeek ?? 1;

  const openCopyDialog = (sourceWeek: number) => {
    setCopySourceWeek(sourceWeek);
    const targets: Record<number, boolean> = {};
    for (let w = 1; w <= phaseWeeks; w++) {
      if (w !== sourceWeek) targets[w] = w === sourceWeek + 1;
    }
    setCopyTargets(targets);
    setCopyOpen(true);
  };

  const toggleCopyTarget = (week: number, checked: boolean) => {
    setCopyTargets((prev) => ({ ...prev, [week]: checked }));
  };

  const selectAllCopyTargets = () => {
    const next: Record<number, boolean> = {};
    for (let w = 1; w <= phaseWeeks; w++) {
      if (w !== copySourceWeek) next[w] = true;
    }
    setCopyTargets(next);
  };

  const handleCloneWeek = async () => {
    const target_weeks = Object.entries(copyTargets)
      .filter(([, on]) => on)
      .map(([w]) => parseInt(w, 10));
    if (target_weeks.length === 0) {
      setError('Select at least one week to copy into');
      return;
    }
    setCopying(true);
    setError('');
    const res = await clientsApi.cloneImportedProgramWeek(clientId, {
      recommendation_id: recommendation.id,
      source_week: copySourceWeek,
      target_weeks,
    });
    if (res.success && res.data) {
      setWorkouts(res.data.workouts);
      onWorkoutsUpdated?.(res.data.workouts);
      setSuccessMessage(
        `Copied week ${copySourceWeek} into ${res.data.updated} session(s)`
      );
      setCopyOpen(false);
      setTimeout(() => setSuccessMessage(''), 4000);
    } else {
      setError(res.error || 'Could not copy week');
    }
    setCopying(false);
  };

  const handleQuickCopyRest = async (sourceWeek: number) => {
    if (sourceWeek >= phaseWeeks) return;
    setCopying(true);
    setError('');
    const res = await clientsApi.cloneImportedProgramWeek(clientId, {
      recommendation_id: recommendation.id,
      source_week: sourceWeek,
      target_week_from: sourceWeek + 1,
      target_week_to: phaseWeeks,
    });
    if (res.success && res.data) {
      setWorkouts(res.data.workouts);
      onWorkoutsUpdated?.(res.data.workouts);
      setSuccessMessage(
        `Week ${sourceWeek} copied to weeks ${sourceWeek + 1}–${phaseWeeks}`
      );
      setTimeout(() => setSuccessMessage(''), 4000);
    } else {
      setError(res.error || 'Could not copy weeks');
    }
    setCopying(false);
  };

  const renderSessionSlot = (week: number, session: number) => {
    const workout = findWorkoutInGrid(workouts, week, session);
    const ready = workout ? isSessionReady(workout) : false;
    const count = workout ? (workout.workout_data?.exercises?.length ?? 0) : 0;
    const missing = !workout;
    const slotTitle =
      workout?.workout_name ?? `Week ${week}, session ${session}`;

    if (missing) {
      return (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-2 py-3 text-center">
          <span className="text-xs text-muted-foreground">Slot missing</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 text-xs"
            disabled={ensuringSlots}
            onClick={() => void handleEnsureMissingSlots()}
          >
            {ensuringSlots ? (
              <Loader2
                className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none"
                aria-hidden
              />
            ) : (
              'Create slot'
            )}
          </Button>
        </div>
      );
    }

    return (
      <Link
        href={editHref(workout.id)}
        aria-label={
          ready
            ? `Edit ${slotTitle}, ${count} exercises`
            : `Add exercises to ${slotTitle}`
        }
        className={cn(
          'flex min-h-11 flex-col gap-1 rounded-lg border px-3 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          ready
            ? 'border-success/35 bg-success/5'
            : 'border-border/80 bg-card'
        )}
      >
        <span className="text-xs font-medium text-foreground line-clamp-2">
          {slotTitle}
        </span>
        <span
          className={cn(
            'text-xs',
            ready ? 'text-success' : 'text-muted-foreground'
          )}
        >
          {ready
            ? `${count} exercise${count === 1 ? '' : 's'}`
            : 'Add exercises'}
        </span>
        <span className="sr-only">Open session editor</span>
      </Link>
    );
  };

  return (
    <div className="space-y-6">
      {error ? (
        <div role="alert" aria-live="assertive" aria-atomic="true">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      ) : null}
      {successMessage ? (
        <Alert variant="success">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      ) : null}

      <Card className="border-border/80 shadow-sm">
        <CardHeader className="space-y-4 pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <CardTitle className="text-xl text-balance">Program builder</CardTitle>
              <CardDescription className="max-w-xl">
                Build every session in the grid. Fill week 1, then copy it across
                later weeks and tweak as needed.
              </CardDescription>
            </div>
            <div className="w-full space-y-2 lg:max-w-xs">
              <div className="flex items-center justify-between text-sm">
                <span
                  id={progressLabelId}
                  className="font-medium text-foreground"
                >
                  {progress.ready} of {progress.total} sessions ready
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {Math.round(progress.percent)}%
                </span>
              </div>
              <Progress
                value={progress.percent}
                className="h-2"
                aria-labelledby={progressLabelId}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {nextEmpty ? (
              <Button className="gap-2" asChild>
                <Link href={editHref(nextEmpty.id)}>
                  <Pencil className="h-4 w-4" />
                  Edit next session
                  <span className="font-normal text-primary-foreground/80">
                    (W{nextEmpty.week_number} · S{nextEmpty.session_number})
                  </span>
                </Link>
              </Button>
            ) : (
              <Badge variant="secondary" className="w-fit gap-1 py-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                All sessions have exercises
              </Badge>
            )}
            <Button
              type="button"
              variant="secondary"
              className="gap-2"
              disabled={copying || phaseWeeks < 2}
              onClick={() => openCopyDialog(defaultCopySourceWeek)}
            >
              <Copy className="h-4 w-4" />
              Copy week to other weeks
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {loading ? (
            <div
              className="flex flex-col items-center justify-center gap-2 py-16"
              aria-live="polite"
              aria-busy="true"
            >
              <Loader2
                className="h-8 w-8 animate-spin text-primary motion-reduce:animate-none"
                aria-hidden
              />
              <span className="sr-only">Loading program sessions</span>
            </div>
          ) : (
            <>
            <div className="space-y-4 md:hidden">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-2 sm:min-w-[10rem]">
                  <Label htmlFor="mobile-focus-week">View week</Label>
                  <Select
                    value={String(focusWeek)}
                    onValueChange={(v) => setFocusWeek(parseInt(v, 10))}
                  >
                    <SelectTrigger id="mobile-focus-week">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {weekNumbers.map((w) => (
                        <SelectItem key={w} value={String(w)}>
                          Week {w}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {focusWeek < phaseWeeks ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="min-h-11"
                    disabled={copying}
                    onClick={() => void handleQuickCopyRest(focusWeek)}
                  >
                    Copy week {focusWeek} to rest
                  </Button>
                ) : null}
              </div>
              <ul className="space-y-3">
                {sessionNumbers.map((session) => (
                  <li key={session} className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      Session {session}
                    </span>
                    {renderSessionSlot(focusWeek, session)}
                  </li>
                ))}
              </ul>
            </div>

            <section
              className="hidden overflow-x-auto rounded-xl border border-border/80 md:block"
              aria-label={`Program grid: ${phaseWeeks} weeks, ${sessionsPerWeek} sessions per week`}
            >
              <table
                className="w-full min-w-[640px] border-collapse text-sm"
                aria-describedby={gridCaptionId}
              >
                <caption id={gridCaptionId} className="sr-only">
                  {phaseWeeks} weeks with {sessionsPerWeek} training sessions
                  each. Select a cell to add or edit exercises.
                </caption>
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th
                      scope="col"
                      className="sticky left-0 z-10 bg-muted/40 px-3 py-3 text-left font-medium text-muted-foreground"
                    >
                      Session
                    </th>
                    {weekNumbers.map((week) => (
                      <th
                        key={week}
                        scope="col"
                        className="min-w-[7.5rem] px-2 py-3 text-center"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-semibold text-foreground">
                            Week {week}
                          </span>
                          {week < phaseWeeks ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="min-h-11 px-3 text-xs text-muted-foreground hover:text-foreground"
                              disabled={copying}
                              onClick={() => void handleQuickCopyRest(week)}
                            >
                              Copy → rest
                            </Button>
                          ) : null}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessionNumbers.map((session) => (
                    <tr
                      key={session}
                      className="border-b border-border/60 last:border-0"
                    >
                      <th
                        scope="row"
                        className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-medium text-foreground"
                      >
                        Session {session}
                      </th>
                      {weekNumbers.map((week) => (
                          <td key={`${week}-${session}`} className="p-2">
                            {renderSessionSlot(week, session)}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            {!loading && phaseWeeks >= 2 ? (
              <p className="mt-4 hidden text-xs text-muted-foreground md:block">
                Fill week 1, then use{' '}
                <span className="font-medium text-foreground">Copy → rest</span>{' '}
                on a column header to duplicate across later weeks.
              </p>
            ) : null}
            </>
          )}

          {!loading ? (
            <ImportedProgramRunSessions
              clientId={clientId}
              workouts={workouts}
              onSessionsChange={refreshWorkouts}
            />
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Copy week across the block</DialogTitle>
            <DialogDescription>
              Copies exercises and session names from the source week into the
              same session slots on each target week.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="copy-source-week">Source week</Label>
              <Select
                value={String(copySourceWeek)}
                onValueChange={(v) => setCopySourceWeek(parseInt(v, 10))}
              >
                <SelectTrigger id="copy-source-week">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {weekNumbers.map((w) => (
                    <SelectItem key={w} value={String(w)}>
                      Week {w}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Copy into</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={selectAllCopyTargets}
                >
                  Select all other weeks
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {weekNumbers
                  .filter((w) => w !== copySourceWeek)
                  .map((w) => (
                    <label
                      key={w}
                      htmlFor={`copy-week-${w}`}
                      className="flex cursor-pointer items-center gap-2 rounded-md border border-border/70 px-3 py-2 hover:bg-muted/30"
                    >
                      <Checkbox
                        id={`copy-week-${w}`}
                        checked={Boolean(copyTargets[w])}
                        onCheckedChange={(c) =>
                          toggleCopyTarget(w, c === true)
                        }
                      />
                      <span className="text-sm">Week {w}</span>
                    </label>
                  ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCopyOpen(false)}
              disabled={copying}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void handleCloneWeek()}
              disabled={copying}
            >
              {copying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Copying…
                </>
              ) : (
                'Copy week'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
