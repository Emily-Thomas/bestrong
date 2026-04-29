import type { Recommendation } from '@/lib/api';

export type PlanOrigin = 'library' | 'ai' | 'manual';

export function getPlanOriginFromRecommendation(
  rec: Recommendation | null
): PlanOrigin | null {
  if (!rec?.plan_structure || typeof rec.plan_structure !== 'object') {
    return null;
  }
  const o = (rec.plan_structure as Record<string, unknown>).plan_origin;
  if (o === 'library' || o === 'ai' || o === 'manual') {
    return o;
  }
  return null;
}

export function getPlanLibraryMeta(rec: Recommendation | null): {
  templateId: string | null;
  templateName: string | null;
  libraryBuiltWorkouts: boolean;
} {
  const ps = rec?.plan_structure;
  if (!ps || typeof ps !== 'object') {
    return {
      templateId: null,
      templateName: null,
      libraryBuiltWorkouts: false,
    };
  }
  const p = ps as Record<string, unknown>;
  const tid = p.plan_template_id;
  const tname = p.plan_template_name;
  return {
    templateId: typeof tid === 'string' ? tid : null,
    templateName: typeof tname === 'string' ? tname : null,
    libraryBuiltWorkouts: p.library_built_workouts === true,
  };
}
