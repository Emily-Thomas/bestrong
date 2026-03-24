## Program Builder, Exercise Library & Logging – Product & UX Spec



### Document Purpose

This spec describes how BeStrong should support:
- **6‑week training block creation** (program builder)
- **Exercise library UX & AI helpers**
- **Logging how a client performed in each workout**

Compared to the current experience, this spec focuses on:
- Making programming and logging **much faster** and **less error‑prone**
- Using **AI as an optional assistant**, never an overbearing decision‑maker
- Delivering a **clear, intuitive UX** for both coaches and clients

This document is product/UX oriented and complements `WORKOUT_AUTHORING_AND_EXERCISE_LIBRARY_INTEGRATION.md` and `WORKOUT_EXECUTION_SPEC.md`.

---

## Goals & Non‑Goals

### Goals

- **Speed up 6‑week program creation**:
  - Reduce the time to build a 6‑week block to a few minutes for typical use cases.
  - Make it trivial to copy patterns across weeks and apply changes consistently.
- **Make the exercise library easy to curate and use**:
  - Quickly find, tag, and reuse exercises and bundles (e.g., warm‑ups, finishers).
  - Use AI to help with tagging, cues, and alternatives while keeping coach in control.
- **Streamline workout logging**:
  - Make logging actual performance fast on both mobile and desktop.
  - Provide smart defaults and AI suggestions for loads and progressions.
- **Give clear, low‑friction UX**:
  - Clear visibility into the 6‑week structure.
  - Minimal modals, inline editing where possible.
  - AI suggestions are visible, explainable, and easy to accept or ignore.

### Non‑Goals

- Full nutrition coaching, payment/billing, and CRM are **out of scope** here.
- Wearables integrations (Apple Health, Garmin, etc.) are **nice‑to‑have** but not required for initial implementation.

---

## Personas & Primary Use Cases

### Personas

- **Coach / Gym Owner (primary user)**
  - Programs training blocks for 10–100+ clients.
  - Needs a clear overview, fast editing tools, and trustworthy AI helpers.
- **Client (secondary user)**
  - Executes workouts and logs performance on mobile.
  - Needs simple flows with minimal manual input.

### Core Use Cases

1. **Create a 6‑week training block** for a client (or a group of similar clients).
2. **Browse and manage the exercise library** (including tags, cues, and bundles).
3. **Assign exercises and bundles** to sessions within a 6‑week block.
4. **Log workout performance** (sets/reps/load/RPE) for each session.
5. **Use AI to generate or adjust plans** and suggest progressions, alternatives, and cues.

---

## Feature Area 1 – 6‑Week Program Builder

### 1.1 High‑Level UX

- **6‑Week Grid View**
  - Columns: weeks 1–6.
  - Rows: sessions per week (e.g., “Day 1 – Lower”, “Day 2 – Upper”, etc.).
  - Each cell: one session. Clicking opens session detail pane with exercises.
  - Support **drag‑and‑drop** of sessions between days/weeks.

- **Guided “New 6‑Week Block” Flow**
  - Step 1 – **Client & Goals**
    - Select one or more clients.
    - Input/select:
      - Primary goal (e.g., fat loss, hypertrophy, strength, endurance).
      - Constraints (injuries, movement restrictions).
      - Available equipment (home gym, commercial gym, specific tools).
  - Step 2 – **Structure**
    - Choose training frequency (sessions/week).
    - Choose split pattern (e.g., Full Body / Upper–Lower / Push–Pull–Legs).
    - Optional: preferred session length (e.g., 45 vs 75 minutes).
  - Step 3 – **Progression Pattern**
    - Select progression style:
      - Linear (%‑based) progression.
      - Undulating (e.g., heavy/medium/light).
      - RPE‑based progression (target RPE ranges).
      - Volume ramp with deload week.
  - Step 4 – **AI‑Assisted Draft (Optional)**
    - Button: **“Generate 6‑Week Draft With AI”**.
    - AI creates a full block (sessions, exercises, sets/reps, progression).
    - Coach reviews in grid view and edits as needed.

### 1.2 Session Detail UX

- Session detail shown in a side drawer or dedicated pane, without losing context of the 6‑week grid.
- For each exercise:
  - Name (with quick search to change).
  - Sets × reps, load (or %1RM), tempo, rest, and notes.
  - Tags/flags: warm‑up, main lift, accessory, finisher.
- Support patterns:
  - Straight sets, supersets, trisets, circuits, EMOM, AMRAP, drop sets.
  - Display grouping visually (brackets, labels).

### 1.3 Power Tools for Speed

- **Copy & Apply Patterns**
  - “Copy week 1 to weeks 2–6” with options:
    - Keep same exercises and progress loads per chosen progression style.
    - Apply a deload pattern on a chosen week (e.g., week 4).
  - “Apply this change to all weeks/selected weeks”:
    - E.g., change bench variation across all weeks at once.

- **Inline Editing (No Modals When Possible)**
  - Edit sets/reps/load directly in the grid cells or session detail rows.
  - Open a side panel only for advanced properties (tempo, advanced notes).

