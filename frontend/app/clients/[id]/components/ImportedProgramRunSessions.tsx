'use client';

import { Clock, Loader2, Play } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { type Workout, workoutsApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { isSessionReady, sortWorkoutsForBuilder } from './imported-program-utils';

interface ImportedProgramRunSessionsProps {
  clientId: number;
  workouts: Workout[];
  onSessionsChange: () => void | Promise<void>;
}

export function ImportedProgramRunSessions({
  clientId,
  workouts,
  onSessionsChange,
}: ImportedProgramRunSessionsProps) {
  const router = useRouter();
  const [startingId, setStartingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const inProgress = workouts.filter((w) => w.status === 'in_progress');
  const readyScheduled = sortWorkoutsForBuilder(
    workouts.filter((w) => w.status === 'scheduled' && isSessionReady(w))
  );

  if (inProgress.length === 0 && readyScheduled.length === 0) {
    return null;
  }

  const handleStart = async (workoutId: number) => {
    setStartingId(workoutId);
    setError('');
    const res = await workoutsApi.start(workoutId);
    if (res.success) {
      await onSessionsChange();
      router.push(`/clients/${clientId}/workouts/${workoutId}/execute`);
    } else {
      setError(res.error || 'Could not start session');
    }
    setStartingId(null);
  };

  const editHref = (workoutId: number) =>
    `/clients/${clientId}/workouts/${workoutId}/edit?tab=workouts&imported=1`;

  return (
    <div className="space-y-4 border-t border-border/80 pt-6">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">Run sessions</h3>
        <p className="text-sm text-muted-foreground">
          Start training when a session has exercises.
        </p>
      </div>

      {error ? (
        <div role="alert" aria-live="assertive" aria-atomic="true">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : null}

      <div className="space-y-3">
        {inProgress.map((workout) => (
          <div
            key={workout.id}
            className="flex flex-col gap-3 rounded-xl border border-warning/40 bg-warning/5 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">
                  Week {workout.week_number} · Session {workout.session_number}
                </span>
                <Badge className="bg-warning/15 text-warning hover:bg-warning/15">
                  In progress
                </Badge>
              </div>
              <p className="font-medium text-foreground">
                {workout.workout_name ||
                  `Week ${workout.week_number}, Session ${workout.session_number}`}
              </p>
            </div>
            <Button
              className="w-full shrink-0 gap-2 bg-warning font-semibold text-foreground hover:bg-warning/90 sm:w-auto"
              onClick={() =>
                router.push(
                  `/clients/${clientId}/workouts/${workout.id}/execute`
                )
              }
            >
              <Clock className="h-4 w-4" />
              Continue session
            </Button>
          </div>
        ))}

        {inProgress.length > 0 && readyScheduled.length > 0 ? (
          <Separator />
        ) : null}

        {readyScheduled.map((workout) => (
          <div
            key={workout.id}
            className={cn(
              'flex flex-col gap-3 rounded-xl border border-border/80 p-4 sm:flex-row sm:items-center sm:justify-between'
            )}
          >
            <div className="min-w-0 space-y-1">
              <span className="font-mono text-xs text-muted-foreground">
                Week {workout.week_number} · Session {workout.session_number}
              </span>
              <p className="font-medium text-foreground">
                {workout.workout_name ||
                  `Week ${workout.week_number}, Session ${workout.session_number}`}
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[12rem]">
              <Button
                className="w-full gap-2"
                disabled={startingId === workout.id}
                onClick={() => void handleStart(workout.id)}
              >
                {startingId === workout.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                    Starting…
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current" />
                    Start session
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link href={editHref(workout.id)}>Edit session</Link>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
