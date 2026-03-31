import type { Exercise } from '@/lib/api';

export type MuscleCategory =
  | 'chest'
  | 'back'
  | 'legs'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'glutes'
  | 'cardio'
  | 'full'
  | 'other';

export const MUSCLE_ORDER: MuscleCategory[] = [
  'chest',
  'back',
  'shoulders',
  'arms',
  'legs',
  'glutes',
  'core',
  'cardio',
  'full',
  'other',
];

/** Map free-text muscle / movement labels to a stable category for UI colors. */
export function categorizeMuscle(
  raw: string | null | undefined
): MuscleCategory {
  if (!raw?.trim()) return 'other';
  const s = raw.toLowerCase();
  if (/chest|pec|pectoral/.test(s)) return 'chest';
  if (
    /back|lat|trap|rhomboid|lats|mid back|upper back|\brow\b|t-bar|pendlay|inverted row|cable row|seated row|barbell row|machine row/i.test(
      s
    )
  )
    return 'back';
  if (/shoulder|delt|delts|rear delt/.test(s)) return 'shoulders';
  if (
    /bicep|tricep|forearm|brachialis|hammer curl|preacher|skull|pushdown/.test(
      s
    )
  )
    return 'arms';
  if (/glute|hip thrust|hip hinge/.test(s)) return 'glutes';
  if (
    /quad|hamstring|calf|leg(?!\s+press)|adductor|abductor|lunge|squat|split|step|lower body/.test(
      s
    )
  )
    return 'legs';
  if (/core|ab|oblique|plank|pallof|anti-rotation|spinal|trunk/.test(s))
    return 'core';
  if (
    /cardio|conditioning|interval|bike|assault|ski|rope|walk|run|engine|metcon|finisher/.test(
      s
    )
  )
    return 'cardio';
  if (/full|total body|whole body/.test(s)) return 'full';
  if (/leg press|hack squat|smith/.test(s)) return 'legs';
  return 'other';
}

export const MUSCLE_CATEGORY_META: Record<
  MuscleCategory,
  { label: string; segment: string; dot: string }
> = {
  chest: {
    label: 'Chest',
    segment: 'bg-rose-500 dark:bg-rose-400',
    dot: 'bg-rose-500',
  },
  back: {
    label: 'Back',
    segment: 'bg-sky-500 dark:bg-sky-400',
    dot: 'bg-sky-500',
  },
  shoulders: {
    label: 'Shoulders',
    segment: 'bg-amber-500 dark:bg-amber-400',
    dot: 'bg-amber-500',
  },
  arms: {
    label: 'Arms',
    segment: 'bg-fuchsia-500 dark:bg-fuchsia-400',
    dot: 'bg-fuchsia-500',
  },
  legs: {
    label: 'Legs',
    segment: 'bg-violet-500 dark:bg-violet-400',
    dot: 'bg-violet-500',
  },
  glutes: {
    label: 'Glutes',
    segment: 'bg-indigo-500 dark:bg-indigo-400',
    dot: 'bg-indigo-500',
  },
  core: {
    label: 'Core',
    segment: 'bg-emerald-500 dark:bg-emerald-400',
    dot: 'bg-emerald-500',
  },
  cardio: {
    label: 'Conditioning',
    segment: 'bg-orange-500 dark:bg-orange-400',
    dot: 'bg-orange-500',
  },
  full: {
    label: 'Full body',
    segment: 'bg-teal-500 dark:bg-teal-400',
    dot: 'bg-teal-500',
  },
  other: {
    label: 'Other',
    segment: 'bg-slate-400 dark:bg-slate-500',
    dot: 'bg-slate-400',
  },
};

/** Hex fills for SVG muscle diagram (approx. Tailwind 500). */
export const MUSCLE_CATEGORY_HEX: Record<MuscleCategory, string> = {
  chest: '#f43f5e',
  back: '#0ea5e9',
  shoulders: '#f59e0b',
  arms: '#d946ef',
  legs: '#8b5cf6',
  glutes: '#6366f1',
  core: '#10b981',
  cardio: '#f97316',
  full: '#14b8a6',
  other: '#94a3b8',
};

/** Aggregate muscle focus counts from exercise library metadata + name fallback. */
export function aggregateMuscleFocus(
  exercises: Exercise[]
): Map<MuscleCategory, number> {
  const counts = new Map<MuscleCategory, number>();

  for (const ex of exercises) {
    const meta = ex.library_metadata;
    const primary = categorizeMuscle(meta?.primary_muscle_group ?? undefined);
    if (primary !== 'other') {
      counts.set(primary, (counts.get(primary) ?? 0) + 1);
    } else if (ex.name) {
      const fromName = categorizeMuscle(ex.name);
      if (fromName !== 'other') {
        counts.set(fromName, (counts.get(fromName) ?? 0) + 0.75);
      }
    }
    for (const sg of meta?.secondary_muscle_groups ?? []) {
      const c = categorizeMuscle(sg);
      if (c !== 'other') {
        counts.set(c, (counts.get(c) ?? 0) + 0.35);
      }
    }
  }

  return counts;
}

/**
 * Normalized 0–1 intensity per category (max category = 1) for diagram opacity.
 */
export function muscleFocusIntensityMap(
  exercises: Exercise[]
): Map<MuscleCategory, number> {
  const counts = aggregateMuscleFocus(exercises);
  let max = 0;
  for (const v of counts.values()) {
    if (v > max) max = v;
  }
  const out = new Map<MuscleCategory, number>();
  if (max <= 0) {
    return out;
  }
  for (const [k, v] of counts) {
    out.set(k, Math.min(1, v / max));
  }
  return out;
}

/** Sorted segments for the muscle strip (percent width each). */
export function muscleFocusSegments(
  exercises: Exercise[]
): { category: MuscleCategory; percent: number; label: string }[] {
  const counts = aggregateMuscleFocus(exercises);
  let total = 0;
  for (const v of counts.values()) total += v;
  if (total <= 0) {
    return [
      {
        category: 'other',
        percent: 100,
        label: MUSCLE_CATEGORY_META.other.label,
      },
    ];
  }

  const segments: {
    category: MuscleCategory;
    percent: number;
    label: string;
  }[] = [];
  for (const cat of MUSCLE_ORDER) {
    const v = counts.get(cat);
    if (v && v > 0) {
      segments.push({
        category: cat,
        percent: (v / total) * 100,
        label: MUSCLE_CATEGORY_META[cat].label,
      });
    }
  }
  if (segments.length === 0) {
    return [
      {
        category: 'other',
        percent: 100,
        label: MUSCLE_CATEGORY_META.other.label,
      },
    ];
  }
  return segments;
}

/** Rough session duration for trainer context (not stopwatch-accurate). */
export function estimateSessionMinutes(exercises: Exercise[]): number {
  let minutes = 8; // warmup buffer
  for (const ex of exercises) {
    const sets = ex.sets ?? 3;
    const restMin = (ex.rest_seconds ?? 90) / 60;
    minutes += sets * (Math.min(restMin, 4) + 1.75);
  }
  return Math.round(Math.min(120, Math.max(20, minutes)));
}

export function totalExerciseCount(
  workouts: { workout_data: { exercises?: Exercise[] } }[]
): number {
  let n = 0;
  for (const w of workouts) {
    n += w.workout_data.exercises?.length ?? 0;
  }
  return n;
}
