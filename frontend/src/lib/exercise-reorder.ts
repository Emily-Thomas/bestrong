import { arrayMove } from '@dnd-kit/sortable';
import {
  groupTypeForCount,
  groupTypeLabel,
  normalizeWorkoutExercises,
  segmentExercises,
  type ExerciseGroupFields,
  type ExerciseSegment,
} from '@/lib/exercise-groups';

export function segmentSortableId<T extends ExerciseGroupFields>(
  segment: ExerciseSegment<T>
): string {
  if (segment.kind === 'group') return `seg-group-${segment.groupId}`;
  const { exercise, index } = segment.items[0];
  return `seg-solo-${exercise.exercise_instance_id ?? `idx-${index}`}`;
}

export function movementSortableId(
  exercise: ExerciseGroupFields,
  flatIndex: number
): string {
  return `mov-${exercise.exercise_instance_id ?? `idx-${flatIndex}`}`;
}

export function flattenSegmentsToExercises<T extends ExerciseGroupFields>(
  segments: ExerciseSegment<T>[],
  exercises: T[]
): T[] {
  return segments.flatMap((seg) =>
    seg.items.map(({ index }) => exercises[index])
  );
}

export function reorderExerciseSegments<T extends ExerciseGroupFields>(
  exercises: T[],
  activeId: string,
  overId: string
): T[] {
  const segments = segmentExercises(exercises);
  const ids = segments.map((seg) => segmentSortableId(seg));
  const from = ids.indexOf(activeId);
  const to = ids.indexOf(overId);
  if (from < 0 || to < 0 || from === to) return exercises;

  const nextSegments = arrayMove(segments, from, to);
  return normalizeWorkoutExercises(
    flattenSegmentsToExercises(nextSegments, exercises)
  );
}

export function reorderGroupMovements<T extends ExerciseGroupFields>(
  exercises: T[],
  groupId: string,
  activeId: string,
  overId: string
): T[] {
  const flatIndices = exercises
    .map((ex, i) => (ex.group_id === groupId ? i : -1))
    .filter((i) => i >= 0);
  if (flatIndices.length < 2) return exercises;

  const subset = flatIndices.map((i) => exercises[i]);
  const subsetIds = flatIndices.map((i) =>
    movementSortableId(exercises[i], i)
  );
  const from = subsetIds.indexOf(activeId);
  const to = subsetIds.indexOf(overId);
  if (from < 0 || to < 0 || from === to) return exercises;

  const reorderedSubset = arrayMove(subset, from, to);
  const next = [...exercises];
  flatIndices.forEach((flatIdx, j) => {
    next[flatIdx] = reorderedSubset[j];
  });
  return normalizeWorkoutExercises(next);
}

export type LinkDragPreview = {
  topSegmentId: string;
  bottomSegmentId: string;
  topName: string;
  bottomName: string;
  linkLabel: string;
};

/** After a segment drag, highlight an adjacent standalone pair that can link. */
export function linkPreviewForSegmentDrag<T extends ExerciseGroupFields>(
  exercises: T[],
  activeSegmentId: string,
  overSegmentId: string
): LinkDragPreview | null {
  if (
    !activeSegmentId.startsWith('seg-solo-') ||
    !overSegmentId.startsWith('seg-solo-')
  ) {
    return null;
  }

  const reordered = reorderExerciseSegments(
    exercises,
    activeSegmentId,
    overSegmentId
  );
  const segments = segmentExercises(reordered);

  const activeInPreview = segments.some(
    (seg) =>
      seg.kind === 'standalone' && segmentSortableId(seg) === activeSegmentId
  );
  if (!activeInPreview) return null;

  for (let i = 0; i < segments.length - 1; i += 1) {
    const a = segments[i];
    const b = segments[i + 1];
    if (a.kind !== 'standalone' || b.kind !== 'standalone') continue;

    const topSegmentId = segmentSortableId(a);
    const bottomSegmentId = segmentSortableId(b);
    if (
      topSegmentId !== activeSegmentId &&
      bottomSegmentId !== activeSegmentId
    ) {
      continue;
    }

    const topIndex = a.items[0].index;
    const bottomIndex = b.items[0].index;

    const topEx = reordered[topIndex] as { name?: string } | undefined;
    const bottomEx = reordered[bottomIndex] as { name?: string } | undefined;

    return {
      topSegmentId,
      bottomSegmentId,
      topName: topEx?.name ?? '',
      bottomName: bottomEx?.name ?? '',
      linkLabel: `Link as ${groupTypeLabel(groupTypeForCount(2))}`,
    };
  }

  return null;
}

export function isSegmentSortableId(id: string): boolean {
  return id.startsWith('seg-group-') || id.startsWith('seg-solo-');
}

export function isMovementSortableId(id: string): boolean {
  return id.startsWith('mov-');
}
