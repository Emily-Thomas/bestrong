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

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
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
  update: (id: number, data: Partial<CreateClientInput>) =>
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
  generateFromQuestionnaire: (questionnaireId: number) =>
    apiClient.post<Recommendation>(
      `/recommendations/generate/${questionnaireId}`
    ),
  generateFromClient: (clientId: number) =>
    apiClient.post<Recommendation>(
      `/recommendations/generate/client/${clientId}`
    ),
  getById: (id: number) =>
    apiClient.get<Recommendation>(`/recommendations/${id}`),
  getByClientId: (clientId: number) =>
    apiClient.get<Recommendation[]>(`/recommendations/client/${clientId}`),
  update: (id: number, data: UpdateRecommendationInput) =>
    apiClient.put<Recommendation>(`/recommendations/${id}`, data),
  delete: (id: number) => apiClient.delete(`/recommendations/${id}`),
};

// Types
export interface Client {
  id: number;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
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
  created_at: string;
  updated_at: string;
}

export interface UpdateRecommendationInput {
  sessions_per_week?: number;
  session_length_minutes?: number;
  training_style?: string;
  plan_structure?: Record<string, unknown>;
  status?: 'draft' | 'approved' | 'active' | 'completed';
}
