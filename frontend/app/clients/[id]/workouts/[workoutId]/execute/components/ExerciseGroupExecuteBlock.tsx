'use client';

import {
  GROUP_BLOCK_SHELL_CLASS,
  GroupBlockHeader,
  GroupRestFooter,
  GroupThenConnector,
  STANDALONE_BLOCK_SHELL_CLASS,
  StandaloneBlockHeader,
  WORKOUT_SEGMENT_LIST_CLASS,
} from '@/components/workout/exercise-group-visuals';
import type { ActualExercisePerformance, Exercise } from '@/lib/api';
import {
  blockLetterForSegmentIndex,
  formatRestAfterGroup,
  getGroupRounds,
  restAfterGroupSeconds,
  type ExerciseSegment,
} from '@/lib/exercise-groups';
import { cn } from '@/lib/utils';
import { ExerciseLogCard, hasLoggedData } from './ExerciseLogCard';

type Proposed = {
  name: string;
  sets?: number;
  reps?: string | number;
  weight?: string;
  rir?: number;
};

interface ExerciseGroupExecuteBlockProps {
  segment: Extract<ExerciseSegment<ActualExercisePerformance>, { kind: 'group' }>;
  segmentIndex: number;
  proposedExercises: Exercise[];
  totalExercises: number;
  expandedExerciseIndex: number | null;
  onToggle: (index: number) => void;
  onUpdate: (index: number, updates: Partial<ActualExercisePerformance>) => void;
  onGoPrev: (index: number) => void;
  onGoNext: (index: number) => void;
  getStatus: (ex: ActualExercisePerformance) => 'completed' | 'pending';
}

export function ExerciseGroupExecuteBlock({
  segment,
  segmentIndex,
  proposedExercises,
  totalExercises,
  expandedExerciseIndex,
  onToggle,
  onUpdate,
  onGoPrev,
  onGoNext,
  getStatus,
}: ExerciseGroupExecuteBlockProps) {
  const blockLetter = blockLetterForSegmentIndex(segmentIndex);
  const restHint = formatRestAfterGroup(restAfterGroupSeconds(segment.items));
  const allLogged = segment.items.every(({ exercise }) =>
    hasLoggedData(exercise)
  );
  const movementNames = segment.items.map(
    ({ exercise }) => exercise.exercise_name
  );
  const blockRounds = getGroupRounds(
    segment.items.map(({ index }) => ({
      exercise: proposedExercises[index] ?? { name: '' },
      index,
    }))
  );

  return (
    <li className="list-none">
      <section
        className={cn(GROUP_BLOCK_SHELL_CLASS, allLogged && 'ring-success/30')}
        aria-label={`${segment.groupType} to log`}
      >
        <GroupBlockHeader
          blockLetter={blockLetter}
          groupType={segment.groupType}
          movementNames={movementNames}
          restHint={restHint}
          groupRounds={blockRounds}
          completed={allLogged}
        />

        <div className="flex flex-col px-3 py-3 sm:px-4">
          {segment.items.map(({ exercise, index }, posInGroup) => {
            const proposed = proposedExercises[index];
            const movementLabel = `${blockLetter}${posInGroup + 1}`;
            return (
              <div
                key={
                  exercise.exercise_instance_id ??
                  `${segment.groupId}-${index}-${exercise.exercise_name}`
                }
              >
                {posInGroup > 0 ? <GroupThenConnector /> : null}
                <div className="overflow-hidden rounded-lg border border-border/90 bg-card shadow-sm">
                  <ExerciseLogCard
                    exercise={exercise}
                    proposedExercise={proposed}
                    exerciseIndex={index}
                    totalExercises={totalExercises}
                  movementLabel={movementLabel}
                  inGroupBlock
                  blockRounds={blockRounds}
                  expanded={expandedExerciseIndex === index}
                    status={getStatus(exercise)}
                    onToggle={() => onToggle(index)}
                    onUpdate={(updates) => onUpdate(index, updates)}
                    onGoPrev={() => onGoPrev(index)}
                    onGoNext={() => onGoNext(index)}
                  />
                </div>
              </div>
            );
          })}
          <GroupRestFooter restHint={restHint} />
        </div>
      </section>
    </li>
  );
}

interface StandaloneExerciseExecuteBlockProps {
  exercise: ActualExercisePerformance;
  proposed?: Proposed;
  index: number;
  totalExercises: number;
  expanded: boolean;
  status: 'completed' | 'pending';
  onToggle: () => void;
  onUpdate: (updates: Partial<ActualExercisePerformance>) => void;
  onGoPrev: () => void;
  onGoNext: () => void;
}

export function StandaloneExerciseExecuteBlock({
  exercise,
  proposed,
  index,
  totalExercises,
  expanded,
  status,
  onToggle,
  onUpdate,
  onGoPrev,
  onGoNext,
}: StandaloneExerciseExecuteBlockProps) {
  return (
    <li className="list-none">
      <section className={STANDALONE_BLOCK_SHELL_CLASS}>
        <StandaloneBlockHeader
          movementNumber={index + 1}
          exerciseName={exercise.exercise_name}
        />
        <ExerciseLogCard
          exercise={exercise}
          proposedExercise={proposed}
          exerciseIndex={index}
          totalExercises={totalExercises}
          expanded={expanded}
          status={status}
          onToggle={onToggle}
          onUpdate={onUpdate}
          onGoPrev={onGoPrev}
          onGoNext={onGoNext}
        />
      </section>
    </li>
  );
}

export { WORKOUT_SEGMENT_LIST_CLASS };
