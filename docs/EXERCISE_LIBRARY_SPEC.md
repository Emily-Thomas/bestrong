## Exercise Library Specification

### Overview

The **Exercise Library** is a shared catalog of atomic exercises (e.g., “Barbell Bench Press”, “Back Squat”) that trainers can reuse when building workouts for clients.  
This spec defines the backend data model, API, and integration points so the existing workout planning and editing flows can leverage the library.

The initial implementation focuses on:
- A single shared library across all trainers (multi-tenant support can be added later).
- CRUD operations for exercises.
- Light filtering/search on the API.
- A non-breaking integration with the existing workout model.

Frontend experiments may still use local state/localStorage, but the backend is the **source of truth** once wired up.

---

### Data Model

#### Table: `exercise_library_exercises`

Stores a single atomic exercise definition.

- **Columns**
  - `id` `SERIAL PRIMARY KEY`
  - `name` `VARCHAR(255) NOT NULL`
  - `primary_muscle_group` `VARCHAR(100)` – e.g., `Chest`, `Quads`
  - `secondary_muscle_groups` `TEXT[]` – optional additional muscle groups
  - `movement_pattern` `VARCHAR(100)` – e.g., `Squat`, `Hinge`, `Horizontal Push`
  - `equipment` `VARCHAR(100)` – e.g., `Barbell`, `Dumbbells`, `SkiErg`, `Sled`
  - `category` `VARCHAR(100)` – e.g., `Strength`, `Hypertrophy`, `Accessory`, `Conditioning`, `Core`
  - `default_sets` `INTEGER`
  - `default_reps` `VARCHAR(50)` – e.g., `8-10`, `5`
  - `default_load` `VARCHAR(100)` – e.g., `RIR 2`, `70% 1RM`, `Bodyweight`
  - `default_rest_seconds` `INTEGER`
  - `default_tempo` `VARCHAR(50)` – e.g., `3-1-1-0`
  - `notes` `TEXT` – coaching cues, setup, common errors
  - `status` `VARCHAR(50) NOT NULL DEFAULT 'active'` – `active` | `archived`
  - `created_by` `INTEGER REFERENCES admin_users(id)` – trainer/admin who created the exercise
  - `created_at` `TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
  - `updated_at` `TIMESTAMP DEFAULT CURRENT_TIMESTAMP`

- **Indexes**
  - `idx_exercise_library_status` on `(status)`
  - `idx_exercise_library_name` on `(LOWER(name))`
  - `idx_exercise_library_primary_muscle` on `(primary_muscle_group)`
  - `idx_exercise_library_equipment` on `(equipment)`

> **Note:** Seeding of default exercises is handled separately (e.g., via local dev seeds) and is not part of the core schema migration.

---

### TypeScript Types (Backend)

Located in `backend/src/types/index.ts`.

```ts
export interface ExerciseLibraryExercise {
  id: number;
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
  status: 'active' | 'archived';
  created_by?: number;
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

export interface UpdateExerciseLibraryExerciseInput {
  name?: string;
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
  status?: 'active' | 'archived';
}
```

---

### Service Layer

Located in `backend/src/services/exercise-library.service.ts`.

**Functions**

- `getExercises(options?: { search?: string; status?: 'active' | 'archived' | 'all'; }): Promise<ExerciseLibraryExercise[]>`
  - Returns all exercises, optionally filtered by:
    - `status` (`active` by default; `all` shows both)
    - `search` (case-insensitive match on `name`, `primary_muscle_group`, `equipment`, `category`, `notes`)

- `getExerciseById(id: number): Promise<ExerciseLibraryExercise | null>`

- `createExercise(input: CreateExerciseLibraryExerciseInput, createdBy?: number): Promise<ExerciseLibraryExercise>`

- `updateExercise(id: number, updates: UpdateExerciseLibraryExerciseInput): Promise<ExerciseLibraryExercise | null>`

- `archiveExercise(id: number): Promise<ExerciseLibraryExercise | null>`
  - Sets `status = 'archived'`.

Each function uses the shared `pool` for DB access and maps rows into typed objects (no JSON parsing necessary here, since all fields are scalar/array).

---

### Routes / API

Located in `backend/src/routes/exercise-library.routes.ts`.  
Mounted under `/api/exercise-library` in `backend/src/index.ts`.

All endpoints require authentication (`authenticateToken`), consistent with other admin APIs.

#### `GET /api/exercise-library`

List exercises with optional filtering.

- **Query Params**:
  - `search?: string` – free text search
  - `status?: 'active' | 'archived' | 'all'` – default `active`

- **Response**:  
  `200 OK`
  ```json
  {
    "success": true,
    "data": [ ExerciseLibraryExercise ]
  }
  ```

#### `GET /api/exercise-library/:id`

Get a single exercise by ID.

- **Responses**:
  - `200 OK` with `{ success: true, data: ExerciseLibraryExercise }`
  - `400` if invalid id
  - `404` if not found

#### `POST /api/exercise-library`

Create a new exercise.

- **Body**: `CreateExerciseLibraryExerciseInput`
  - `name` is required.
  - Other fields optional.

- **Response**:
  - `201 Created`
  ```json
  {
    "success": true,
    "data": ExerciseLibraryExercise,
    "message": "Exercise created successfully"
  }
  ```

#### `PUT /api/exercise-library/:id`

Update an existing exercise.

- **Body**: `UpdateExerciseLibraryExerciseInput`
- **Responses**:
  - `200 OK` with updated exercise
  - `400` invalid id
  - `404` not found

#### `POST /api/exercise-library/:id/archive`

Archive an exercise (soft-delete).

- **Response**:
  - `200 OK` with updated exercise (`status: 'archived'`)
  - `400` invalid id
  - `404` if not found

---

### Frontend API Types & Client

Located in `frontend/src/lib/api.ts`.

```ts
export interface ExerciseLibraryExercise {
  id: number;
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
  status: 'active' | 'archived';
  created_by?: number;
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

export interface UpdateExerciseLibraryExerciseInput {
  name?: string;
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
  status?: 'active' | 'archived';
}

export const exerciseLibraryApi = {
  getAll: (params?: { search?: string; status?: 'active' | 'archived' | 'all' }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    const qs = searchParams.toString();
    const endpoint = qs ? `/exercise-library?${qs}` : '/exercise-library';
    return apiClient.get<ExerciseLibraryExercise[]>(endpoint);
  },
  getById: (id: number) => apiClient.get<ExerciseLibraryExercise>(`/exercise-library/${id}`),
  create: (data: CreateExerciseLibraryExerciseInput) =>
    apiClient.post<ExerciseLibraryExercise>('/exercise-library', data),
  update: (id: number, data: UpdateExerciseLibraryExerciseInput) =>
    apiClient.put<ExerciseLibraryExercise>(`/exercise-library/${id}`, data),
  archive: (id: number) =>
    apiClient.post<ExerciseLibraryExercise>(`/exercise-library/${id}/archive`),
};
```

> **Note:** Frontend experiment components currently use a localStorage-based helper. Once we’re ready to fully adopt the backend, we can refactor those components to call `exerciseLibraryApi` instead.

---

### Integration with Workouts

For now, workouts simply **copy exercise details** from the library when a trainer selects an exercise in the editor. The `WorkoutData.Exercise` type can optionally store a `library_exercise_id` in its `notes` or via a future schema extension, but this is not required for the first backend integration.

**Future (optional) extension:**

- Add `library_exercise_id INTEGER REFERENCES exercise_library_exercises(id)` to `workouts` JSON data or a dedicated column for traceability.
- Use this reference when updating or analyzing how often a library exercise is used.

---

### Security & Auth

- All routes are behind `authenticateToken`; only logged-in admin users can manage the Exercise Library.
- `created_by` is set from `req.user.userId` on create operations.
- The library is **shared** across all admins for now. Multi-tenant scoping (per gym/organization) can be layered later (e.g., by adding a `gym_id` and filtering by it).

---

### Migration

The schema is created via a versioned migration file:

- `backend/migrations/014_create_exercise_library_exercises.sql`
  - Creates table `exercise_library_exercises`
  - Adds indexes
  - Adds `update_updated_at_column` trigger hook

This migration is run automatically by the existing `runMigrations` flow on startup (local and Vercel).