- **Template Saving**
  - Any 6‑week block can be saved as a reusable **template**.
  - Templates can be:
    - Global (for all clients).
    - Tag‑scoped (e.g., “Beginner Hypertrophy”, “Powerlifting Prep”).

---

## Feature Area 2 – Exercise Library UX & AI

### 2.1 Library Browsing & Organization

- **Two‑Pane Library**
  - Left pane:
    - Filters: movement pattern, muscle group, equipment, difficulty, body region, tags.
    - Toggle: “Show only my favorites”.
  - Right pane:
    - List of exercises with:
      - Thumbnail/video preview.
      - Name, key tags.
      - Quick actions: favorite, edit, duplicate, add to current session.

- **Search‑While‑Typing Integration**
  - In the program builder:
    - Typing in an exercise cell opens a searchable dropdown.
    - Shows:
      - Recent exercises for that client.
      - Coach favorites.
      - Filtered matches.

- **Bundles / Grouped Sequences**
  - Support **bundles**:
    - Examples: “Warm‑up A”, “Glute Activation Circuit”, “Core Finisher”.
  - Each bundle:
    - Is a named group of exercises with set/rep defaults.
    - Can be added to a session with one click.

### 2.2 Exercise Creation & Editing

- Fields:
  - Name, description.
  - Video URL(s) or uploads.
  - Movement pattern(s), muscle group(s), equipment, difficulty, tags.
  - Coaching cues and “common mistakes”.
  - Suggested regressions/progressions/alternatives (links to other exercises).

- UX Requirements:
  - Fast “add exercise” flow.
  - Inline preview of videos.
  - Clear indication of which fields were AI‑generated (if any).

### 2.3 AI Helpers (Non‑Overbearing)

- **AI‑Assisted Tagging**
  - When adding or editing an exercise:
    - AI suggests movement patterns, muscle groups, equipment, and difficulty.
  - Coach sees a list of suggestions and can:
    - Accept all.
    - Accept individual tags.
    - Edit/remove as needed.

- **AI Cue & Description Generator**
  - Given name + optional video/brief description:
    - Generate:
      - Short coaching cues (1–3 lines).
      - “Common mistakes” and “Troubleshooting” sections.
  - Coach can regenerate or edit before saving.

- **Smart Alternatives Panel**
  - From a session:
    - Click an exercise → open **“Alternatives”** side panel.
    - AI suggests:
      - Regressions and progressions.
      - Equipment swaps (e.g., DB Bench instead of Barbell Bench).
      - Options that respect client constraints (shoulder, knee, etc.).
    - Coach can replace the exercise in this session or across selected weeks.

---

## Feature Area 3 – Logging Client Performance

### 3.1 Session Logging UX (Coach & Client)

- **Mobile‑First Session View**
  - Stacked list of exercises.
  - For each exercise:
    - Target sets/reps/load.
    - Previous session performance (last 1–3 sessions).
    - Rows for each set:
      - `Target` | `Actual reps` | `Actual load` | `RPE` (optional).
  - Quick actions:
    - “Copy last session actuals”.
    - “Use programmed targets as today’s actuals”.

- **Fast Deviation Logging**
  - Per exercise controls:
    - Mark as **skipped** (with optional reason selection).
    - Mark as **substituted** with another exercise:
      - Opens search dropdown.
      - Logs substitution and reason.
  - Per exercise notes:
    - Short free‑text field for pain, difficulty, equipment issues.

- **Desktop UX**
  - Keyboard‑optimized:
    - `Tab`/arrow key navigation between fields.
    - Minimal mouse usage.
  - Option to show more historical context (e.g., 4–6 past sessions).

### 3.2 AI Helpers for Logging & Review

- **Smart Autofill of Suggested Loads**
  - Before the session:
    - AI pre‑computes suggested loads based on:
      - Programmed targets.
      - Last few sessions (actual loads & RPE).
      - Chosen progression style for the block.
  - Display:
    - Suggested load appears in the input field as a placeholder or default value.
    - Client/coach can override at any time.

- **Anomaly & Pain Detection**
  - AI scans logs over time to detect:
    - Sudden drops in load or volume.
    - Repeated mention of pain/injury keywords.
    - Frequent skips of specific exercises.
  - Surfaced in a **“Needs Attention”** list for the coach:
    - E.g., “Sarah: recurring knee pain on lunges in last 3 sessions.”

- **Post‑Workout Summaries**
  - For the coach:
    - Short weekly summary card per client:
      - Adherence (% completed vs programmed).
      - Key PRs or improvements.
      - High RPE trends or fatigue indicators.
      - Suggested actions (e.g., “Consider deloading deadlift volume next week.”).
  - For the client:
    - Simple, motivational summary:
      - E.g., “You increased your squat volume by 10% vs last week. Great work!”

---

## AI Copilot Behavior & Guardrails

### 4.1 Principles

- **Coach in Control**
  - AI never silently changes programs or logs.
  - All AI‑generated content is **previewed** and must be accepted or edited.

