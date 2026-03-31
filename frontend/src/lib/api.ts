// NEXT_PUBLIC_API_URL wins. In the browser on local hostnames, call Express
// directly on :3001 — Next dev rewrites to the backend often return plain-text
// "Internal Server Error" (500) instead of JSON when the proxy hiccups.
function resolveApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]'
    ) {
      return 'http://127.0.0.1:3001/api';
    }
  }
  return '/api';
}

const API_BASE_URL = resolveApiBaseUrl();

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    // Don't read from localStorage in constructor - it might run during SSR
    // Token will be synced before each request
    this.token = null;
  }

  setToken(token: string | null) {
    this.token = token;
    if (token && typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    } else if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    // Always sync token from localStorage before making request
    // This ensures we have the latest token even after page refresh
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        // Always use the token from localStorage (source of truth)
        this.token = storedToken;
      } else if (this.token) {
        // If localStorage has no token but we have one in memory, clear it
        this.token = null;
      }
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
        // Avoid stale GET responses (e.g. cached 404 after creating a questionnaire)
        cache: 'no-store',
      });

      const text = await response.text();
      const data = this.parseJsonApiBody<T>(text, response);

      if (!response.ok) {
        // Only clear token on 401/403 if it's NOT the /auth/me endpoint
        // (we handle auth/me failures in AuthContext to avoid clearing token prematurely)
        const isAuthMeEndpoint =
          endpoint === '/auth/me' || endpoint.includes('/auth/me');

        if (
          (response.status === 401 || response.status === 403) &&
          !isAuthMeEndpoint
        ) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
            this.token = null;
          }
        }

        return {
          success: false,
          error: data.error || 'An error occurred',
        };
      }

      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      } as ApiResponse<T>;
    }
  }

  /** Avoids "Unexpected token '<'" when the server returns HTML (wrong URL, 404 page, etc.) */
  private parseJsonApiBody<T>(
    text: string,
    response: Response
  ): ApiResponse<T> {
    const trimmed = text.trim();
    if (!trimmed || trimmed.startsWith('<')) {
      return {
        success: false,
        error:
          response.status === 404
            ? 'API not found. If you are developing locally, run the backend (port 3001) with the frontend.'
            : `Server returned a page instead of JSON (${response.status}). Check NEXT_PUBLIC_API_URL and that the API is running.`,
      } as ApiResponse<T>;
    }
    try {
      return JSON.parse(text) as ApiResponse<T>;
    } catch {
      const oneLine = trimmed.replace(/\s+/g, ' ').slice(0, 320);
      const hint =
        oneLine.length > 0
          ? ` ${oneLine}${trimmed.length > 320 ? '…' : ''}`
          : '';
      return {
        success: false,
        error: `Could not read API response (${response.status}).${hint}`,
      } as ApiResponse<T>;
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async uploadFile<T>(
    endpoint: string,
    file: File,
    additionalData: Record<string, string> = {}
  ): Promise<ApiResponse<T>> {
    // Sync token from localStorage
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('auth_token');
      if (storedToken) {
        this.token = storedToken;
      }
    }

    const url = `${this.baseUrl}${endpoint}`;
    const formData = new FormData();
    formData.append('file', file);

    // Add additional form data
    Object.entries(additionalData).forEach(([key, value]) => {
      formData.append(key, value);
    });

    const headers: Record<string, string> = {};
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        credentials: 'include',
        cache: 'no-store',
      });

      const text = await response.text();
      const data = this.parseJsonApiBody<T>(text, response);

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('auth_token');
            this.token = null;
          }
        }
        return {
          success: false,
          error: data.error || 'An error occurred',
        };
      }

      return data;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      } as ApiResponse<T>;
    }
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post<{
      user: { id: number; email: string; name: string };
      token: string;
    }>('/auth/login', { email, password });
    if (response.success && response.data) {
      apiClient.setToken(response.data.token);
    }
    return response;
  },

  register: async (email: string, password: string, name: string) => {
    return apiClient.post('/auth/register', { email, password, name });
  },

  getMe: async () => {
    return apiClient.get<{ id: number; email: string; name: string }>(
      '/auth/me'
    );
  },

  logout: () => {
    apiClient.setToken(null);
  },
};

