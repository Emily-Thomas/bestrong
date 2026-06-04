import type { ActualExercisePerformance, Exercise } from '@/lib/api';

export type ExerciseGroupType = 'superset' | 'triset' | 'circuit';

export interface ExerciseGroupFields {
  exercise_instance_id?: string;
  group_id?: string;
  group_type?: ExerciseGroupType;
  group_position?: number;
  group_rounds?: number;
  sets?: number;
}

export type IndexedExercise<T extends ExerciseGroupFields> = {
  exercise: T;
  index: number;
};

export type ExerciseSegment<T extends ExerciseGroupFields> =
  | { kind: 'standalone'; items: [IndexedExercise<T>] }
  | {
      kind: 'group';
      groupId: string;
      groupType: ExerciseGroupType;
      items: IndexedExercise<T>[];
    };

function randomId(prefix: string): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function newExerciseInstanceId(): string {
  return randomId('ex');
}

export function newGroupId(): string {
  return randomId('grp');
}

export function groupTypeForCount(count: number): ExerciseGroupType {
  if (count <= 2) return 'superset';
  if (count === 3) return 'triset';
  return 'circuit';
}

export function groupTypeLabel(type: ExerciseGroupType): string {
  switch (type) {
    case 'superset':
      return 'Superset';
    case 'triset':
      return 'Triset';
    case 'circuit':
      return 'Circuit';
    default:
      return 'Group';
  }
}

export function groupTypeDescription(type: ExerciseGroupType): string {
  switch (type) {
    case 'superset':
      return 'Two movements back-to-back, then rest.';
    case 'triset':
      return 'Three movements back-to-back, then rest.';
    case 'circuit':
      return 'Multiple stations in sequence; rest after the round.';
    default:
      return '';
  }
}

/** Rest after the block: use the last movement's rest_seconds (coaching default). */
export function restAfterGroupSeconds<T extends ExerciseGroupFields>(
  items: IndexedExercise<T>[]
): number | undefined {
  if (items.length === 0) return undefined;
  const last = items[items.length - 1].exercise;
  const rest =
    'rest_seconds' in last && typeof last.rest_seconds === 'number'
      ? last.rest_seconds
      : undefined;
  return rest;
}

export function formatRestAfterGroup(seconds: number | undefined): string | null {
  if (seconds == null || seconds <= 0) return null;
  return `Rest after block · ${seconds}s`;
}

/** Superset/triset use "sets"; circuits use "rounds". */
export function groupRoundsLabel(type: ExerciseGroupType): string {
  return type === 'circuit' ? 'rounds' : 'sets';
}

export function groupRoundsLabelCapitalized(type: ExerciseGroupType): string {
  return type === 'circuit' ? 'Rounds' : 'Sets';
}

export function formatGroupRoundsPrescription(
  rounds: number | undefined,
  type: ExerciseGroupType,
  movementCount: number
): string | null {
  if (rounds == null || rounds <= 0) return null;
  const unit = groupRoundsLabel(type);
  return `${rounds} ${unit} of this block · ${movementCount} movements each ${unit === 'rounds' ? 'round' : 'set'}`;
}

function resolveGroupRounds<T extends ExerciseGroupFields>(
  members: T[]
): number | undefined {
  for (const ex of members) {
    if (ex.group_rounds != null && ex.group_rounds > 0) {
      return ex.group_rounds;
    }
  }
  let maxSets: number | undefined;
  for (const ex of members) {
    if (ex.sets != null && ex.sets > 0) {
      maxSets =
        maxSets == null ? ex.sets : Math.max(maxSets, ex.sets);
    }
  }
  return maxSets;
}

export function getGroupRounds<T extends ExerciseGroupFields>(
  items: IndexedExercise<T>[]
): number | undefined {
  if (items.length === 0) return undefined;
  return resolveGroupRounds(items.map((i) => i.exercise));
}

export function updateGroupRounds<T extends ExerciseGroupFields>(
  exercises: T[],
  groupId: string,
  group_rounds: number | undefined
): T[] {
  return exercises.map((ex) =>
    ex.group_id === groupId ? { ...ex, group_rounds } : ex
  );
}

