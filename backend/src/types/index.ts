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
  status: 'prospect' | 'active' | 'inactive' | 'archived';
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

export interface UpdateClientInput {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  status?: 'prospect' | 'active' | 'inactive' | 'archived';
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
  current_week: number;
  started_at?: Date;
  completed_at?: Date;
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
  inbody_scan_id?: number;
}

export interface UpdateRecommendationInput {
  sessions_per_week?: number;
  session_length_minutes?: number;
  training_style?: string;
  plan_structure?: Record<string, unknown>;
  status?: 'draft' | 'approved' | 'active' | 'completed';
  current_week?: number;
}

// Workout Types
export interface Exercise {
  name: string;
  sets?: number;
  reps?: string | number; // Can be "8-10" or 8
  weight?: string; // Can be "bodyweight", "RPE 7", "50% 1RM", etc.
  rest_seconds?: number;
  notes?: string;
  tempo?: string; // e.g., "2-0-1-0" for tempo training
  rpe?: number; // Rate of Perceived Exertion (1-10)
}

export interface WorkoutData {
  exercises: Exercise[];
  warmup?: Exercise[];
  cooldown?: Exercise[];
  total_duration_minutes?: number;
  focus_areas?: string[]; // e.g., ["upper body", "push", "strength"]
  notes?: string;
}

export interface Workout {
  id: number;
  recommendation_id: number;
  week_number: number;
  session_number: number;
  workout_name?: string;
  workout_data: WorkoutData;
  workout_reasoning?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'skipped' | 'cancelled';
  scheduled_date?: Date;
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
  actual_workout?: ActualWorkout;
}

export interface CreateWorkoutInput {
  recommendation_id: number;
  week_number: number;
  session_number: number;
  workout_name?: string;
  workout_data: WorkoutData;
  workout_reasoning?: string;
}

export interface UpdateWorkoutInput {
  workout_name?: string;
  workout_data?: WorkoutData;
  workout_reasoning?: string;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'skipped' | 'cancelled';
  scheduled_date?: string;
  completed_at?: string;
}

// LLM Response Types
export interface LLMRecommendationResponse {
  client_type: string;
  client_type_reasoning: string;
  sessions_per_week: number;
  session_length_minutes: number;
  training_style: string;
  plan_structure: {
    archetype: string;
    description: string;
    weeks: number;
    training_methods: string[];
    weekly_structure: Record<string, string>;
    progression_strategy?: string;
    periodization_approach?: string;
  };
  ai_reasoning: string;
  workouts: LLMWorkoutResponse[];
}

export interface LLMWorkoutResponse {
  week_number: number;
  session_number: number;
  workout_name: string;
  workout_data: WorkoutData;
  workout_reasoning: string;
}

// JWT Payload
export interface JWTPayload {
  userId: number;
  email: string;
  type: 'admin';
}

// Actual Workout Types
export interface ActualExercisePerformance {
  exercise_name: string; // Matches proposed exercise name
  sets_completed?: number;
  reps_completed?: number | string; // Actual reps (may be range like "8-10")
  weight_used?: string; // Actual weight/load used
  rpe?: number; // Actual RPE (1-10)
  rounds_completed?: number; // For circuit/round-based exercises
  notes?: string; // Exercise-specific notes
  rest_taken_seconds?: number; // Actual rest time
}

export interface ActualWorkoutPerformance {
  exercises: ActualExercisePerformance[];
  warmup_completed?: boolean;
  cooldown_completed?: boolean;
  total_duration_minutes?: number;
  modifications_made?: string; // What was changed from the plan
}

export interface ActualWorkout {
  id: number;
  workout_id: number;
  completed_by?: number;
  actual_performance: ActualWorkoutPerformance;
  session_notes?: string;
  overall_rpe?: number; // Overall session RPE (1-10)
  client_energy_level?: number; // 1-10 scale
  trainer_observations?: string;
  started_at?: Date;
  completed_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateActualWorkoutInput {
  workout_id: number;
  actual_performance: ActualWorkoutPerformance;
  session_notes?: string;
  overall_rpe?: number;
  client_energy_level?: number;
  trainer_observations?: string;
  started_at?: string;
  completed_at: string;
}

// Week Generation Job Types
export interface WeekGenerationJob {
  id: number;
  recommendation_id: number;
  week_number: number;
  created_by?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  current_step?: string;
  error_message?: string;
  created_at: Date;
  started_at?: Date;
  completed_at?: Date;
  updated_at: Date;
}

export interface CreateWeekGenerationJobInput {
  recommendation_id: number;
  week_number: number;
}

// InBody Scan Types
export interface SegmentAnalysis {
  right_arm?: {
    muscle_mass_lbs?: number;
    fat_mass_lbs?: number;
    percent_fat?: number;
  };
  left_arm?: {
    muscle_mass_lbs?: number;
    fat_mass_lbs?: number;
    percent_fat?: number;
  };
  trunk?: {
    muscle_mass_lbs?: number;
    fat_mass_lbs?: number;
    percent_fat?: number;
  };
  right_leg?: {
    muscle_mass_lbs?: number;
    fat_mass_lbs?: number;
    percent_fat?: number;
  };
  left_leg?: {
    muscle_mass_lbs?: number;
    fat_mass_lbs?: number;
    percent_fat?: number;
  };
}

export interface InBodyScan {
  id: number;
  client_id: number;
  uploaded_by: number;
  file_path: string;
  file_name: string;
  file_size_bytes?: number;
  mime_type: string;
  scan_date?: Date;
  weight_lbs?: number;
  smm_lbs?: number;
  body_fat_mass_lbs?: number;
  bmi?: number;
  percent_body_fat?: number;
  segment_analysis?: SegmentAnalysis;
  extraction_status: 'pending' | 'completed' | 'failed' | 'verified';
  extraction_raw_response?: string;
  verified: boolean;
  verified_at?: Date;
  verified_by?: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateInBodyScanInput {
  client_id: number;
  file_path: string;
  file_name: string;
  file_size_bytes?: number;
  mime_type?: string;
}

export interface UpdateInBodyScanInput {
  scan_date?: Date | string;
  weight_lbs?: number;
  smm_lbs?: number;
  body_fat_mass_lbs?: number;
  bmi?: number;
  percent_body_fat?: number;
  segment_analysis?: SegmentAnalysis;
  verified?: boolean;
  extraction_status?: 'pending' | 'completed' | 'failed' | 'verified';
}

export interface ExtractedInBodyData {
  weight_lbs?: number;
  smm_lbs?: number;
  body_fat_mass_lbs?: number;
  bmi?: number;
  percent_body_fat?: number;
  scan_date?: string;
  segment_analysis?: SegmentAnalysis;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
