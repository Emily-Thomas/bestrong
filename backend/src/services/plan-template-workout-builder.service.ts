import type {
  CreateWorkoutInput,
  Exercise,
  ExerciseLibraryExercise,
  PlanTemplateDefinition,
  PlanTemplateProgression,
  PlanTemplateSessionExercise,
} from '../types';
import { enrichWorkoutDataWithLibrary } from './workout-library-integration.service';

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function buildLibraryNameMap(
  libraryExercises: ExerciseLibraryExercise[]
): Map<string, ExerciseLibraryExercise> {
  const map = new Map<string, ExerciseLibraryExercise>();
  for (const ex of libraryExercises) {
    const key = normalizeName(ex.name);
    if (!map.has(key)) {
      map.set(key, ex);
    }
  }
  return map;
}

/**
 * Resolve template label to a library row: exact name match, then substring match.
 */
export function resolveTemplateExerciseToLibrary(
  libraryExerciseName: string,
  byName: Map<string, ExerciseLibraryExercise>
): ExerciseLibraryExercise | null {
  const key = normalizeName(libraryExerciseName);
  const exact = byName.get(key);
  if (exact) return exact;

  for (const [k, ex] of byName) {
    if (k.includes(key) || key.includes(k)) {
      return ex;
    }
  }
  return null;
}

function applyWeekProgressionToLoad(
  weight: string | undefined,
  weekNumber: number,
  progression: PlanTemplateProgression | undefined
): string {
  const base = weight ?? '';
  if (weekNumber <= 1 || !progression) {
    return base;
  }
  const w = base;
  const delta = progression.weekly_rpe_delta ?? 0;
  if (delta > 0 && !/RPE\s*\d+(?:\.\d+)?\s*[–-]\s*\d/i.test(w)) {
    const single = w.match(/RPE\s*(\d+(?:\.\d+)?)/i);
    if (single) {
      const n = parseFloat(single[1]);
      const bumped = Math.min(9, n + delta * (weekNumber - 1));
      const rounded =
        Math.abs(bumped - Math.round(bumped)) < 0.01
          ? String(Math.round(bumped))
          : bumped.toFixed(1).replace(/\.0$/, '');
      return w.replace(/RPE\s*(\d+(?:\.\d+)?)/i, `RPE ${rounded}`);
    }
  }

  const mult = progression.weekly_load_multiplier ?? 1;
  if (mult !== 1) {
    const factor = mult ** (weekNumber - 1);
    const numMatch = w.match(/^(\d+(?:\.\d+)?)\s*(lb|lbs|kg)?$/i);
    if (numMatch) {
      const val = parseFloat(numMatch[1]) * factor;
      const rounded = Math.round(val * 10) / 10;
      const unit = numMatch[2] ? ` ${numMatch[2].toLowerCase()}` : '';
      return `${rounded}${unit}`;
    }
  }

  return w;
}

function exerciseFromSlot(
  slot: PlanTemplateSessionExercise,
  libMatch: ExerciseLibraryExercise | null,
  weekNumber: number,
  progression: PlanTemplateProgression | undefined
): Exercise {
  const displayName = libMatch?.name ?? slot.library_exercise_name.trim();
  const sets = slot.sets ?? libMatch?.default_sets ?? 3;
  const reps =
    slot.reps ?? (libMatch?.default_reps != null ? libMatch.default_reps : '8-10');
  const baseLoad =
    slot.load_prescription ??
    libMatch?.default_load ??
    'RPE 6–7';
  const weight = applyWeekProgressionToLoad(baseLoad, weekNumber, progression);

  return {
    name: displayName,
    sets,
    reps,
    weight,
    rest_seconds: slot.rest_seconds ?? libMatch?.default_rest_seconds ?? 90,
    rir: slot.rir ?? 2,
    notes: slot.notes?.trim() || undefined,
    library_exercise_id: libMatch?.id,
    library_exercise_name: libMatch?.name,
    is_custom: !libMatch,
  };
}

/**
 * Expands phase 1 weeks × sessions from template blueprints into workout rows.
 */
export function buildWorkoutInputsFromPlanTemplate(
  template: PlanTemplateDefinition,
  libraryExercises: ExerciseLibraryExercise[]
): Omit<CreateWorkoutInput, 'recommendation_id'>[] {
  const blueprints = template.session_blueprints;
  if (!blueprints?.length) {
    return [];
  }

  const byName = buildLibraryNameMap(libraryExercises);
  const schedule = template.plan_structure.weekly_repeating_schedule;
  const phaseWeeks = template.plan_structure.phase_1_weeks;
  const sessionsPerWeek = template.sessions_per_week;
  const progression = template.template_progression;

  const workouts: Omit<CreateWorkoutInput, 'recommendation_id'>[] = [];

  for (let week = 1; week <= phaseWeeks; week++) {
    for (let sessionIndex = 0; sessionIndex < sessionsPerWeek; sessionIndex++) {
      const bp = blueprints.find((b) => b.session_index === sessionIndex);
      if (!bp) {
        continue;
      }

      const dayMeta = schedule[sessionIndex];
      const sessionLabel =
        dayMeta?.session_label?.trim() ?? `Session ${sessionIndex + 1}`;

      const sorted = [...bp.exercises].sort((a, b) => a.order - b.order);
      const rawExercises: Exercise[] = sorted.map((slot) => {
        const lib = resolveTemplateExerciseToLibrary(
          slot.library_exercise_name,
          byName
        );
        return exerciseFromSlot(slot, lib, week, progression);
      });

      const workout_data = enrichWorkoutDataWithLibrary(
        { exercises: rawExercises },
        libraryExercises
      );

      workouts.push({
        week_number: week,
        session_number: sessionIndex + 1,
        workout_name: `${sessionLabel} — week ${week}`,
        workout_data,
        workout_reasoning:
          week === 1
            ? (template.plan_structure.intensity_load_progression ?? '').slice(
                0,
                400
              )
            : `Progression week ${week}: ${template.plan_structure.progression_guidelines ?? 'Follow template progression; adjust load or reps when form stays crisp.'}`.slice(
                0,
                400
              ),
      });
    }
  }

  return workouts;
}
