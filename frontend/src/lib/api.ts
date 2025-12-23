// In production on Vercel, use relative paths (same domain)
// In development, use the local backend URL
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.origin === 'http://localhost:3000'
    ? 'http://localhost:3001/api'
    : '/api');

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
      });

      const data = await response.json();

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
      };
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
      });

      const data = await response.json();

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
      };
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
  update: (id: number, data: Partial<CreateClientInput & { status?: Client['status'] }>) =>
    apiClient.put<Client>(`/clients/${id}`, data),
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
  startGenerationFromQuestionnaire: (questionnaireId: number) =>
    apiClient.post<{ job_id: number }>(
      `/recommendations/generate/${questionnaireId}/start`
    ),
  startGenerationFromClient: (clientId: number) =>
    apiClient.post<{ job_id: number }>(
      `/recommendations/generate/client/${clientId}/start`
    ),
  getJobStatus: (jobId: number) =>
    apiClient.get<RecommendationJob>(`/recommendations/generate/job/${jobId}`),
  getLatestJobByQuestionnaireId: (questionnaireId: number) =>
    apiClient.get<RecommendationJob>(`/recommendations/generate/questionnaire/${questionnaireId}/job`),
  cancelJob: (jobId: number, reason?: string) =>
    apiClient.post<RecommendationJob>(`/recommendations/generate/job/${jobId}/cancel`, { reason }),
  
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
    apiClient.get<Workout[]>(`/recommendations/${id}/week/${weekNumber}/workouts`),
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
      scan_count: number;
      latest_scan_id: number | null;
    }>(`/inbody-scans/client/${clientId}/has-scan`),
  update: (id: number, data: UpdateInBodyScanInput) =>
    apiClient.put<InBodyScan>(`/inbody-scans/${id}`, data),
  delete: (id: number) => apiClient.delete(`/inbody-scans/${id}`),
  download: (id: number) => {
    // Download redirects, so we return the URL
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
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

export interface Exercise {
  name: string;
  sets?: number;
  reps?: string | number;
  weight?: string;
  rest_seconds?: number;
  notes?: string;
  tempo?: string;
  rir?: number;
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

export interface ActualExercisePerformance {
  exercise_name: string;
  sets_completed?: number;
  reps_completed?: number | string;
  weight_used?: string;
  rir?: number;
  rounds_completed?: number;
  notes?: string;
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
  workouts?: Workout[]; // Optional, included when fetching recommendation
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

export interface RecommendationJob {
  id: number;
  questionnaire_id: number;
  client_id: number;
  created_by?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  current_step?: string;
  recommendation_id?: number;
  error_message?: string;
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
