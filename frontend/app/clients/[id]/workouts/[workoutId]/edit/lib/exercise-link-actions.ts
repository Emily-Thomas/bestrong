import type { Exercise } from '@/lib/api';
import {
  groupTypeForCount,
  groupTypeLabel,
  linkExerciseWithNext,
  linkExerciseWithPrevious,
} from '@/lib/exercise-groups';

export type ExerciseLinkAction =
  | { type: 'with_previous' }
  | { type: 'with_next' }
  | { type: 'join_group_above' }
  | { type: 'join_group_below' };

export interface ExerciseLinkOption {
  action: ExerciseLinkAction;
  label: string;
  detail?: string;
}

function movementLabel(ex: Exercise, index: number): string {
  const name = ex.name?.trim();
  return name || `Movement ${index + 1}`;
}

export function getExerciseLinkOptions(
  exercises: Exercise[],
  index: number
): ExerciseLinkOption[] {
  if (index < 0 || index >= exercises.length) return [];
  const current = exercises[index];
  if (current.group_id) return [];

  const options: ExerciseLinkOption[] = [];
  const prev = index > 0 ? exercises[index - 1] : undefined;
  const next =
    index < exercises.length - 1 ? exercises[index + 1] : undefined;

  if (prev) {
    if (prev.group_id) {
      options.push({
        action: { type: 'join_group_above' },
        label: `Add to ${groupTypeLabel(prev.group_type ?? 'superset')} above`,
        detail: movementLabel(prev, index - 1),
      });
    } else {
      options.push({
        action: { type: 'with_previous' },
        label: `Pair with ${movementLabel(prev, index - 1)}`,
        detail: 'Creates a linked block with the movement above',
      });
    }
  }

  if (next) {
    if (next.group_id) {
      options.push({
        action: { type: 'join_group_below' },
        label: `Add to ${groupTypeLabel(next.group_type ?? 'superset')} below`,
        detail: movementLabel(next, index + 1),
      });
    } else {
      options.push({
        action: { type: 'with_next' },
        label: `Pair with ${movementLabel(next, index + 1)}`,
        detail: 'Creates a linked block with the movement below',
      });
    }
  }

  return options;
}

export function applyExerciseLinkAction(
  exercises: Exercise[],
  index: number,
  action: ExerciseLinkAction
): Exercise[] {
  switch (action.type) {
    case 'with_previous':
    case 'join_group_above':
      return linkExerciseWithPrevious(exercises, index);
    case 'with_next':
    case 'join_group_below':
      return linkExerciseWithNext(exercises, index);
    default:
      return exercises;
  }
}

export function linkLabelForSelectionCount(count: number): string {
  return `Link as ${groupTypeLabel(groupTypeForCount(count))}`;
}

export {
  areConsecutiveIndices,
  linkExercisesAtIndices,
} from '@/lib/exercise-groups';
