# Workout Authoring & Exercise Library Integration Specification

## Overview

This spec defines how workouts are **authored, edited, and stored** so that:

- **Manual workouts** can be created from scratch by the coach using the Exercise Library (or custom entries when needed).
- **AI‑generated workouts** also use the **same data model** and **reference the Exercise Library** wherever possible.
- Downstream features (execution, progressive weeks, analytics) can rely on a **consistent workout structure** regardless of how the workout was created.

This builds on:

- `docs/EXERCISE_LIBRARY_SPEC.md`
- `docs/LLM_INTEGRATION.md`
- `docs/WORKOUT_EXECUTION_SPEC.md`

and replaces the “future extension” note in the Exercise Library spec with a concrete design.

---

## Feature Goals

1. **Single Source of Truth for Exercise Definitions**
   - Every workout exercise should **optionally** reference an `exercise_library_exercises` row via `library_exercise_id`.
   - Workouts store a **snapshot** of exercise parameters (sets/reps/load/rest/notes) so changes to the library do not retroactively change historic workouts.

2. **Unified Authoring Model**
   - Manual and AI‑generated workouts share the **same TypeScript types** and JSON shape.
   - Manual edits to AI‑generated workouts remain compatible with AI‑driven progressive generation.

3. **Manual Plan Creation (No AI Required)**
   - Coaches can create full plans (weeks/sessions) **without running the LLM**, using the Exercise Library picker and manual input for sets/reps/load/etc.

4. **AI Uses the Library**
   - When AI generates workouts, it should:
     - Prefer **existing library exercises**.
     - Return exercises in a form that can be **resolved to library entries** and stored with `library_exercise_id`.

5. **Backward Compatibility**
   - Existing workouts without `library_exercise_id` continue to work.
   - New fields are **optional** and added in a way that does not break existing data or clients.

---

## Authoring Modes & User Workflows

### 1. Manual Workout Authoring (No AI)

**Scenario:** Coach wants to design a program entirely by hand.

1. From the client page, coach chooses **"Create Manual Plan"** (new option alongside existing AI recommendation generation).
2. System creates a **Recommendation** with:
   - `status = 'draft'`
   - Minimal `plan_structure` (e.g., weeks/sessions scaffold) based on coach inputs (sessions/week, length, etc.) or defaults.
3. Coach is taken to a **plan editor** showing:
   - Weeks (1..N)
   - Sessions per week (e.g., Week 1 – Session 1, 2, 3)
4. For each session, coach can:
   - Add exercises using **"Add from Exercise Library"** (existing `ExerciseLibraryPicker`).
   - Optionally add **custom exercises** via "Add Custom" (no library reference).
   - For each exercise instance, adjust:
     - Sets
     - Reps
     - Weight/load
     - Rest
     - Tempo
     - Notes
5. When the coach saves:
   - A `Workout` record is created for each session (if not already present) with consistent `workout_data` shape (see Data Model section).
   - Recommendation remains `draft` until the coach explicitly **activates** it (same activation flows as in `WORKOUT_EXECUTION_SPEC`).

### 2. AI‑Generated Workouts Using the Library

**Scenario:** Coach uses AI to generate an initial 6‑week plan or future weeks, but wants all exercises to come from the Exercise Library where possible.

1. Coach triggers an AI recommendation / week generation job (existing async flow).
2. Backend LLM service:
   - Receives a **catalog summary** of active library exercises (e.g., names, muscle groups, equipment, categories).
   - Is instructed to **only reference exercises by name that exist in the library**, except for clearly marked “new/custom” exercises.
3. LLM returns `LLMWorkoutResponse[]` with `workout_data` exercises that include:
   - `name` (string)
   - Prescribed sets, reps, load, rest, etc.