- **Transparency**
  - Always show:
    - What AI changed or is suggesting.
    - A brief rationale (e.g., based on last RPE and target RPE range).

- **Reversibility**
  - Any AI‑driven change is one‑click undoable.
  - When making multiple changes at once (e.g., applying a progression across weeks), they should be grouped into a single undo step.

### 4.2 UX Design for AI

- **Collapsible “Coach Copilot” Sidebar**
  - Default: collapsed icon (e.g., small button labeled “Copilot”).
  - When expanded:
    - Shows context‑aware suggestions:
      - “Fill weeks 2–6 based on week 1.”
      - “Check for overload issues in this block.”
      - “Suggest regressions for flagged painful exercises.”
  - Settings:
    - Coach can mute certain suggestion categories (e.g., no automatic progression suggestions).

- **Diff‑First Changes**
  - When AI proposes edits (e.g., changing progressions):
    - Show a diff:
      - Before vs after for sets/reps/load across weeks.
    - Coach confirms or rejects.

---

## Data Model Sketch (Conceptual)

> Note: This is conceptual and should be aligned with existing entities defined in other specs and the backend.

- **ProgramBlock**
  - `id`
  - `clientId` (or group identifier)
  - `name`
  - `startDate`, `endDate`
  - `weeks` (6 for this spec; consider generic N in implementation)
  - `goal`, `constraints`, `equipment`
  - `progressionStyle` (enum)

- **ProgramWeek**
  - `id`
  - `programBlockId`
  - `index` (1–6)

- **ProgramSession**
  - `id`
  - `programWeekId`
  - `name` (e.g., “Day 1 – Lower”)
  - `dayOfWeek` (optional)

- **ProgramExercise**
  - `id`
  - `programSessionId`
  - Ordered index within session
  - Reference to `Exercise` (library) or custom definition
  - Grouping info (superset, circuit, etc.)
  - Target sets/reps/load/%1RM/RPE, tempo, rest, notes

- **Exercise (Library)**
  - `id`
  - `name`
  - `videos` (URLs or media refs)
  - `tags` (movement, muscles, equipment, difficulty)
  - `cues`, `commonMistakes`, `troubleshooting`
  - Relations to alternative/regression/progression exercises

- **WorkoutLog / SessionLog**
  - `id`
  - `programSessionId` (if based on a program)
  - `clientId`
  - `performedAt`
  - Per‑exercise log entries:
    - `exerciseId` (or custom name)
    - Set rows: `targetReps`, `targetLoad`, `actualReps`, `actualLoad`, `RPE`
    - `skipped`, `substitutionExerciseId`, `notes`

---

## Key User Flows (High‑Level)

### 6.1 Create a 6‑Week Block With AI Draft

1. Coach opens client page → clicks **“New 6‑Week Block”**.
2. Completes steps: Client & Goals → Structure → Progression Style.
3. Clicks **“Generate 6‑Week Draft With AI”**.
4. Reviews the 6‑week grid:
   - Tweaks exercises and patterns inline.
   - Uses copy/apply tools to adjust across weeks.
5. Saves program and assigns start date → sessions appear in client schedule.

### 6.2 Add / Edit Exercises in the Library

1. Coach opens the exercise library.
2. Clicks **“New Exercise”**:
   - Enters name, optional video link.
   - Clicks **“AI Suggest Tags & Cues”**:
     - Reviews and adjusts tags, cues, and common mistakes.
3. Saves exercise; it becomes available in search dropdowns and bundles.

### 6.3 Client Logs a Workout With AI Suggestions

1. Client opens today’s workout on mobile:
   - Sees exercises with pre‑suggested loads based on history/program.
2. Logs actual reps and loads for each set:
   - Uses “Copy last session” for quick fill when appropriate.
3. Substitutes one exercise due to pain:
   - Selects alternative from quick search.
4. After completion, sees a brief positive summary.
5. Coach later sees flagged pain pattern and suggested plan adjustment.

---

## Implementation Notes & Priorities

### 7.1 Suggested Phasing

1. **Phase 1 – Core 6‑Week Builder & Exercise Library UX**
   - 6‑week grid, session detail, copy/apply tools.
   - Improved exercise library browsing, search, and bundles.
2. **Phase 2 – Logging UX**
   - Mobile‑first logging screen with quick fill, substitutions, and notes.
3. **Phase 3 – AI Assistants**
   - AI exercise tagging & cue generation.
   - AI 6‑week draft generation and progression suggestions.
   - AI logging suggestions, anomaly detection, and summaries.

### 7.2 Alignment With Existing Specs

- Ensure entity and API design are consistent with:
  - `WORKOUT_AUTHORING_AND_EXERCISE_LIBRARY_INTEGRATION.md`
  - `WORKOUT_EXECUTION_SPEC.md`
  - Backend services in `backend/src/services/` for workouts and exercises.

This spec should be used as the **product/UX reference** when implementing the next iterations of the 6‑week program builder, exercise library improvements, and logging flows.

