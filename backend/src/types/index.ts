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
  /** Persisted coach-fit AI result (when present) */
  coach_fit?: QuestionnaireCoachFitStored | null;
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

  /** v2 intake (also in notes JSON) — optional fields */
  schema_version?: 2;
  parq_chest_pain?: boolean;
  parq_resting_bp?: boolean;
  parq_dizziness?: boolean;
  parq_bone_joint?: boolean;
  parq_heart_meds?: boolean;
  parq_other_reason?: boolean;
  /** PAR-Q style: any other reason not to exercise */
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
  preferred_session_length?: number | string;
  readiness_confidence?: number;
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
  plan_structure: Record<string, unknown> | PlanGuidanceStructure;
  ai_reasoning?: string;
  status: 'draft' | 'approved' | 'active' | 'completed';
  is_edited: boolean;
  current_week: number;
  started_at?: Date;
  completed_at?: Date;
  created_at: Date;
  updated_at: Date;
  trainer_id?: number | null;
  comparison_batch_id?: string | null;
}

export interface CreateRecommendationInput {
  client_id: number;
  questionnaire_id?: number;
  client_type: string;
  sessions_per_week: number;
  session_length_minutes: number;
  training_style: string;
  plan_structure: Record<string, unknown> | PlanGuidanceStructure;
  ai_reasoning?: string;
  inbody_scan_id?: number;
  trainer_id?: number | null;
  comparison_batch_id?: string | null;
}

export interface UpdateRecommendationInput {
  sessions_per_week?: number;
  session_length_minutes?: number;
  training_style?: string;
  plan_structure?: Record<string, unknown> | PlanGuidanceStructure;
  status?: 'draft' | 'approved' | 'active' | 'completed';
  current_week?: number;
  trainer_id?: number | null;
  comparison_batch_id?: string | null;
}

/** Coach persona (trainer) for AI style */
export interface TrainerPersonaPillar {
  name: string;
  summary: string;
}

export interface TrainerPersonaStructured {
  coaching_headline: string;
  coaching_narrative: string;
  programming_pillars?: TrainerPersonaPillar[];
  progression_philosophy?: string;
  intensity_and_effort_model?: string;
  prehab_and_systems_integration?: string;
  client_archetype_summary?: string;
  ideal_client_needs?: string[];
  programming_anti_patterns?: string[];
  ai_prompt_injection?: string;
}

export interface Trainer {
  id: number;
  created_by: number;
  first_name: string;
  last_name: string;
  email?: string | null;
  title: string;
  image_url?: string | null;
  raw_trainer_definition: string;
  raw_client_needs: string;
  structured_persona?: TrainerPersonaStructured | null;
  persona_generated_at?: Date | null;
  persona_raw_content_hash?: string | null;
  created_at: Date;
  updated_at: Date;
}

export type TrainerWithPersonaMeta = Trainer & { persona_stale?: boolean };

export interface TrainerCoachMatchOption {
  id: number;
  display_name: string;
  title: string;
  program_summary: string;
}

export interface RecommendedCoachMatch {
  trainer_id: number;
  coach_name: string;
  reasoning: string;
}

/** AI coach-fit: pick one trainer + short rationale (no per-trainer pros/cons) */
export interface CoachFitRecommendation {
  /** At most two sentences; coaches by name only in text, no IDs */
  reasoning: string;
}

export interface CoachFitAnalysis {
  recommended_trainer_id: number;
  recommendation: CoachFitRecommendation;
}

/** Stored in questionnaires.coach_fit JSONB */
export interface QuestionnaireCoachFitStored {
  analysis: CoachFitAnalysis;
  trainer_ids_evaluated: number[];
}

export interface PlanGuidanceWeeklyDay {
  day: string;
  session_label: string;
  focus_theme: string;
}

/** Stored in recommendation.plan_structure */
export interface PlanGuidanceStructure {
  archetype: string;
  description: string;
  phase_1_weeks: number;
  training_methods: string[];
  weekly_repeating_schedule: PlanGuidanceWeeklyDay[];
  progression_guidelines: string;
  intensity_load_progression: string;
  periodization_approach?: string;
}

/** Prebuilt mesocycle library (system-defined; gym-owned templates may come later) */
export type PlanTemplateGoalCategory =
  | 'general_fitness'
  | 'fat_loss'
  | 'muscle_gain'
  | 'strength'
  | 'athletic_performance'
  | 'health_longevity'
  | 'return_to_training';

export type PlanTemplateExperienceLevel =
  | 'beginner'
  | 'intermediate'
  | 'advanced';

export interface PlanTemplateSummary {
  id: string;
  name: string;
  summary: string;
  goal_category: PlanTemplateGoalCategory;
  experience_level: PlanTemplateExperienceLevel;
  sessions_per_week: number;
  session_length_minutes: number;
  phase_1_weeks: number;
  training_style: string;
  /** Short label for UI, e.g. "Moderate", "High" */
  intensity_label: string;
  /** e.g. "Foundation", "Hypertrophy block", "Deload" */
  mesocycle_type: string;
}