// Clients API
export const clientsApi = {
  getAll: () => apiClient.get<Client[]>('/clients'),
  getById: (id: number) => apiClient.get<Client>(`/clients/${id}`),
  create: (data: CreateClientInput) => apiClient.post<Client>('/clients', data),
  update: (
    id: number,
    data: Partial<CreateClientInput & { status?: Client['status'] }>
  ) => apiClient.put<Client>(`/clients/${id}`, data),
  delete: (id: number) => apiClient.delete(`/clients/${id}`),
};

// Questionnaires API
export const questionnairesApi = {
  getById: (id: number) =>
    apiClient.get<Questionnaire>(`/questionnaires/${id}`),
  getByClientId: (clientId: number) =>
    apiClient.get<Questionnaire>(`/questionnaires/client/${clientId}`),
  create: (data: CreateQuestionnaireInput) =>
    apiClient.post<Questionnaire>('/questionnaires', data),
  update: (id: number, data: Partial<CreateQuestionnaireInput>) =>
    apiClient.put<Questionnaire>(`/questionnaires/${id}`, data),
  delete: (id: number) => apiClient.delete(`/questionnaires/${id}`),
};

// Recommendations API
export const recommendationsApi = {
  // Async job-based generation (new, recommended)
  startGenerationFromQuestionnaire: (
    questionnaireId: number,
    body?: { trainer_id?: number }
  ) =>
    apiClient.post<{ job_id: number }>(
      `/recommendations/generate/${questionnaireId}/start`,
      body ?? {}
    ),
  /** Quick AI: suggested coach + structured rationale (no full plans). */
  coachFitAnalysis: (questionnaireId: number) =>
    apiClient.post<{
      analysis: CoachFitAnalysis;
      trainer_ids_evaluated: number[];
    }>(`/recommendations/questionnaire/${questionnaireId}/coach-fit`, {}),
  startGenerationFromClient: (clientId: number) =>
    apiClient.post<{ job_id: number }>(
      `/recommendations/generate/client/${clientId}/start`
    ),
  getJobStatus: (jobId: number) =>
    apiClient.get<RecommendationJob>(`/recommendations/generate/job/${jobId}`),
  getLatestJobByQuestionnaireId: (questionnaireId: number) =>
    apiClient.get<RecommendationJob>(
      `/recommendations/generate/questionnaire/${questionnaireId}/job`
    ),
  cancelJob: (jobId: number, reason?: string) =>
    apiClient.post<RecommendationJob>(
      `/recommendations/generate/job/${jobId}/cancel`,
      { reason }
    ),

  // Legacy blocking generation (deprecated, kept for backward compatibility)
  generateFromQuestionnaire: (questionnaireId: number) =>
    apiClient.post<Recommendation>(
      `/recommendations/generate/${questionnaireId}`
    ),
  generateFromClient: (clientId: number) =>
    apiClient.post<Recommendation>(
      `/recommendations/generate/client/${clientId}`
    ),

  // Standard CRUD operations
  getById: (id: number) =>
    apiClient.get<Recommendation>(`/recommendations/${id}`),
  getByClientId: (clientId: number) =>
    apiClient.get<Recommendation[]>(`/recommendations/client/${clientId}`),
  getByQuestionnaireId: (questionnaireId: number) =>
    apiClient.get<Recommendation>(
      `/recommendations/questionnaire/${questionnaireId}`
    ),
  update: (id: number, data: UpdateRecommendationInput) =>
    apiClient.put<Recommendation>(`/recommendations/${id}`, data),
  delete: (id: number) => apiClient.delete(`/recommendations/${id}`),
  getWorkouts: (id: number) =>
    apiClient.get<Workout[]>(`/recommendations/${id}/workouts`),
  getWorkoutsByWeek: (id: number, weekNumber: number) =>
    apiClient.get<Workout[]>(
      `/recommendations/${id}/week/${weekNumber}/workouts`
    ),
  getWeekStatus: (id: number, weekNumber: number) =>
    apiClient.get<{
      week_number: number;
      total_workouts: number;
      completed_workouts: number;
      skipped_workouts?: number;
      in_progress_workouts?: number;
      scheduled_workouts?: number;
      is_complete: boolean;
      workouts: Workout[];
    }>(`/recommendations/${id}/week/${weekNumber}/status`),
  activateClient: (clientId: number, recommendationId: number) =>
    apiClient.post<{ client: Client; recommendation: Recommendation }>(
      `/clients/${clientId}/activate`,
      { recommendation_id: recommendationId }
    ),
  generateWeek: (id: number, weekNumber: number) =>
    apiClient.post<{ job_id: number }>(`/recommendations/${id}/generate-week`, {
      week_number: weekNumber,
    }),
  getWeekGenerationJob: (id: number, jobId: number) =>
    apiClient.get<WeekGenerationJob>(
      `/recommendations/${id}/generate-week/job/${jobId}`
    ),
  getWeekGenerationJobs: (id: number) =>
    apiClient.get<WeekGenerationJob[]>(`/recommendations/${id}/week-jobs`),

  /** AI generates mesocycle workouts (preview on job); save via applyWorkoutGenerationPreview */
  startWorkoutGenerationFromPlan: (recommendationId: number) =>
    apiClient.post<{ job_id: number }>(
      `/recommendations/${recommendationId}/workouts/generate/start`
    ),
  applyWorkoutGenerationPreview: (
    recommendationId: number,
    body: { job_id: number; workouts?: LLMWorkoutPreview[] }
  ) =>
    apiClient.post<Recommendation>(
      `/recommendations/${recommendationId}/workouts/generate/apply`,
      body
    ),

  getComparisonBatch: (batchId: string) =>
    apiClient.get<{
      plans: { recommendation: Recommendation; trainer: Trainer | null }[];
    }>(`/recommendations/comparison-batch/${encodeURIComponent(batchId)}`),

  selectComparisonPlan: (batchId: string, recommendationId: number) =>
    apiClient.post<Recommendation>(
      `/recommendations/comparison-batch/${encodeURIComponent(batchId)}/select`,
      { recommendation_id: recommendationId }
    ),

  /** System plan library — async job applies template + generates full mesocycle workouts */
  getPlanTemplates: () =>
    apiClient.get<PlanTemplateSummary[]>('/recommendations/plan-templates'),
  getPlanTemplateById: (templateId: string) =>
    apiClient.get<PlanTemplateDetail>(
      `/recommendations/plan-templates/${encodeURIComponent(templateId)}`
    ),
  applyPlanTemplate: (
    templateId: string,
    body: {
      questionnaire_id: number;
      trainer_id?: number;
    }
  ) =>
    apiClient.post<{ job_id: number }>(
      `/recommendations/plan-templates/${encodeURIComponent(templateId)}/apply`,
      body
    ),
  /** Custom mesocycle from admin-defined structure — async job saves plan + optional AI workouts */
  startManualPlan: (body: ManualPlanStartPayload) =>
    apiClient.post<{ job_id: number }>(
      '/recommendations/manual-plan/start',
      body
    ),
};