export function segmentExercises<T extends ExerciseGroupFields>(
  exercises: T[]
): ExerciseSegment<T>[] {
  const segments: ExerciseSegment<T>[] = [];
  let i = 0;

  while (i < exercises.length) {
    const ex = exercises[i];
    const groupId = ex.group_id;

    if (!groupId) {
      segments.push({
        kind: 'standalone',
        items: [{ exercise: ex, index: i }],
      });
      i += 1;
      continue;
    }

    const items: IndexedExercise<T>[] = [{ exercise: ex, index: i }];
    let j = i + 1;
    while (j < exercises.length && exercises[j].group_id === groupId) {
      items.push({ exercise: exercises[j], index: j });
      j += 1;
    }

    const groupType =
      ex.group_type ?? groupTypeForCount(items.length);

    segments.push({
      kind: 'group',
      groupId,
      groupType,
      items,
    });
    i = j;
  }

  return segments;
}

export function ensureExerciseInstanceIds<T extends ExerciseGroupFields>(
  exercises: T[]
): T[] {
  return exercises.map((ex) =>
    ex.exercise_instance_id
      ? ex
      : { ...ex, exercise_instance_id: newExerciseInstanceId() }
  );
}

export function syncGroupMetadata<T extends ExerciseGroupFields>(
  exercises: T[]
): T[] {
  const segments = segmentExercises(exercises);
  const next = [...exercises];

  for (const seg of segments) {
    if (seg.kind === 'standalone') {
      const { index } = seg.items[0];
      const ex = next[index];
      if (
        ex.group_id ||
        ex.group_type ||
        ex.group_position ||
        ex.group_rounds != null
      ) {
        next[index] = clearGroupFields(ex);
      }
      continue;
    }

    const count = seg.items.length;
    if (count < 2) {
      for (const { index } of seg.items) {
        next[index] = clearGroupFields(next[index]);
      }
      continue;
    }

    const groupType = groupTypeForCount(count);
    const members = seg.items.map(({ index }) => next[index]);
    const groupRounds = resolveGroupRounds(members);

    seg.items.forEach(({ index }, pos) => {
      const { sets: _sets, ...rest } = next[index];
      next[index] = {
        ...rest,
        group_id: seg.groupId,
        group_type: groupType,
        group_position: pos + 1,
        group_rounds: groupRounds,
        sets: undefined,
      };
    });
  }

  return next;
}

export function normalizeWorkoutExercises<T extends ExerciseGroupFields>(
  exercises: T[]
): T[] {
  return syncGroupMetadata(ensureExerciseInstanceIds(exercises));
}

export function validateExerciseGroups<T extends ExerciseGroupFields>(
  exercises: T[]
): string | null {
  const segments = segmentExercises(exercises);

  for (const seg of segments) {
    if (seg.kind !== 'group') continue;
    if (seg.items.length < 2) {
      return 'Each linked group needs at least two movements.';
    }
    const rounds = getGroupRounds(seg.items);
    if (rounds == null || rounds < 1) {
      return `Each linked block needs ${groupRoundsLabel(seg.groupType)} prescribed for the whole block.`;
    }
  }

  const ids = new Set<string>();
  for (const ex of exercises) {
    if (!ex.group_id) continue;
    if (ids.has(ex.group_id)) continue;
    ids.add(ex.group_id);

    const indices = exercises
      .map((e, i) => (e.group_id === ex.group_id ? i : -1))
      .filter((i) => i >= 0);

    for (let k = 1; k < indices.length; k += 1) {
      if (indices[k] !== indices[k - 1] + 1) {
        return 'Linked movements must stay together in the list. Move the block as a unit or ungroup first.';
      }
    }
  }

  return null;
}

function clearGroupFields<T extends ExerciseGroupFields>(ex: T): T {
  const savedRounds = ex.group_rounds;
  const {
    group_id: _g,
    group_type: _t,
    group_position: _p,
    group_rounds: _r,
    sets: _s,
    ...rest
  } = ex;
  return {
    ...rest,
    sets: rest.sets ?? savedRounds,
  } as T;
}

/** Indices must be sorted ascending and contiguous in the exercise list. */
export function areConsecutiveIndices(indices: number[]): boolean {
  if (indices.length < 2) return false;
  const sorted = [...indices].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i] !== sorted[i - 1] + 1) return false;
  }
  return true;
}

export function linkExercisesAtIndices<T extends ExerciseGroupFields>(
  exercises: T[],
  indices: number[]
): T[] {
  const sorted = [...new Set(indices)].sort((a, b) => a - b);
  if (sorted.length < 2 || !areConsecutiveIndices(sorted)) {
    return exercises;
  }

  const groupId = newGroupId();
  const next = [...exercises];
  for (const i of sorted) {
    next[i] = { ...next[i], group_id: groupId };
  }
  return syncGroupMetadata(next);
}

