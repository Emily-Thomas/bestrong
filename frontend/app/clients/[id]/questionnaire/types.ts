export interface QuestionnaireData {
  // Section 1 - Starting Point
  section1_energy_level?: number;
  section1_exercise_consistency?: number;
  section1_strength_confidence?: number;
  section1_limiting_factors?: string;

  // Section 2 - Motivation & Mindset
  section2_motivation?: number;
  section2_discipline?: number;
  section2_support_level?: number;
  section2_what_keeps_going?: string;

  // Section 3 - Body & Movement
  section3_pain_limitations?: number;
  section3_mobility_confidence?: number;
  section3_strength_comparison?: number;

  // Section 4 - Nutrition & Recovery
  section4_nutrition_alignment?: number;
  section4_meal_consistency?: number;
  section4_sleep_quality?: number;
  section4_stress_level?: number;

  // Section 5 - Identity & Self-Perception
  section5_body_connection?: number;
  section5_appearance_satisfaction?: number;
  section5_motivation_driver?: number;
  section5_sustainability_confidence?: number;
  section5_success_vision?: string;
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

export interface TextareaQuestion {
  type: 'textarea';
  fieldName: keyof QuestionnaireData;
  label: string;
  placeholder: string;
  rows?: number;
}

export type Question = SliderQuestion | TextareaQuestion;

export interface Section {
  title: string;
  description: string;
  questions: Question[];
}

