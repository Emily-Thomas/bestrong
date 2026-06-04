'use client';

import { BookOpen, Unlink } from 'lucide-react';
import {
  GROUP_BLOCK_SHELL_CLASS,
  GroupBlockHeader,
  GroupRestFooter,
} from '@/components/workout/exercise-group-visuals';
import { Button } from '@/components/ui/button';
import type { Exercise } from '@/lib/api';
import {
  blockLetterForSegmentIndex,
  formatRestAfterGroup,
  getGroupRounds,
  restAfterGroupSeconds,
  type ExerciseSegment,
} from '@/lib/exercise-groups';
import { EDIT_GROUP_INNER_BODY, EDIT_GROUP_MOVEMENTS_STACK } from '../lib/edit-ui-classes';
import { GroupBlockPrescription } from './GroupBlockPrescription';
import { cn } from '@/lib/utils';
import { touchActionClass } from '@/lib/touch-targets';
import { ExerciseRow } from './ExerciseRow';

interface ExerciseGroupBlockProps {
  segment: Extract<ExerciseSegment<Exercise>, { kind: 'group' }>;
  segmentIndex: number;
  compactPrescription?: boolean;
  onUpdateAtIndex: (index: number, updates: Partial<Exercise>) => void;
  onReplaceAtIndex: (index: number) => void;
  onRemoveAtIndex: (index: number) => void;
  onUnlinkAtIndex: (index: number) => void;
  onDissolveGroup: (groupId: string) => void;
  onAddMovementToGroup: (groupId: string) => void;
  sessionExercises: Exercise[];
  onSessionExercisesChange: (exercises: Exercise[]) => void;
}

export function ExerciseGroupBlock({
  segment,
  segmentIndex,
  compactPrescription,
  onUpdateAtIndex,
  onReplaceAtIndex,
  onRemoveAtIndex,
  onUnlinkAtIndex,
  onDissolveGroup,
  onAddMovementToGroup,
  sessionExercises,
  onSessionExercisesChange,
}: ExerciseGroupBlockProps) {
  const blockLetter = blockLetterForSegmentIndex(segmentIndex);
  const restHint = formatRestAfterGroup(
    restAfterGroupSeconds(segment.items)
  );
  const movementNames = segment.items.map(({ exercise }) => exercise.name);
  const groupRounds = getGroupRounds(segment.items);
  const lastBlockIndex = segment.items[segment.items.length - 1]?.index;

  return (
    <li className="list-none">
      <section
        className={GROUP_BLOCK_SHELL_CLASS}
        aria-label={`${segment.groupType} with ${segment.items.length} movements`}
      >
        <GroupBlockHeader
          blockLetter={blockLetter}
          groupType={segment.groupType}
          movementNames={movementNames}
          groupRounds={groupRounds}
          trailingAction={
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={cn(
                'gap-1.5 border-border bg-card',
                touchActionClass
              )}
              onClick={() => onDissolveGroup(segment.groupId)}
            >
              <Unlink className="h-3.5 w-3.5" aria-hidden />
              Ungroup all
            </Button>
          }
        />

        <GroupBlockPrescription
          groupId={segment.groupId}
          groupType={segment.groupType}
          groupRounds={groupRounds}
          movementCount={segment.items.length}
          sessionExercises={sessionExercises}
          onSessionExercisesChange={onSessionExercisesChange}
        />

        <div className={EDIT_GROUP_INNER_BODY}>
          <div className={EDIT_GROUP_MOVEMENTS_STACK}>
            {segment.items.map(({ exercise, index }, posInGroup) => (
              <ExerciseRow
                key={exercise.exercise_instance_id ?? `${segment.groupId}-${index}`}
                exercise={exercise}
                index={index}
                compactPrescription={compactPrescription}
                groupMovementLabel={`${blockLetter}${posInGroup + 1}`}
                inGroup
                isLastInBlock={index === lastBlockIndex}
                sessionExercises={sessionExercises}
                onSessionExercisesChange={onSessionExercisesChange}
                onUpdateAtIndex={onUpdateAtIndex}
                onReplaceAtIndex={onReplaceAtIndex}
                onRemoveAtIndex={onRemoveAtIndex}
                onUnlinkFromGroup={
                  segment.items.length > 2
                    ? () => onUnlinkAtIndex(index)
                    : undefined
                }
              />
            ))}
          </div>
          <div className="flex justify-center pt-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={cn('gap-1.5', touchActionClass)}
              onClick={() => onAddMovementToGroup(segment.groupId)}
            >
              <BookOpen className="h-3.5 w-3.5" aria-hidden />
              Add movement to this block
            </Button>
          </div>
          <GroupRestFooter restHint={restHint} />
        </div>
      </section>
    </li>
  );
}
