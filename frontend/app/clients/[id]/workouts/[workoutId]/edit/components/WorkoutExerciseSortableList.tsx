'use client';

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Fragment, useCallback, useMemo, useState } from 'react';
import type { Exercise } from '@/lib/api';
import { segmentExercises } from '@/lib/exercise-groups';
import {
  isSegmentSortableId,
  linkPreviewForSegmentDrag,
  reorderExerciseSegments,
  segmentSortableId,
  type LinkDragPreview,
} from '@/lib/exercise-reorder';
import { cn } from '@/lib/utils';
import { EDIT_EXERCISES_LIST, DRAG_SEGMENT_GHOST_CLASS } from '../lib/edit-ui-classes';
import { ExerciseGroupBlock } from './ExerciseGroupBlock';
import { SegmentPairLinkButton } from './SegmentPairLinkButton';
import { SortableSegmentShell } from './SortableSegmentShell';
import { StandaloneExerciseBlock } from './StandaloneExerciseBlock';

interface WorkoutExerciseSortableListProps {
  exercises: Exercise[];
  compactPrescription?: boolean;
  linkSelection: number[];
  onApplyExercises: (exercises: Exercise[]) => void;
  onToggleSelectForLink: (index: number) => void;
  onUpdateAtIndex: (index: number, updates: Partial<Exercise>) => void;
  onReplaceAtIndex: (index: number) => void;
  onRemoveAtIndex: (index: number) => void;
  onUnlinkAtIndex: (index: number) => void;
  onDissolveGroup: (groupId: string) => void;
  onAddMovementToGroup: (groupId: string) => void;
  onLinkAdjacentPair: (topIndex: number, bottomIndex: number) => void;
}

export function WorkoutExerciseSortableList({
  exercises,
  compactPrescription,
  linkSelection,
  onApplyExercises,
  onToggleSelectForLink,
  onUpdateAtIndex,
  onReplaceAtIndex,
  onRemoveAtIndex,
  onUnlinkAtIndex,
  onDissolveGroup,
  onAddMovementToGroup,
  onLinkAdjacentPair,
}: WorkoutExerciseSortableListProps) {
  const segments = useMemo(() => segmentExercises(exercises), [exercises]);
  const segmentIds = useMemo(
    () => segments.map((seg) => segmentSortableId(seg)),
    [segments]
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const [linkPreview, setLinkPreview] = useState<LinkDragPreview | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    setLinkPreview(null);
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      if (!over || !isSegmentSortableId(String(active.id))) {
        setLinkPreview(null);
        return;
      }
      const preview = linkPreviewForSegmentDrag(
        exercises,
        String(active.id),
        String(over.id)
      );
      setLinkPreview(preview);
    },
    [exercises]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      setLinkPreview(null);

      if (!over || active.id === over.id) return;

      const activeKey = String(active.id);
      const overKey = String(over.id);

      if (isSegmentSortableId(activeKey) && isSegmentSortableId(overKey)) {
        onApplyExercises(
          reorderExerciseSegments(exercises, activeKey, overKey)
        );
      }
    },
    [exercises, onApplyExercises]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setLinkPreview(null);
  }, []);

  const activeSegment = useMemo(() => {
    if (!activeId || !isSegmentSortableId(activeId)) return null;
    return segments.find((seg) => segmentSortableId(seg) === activeId) ?? null;
  }, [activeId, segments]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <SortableContext
        items={segmentIds}
        strategy={verticalListSortingStrategy}
      >
        <ul className={EDIT_EXERCISES_LIST} aria-label="Exercises in this session">
          {segments.map((segment, segmentIndex) => {
            const segId = segmentSortableId(segment);
            const elements: React.ReactNode[] = [];

            elements.push(
              <SortableSegmentShell key={segId} id={segId}>
                {(segmentDrag) =>
                  segment.kind === 'group' ? (
                    <ExerciseGroupBlock
                      segment={segment}
                      segmentIndex={segmentIndex}
                      segmentDrag={segmentDrag}
                      compactPrescription={compactPrescription}
                      sessionExercises={exercises}
                      onSessionExercisesChange={onApplyExercises}
                      onUpdateAtIndex={onUpdateAtIndex}
                      onReplaceAtIndex={onReplaceAtIndex}
                      onRemoveAtIndex={onRemoveAtIndex}
                      onUnlinkAtIndex={onUnlinkAtIndex}
                      onDissolveGroup={onDissolveGroup}
                      onAddMovementToGroup={onAddMovementToGroup}
                    />
                  ) : (
                    <StandaloneExerciseBlock
                      exercise={segment.items[0].exercise}
                      index={segment.items[0].index}
                      segmentDrag={segmentDrag}
                      compactPrescription={compactPrescription}
                      sessionExercises={exercises}
                      onSessionExercisesChange={onApplyExercises}
                      selectedForLink={linkSelection.includes(
                        segment.items[0].index
                      )}
                      onToggleSelectForLink={onToggleSelectForLink}
                      onUpdateAtIndex={onUpdateAtIndex}
                      onReplaceAtIndex={onReplaceAtIndex}
                      onRemoveAtIndex={onRemoveAtIndex}
                    />
                  )
                }
              </SortableSegmentShell>
            );

            const nextSeg = segments[segmentIndex + 1];
            if (
              segment.kind === 'standalone' &&
              nextSeg?.kind === 'standalone'
            ) {
              const top = segment.items[0];
              const bottom = nextSeg.items[0];
              if (bottom.index === top.index + 1) {
                const pairKey = `${top.index}-${bottom.index}`;
                const topSegId = segmentSortableId(segment);
                const bottomSegId = segmentSortableId(nextSeg);
                const previewActive =
                  linkPreview != null &&
                  linkPreview.topSegmentId === topSegId &&
                  linkPreview.bottomSegmentId === bottomSegId;

                elements.push(
                  <li key={`pair-${pairKey}`} className="list-none">
                    <SegmentPairLinkButton
                      topName={top.exercise.name}
                      bottomName={bottom.exercise.name}
                      onLink={() => onLinkAdjacentPair(top.index, bottom.index)}
                      previewActive={previewActive}
                      previewLabel={
                        previewActive ? linkPreview.linkLabel : undefined
                      }
                    />
                  </li>
                );
              }
            }

            return <Fragment key={`wrap-${segId}`}>{elements}</Fragment>;
          })}
        </ul>
      </SortableContext>

      <DragOverlay dropAnimation={{ duration: 220, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }}>
        {activeSegment ? (
          <div
            className={cn(
              'pointer-events-none rounded-xl bg-card px-4 py-3 text-sm font-medium shadow-2xl',
              DRAG_SEGMENT_GHOST_CLASS
            )}
            aria-hidden
          >
            {activeSegment.kind === 'group'
              ? `${activeSegment.groupType} block · ${activeSegment.items.length} movements`
              : activeSegment.items[0].exercise.name?.trim() ||
                'Movement'}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
