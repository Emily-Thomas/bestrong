---
target: clients/17/workouts/183/edit?tab=workouts&imported=1
total_score: 25
p0_count: 0
p1_count: 2
timestamp: 2026-06-02T16-05-14Z
slug: nd-app-clients-id-workouts-workoutid-edit-page-tsx
---
# Critique: Workout edit (imported program)

**Target:** `clients/17/workouts/183/edit?tab=workouts&imported=1`  
**Resolved:** `frontend/app/clients/[id]/workouts/[workoutId]/edit/page.tsx` (+ picker, prescription components)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | No unsaved-changes signal; Save only at page bottom after long scroll |
| 2 | Match System / Real World | 3 | Coach-friendly labels; "Workout Reasoning" reads like AI plan output, not manual import |
| 3 | User Control and Freedom | 2 | Remove exercise with no confirm; Back/Cancel can leave without save warning |
| 4 | Consistency and Standards | 3 | Scout shell/tokens; picker uses dense card grid unlike compact builder grid |
| 5 | Error Prevention | 3 | Blocks save when exercise name missing |
| 6 | Recognition Rather Than Recall | 3 | Library name + metadata; headers still "Exercise 1" not movement-first scan |
| 7 | Flexibility and Efficiency | 2 | Library search helps; no reorder, duplicate row, or sticky primary actions |
| 8 | Aesthetic and Minimalist Design | 2 | Nested cards (page > exercises > each exercise); 7 fields per movement |
| 9 | Error Recovery | 3 | Clear completed-workout gate and destructive alerts |
| 10 | Help and Documentation | 2 | Good empty state; prescription grid shows all fields at once |
| **Total** | | **25/40** | **Acceptable** |

## Anti-Patterns Verdict

**LLM assessment:** Does not scream generic AI landing page. It reads as a competent shadcn admin form: stacked Cards, dashed empty state, icon + CTA. The nested-card exercise list and full prescription grid are the main "template" tells. Not slop-heavy, but not tailored to the imported-program "fill many sessions fast" job.

**Deterministic scan:** Clean (`[]`) on `page.tsx`, `ExerciseLibraryPicker.tsx`, `ExercisePrescriptionFields.tsx`.

**Browser visualization:** Not run (no browser automation in this session). Dev server available at `http://localhost:3000`.

## Overall Impression

Solid library-first editing with sensible validation and imported back-link preservation. The biggest gap for your imported flow is **task fit**: this page still feels like "edit one AI workout" (reasoning field, deep per-exercise form, save buried at bottom) rather than "slot in movements for this cell in the program grid."

## What's Working

1. **Library-first path** — Add/replace from library, defaults from library presets (`exerciseFromLibrary`), badges for Library vs Custom.
2. **Imported navigation** — `clientBackHref` keeps `tab=workouts` and `imported=1` so return lands on the builder.
3. **Guardrails** — Completed workouts blocked; unnamed exercises caught before save; empty state points to library browse.

## Priority Issues

### [P1] Save and status are easy to miss on long sessions
- **What:** Primary Save sits below a tall stack of nested exercise cards; no dirty indicator.
- **Why it matters:** Coaches building 8–12 movement sessions scroll for minutes and may navigate away losing work.
- **Fix:** Sticky footer bar with Save + Cancel; optional "Unsaved changes" on Back; `beforeunload` when dirty.
- **Suggested command:** `/impeccable layout`

### [P1] Cognitive load from nested cards + full prescription grid
- **What:** Card inside Card for each exercise; six inputs + notes always visible (weight and RIR both present).
- **Why it matters:** Imported coaches repeat this across dozens of sessions; extraneous load compounds.
- **Fix:** Flatten to bordered rows or a single list surface; progressive disclosure (Sets/Reps/Rest primary, Tempo/RIR/Notes under "More").
- **Suggested command:** `/impeccable distill`

### [P2] Imported flow copy and IA mismatch
- **What:** Back label "Back to client"; prominent "Workout Reasoning" for manual import.
- **Why it matters:** Breaks mental model from program builder; adds fields coaches will leave blank.
- **Fix:** When `imported=1`, label "Back to program builder"; collapse or hide reasoning (optional expand).
- **Suggested command:** `/impeccable clarify`

### [P2] Exercise list scanability
- **What:** Headers emphasize "Exercise 3" over movement name in the row chrome (name is smaller below badges).
- **Why it matters:** Recognition suffers when comparing sessions or copying from notes.
- **Fix:** Movement name as primary heading; week/session in page subtitle only.
- **Suggested command:** `/impeccable typeset`

### [P3] Picker performance and density
- **What:** Dialog loads entire active library; two-column card grid in scroll region.
- **Why it matters:** Large libraries lag; card-per-exercise is heavy for quick pick.
- **Fix:** Virtualized list rows; debounced search; show defaults on row without nested Card.
- **Suggested command:** `/impeccable optimize`

## Persona Red Flags

**Alex (Power User):** No keyboard save, no reorder, no duplicate exercise. Remove is one click with no undo. Will tab through 70+ fields per session.

**Jordan (Imported-program first-timer):** Lands from builder grid expecting "fill this session"; sees "Workout Reasoning" and wonders if required. Back says "client" not "program."

**Sam (Floor coach, mobile):** Save below fold on phone; nested cards increase scroll. Picker dialog cards are small tap targets in two-column grid.

## Minor Observations

- Loading copy is generic ("Loading workout...") vs Scout voice.
- `weight` placeholder mentions RIR while a separate RIR field exists (ambiguous).
- Library picker empty message routes to Exercise Library app area (good) but long search placeholder may wrap awkwardly on narrow dialog.
- Exercise list keys use index (reorder would remount fields).

## Questions to Consider

- What if imported sessions only exposed Sets, Reps, Rest until the coach expands advanced fields?
- Should Save return to the same week/session cell in the builder without a full client reload?
- Would a compact table editor beat cards for coaches entering 10+ movements?