4. Backend **post‑processing step**:
   - For each exercise in `workout_data.exercises`:
     - Attempts to **resolve by name** to an `exercise_library_exercises` row (case‑insensitive, trimmed).
     - If matched:
       - Sets `library_exercise_id` and `library_exercise_name` on the exercise instance.
       - Fills any missing parameters (sets/reps/load/rest/tempo/notes) from the library defaults, unless LLM overrides them.
     - If not matched:
       - Marks as **custom** (`is_custom = true`, no `library_exercise_id`).
5. Resolved workouts are saved via `Workout` service and surfaced in the UI using the same editor as manual workouts.

### 3. Editing AI‑Generated Workouts Manually

**Scenario:** Coach wants to tweak or fully rewrite AI‑generated sessions.

1. On the workout edit page (`/clients/[id]/workouts/[workoutId]/edit`):
   - Exercises that came from the library include hidden metadata (`library_exercise_id`, etc.).
   - UI remains editable for name/sets/reps/load/rest/etc. as today.
2. Coach can:
   - Edit any field of an existing exercise instance (overriding library defaults).
   - Remove exercises.
   - Use **"Add from Library"** to insert new exercises with `library_exercise_id`.
   - Use **"Add Custom"** to add a manual exercise with no library reference.
3. On save:
   - `WorkoutData` is persisted with **both** the library reference (if present) and the per‑workout overrides.
   - Downstream execution and progressive generation logic can inspect whether an exercise is tied to the library.

---

## Data Model Changes

### 1. Workout Exercise Shape (Backend Types)

**Goal:** Extend the existing `Exercise` / `WorkoutData` model to optionally reference the Exercise Library and carry a snapshot of core metadata.

**Current (simplified):**

- Located in `backend/src/types/index.ts`:

```ts
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
```

**Proposed extension (conceptual spec):**

- Add **optional** fields to `Exercise`:

```ts
export interface Exercise {
  // Existing fields
  name: string;
  sets?: number;
  reps?: string | number;
  weight?: string;
  rest_seconds?: number;
  notes?: string;
  tempo?: string;
  rir?: number;

  // NEW: Library linkage
  library_exercise_id?: number;        // FK to exercise_library_exercises.id
  library_exercise_name?: string;      // Snapshot of library name at time of authoring
  library_metadata?: {
    primary_muscle_group?: string;
    secondary_muscle_groups?: string[];
    movement_pattern?: string;
    equipment?: string;
    category?: string;
  };

  // NEW: Flags
  is_custom?: boolean;                  // True when not backed by library
}
```

**Notes:**

- These changes **do not require SQL migrations**, since `workout_data` is JSONB.
- Existing records without the new fields remain valid.
- Snapshotted `library_metadata` is **denormalized** for:
  - Faster rendering without additional joins.
  - Historical analysis even if library entries change (or are archived).

### 2. LLM Response Types

The `LLMWorkoutResponse` type currently uses `WorkoutData` directly:

```ts
export interface LLMWorkoutResponse {
  week_number: number;
  session_number: number;
  workout_name: string;
  workout_data: WorkoutData;
  workout_reasoning: string;
}
```

**Design:**

- Keep `LLMWorkoutResponse` unchanged at the type level.
- Instead, update the **prompt contract** so that:
  - LLM is instructed to use **exact exercise names from the library**.
  - Optionally, LLM can emit a `library_exercise_name` field, but we will primarily rely on **name resolution** + backend post‑processing.

Backend will **enrich** `workout_data` with `library_exercise_id`, `library_exercise_name`, and `library_metadata` after matching against the Exercise Library.

---

## API & Service Changes

### 1. Workouts Service (Backend)

**Location:** `backend/src/services/workout.service.ts`

**New/updated responsibilities:**

- When creating or updating a workout:
  - For any `Exercise` with `library_exercise_id`:
    - Optionally refresh `library_metadata` from `exercise_library_exercises` (for newly added exercises).
  - For any `Exercise` without `library_exercise_id` but with a `name` that matches a library exercise:
    - Optionally auto‑attach `library_exercise_id` if desired (configurable).

### 2. Exercise Library Resolution Helper

