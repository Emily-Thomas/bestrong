// Admin User Types
export interface AdminUser {
  id: number;
  email: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export interface AdminUserWithPassword extends AdminUser {
  password_hash: string;
}

export interface CreateAdminUserInput {
  email: string;
  password: string;
  name: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

// Client Types
export interface Client {
  id: number;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  date_of_birth?: Date;
  created_by: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateClientInput {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
}

// Questionnaire Types
export interface Questionnaire {
  id: number;
  client_id: number;
  filled_by?: number;
  primary_goal?: string;
  secondary_goals?: string[];
  experience_level?: string;
  preferred_training_style?: string[];
  available_days_per_week?: number;
  preferred_session_length?: number;
  time_preferences?: string[];
  injury_history?: string;
  medical_conditions?: string;
  fitness_equipment_access?: string[];
  activity_level?: string;
  stress_level?: string;
  sleep_quality?: string;
  nutrition_habits?: string;
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateQuestionnaireInput {
  client_id: number;
  primary_goal?: string;
  secondary_goals?: string[];
  experience_level?: string;
  preferred_training_style?: string[];
  available_days_per_week?: number;
  preferred_session_length?: number;
  time_preferences?: string[];
  injury_history?: string;
  medical_conditions?: string;
  fitness_equipment_access?: string[];
  activity_level?: string;
  stress_level?: string;
  sleep_quality?: string;
  nutrition_habits?: string;
  notes?: string;
}

// New structured questionnaire data format
export interface StructuredQuestionnaireData {
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

// Recommendation Types
export interface Recommendation {
  id: number;
  client_id: number;
  questionnaire_id?: number;
  created_by?: number;
  client_type: string;
  sessions_per_week: number;
  session_length_minutes: number;
  training_style: string;
  plan_structure: Record<string, unknown>;
  ai_reasoning?: string;
  status: 'draft' | 'approved' | 'active' | 'completed';
  is_edited: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateRecommendationInput {
  client_id: number;
  questionnaire_id?: number;
  client_type: string;
  sessions_per_week: number;
  session_length_minutes: number;
  training_style: string;
  plan_structure: Record<string, unknown>;
  ai_reasoning?: string;
}

export interface UpdateRecommendationInput {
  sessions_per_week?: number;
  session_length_minutes?: number;
  training_style?: string;
  plan_structure?: Record<string, unknown>;
  status?: 'draft' | 'approved' | 'active' | 'completed';
}

// JWT Payload
export interface JWTPayload {
  userId: number;
  email: string;
  type: 'admin';
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