// Trainers API (coach personas)
export const trainersApi = {
  getAll: () => apiClient.get<Trainer[]>('/trainers'),
  getById: (id: number) => apiClient.get<Trainer>(`/trainers/${id}`),
  create: (data: CreateTrainerInput) =>
    apiClient.post<Trainer>('/trainers', data),
  update: (id: number, data: UpdateTrainerInput) =>
    apiClient.put<Trainer>(`/trainers/${id}`, data),
  delete: (id: number) => apiClient.delete(`/trainers/${id}`),
  generatePersona: (id: number) =>
    apiClient.post<Trainer>(`/trainers/${id}/generate-persona`),
};

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
  created_at: string;
  updated_at: string;
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

export const exerciseLibraryApi = {
  getAll: (params?: {
    search?: string;
    status?: 'active' | 'archived' | 'all';
  }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.status) q.set('status', params.status);
    const suffix = q.toString() ? `?${q}` : '';
    return apiClient.get<ExerciseLibraryExercise[]>(
      `/exercise-library${suffix}`
    );
  },
  getById: (id: number) =>
    apiClient.get<ExerciseLibraryExercise>(`/exercise-library/${id}`),
  getSimilar: (id: number, params?: { limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.limit != null) q.set('limit', String(params.limit));
    const suffix = q.toString() ? `?${q}` : '';
    return apiClient.get<ExerciseLibraryExercise[]>(
      `/exercise-library/${id}/similar${suffix}`
    );
  },
  create: (data: CreateExerciseLibraryExerciseInput) =>
    apiClient.post<ExerciseLibraryExercise>('/exercise-library', data),
  update: (id: number, data: Partial<CreateExerciseLibraryExerciseInput>) =>
    apiClient.put<ExerciseLibraryExercise>(`/exercise-library/${id}`, data),
  archive: (id: number) =>
    apiClient.post<ExerciseLibraryExercise>(`/exercise-library/${id}/archive`),
};