/** One exercise slot in a library template session (resolved against the exercise library by name). */
export interface PlanTemplateSessionExercise {
  order: number;
  /** Primary label used to fuzzy-match `exercise_library_exercises.name` */
  library_exercise_name: string;
  sets?: number;
  reps?: string;
  /** Default load / RPE before per-client AI refinement, e.g. "RPE 6–7" or "50% 1RM" */
  load_prescription?: string;
  rest_seconds?: number;
  rir?: number;
  notes?: string;
}

/** Exercises for one repeating session index (0 = first day in weekly_repeating_schedule, etc.). */
export interface PlanTemplateSessionBlueprint {
  session_index: number;
  exercises: PlanTemplateSessionExercise[];
}

/** Deterministic progression applied across weeks of phase 1 (before AI load/RPE refinement). */
export interface PlanTemplateProgression {
  /** Compound weekly multiplier for numeric load strings (e.g. 1.025 ≈ 2.5%/week). */
  weekly_load_multiplier?: number;
  /** Added to parsed RPE numbers each week after week 1 (capped at 9). */
  weekly_rpe_delta?: number;
}

export interface PlanTemplateDefinition extends PlanTemplateSummary {
  client_type: string;
  plan_structure: PlanGuidanceStructure;
  ai_reasoning: string;
  /** When set, library apply builds mesocycle workouts from these slots + library resolution. */
  session_blueprints?: PlanTemplateSessionBlueprint[];
  template_progression?: PlanTemplateProgression;
}

export interface PeerCoachDirectionPreview {
  trainer_id: number;
  coach_name: string;
  direction_summary: string;
  differs_from_recommended?: string;
}

export interface CreateTrainerInput {
  first_name: string;
  last_name: string;
  email?: string;
  title: string;
  image_url?: string;
  raw_trainer_definition: string;
  raw_client_needs: string;
}

export interface UpdateTrainerInput extends Partial<CreateTrainerInput> {}

// Workout Types
export interface ExerciseLibraryMetadataSnapshot {
  primary_muscle_group?: string | null;
  secondary_muscle_groups?: string[] | null;
  movement_pattern?: string | null;
  equipment?: string | null;
  category?: string | null;
}

export interface Exercise {
  name: string;
  sets?: number;
  reps?: string | number; // Can be "8-10" or 8
  weight?: string; // Can be "bodyweight", "RIR 2", "50% 1RM", etc.
  rest_seconds?: number;
  notes?: string;
  tempo?: string; // e.g., "2-0-1-0" for tempo training
  rir?: number; // Reps in Reserve (0-5 scale: 0=failure, 1-5=reps remaining)
  /** True when no exercise-library match by name */
  is_custom?: boolean;
  library_exercise_id?: number;
  library_exercise_name?: string;
  library_metadata?: ExerciseLibraryMetadataSnapshot;
}

export interface ExerciseLibraryExercise {
  id: number;
  name: string;
  primary_muscle_group?: string | null;
  secondary_muscle_groups?: string[] | null;
  movement_pattern?: string | null;
  equipment?: string | null;
  category?: string | null;
  default_sets?: number | null;
  default_reps?: string | null;
  default_load?: string | null;
  default_rest_seconds?: number | null;
  default_tempo?: string | null;
  notes?: string | null;
  status: string;
  created_by?: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateExerciseLibraryExerciseInput {
  name: string;
  primary_muscle_group?: string;
  secondary_muscle_groups?: string[];
  movement_pattern?: string;
  equipment?: string;
  category?: string;
  default_sets?: number;
  default_reps?: string | number;
  default_load?: string;
  default_rest_seconds?: number;
  default_tempo?: string;
  notes?: string;
}

export interface UpdateExerciseLibraryExerciseInput
  extends Partial<CreateExerciseLibraryExerciseInput> {
  status?: string;
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
  plan_structure: PlanGuidanceStructure | Record<string, unknown>;
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
export interface ExerciseRound {
  round_number: number;
  reps?: number | string;
  weight?: string; // Weight used for this specific round
  rir?: number;
  notes?: string;
}

export interface ActualExercisePerformance {
  exercise_name: string; // Matches proposed exercise name
  sets_completed?: number;
  reps_completed?: number | string; // Actual reps (may be range like "8-10") - for backward compatibility
  weight_used?: string; // Actual weight/load used - for backward compatibility
  rir?: number; // Actual RIR (Reps in Reserve, 0-5 scale: 0=failure, 1-5=reps remaining)
  rounds_completed?: number; // For circuit/round-based exercises
  rounds?: ExerciseRound[]; // Per-round data (weight, reps, etc. for each round)
  exercise_rating?: 'happy' | 'meh' | 'sad'; // Per-exercise feedback
  exercise_notes?: string; // What went right/wrong for this exercise
  notes?: string; // Exercise-specific notes (deprecated, use exercise_notes)
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
  overall_rir?: number; // Overall session RIR (Reps in Reserve, 0-5 scale: 0=failure, 1-5=reps remaining)
  client_energy_level?: number; // 1-10 scale
  trainer_observations?: string;
  workout_rating?: 'happy' | 'meh' | 'sad'; // Overall workout feedback
  started_at?: Date;
  completed_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateActualWorkoutInput {
  workout_id: number;
  actual_performance: ActualWorkoutPerformance;
  session_notes?: string;
  overall_rir?: number;
  client_energy_level?: number;
  trainer_observations?: string;
  workout_rating?: 'happy' | 'meh' | 'sad';
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
