'use client';

import type { Exercise } from '@/lib/api';
import {
  blockLetterForSegmentIndex,
  formatGroupRoundsPrescription,
  formatRestAfterGroup,
  getGroupRounds,
  restAfterGroupSeconds,
  segmentExercises,
} from '@/lib/exercise-groups';
import { cn } from '@/lib/utils';
import {
  GROUP_BLOCK_SHELL_CLASS,
  GroupBlockHeader,
  GroupRestFooter,
  GroupThenConnector,
  STANDALONE_BLOCK_SHELL_CLASS,
  StandaloneBlockHeader,
  WORKOUT_SEGMENT_LIST_CLASS,
} from './exercise-group-visuals';

function PrescriptionLine({
  ex,
  hideSets = false,
}: {
  ex: Exercise;
  hideSets?: boolean;
}) {
  return (
    <div className="text-sm text-muted-foreground">
      {!hideSets && ex.sets != null && <span>{ex.sets} sets</span>}
      {ex.reps != null && (
        <span>
          {!hideSets && ex.sets != null ? ' · ' : ''}
          {ex.reps} reps
        </span>
      )}
      {ex.weight && <span> · {ex.weight}</span>}
      {ex.rir !== undefined && <span> · RIR {ex.rir}</span>}
      {ex.rest_seconds != null && <span> · {ex.rest_seconds}s rest</span>}
    </div>
  );
}

interface WorkoutExerciseListProps {
  exercises: Exercise[];
  className?: string;
}

export function WorkoutExerciseList({
  exercises,
  className,
}: WorkoutExerciseListProps) {
  const segments = segmentExercises(exercises);

  if (segments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No exercises in this session.</p>
    );
  }

  return (
    <ul className={cn(WORKOUT_SEGMENT_LIST_CLASS, 'p-0', className)}>
      {segments.map((segment, segmentIndex) => {
        if (segment.kind === 'group') {
          const blockLetter = blockLetterForSegmentIndex(segmentIndex);
          const restHint = formatRestAfterGroup(
            restAfterGroupSeconds(segment.items)
          );
          const groupRounds = getGroupRounds(segment.items);
          const roundsSummary = formatGroupRoundsPrescription(
            groupRounds,
            segment.groupType,
            segment.items.length
          );
          const movementNames = segment.items.map(({ exercise }) => exercise.name);

          return (
            <li key={segment.groupId} className="list-none">
              <section className={GROUP_BLOCK_SHELL_CLASS}>
                <GroupBlockHeader
                  blockLetter={blockLetter}
                  groupType={segment.groupType}
                  movementNames={movementNames}
                  groupRounds={groupRounds}
                />
                {roundsSummary ? (
                  <p className="border-b border-primary/10 px-4 py-2 text-xs font-medium text-foreground sm:px-5">
                    {roundsSummary}
                  </p>
                ) : null}
                <div className="flex flex-col px-3 py-3">
                  {segment.items.map(({ exercise, index }, pos) => (
                    <div key={exercise.exercise_instance_id ?? `g-${index}`}>
                      {pos > 0 ? <GroupThenConnector /> : null}
                      <div className="rounded-lg border border-border/90 bg-card px-3 py-2.5">
                        <p className="font-medium text-foreground">
                          <span className="mr-2 font-mono text-xs font-bold text-primary">
                            {blockLetter}
                            {pos + 1}
                          </span>
                          {exercise.name}
                        </p>
                        <PrescriptionLine ex={exercise} hideSets />
                        {exercise.notes ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {exercise.notes}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  <GroupRestFooter restHint={restHint} />
                </div>
              </section>
            </li>
          );
        }

        const { exercise, index } = segment.items[0];
        return (
          <li key={exercise.exercise_instance_id ?? `s-${index}`} className="list-none">
            <section className={STANDALONE_BLOCK_SHELL_CLASS}>
              <StandaloneBlockHeader
                movementNumber={index + 1}
                exerciseName={exercise.name}
              />
              <div className="px-4 py-3">
                <p className="font-medium text-foreground">{exercise.name}</p>
                <PrescriptionLine ex={exercise} />
                {exercise.notes ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {exercise.notes}
                  </p>
                ) : null}
              </div>
            </section>
          </li>
        );
      })}
    </ul>
  );
}
