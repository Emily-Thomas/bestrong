# Trainer Personas – Product & Technical Spec

### Document purpose

This spec defines **trainer personas**: saved coaching profiles that steer **AI-generated recommendations and workouts** toward a specific philosophy, style, and client population—without replacing client-specific inputs (questionnaire, InBody, etc.).

It complements existing docs (`PROGRAM_BUILDER_AND_EXERCISE_LIBRARY_AI_UX_SPEC.md`, `WORKOUT_AUTHORING_AND_EXERCISE_LIBRARY_INTEGRATION.md`) and the current AI flow in `backend/src/services/ai.service.ts` (recommendation structure → Week 1 workouts → subsequent week generation).

---

## Terminology

| Term | Meaning |
|------|--------|
| **Trainer persona** | A reusable profile owned by the product account (see scoping below) that includes **raw coach inputs** and a **generated persona** used in prompts. |
| **Raw inputs** | Long-form text the coach provides: (1) what defines *them* as a trainer / their methodology, and (2) what defines *their typical clients’* needs. Stored as-is for edit/audit. |
| **Generated persona** | Model-produced synthesis (and optional structured fields) derived from the raw inputs, optimized to inject into AI prompts consistently and within token limits. |
| **Client archetype** | Existing concept in the app (`client_type` / `CLIENT_ARCHETYPES`): *who the client is*. Trainer persona is orthogonal: *whose coaching voice and bias* apply to the generation. |

---

## Goals

1. Let coaches define **how** AI should think when programming (methodology, biases, exercise preferences, language, risk tolerance, etc.).
2. Persist **raw text** for transparency and re-generation when prompts or models change.
3. Require an explicit **trainer assignment** when generating workouts for a client so outputs match the selected coaching style.
4. Apply the same influence across **initial recommendation generation** (structure + Week 1) and **later week generation** jobs for consistency within a program.

### Non-goals (initial release)

- Multi-tenant “organization” sharing personas across unrelated businesses (unless product later adds orgs; see scoping).
- Auto-selecting a persona from questionnaire alone without user choice (may be a later enhancement).
- Client-facing display of full raw trainer notes (optional future: show only a short “Coaching style” label).
- Replacing manual program editing or exercise library curation.

---

## User-facing behavior

### Creating and managing trainer personas

1. **List** existing personas (name, short summary or tags, last updated).
2. **Create / edit** a persona:
   - **Display name** (e.g. “Alex – strength-first”).
   - **Field A – Trainer definition** (large text): philosophy, certifications emphasis, how they program, what they avoid, communication style cues for the model, etc.
   - **Field B – Client population / needs** (large text): typical goals, constraints, equipment, experience levels, what “success” looks like for their roster.
   - **Save** persists raw text immediately (no AI required to save).
3. **Generate persona** (explicit action):
   - Calls the backend to produce **generated persona** from Fields A + B.
   - Shows loading state; on success, stores result and optionally shows a diff/preview before final save (UX choice: auto-save vs confirm).
   - **Regenerate** allowed anytime raw text changes; warn if raw text changed since last generation.
4. **Delete** with confirmation (and guardrails if personas are referenced by active recommendations—see data rules).

### Assigning a persona when generating AI work

1. When starting **AI recommendation generation** for a client (sync or async job flow), the coach **selects a trainer persona** (required or strongly encouraged—product decision).
2. When kicking off **week N generation** for an existing recommendation, the system should use the **same persona** stored on that recommendation unless the product explicitly allows “switch persona mid-program” (discouraged for coherence; default = locked at creation).

### Optional: default persona

- Settings: “Default trainer persona for new AI generations” to reduce clicks for single-coach shops.

---

## Data model (proposed)

### Table: `trainer_personas`

| Column | Type | Notes |
|--------|------|--------|
| `id` | serial PK | |
| `created_by` | FK → `admin_users(id)` | Aligns with `clients.created_by` / `recommendations.created_by`. |
| `name` | varchar | Display name. |
| `raw_trainer_definition` | text | Field A. |
| `raw_client_needs` | text | Field B. |
| `generated_persona` | text | Primary blob injected into prompts (markdown or plain). |
| `generated_persona_metadata` | jsonb nullable | Optional: bullets, tags, `version`, `model`, `generated_at` for audit. |
| `raw_content_hash` | varchar nullable | Hash of A+B at last successful generation to detect stale generated content. |
| `created_at`, `updated_at` | timestamps | |

Indexes: `(created_by)`, optional unique `(created_by, lower(name))` if duplicate names are disallowed.

### Table: `recommendations` (extend)

| Addition | Notes |
|----------|--------|
| `trainer_persona_id` | FK → `trainer_personas(id)` **nullable** for backward compatibility; new generations set explicitly. |

