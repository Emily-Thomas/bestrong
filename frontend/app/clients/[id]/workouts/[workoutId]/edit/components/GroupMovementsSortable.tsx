'use client';

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { Exercise } from '@/lib/api';
import {
  movementSortableId,
  reorderGroupMovements,
} from '@/lib/exercise-reorder';
import type { ExerciseSegment } from '@/lib/exercise-groups';
import { EDIT_GROUP_MOVEMENTS_STACK } from '../lib/edit-ui-classes';
import { ExerciseDragHandle } from './ExerciseDragHandle';
import { ExerciseRow } from './ExerciseRow';
import { SortableMovementRow } from './SortableMovementRow';

interface GroupMovementsSortableProps {
  segment: Extract<ExerciseSegment<Exercise>, { kind: 'group' }>;
  blockLetter: string;
  lastBlockIndex: number;
  compactPrescription?: boolean;
  sessionExercises: Exercise[];
  onSessionExercisesChange: (exercises: Exercise[]) => void;
  onUpdateAtIndex: (index: number, updates: Partial<Exercise>) => void;
  onReplaceAtIndex: (index: number) => void;
  onRemoveAtIndex: (index: number) => void;
  onUnlinkAtIndex: (index: number) => void;
}

export function GroupMovementsSortable({
  segment,
  blockLetter,
  lastBlockIndex,
  compactPrescription,
  sessionExercises,
  onSessionExercisesChange,
  onUpdateAtIndex,
  onReplaceAtIndex,
  onRemoveAtIndex,
  onUnlinkAtIndex,
}: GroupMovementsSortableProps) {
  const movementIds = segment.items.map(({ exercise, index }) =>
    movementSortableId(exercise, index)
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    onSessionExercisesChange(
      reorderGroupMovements(
        sessionExercises,
        segment.groupId,
        String(active.id),
        String(over.id)
      )
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={movementIds} strategy={verticalListSortingStrategy}>
        <div className={EDIT_GROUP_MOVEMENTS_STACK}>
          {segment.items.map(({ exercise, index }, posInGroup) => {
            const movId = movementSortableId(exercise, index);
            return (
              <SortableMovementRow key={movId} id={movId}>
                {({ attributes, listeners }) => (
                  <div className="flex items-start gap-2 px-2 pt-2 sm:px-3">
                    <ExerciseDragHandle
                      label={`Reorder ${exercise.name?.trim() || 'movement'} in block`}
                      attributes={attributes}
                      listeners={listeners}
                      className="mt-3"
                    />
                    <div className="min-w-0 flex-1">
                      <ExerciseRow
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
                    </div>
                  </div>
                )}
              </SortableMovementRow>
            );
          })}
        </div>
      </SortableContext>
    </DndContext>
  );
}