**New helper (conceptual):**

- `backend/src/services/exercise-library-resolution.service.ts` (or inside exercise library service):

```ts
export async function resolveExerciseNameToLibraryId(
  name: string
): Promise<ExerciseLibraryExercise | null> {
  // Case-insensitive match on trimmed name; optionally allow simple aliases
}
```

Used by:

- AI post‑processing pipeline.
- (Optionally) manual workout save, to auto‑link plain‑text exercises to the library when an exact match exists.

### 3. Manual Plan Creation Endpoints

**High‑level design (exact paths can reuse existing patterns):**

- **Create Manual Recommendation & Workouts**
  - `POST /api/clients/:clientId/recommendations/manual`
  - Body:
    - Basic recommendation parameters (sessions/week, session_length, training_style, etc.).
    - Optional initial `workouts` payload if coach already has a draft.
  - Behavior:
    - Creates `Recommendation` with `status = 'draft'`.
    - Optionally creates stub `Workout` records (empty `workout_data`) for each planned session.

- **Update Manual Workouts**
  - Reuse existing workout update endpoint (`PATCH /api/workouts/:id`).
  - Accept enriched `WorkoutData` including `library_exercise_id` and other new fields.

No changes are required to **execution** endpoints (`start`, `complete`) beyond them receiving richer `WorkoutData`.

---

## AI Integration with Exercise Library

### 1. Prompt Updates

Extend the prompts described in `docs/LLM_INTEGRATION.md` to include:

- A **summarized list** of active library exercises, for example:
  - Name
  - Primary muscle group
  - Movement pattern
  - Equipment
  - Category
- Explicit instructions:
  - “When choosing exercises, **only use names from this exercise library list unless explicitly instructed to create a new/custom exercise**.”
  - “Do not invent new exercise names that are similar but not in the list.”

### 2. Post‑Processing Pipeline

After receiving `LLMRecommendationResponse`:

1. Iterate all `LLMWorkoutResponse.workout_data.exercises` (and `warmup` / `cooldown` if present).
2. For each exercise:
   - Attempt `resolveExerciseNameToLibraryId(exercise.name)`.
   - If match:
     - Set `exercise.library_exercise_id`.
     - Set `exercise.library_exercise_name = matched.name`.
     - Populate `exercise.library_metadata` from the library row.
     - Only **override** sets/reps/load/rest/tempo/notes when LLM did not specify them; otherwise respect the AI’s prescription.
   - If no match:
     - Set `exercise.is_custom = true`.
3. Save enriched workouts via workout service.

### 3. Progressive Week Generation

For progressive week generation (see `WORKOUT_EXECUTION_SPEC`), the AI context should include:

- Which exercises in prior weeks were **library‑based** vs **custom**.
- Any trends in performance specific to certain library exercises (e.g., “Barbell Bench Press”).

Because workouts now carry `library_exercise_id`, the AI prompt can:

- Aggregate performance per **library exercise** (e.g., progress over weeks on the same movement).
- Suggest **appropriate progressions** while staying anchored to the same or closely related library exercises.

---

## UI / UX Requirements

### 1. Manual Plan Creation Entry Point

- On the client page:
  - Add a **"Create Manual Plan"** CTA near the existing AI recommendation generation controls.
  - When clicked:
    - Prompt coach for key parameters (sessions per week, weeks, session length).
    - Create a draft recommendation and redirect to the plan editor.

### 2. Plan / Workout Editors

Reuse and extend existing workout edit UI (`EditWorkoutPage`):

- **Exercises Section**
  - Existing “Add from Library” button continues to open `ExerciseLibraryPicker`.
  - When an exercise is selected from the library:
    - New `Exercise` instance is created with:
      - `library_exercise_id`
      - `name` (from library)
      - Default sets/reps/load/rest/tempo/notes from library.
  - “Add Custom” continues to create an exercise with no `library_exercise_id` and `is_custom = true`.

