/**
 * v2 questionnaire stored in `notes` as JSON. Legacy v1 slider fields remain optional for parsing old saves.
 */
export interface QuestionnaireData {
  schema_version: 2;

  // Legacy v1 (optional — old submissions)
  section1_energy_level?: number;
  section1_exercise_consistency?: number;
  section1_strength_confidence?: number;
  section1_limiting_factors?: string;
  section2_motivation?: number;
  section2_discipline?: number;
  section2_support_level?: number;
  section2_what_keeps_going?: string;
  section3_pain_limitations?: number;
  section3_mobility_confidence?: number;
  section3_strength_comparison?: number;
  section4_nutrition_alignment?: number;
  section4_meal_consistency?: number;
  section4_sleep_quality?: number;
  section4_stress_level?: number;
  section5_body_connection?: number;
  section5_appearance_satisfaction?: number;
  section5_motivation_driver?: number;
  section5_sustainability_confidence?: number;
  section5_success_vision?: string;

  parq_chest_pain?: boolean;
  parq_resting_bp?: boolean;
  parq_dizziness?: boolean;
  parq_bone_joint?: boolean;
  parq_heart_meds?: boolean;
  parq_other_reason?: boolean;
  parq_extra?: boolean;
  parq_health_note?: string;

  work_pattern?: string;
  walking_frequency?: string;
  other_sports_text?: string;
  training_background?: string;

  motivation_adherence?: string;
  motivation_barriers?: string;

  has_pain_or_injury?: boolean;
  injury_region?: string;
  injury_timeline?: string;
  injury_aggravates?: string;
  injury_helps?: string;
  injury_red_flags?: boolean;
  injury_cleared?: string;
  injury_notes?: string;

  meals_per_day?: string;
  protein_level?: string;
  vegetables_frequency?: string;
  alcohol_frequency?: string;
  nutrition_notes?: string;
  sleep_quality_bucket?: string;
  stress_level_bucket?: string;

  goal_categories?: string[];
  primary_goal_label?: string;
  goal_timeline?: string;
  success_definition?: string;
  available_days_per_week?: number;
  /** Stored as minutes number or radio string (`"30"` | `"45"` | `"60"`) until save */
  preferred_session_length?: number | string;
  readiness_confidence?: number;
}

export interface YesNoQuestion {
  type: 'yes_no';
  fieldName: keyof QuestionnaireData;
  label: string;
  description?: string;
}

export interface SingleChoiceQuestion {
  type: 'single_choice';
  fieldName: keyof QuestionnaireData;
  label: string;
  options: { value: string; label: string }[];
}

export interface MultiSelectQuestion {
  type: 'multi_select';
  fieldName: keyof QuestionnaireData;
  label: string;
  options: { value: string; label: string }[];
}

export interface TextareaQuestion {
  type: 'textarea';
  fieldName: keyof QuestionnaireData;
  label: string;
  placeholder: string;
  rows?: number;
}

export interface SliderQuestion {
  type: 'slider';
  fieldName: keyof QuestionnaireData;
  label: string;
  minLabel: string;
  maxLabel: string;
  min?: number;
  max?: number;
  defaultValue?: number;
}

export interface NumberQuestion {
  type: 'number';
  fieldName: keyof QuestionnaireData;
  label: string;
  min?: number;
  max?: number;
  step?: number;
}

export type Question =
  | YesNoQuestion
  | SingleChoiceQuestion
  | MultiSelectQuestion
  | TextareaQuestion
  | SliderQuestion
  | NumberQuestion;

export interface Section {
  title: string;
  description: string;
  questions: Question[];
  showWhen?: (data: QuestionnaireData) => boolean;
}
