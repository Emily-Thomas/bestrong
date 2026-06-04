'use client';

import { Clock, Dumbbell, Hash, RefreshCw, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Exercise } from '@/lib/api';
import {
  GROUP_BLOCK_SHELL_CLASS,
  GroupBlockHeader,
  GroupThenConnector,
  STANDALONE_BLOCK_SHELL_CLASS,
  StandaloneBlockHeader,
  WORKOUT_SEGMENT_LIST_CLASS,
} from '@/components/workout/exercise-group-visuals';
import {
  blockLetterForSegmentIndex,
  formatRestAfterGroup,
  restAfterGroupSeconds,
  segmentExercises,
} from '@/lib/exercise-groups';
import { cn } from '@/lib/utils';
import {
  categorizeMuscle,
  estimateSessionMinutes,
  MUSCLE_CATEGORY_META,
} from '../workout-review-utils';
import { MuscleBodyDiagram } from './MuscleBodyDiagram';

interface SessionWorkoutCardProps {
  workout: {
    id: number;
    week_number: number;
    session_number: number;
    workout_name?: string;
    workout_data: { exercises?: Exercise[] };
    workout_reasoning?: string;
  };
  sessionsInWeek: number;
  onSwap: (exerciseIndex: number, exercise: Exercise) => void;
}

export function SessionWorkoutCard({
  workout,
  sessionsInWeek,
  onSwap,
}: SessionWorkoutCardProps) {
  const exercises = workout.workout_data.exercises ?? [];
  const segments = segmentExercises(exercises);
  const duration = estimateSessionMinutes(exercises);
  const title = workout.workout_name ?? `Session ${workout.session_number}`;

  return (
    <Card className="overflow-hidden border border-border/70 bg-card shadow-sm transition-colors hover:bg-muted/20">
      <CardHeader className="space-y-3 border-b border-border/50 bg-muted/20 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="secondary"
                className="rounded-md px-2 py-0.5 font-mono text-xs"
              >
                <Hash className="mr-1 inline h-3 w-3 opacity-70" aria-hidden />
                Session {workout.session_number}
              </Badge>
              <span className="text-xs font-medium text-muted-foreground">
                Week {workout.week_number} · Session {workout.session_number} of{' '}
                {sessionsInWeek}
              </span>
            </div>
            <h3 className="text-lg font-semibold leading-tight tracking-tight text-foreground sm:text-xl">
              {title}
            </h3>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground sm:text-sm">
              <span className="inline-flex items-center gap-1.5">
                <Dumbbell className="h-3.5 w-3.5 text-muted-foreground" />
                {exercises.length} exercises
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                ~{duration} min
              </span>
            </div>
          </div>
        </div>
        {exercises.length > 0 ? (
          <MuscleBodyDiagram exercises={exercises} />
        ) : null}
      </CardHeader>
      <CardContent className="p-4 sm:p-5">
        <ul className={cn(WORKOUT_SEGMENT_LIST_CLASS, 'p-0')}>
          {segments.map((segment, segmentIndex) => {
            const renderRow = (ex: Exercise, i: number, label: string) => {
            const cat = categorizeMuscle(
              ex.library_metadata?.primary_muscle_group ?? ex.name
            );
            const meta = MUSCLE_CATEGORY_META[cat];
            return (
              <div
                key={`${workout.id}-${i}-${ex.name}`}
                className="group flex flex-col gap-3 rounded-lg border border-border/80 bg-card p-4 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="flex shrink-0 items-start gap-3 sm:items-center">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/12 font-mono text-sm font-bold text-primary shadow-inner">
                    {label}
                  </span>
                  <div
                    className={cn(
                      'mt-1.5 hidden h-9 w-1 shrink-0 rounded-full sm:block',
                      meta.segment
                    )}
                    aria-hidden
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold leading-snug text-foreground">
                      {ex.name}
                    </p>
                    {ex.library_exercise_id ? (
                      <Badge
                        variant="outline"
                        className="h-5 border-primary/25 bg-primary/5 text-xs font-normal text-primary"
                      >
                        Library
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="h-5 text-xs font-normal"
                      >
                        Custom
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground sm:text-sm">
                    {ex.sets != null ? (
                      <span className="tabular-nums">{ex.sets} sets</span>
                    ) : null}
                    {ex.reps != null ? (
                      <span className="tabular-nums">{ex.reps} reps</span>
                    ) : null}
                    {ex.weight ? (
                      <span className="font-medium text-foreground/90">
                        {ex.weight}
                      </span>
                    ) : null}
                    {ex.rir != null ? (
                      <span className="tabular-nums">{ex.rir} RIR</span>
                    ) : null}
                    {ex.rest_seconds != null ? (
                      <span className="tabular-nums">
                        {ex.rest_seconds}s rest
                      </span>
                    ) : null}
                  </div>
                  {ex.notes ? (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {ex.notes}
                    </p>
                  ) : null}
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 gap-1.5 border-dashed border-primary/40 bg-background/80 text-primary hover:bg-primary/10"
                      onClick={() => onSwap(i, ex)}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Swap
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-[220px]">
                    Replace with a similar library exercise or search the full
                    catalog.
                  </TooltipContent>
                </Tooltip>
              </div>
            );
            };

            if (segment.kind === 'group') {
              const blockLetter = blockLetterForSegmentIndex(segmentIndex);
              const restHint = formatRestAfterGroup(
                restAfterGroupSeconds(segment.items)
              );
              const movementNames = segment.items.map(
                ({ exercise }) => exercise.name
              );
              return (
                <li key={segment.groupId} className="list-none">
                  <section className={GROUP_BLOCK_SHELL_CLASS}>
                    <GroupBlockHeader
                      blockLetter={blockLetter}
                      groupType={segment.groupType}
                      movementNames={movementNames}
                      restHint={restHint}
                    />
                    <ul className="flex flex-col px-3 py-2">
                      {segment.items.map(({ exercise, index }, pos) => (
                        <li key={`${workout.id}-g-${index}`} className="list-none">
                          {pos > 0 ? <GroupThenConnector /> : null}
                          {renderRow(
                            exercise,
                            index,
                            `${blockLetter}${pos + 1}`
                          )}
                        </li>
                      ))}
                    </ul>
                  </section>
                </li>
              );
            }

            const { exercise, index } = segment.items[0];
            return (
              <li key={`${workout.id}-s-${index}`} className="list-none">
                <section className={STANDALONE_BLOCK_SHELL_CLASS}>
                  <StandaloneBlockHeader
                    movementNumber={index + 1}
                    exerciseName={exercise.name}
                  />
                  {renderRow(exercise, index, String(index + 1))}
                </section>
              </li>
            );
          })}
        </ul>
        {workout.workout_reasoning?.trim() ? (
          <div className="border-t border-border/50 bg-muted/20 px-4 py-3 sm:px-5">
            <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500/90" />
              {workout.workout_reasoning}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