- **Visual Indicators**
  - For each exercise card, show a subtle badge:
    - “From Library” (with the library name) when `library_exercise_id` is set.
    - “Custom” when `is_custom` is true.

### 3. Safety & Edit Behavior

- Editing the **name** of a library‑backed exercise:
  - Does **not** change the underlying library entry.
  - May optionally clear `library_exercise_id` (implementation detail; can be configured as:
    - Strict mode: changing the name unlinks from library and sets `is_custom = true`.
    - Lenient mode: keep `library_exercise_id` even if name diverges; badge can indicate “Linked to [Library Name] (name overridden)”.

- Archiving a library exercise:
  - Does **not** affect existing workouts.
  - Picker does not show archived exercises (already implemented).

---

## Implementation Phases

### Phase 1: Data Model & Backend Wiring

- [ ] Extend `Exercise` / `WorkoutData` interfaces to include `library_exercise_id`, `library_exercise_name`, `library_metadata`, `is_custom`.
- [ ] Implement library resolution helper (`resolveExerciseNameToLibraryId`).
- [ ] Update workout service to preserve and, where appropriate, populate library metadata on save.

### Phase 2: Manual Authoring UX

- [ ] Add “Create Manual Plan” entry point on the client page.
- [ ] Implement basic manual plan editor (weeks/sessions list) that uses existing workout edit UI.
- [ ] Ensure `ExerciseLibraryPicker` populates `library_exercise_id` and default fields when adding exercises.
- [ ] Add visual indicators (“From Library” / “Custom”) in the workout editor.

### Phase 3: AI + Library Integration

- [ ] Update LLM prompts to include exercise library context and constraints.
- [ ] Implement AI post‑processing that resolves exercises to library entries and enriches `WorkoutData`.
- [ ] Verify progressive week generation uses updated `WorkoutData` and benefits from library IDs.

### Phase 4: Polish & Edge Cases

- [ ] Decide and implement behavior when coach edits the name of a library‑linked exercise.
- [ ] Handle cases where the library exercise is later archived (e.g., still display in existing workouts with an “archived” tag).
- [ ] Add basic analytics hooks (e.g., count of workouts using each `library_exercise_id`) for future reporting.

---

## Edge Cases & Considerations

1. **Name Collisions in Library**
   - If multiple library exercises share the same name, resolution becomes ambiguous.
   - **Decision:** Enforce unique `name` per active exercise in the library, or enhance resolution to prefer the most recently created, or require an explicit mapping step in the UI.

2. **AI Suggests Non‑Library Exercise**
   - Treat as `is_custom = true`.
   - Optionally surface a “Convert to Library Exercise” action in the editor that:
     - Creates a new library entry from the custom exercise.
     - Updates the workout to reference the new `library_exercise_id`.

3. **Backfilling Existing Workouts**
   - Optionally run a background script to:
     - Scan historical workouts.
     - Attempt to attach `library_exercise_id` based on exact name matching.
     - This is **not required** for initial rollout but may be useful for analytics.

4. **Performance**
   - When resolving names for AI‑generated plans (potentially dozens of workouts):
     - Prefer batching: load all active library exercises **once**, build an in‑memory map keyed by normalized name.
     - Avoid per‑exercise DB queries.

5. **Testing**
   - Unit tests:
     - Name resolution logic (exact, case‑insensitive, trimmed).
     - Workout service behavior when saving exercises with/without `library_exercise_id`.
   - Integration tests:
     - Manual plan creation and editing flows.
     - AI generation followed by resolution and editing.
   - E2E tests:
     - Full flow from manual/AI authoring → execution → progressive generation using the same exercise model.

---

## Out of Scope (For Now)

- Multi‑tenant / per‑coach exercise libraries (current design assumes a shared library).
- Rich versioning of library exercises (we rely on simple snapshots in workouts).
- Advanced recommendation logic that automatically swaps exercises based on library tags (this can be layered later using `library_metadata`).

