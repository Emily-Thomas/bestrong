import type { Questionnaire, StructuredQuestionnaireData } from '../types';

export const GOALS_VS_INJURIES_INSTRUCTION = `**Goals vs. injuries (critical):** The client's stated goals are the **primary outcomes** of this program. Pain, injury, and limitations guide **how** you program (exercise selection, volume, tempo, progression, weekly themes)—they do **not** replace those goals unless there are clear **red flags**, medical contraindications, or **severe** limitations described in the questionnaire. For **minor or localized** issues, keep the program aligned with the stated goals and reflect the injury in exercise choice, load management, and session design—not by switching to an unrelated objective.`;

function yn(v: boolean | undefined): string {
  if (v === true) return 'Yes';
  if (v === false) return 'No';
  return 'Not answered';
}

function isV2(data: StructuredQuestionnaireData): boolean {
  if (data.schema_version === 2) {
    return true;
  }
  if (data.section1_energy_level !== undefined) {
    return false;
  }
  return (
    data.work_pattern !== undefined ||
    data.goal_categories !== undefined ||
    data.has_pain_or_injury !== undefined
  );
}

export function parseQuestionnaireData(
  questionnaire: Questionnaire
): StructuredQuestionnaireData | null {
  if (!questionnaire.notes?.trim()) {
    return null;
  }
  try {
    const parsed = JSON.parse(
      questionnaire.notes
    ) as StructuredQuestionnaireData;
    if (parsed.schema_version === 2) {
      return parsed;
    }
    if (parsed.section1_energy_level !== undefined) {
      return parsed;
    }
    if (
      parsed.work_pattern !== undefined ||
      parsed.goal_categories !== undefined ||
      parsed.has_pain_or_injury !== undefined
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function formatQuestionnaireDbColumnsForPrompt(
  questionnaire: Questionnaire
): string {
  let prompt =
    '## Client Questionnaire Data (database columns only — no structured JSON)\n\n';
  prompt += `- Primary Goal: ${questionnaire.primary_goal || 'N/A'}\n`;
  prompt += `- Experience Level: ${questionnaire.experience_level || 'N/A'}\n`;
  prompt += `- Available Days Per Week: ${questionnaire.available_days_per_week ?? 'N/A'}\n`;
  prompt += `- Preferred Session Length: ${questionnaire.preferred_session_length ?? 'N/A'} minutes\n`;
  prompt += `- Activity Level: ${questionnaire.activity_level || 'N/A'}\n`;
  prompt += `- Stress Level: ${questionnaire.stress_level || 'N/A'}\n`;
  prompt += `- Sleep Quality: ${questionnaire.sleep_quality || 'N/A'}\n`;
  prompt += `- Nutrition Habits: ${questionnaire.nutrition_habits || 'N/A'}\n`;
  if (questionnaire.injury_history) {
    prompt += `- Injury History: ${questionnaire.injury_history}\n`;
  }
  if (questionnaire.medical_conditions) {
    prompt += `- Medical Conditions: ${questionnaire.medical_conditions}\n`;
  }
  return prompt;
}

function formatQuestionnaireV1ForPrompt(
  structuredData: StructuredQuestionnaireData
): string {
  let prompt = '## Client Questionnaire Data (legacy slider format)\n\n';
  prompt += '### Section 1 - Starting Point\n';
  prompt += `- Energy Level: ${structuredData.section1_energy_level ?? 'N/A'}/10\n`;
  prompt += `- Exercise Consistency: ${structuredData.section1_exercise_consistency ?? 'N/A'}/10\n`;
  prompt += `- Strength Confidence: ${structuredData.section1_strength_confidence ?? 'N/A'}/10\n`;
  if (structuredData.section1_limiting_factors) {
    prompt += `- Limiting Factors: ${structuredData.section1_limiting_factors}\n`;
  }

  prompt += '\n### Section 2 - Motivation & Mindset\n';
  prompt += `- Motivation: ${structuredData.section2_motivation ?? 'N/A'}/10\n`;
  prompt += `- Discipline: ${structuredData.section2_discipline ?? 'N/A'}/10\n`;
  prompt += `- Support Level: ${structuredData.section2_support_level ?? 'N/A'}/10\n`;
  if (structuredData.section2_what_keeps_going) {
    prompt += `- What Keeps Going: ${structuredData.section2_what_keeps_going}\n`;
  }

  prompt += '\n### Section 3 - Body & Movement\n';
  prompt += `- Pain Limitations: ${structuredData.section3_pain_limitations ?? 'N/A'}/10\n`;
  prompt += `- Mobility Confidence: ${structuredData.section3_mobility_confidence ?? 'N/A'}/10\n`;
  prompt += `- Strength Comparison: ${structuredData.section3_strength_comparison ?? 'N/A'}/10\n`;

  prompt += '\n### Section 4 - Nutrition & Recovery\n';
  prompt += `- Nutrition Alignment: ${structuredData.section4_nutrition_alignment ?? 'N/A'}/10\n`;
  prompt += `- Meal Consistency: ${structuredData.section4_meal_consistency ?? 'N/A'}/10\n`;
  prompt += `- Sleep Quality: ${structuredData.section4_sleep_quality ?? 'N/A'}/10\n`;
  prompt += `- Stress Level: ${structuredData.section4_stress_level ?? 'N/A'}/10\n`;

  prompt += '\n### Section 5 - Identity & Self-Perception\n';
  prompt += `- Body Connection: ${structuredData.section5_body_connection ?? 'N/A'}/10\n`;
  prompt += `- Appearance Satisfaction: ${structuredData.section5_appearance_satisfaction ?? 'N/A'}/10\n`;
  prompt += `- Motivation Driver: ${structuredData.section5_motivation_driver ?? 'N/A'}/10\n`;
  prompt += `- Sustainability Confidence: ${structuredData.section5_sustainability_confidence ?? 'N/A'}/10\n`;
  if (structuredData.section5_success_vision) {
    prompt += `- Success Vision: ${structuredData.section5_success_vision}\n`;
  }
  return prompt;
}

function formatQuestionnaireV2ForPrompt(
  d: StructuredQuestionnaireData
): string {
  let prompt = '## Client Questionnaire Data (structured intake, v2)\n\n';
  prompt +=
    '**Training context:** Sessions are at the **trainer’s gym** (on-site coaching with full facility access). Program for in-person training, not a generic home plan.\n\n';

  prompt += '### Goals & logistics (primary outcomes)\n';
  if (d.goal_categories && d.goal_categories.length > 0) {
    prompt += `- Goal categories: ${d.goal_categories.join(', ')}\n`;
  }
  if (d.primary_goal_label) {
    prompt += `- Primary goal: ${d.primary_goal_label}\n`;
  }
  if (d.goal_timeline) {
    prompt += `- Timeline: ${d.goal_timeline}\n`;
  }
  if (d.success_definition) {
    prompt += `- Success looks like: ${d.success_definition}\n`;
  }
  if (d.available_days_per_week !== undefined) {
    prompt += `- Days available to train per week: ${d.available_days_per_week}\n`;
  }
  if (d.preferred_session_length !== undefined) {
    prompt += `- Preferred session length: ${d.preferred_session_length}\n`;
  }
  if (d.readiness_confidence !== undefined) {
    prompt += `- Readiness / confidence (1–5): ${d.readiness_confidence}\n`;
  }

  prompt += '\n### Pain, injuries & red flags\n';
  prompt += `- Has pain or injury concern: ${yn(d.has_pain_or_injury)}\n`;
  if (d.injury_region) {
    prompt += `- Region / area: ${d.injury_region}\n`;
  }
  if (d.injury_timeline) {
    prompt += `- Timeline: ${d.injury_timeline}\n`;
  }
  if (d.injury_aggravates) {
    prompt += `- What aggravates: ${d.injury_aggravates}\n`;
  }
  if (d.injury_helps) {
    prompt += `- What helps: ${d.injury_helps}\n`;
  }
  prompt += `- Red-flag symptoms present: ${yn(d.injury_red_flags)}\n`;
  if (d.injury_cleared) {
    prompt += `- Cleared by clinician / notes: ${d.injury_cleared}\n`;
  }
  if (d.injury_notes) {
    prompt += `- Extra notes: ${d.injury_notes}\n`;
  }

  prompt +=
    '\n**Interpretation:** Goals above define outcomes; this section guides *how* you program unless red flags or severe limitation in notes require medical clearance or major constraint.\n\n';

  prompt += '### Pre-exercise screening\n';
  prompt +=
    '- Completed **outside** this application. Treat standard PAR-Q style items as **no** (cleared for exercise) unless contradicted elsewhere in this questionnaire.\n\n';

  prompt += '### Daily life & background\n';
  if (d.work_pattern) {
    prompt += `- Work / daily demand: ${d.work_pattern}\n`;
  }
  if (d.walking_frequency) {
    prompt += `- Walking / movement outside gym: ${d.walking_frequency}\n`;
  }
  if (d.other_sports_text) {
    prompt += `- Other sports / activity: ${d.other_sports_text}\n`;
  }
  if (d.training_background) {
    prompt += `- Training background: ${d.training_background}\n`;
  }

  prompt += '\n### Motivation & adherence\n';
  if (d.motivation_adherence) {
    prompt += `- Adherence / motivation: ${d.motivation_adherence}\n`;
  }
  if (d.motivation_barriers) {
    prompt += `- Barriers: ${d.motivation_barriers}\n`;
  }

  prompt += '\n### Eating & recovery habits\n';
  if (d.meals_per_day) {
    prompt += `- Meals per day: ${d.meals_per_day}\n`;
  }
  if (d.protein_level) {
    prompt += `- Protein: ${d.protein_level}\n`;
  }
  if (d.vegetables_frequency) {
    prompt += `- Vegetables: ${d.vegetables_frequency}\n`;
  }
  if (d.alcohol_frequency) {
    prompt += `- Alcohol: ${d.alcohol_frequency}\n`;
  }
  if (d.nutrition_notes) {
    prompt += `- Nutrition notes: ${d.nutrition_notes}\n`;
  }
  if (d.sleep_quality_bucket) {
    prompt += `- Sleep (bucket): ${d.sleep_quality_bucket}\n`;
  }
  if (d.stress_level_bucket) {
    prompt += `- Stress (bucket): ${d.stress_level_bucket}\n`;
  }

  return prompt;
}

export function formatQuestionnaireForPrompt(
  questionnaire: Questionnaire,
  structuredData: StructuredQuestionnaireData | null
): string {
  if (structuredData && isV2(structuredData)) {
    return formatQuestionnaireV2ForPrompt(structuredData);
  }
  if (structuredData) {
    return formatQuestionnaireV1ForPrompt(structuredData);
  }
  return formatQuestionnaireDbColumnsForPrompt(questionnaire);
}