// InBody Scans API
export const inbodyScansApi = {
  upload: (clientId: number, file: File) =>
    apiClient.uploadFile<{ scan_id: number; extraction_status: string }>(
      '/inbody-scans/upload',
      file,
      { client_id: clientId.toString() }
    ),
  getById: (id: number) => apiClient.get<InBodyScan>(`/inbody-scans/${id}`),
  getStatus: (id: number) =>
    apiClient.get<{
      extraction_status: string;
      scan?: InBodyScan;
    }>(`/inbody-scans/${id}/status`),
  getByClientId: (clientId: number) =>
    apiClient.get<InBodyScan[]>(`/inbody-scans/client/${clientId}`),
  getLatestByClientId: (clientId: number) =>
    apiClient.get<InBodyScan>(`/inbody-scans/client/${clientId}/latest`),
  hasScan: (clientId: number) =>
    apiClient.get<{
      has_scan: boolean;
      has_verified_scan: boolean;
      scan_count: number;
      latest_scan_id: number | null;
    }>(`/inbody-scans/client/${clientId}/has-scan`),
  update: (id: number, data: UpdateInBodyScanInput) =>
    apiClient.put<InBodyScan>(`/inbody-scans/${id}`, data),
  delete: (id: number) => apiClient.delete(`/inbody-scans/${id}`),
  download: (id: number) => {
    // Download redirects, so we return the URL
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    return `/api/inbody-scans/${id}/download${token ? `?token=${token}` : ''}`;
  },
};

// Types
export interface Client {
  id: number;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  status?: 'prospect' | 'active' | 'inactive' | 'archived';
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface CreateClientInput {
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
}

export interface TrainerPersonaPillar {
  name: string;
  summary: string;
}

/** Structured persona returned from the backend / AI pipeline */
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
  created_by?: number;
  first_name: string;
  last_name: string;
  email?: string | null;
  title: string;
  image_url?: string | null;
  raw_trainer_definition: string;
  raw_client_needs: string;
  structured_persona?: TrainerPersonaStructured | null;
  persona_generated_at?: string | null;
  persona_raw_content_hash?: string | null;
  persona_stale?: boolean;
  created_at?: string;
  updated_at?: string;
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
  coach_fit?: QuestionnaireCoachFitStored | null;
  created_at: string;
  updated_at: string;
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
  reps?: string | number;
  weight?: string;
  rest_seconds?: number;
  notes?: string;
  tempo?: string;
  rir?: number;
  is_custom?: boolean;
  library_exercise_id?: number;
  library_exercise_name?: string;
  library_metadata?: ExerciseLibraryMetadataSnapshot;
}

export interface WorkoutData {
  exercises: Exercise[];
  warmup?: Exercise[];
  cooldown?: Exercise[];
  total_duration_minutes?: number;
  focus_areas?: string[];
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
  status?: 'scheduled' | 'in_progress' | 'completed' | 'skipped' | 'cancelled';
  scheduled_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  actual_workout?: ActualWorkout;
}

export interface ExerciseRound {
  round_number: number;
  reps?: number | string;
  weight?: string;
  rir?: number;
  notes?: string;
}

export interface ActualExercisePerformance {
  exercise_name: string;
  sets_completed?: number;
  reps_completed?: number | string; // For backward compatibility
  weight_used?: string; // For backward compatibility
  rir?: number;
  rounds_completed?: number;
  rounds?: ExerciseRound[]; // Per-round data (weight, reps, etc. for each round)
  exercise_rating?: 'happy' | 'meh' | 'sad'; // Per-exercise feedback
  exercise_notes?: string; // What went right/wrong for this exercise
  notes?: string; // Exercise-specific notes (deprecated, use exercise_notes)
  rest_taken_seconds?: number;
}

export interface ActualWorkoutPerformance {
  exercises: ActualExercisePerformance[];
  warmup_completed?: boolean;
  cooldown_completed?: boolean;
  total_duration_minutes?: number;
  modifications_made?: string;
}