**Rule:** For any **new** AI generation after ship, require `trainer_persona_id` (or resolve default from settings). Historical rows remain nullable.

### Optional: `admin_users` or settings store

- `default_trainer_persona_id` per user (nullable FK) if “default persona” is implemented without a separate settings table.

---

## AI integration

### Where to inject

1. **`generateRecommendationStructure`**  
   - Add a section **Trainer coaching profile** (generated persona text, not necessarily full raw fields unless product wants more context—prefer generated blob for token efficiency).  
   - Instruct the model to align `training_style`, `plan_structure`, and `ai_reasoning` with this profile while still choosing **client archetype** from questionnaire.

2. **`generateWorkouts` (Week 1)**  
   - Same **Trainer coaching profile** block.  
   - Emphasize exercise selection, volume, and intensity **consistent with both** client context and trainer persona.

3. **`generateWeekWorkouts` (weeks 2–6)**  
   - Include the same profile so weekly progressions stay stylistically consistent.

### Prompt design notes

- Keep **client archetype** (`CLIENT_ARCHETYPES`) and **trainer persona** clearly separated in the prompt to avoid the model conflating “who the client is” with “who the coach is.”
- If **generated persona** is missing but raw fields exist, either block generation with a clear error (“Generate persona first”) or fall back to concatenated raw snippets with a size cap (product preference; blocking is simpler and safer).

### Generation of the persona (offline step)

- **Input:** `raw_trainer_definition` + `raw_client_needs`.  
- **Output:** `generated_persona` (concise coaching directive, ~500–2000 tokens target—tune empirically).  
- Optional structured JSON in `generated_persona_metadata` for UI chips (e.g. “Powerlifting bias”, “Low-back cautious”).  
- **Idempotency:** Store model and timestamp; re-run on demand when raw text changes.

---

## API sketch (REST)

All routes authenticated; scope list/get/update/delete to `req.user.id` as `created_by` (same pattern as other resources).

| Method | Path | Purpose |
|--------|------|--------|
| GET | `/trainer-personas` | List current user’s personas. |
| POST | `/trainer-personas` | Create (raw fields + name). |
| GET | `/trainer-personas/:id` | Detail including generated blob and stale flags. |
| PATCH | `/trainer-personas/:id` | Update name/raw fields; may clear or mark `generated_persona` stale. |
| DELETE | `/trainer-personas/:id` | Delete if not referenced, or soft-delete policy. |
| POST | `/trainer-personas/:id/generate` | Regenerate `generated_persona` from current raw text (async optional if slow). |

Recommendation generation endpoints accept optional or required `trainer_persona_id` in body; validate ownership.

---

## Frontend UX

- **Settings or top-level nav** entry: “Trainer personas” (or under coach profile).  
- **Persona editor** with two large text areas, primary CTA **Generate coaching profile**, status for last generated time / stale indicator.  
- **Client recommendation / generate** screens: persona **select** (searchable if many).  
- **Recommendation detail**: show assigned persona name (and link to edit persona).

---

## Jobs and consistency

- **`processRecommendationJob`** and **`processWeekGenerationJob`**: load `trainer_persona_id` from the recommendation; fetch persona; pass into `aiService` calls.  
- If recommendation has no `trainer_persona_id` (legacy): use neutral default text in prompts or block new week generation until backfilled (product choice).

---

## Security and privacy

- Personas are **coach-owned** (`created_by`); no cross-user access.  
- Raw text may contain sensitive business IP; treat as internal data, same as questionnaires.  
- Logs: avoid printing full persona text in production logs (align with `.cursorrules` on debug logging).

---

## Migration & rollout

1. Add `trainer_personas` table + `recommendations.trainer_persona_id` (nullable).  
2. Ship UI for CRUD + generate.  
3. Ship prompt changes + API validation for new generations.  
4. Optional: script or admin tool to attach a default persona to old recommendations if needed for week generation.

---

## Open questions (product)

1. **Required vs optional** persona on first generation—recommend **required** for clarity.  
2. **Rename “trainer” in UI** if it collides with “admin user” mental model—alternatives: “Coaching style,” “Programmer profile.”  
3. **Mid-program persona switch**: allow only before Week 1 is approved, or never—default **never** for v1.  
4. **Sharing personas** between multiple `admin_users` in one gym: out of scope until multi-user org model exists.

---

## Success criteria

- Coaches can save raw definitions, generate a compact persona, and see AI outputs shift in line with that style while still respecting client data.  
- Every new AI-generated recommendation records which persona was used.  
- Week 2+ generations use the same persona unless product explicitly designs a different flow.