/** Link this movement with the one directly below. */
export function linkExerciseWithNext<T extends ExerciseGroupFields>(
  exercises: T[],
  index: number
): T[] {
  if (index < 0 || index >= exercises.length - 1) return exercises;
  return linkExerciseWithPrevious(exercises, index + 1);
}

export function linkExerciseWithPrevious<T extends ExerciseGroupFields>(
  exercises: T[],
  index: number
): T[] {
  if (index <= 0 || index >= exercises.length) return exercises;

  const next = [...exercises];
  const prevIdx = index - 1;
  const prevGroup = next[prevIdx].group_id;
  const curGroup = next[index].group_id;
  const groupId = prevGroup ?? curGroup ?? newGroupId();

  if (curGroup && prevGroup && curGroup !== prevGroup) {
    next[index] = { ...next[index], group_id: groupId };
  } else {
    let start = prevIdx;
    while (start > 0 && next[start - 1].group_id === groupId) {
      start -= 1;
    }
    let end = index;
    while (end + 1 < next.length && next[end + 1].group_id === groupId) {
      end += 1;
    }
    if (!prevGroup && !curGroup) {
      start = prevIdx;
      end = index;
    }
    for (let i = start; i <= end; i += 1) {
      next[i] = { ...next[i], group_id: groupId };
    }
  }

  return syncGroupMetadata(next);
}

export function unlinkExerciseFromGroup<T extends ExerciseGroupFields>(
  exercises: T[],
  index: number
): T[] {
  if (index < 0 || index >= exercises.length) return exercises;
  const target = exercises[index];
  if (!target.group_id) return exercises;

  const groupId = target.group_id;
  const next = exercises.map((ex, i) =>
    i === index ? clearGroupFields(ex) : ex
  );

  const remaining = next.filter((e) => e.group_id === groupId);
  if (remaining.length < 2) {
    return syncGroupMetadata(
      next.map((ex) => (ex.group_id === groupId ? clearGroupFields(ex) : ex))
    );
  }

  return syncGroupMetadata(next);
}

export function dissolveExerciseGroup<T extends ExerciseGroupFields>(
  exercises: T[],
  groupId: string
): T[] {
  return syncGroupMetadata(
    exercises.map((ex) =>
      ex.group_id === groupId ? clearGroupFields(ex) : ex
    )
  );
}

export function moveExerciseInList<T>(
  exercises: T[],
  fromIndex: number,
  toIndex: number
): T[] {
  if (
    fromIndex < 0 ||
    fromIndex >= exercises.length ||
    toIndex < 0 ||
    toIndex >= exercises.length ||
    fromIndex === toIndex
  ) {
    return exercises;
  }
  const next = [...exercises];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export function copyPrescriptionGroupFields(
  prescribed: Exercise,
  actual: ActualExercisePerformance
): ActualExercisePerformance {
  return {
    ...actual,
    exercise_instance_id: prescribed.exercise_instance_id,
    group_id: prescribed.group_id,
    group_type: prescribed.group_type,
    group_position: prescribed.group_position,
    group_rounds: prescribed.group_rounds,
  };
}

export function buildInitialActualFromPrescription(
  prescribed: Exercise[]
): ActualExercisePerformance[] {
  return normalizeWorkoutExercises(prescribed).map((ex) =>
    copyPrescriptionGroupFields(ex, { exercise_name: ex.name })
  );
}

export function mergeActualWithPrescriptionGroups(
  prescribed: Exercise[],
  actual: ActualExercisePerformance[]
): ActualExercisePerformance[] {
  const normalized = normalizeWorkoutExercises(prescribed);
  return actual.map((row, i) => {
    const byId = row.exercise_instance_id
      ? normalized.find(
          (p) => p.exercise_instance_id === row.exercise_instance_id
        )
      : undefined;
    const p = byId ?? normalized[i];
    if (!p) return row;
    return copyPrescriptionGroupFields(p, row);
  });
}

export function segmentLabel(
  segmentIndex: number,
  segment: ExerciseSegment<ExerciseGroupFields>
): string {
  if (segment.kind === 'standalone') {
    return `Movement ${segmentIndex + 1}`;
  }
  return `${groupTypeLabel(segment.groupType)} ${segmentIndex + 1}`;
}

export function blockLetterForSegmentIndex(segmentIndex: number): string {
  return String.fromCharCode(65 + Math.min(segmentIndex, 25));
}

export function movementLabelInGroup(
  blockLetter: string,
  position: number
): string {
  return `${blockLetter}${position}`;
}