export interface ActualWorkout {
  id: number;
  workout_id: number;
  completed_by?: number;
  actual_performance: ActualWorkoutPerformance;
  session_notes?: string;
  overall_rir?: number;
  client_energy_level?: number;
  trainer_observations?: string;
  workout_rating?: 'happy' | 'meh' | 'sad'; // Overall workout feedback
  started_at?: string;
  completed_at: string;
  created_at: string;
  updated_at: string;
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

export interface UpdateWorkoutInput {
  workout_name?: string;
  workout_data?: WorkoutData;
  workout_reasoning?: string;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'skipped' | 'cancelled';
  scheduled_date?: string;
}

/** AI coach fit: suggested trainer + short rationale (≤2 sentences in production) */
export interface CoachFitRecommendation {
  reasoning: string;
}

export interface CoachFitAnalysis {
  recommended_trainer_id: number;
  recommendation: CoachFitRecommendation;
}

/** Persisted on questionnaires.coach_fit JSONB */
export interface QuestionnaireCoachFitStored {
  analysis: CoachFitAnalysis;
  trainer_ids_evaluated: number[];
}

function truncateCoachFitReasoningToTwoSentences(text: string): string {
  const t = text.trim();
  if (!t) return t;
  const sentences = t.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  if (sentences.length <= 2) {
    return sentences.join(' ').trim();
  }
  return `${sentences[0].trim()} ${sentences[1].trim()}`.trim();
}

function parseCoachFitTrainerId(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return Math.trunc(raw);
  }
  if (typeof raw === 'string' && /^\d+$/.test(raw.trim())) {
    const n = parseInt(raw.trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

/** Unwrap `questionnaires.coach_fit` (object or occasional JSON string). */
export function getCoachFitAnalysisFromQuestionnaire(
  questionnaire: Questionnaire | null
): unknown | null {
  if (!questionnaire?.coach_fit) return null;
  const cf = questionnaire.coach_fit;
  if (typeof cf === 'string') {
    try {
      const p = JSON.parse(cf) as unknown;
      if (p && typeof p === 'object' && p !== null && 'analysis' in p) {
        return (p as { analysis: unknown }).analysis;
      }
    } catch {
      return null;
    }
    return null;
  }
  if (typeof cf === 'object' && cf !== null && 'analysis' in cf) {
    return (cf as QuestionnaireCoachFitStored).analysis;
  }
  return null;
}

/**
 * Coerce coach-fit API payloads (including legacy `recommendation_reasoning` only)
 * into a consistent shape. Returns null if the payload cannot be shown.
 */
export function normalizeCoachFitAnalysis(
  raw: unknown
): CoachFitAnalysis | null {
  if (!raw || typeof raw !== 'object') return null;
  const a = raw as Record<string, unknown>;
  const id = parseCoachFitTrainerId(a.recommended_trainer_id);
  if (id === null) return null;

  const rec = a.recommendation;
  if (rec && typeof rec === 'object' && !Array.isArray(rec)) {
    const r = rec as Record<string, unknown>;
    if (typeof r.reasoning === 'string' && r.reasoning.trim()) {
      return {
        recommended_trainer_id: id,
        recommendation: {
          reasoning: truncateCoachFitReasoningToTwoSentences(r.reasoning.trim()),
        },
      };
    }
    const headline = typeof r.headline === 'string' ? r.headline.trim() : '';
    const bottomLine =
      typeof r.bottom_line === 'string' ? r.bottom_line.trim() : '';
    const keyPoints = Array.isArray(r.key_points)
      ? r.key_points.map((x) => String(x).trim()).filter(Boolean)
      : [];
    const merged = [headline, ...keyPoints, bottomLine].filter(Boolean).join(' ');
    if (merged.trim()) {
      return {
        recommended_trainer_id: id,
        recommendation: {
          reasoning: truncateCoachFitReasoningToTwoSentences(merged.trim()),
        },
      };
    }
  }

  const legacy = a.recommendation_reasoning;
  if (typeof legacy === 'string' && legacy.trim()) {
    const text = legacy.trim();
    return {
      recommended_trainer_id: id,
      recommendation: {
        reasoning: truncateCoachFitReasoningToTwoSentences(text),
      },
    };
  }

  return null;
}

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
  current_week?: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  trainer_id?: number | null;
  comparison_batch_id?: string | null;
  workouts?: Workout[]; // Optional, included when fetching recommendation
}

/** Prebuilt mesocycle templates (system library; gym-defined templates may come later) */
export type PlanTemplateGoalCategory =
  | 'general_fitness'
  | 'fat_loss'
  | 'muscle_gain'
  | 'strength'
  | 'athletic_performance'
  | 'health_longevity'
  | 'return_to_training';

export interface PlanTemplateSummary {
  id: string;
  name: string;
  summary: string;
  goal_category: PlanTemplateGoalCategory;
  experience_level: 'beginner' | 'intermediate' | 'advanced';
  sessions_per_week: number;
  session_length_minutes: number;
  phase_1_weeks: number;
  training_style: string;
  intensity_label: string;
  mesocycle_type: string;
  /** True when the template includes exercise slots (library apply builds workouts). */
  has_session_blueprints?: boolean;
}

export interface PlanTemplateSessionExercise {
  order: number;
  library_exercise_name: string;
  sets?: number;
  reps?: string;
  load_prescription?: string;
  rest_seconds?: number;
  rir?: number;
  notes?: string;
}

export interface PlanTemplateSessionBlueprint {
  session_index: number;
  exercises: PlanTemplateSessionExercise[];
}

export interface PlanTemplateProgression {
  weekly_load_multiplier?: number;
  weekly_rpe_delta?: number;
}

/** Full library template (for detail modal); extends summary with planning + optional blueprints */
export interface PlanTemplateDetail extends PlanTemplateSummary {
  client_type: string;
  plan_structure: PlanGuidanceStructure;
  ai_reasoning: string;
  session_blueprints?: PlanTemplateSessionBlueprint[];
  template_progression?: PlanTemplateProgression;
}

export interface PlanGuidanceWeeklyDay {
  day: string;
  session_label: string;
  focus_theme: string;
}

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

export interface ManualPlanStartPayload {
  questionnaire_id: number;
  trainer_id?: number;
  client_type: string;
  sessions_per_week: number;
  session_length_minutes: number;
  training_style: string;
  plan_structure: PlanGuidanceStructure;
  ai_reasoning?: string;
}

export interface UpdateRecommendationInput {
  sessions_per_week?: number;
  session_length_minutes?: number;
  training_style?: string;
  plan_structure?: Record<string, unknown>;
  status?: 'draft' | 'approved' | 'active' | 'completed';
  current_week?: number;
}

// Workouts API
export const workoutsApi = {
  getById: (id: number) => apiClient.get<Workout>(`/workouts/${id}`),
  update: (id: number, data: UpdateWorkoutInput) =>
    apiClient.patch<Workout>(`/workouts/${id}`, data),
  start: (id: number) => apiClient.post<Workout>(`/workouts/${id}/start`),
  complete: (id: number, data: CreateActualWorkoutInput) =>
    apiClient.post<{ workout: Workout; actual_workout: ActualWorkout }>(
      `/workouts/${id}/complete`,
      data
    ),
  updateActual: (id: number, data: Partial<CreateActualWorkoutInput>) =>
    apiClient.patch<ActualWorkout>(`/workouts/${id}/actual`, data),
};

/** Matches LLM shape before workouts are persisted */
export interface LLMWorkoutPreview {
  week_number: number;
  session_number: number;
  workout_name: string;
  workout_data: WorkoutData;
  workout_reasoning: string;
}

export interface RecommendationJob {
  id: number;
  questionnaire_id: number;
  client_id: number;
  created_by?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  current_step?: string;
  recommendation_id?: number;
  error_message?: string;
  metadata?: {
    mode?: string;
    trainer_ids?: number[];
    comparison_batch_id?: string;
    recommendation_ids?: number[];
    recommendation_id?: number;
    preview_workouts?: LLMWorkoutPreview[];
    /** Set when a library template with session blueprints persisted built workouts */
    template_library_built_workouts?: boolean;
  } | null;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  updated_at: string;
}

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
  scan_date?: string;
  weight_lbs?: number;
  smm_lbs?: number;
  body_fat_mass_lbs?: number;
  bmi?: number;
  percent_body_fat?: number;
  segment_analysis?: SegmentAnalysis;
  extraction_status: 'pending' | 'completed' | 'failed' | 'verified';
  extraction_raw_response?: string;
  verified: boolean;
  verified_at?: string;
  verified_by?: number;
  created_at: string;
  updated_at: string;
}

export interface UpdateInBodyScanInput {
  scan_date?: string;
  weight_lbs?: number;
  smm_lbs?: number;
  body_fat_mass_lbs?: number;
  bmi?: number;
  percent_body_fat?: number;
  segment_analysis?: SegmentAnalysis;
  verified?: boolean;
}

export interface WeekGenerationJob {
  id: number;
  recommendation_id: number;
  week_number: number;
  created_by?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  current_step?: string;
  error_message?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  updated_at: string;
}
