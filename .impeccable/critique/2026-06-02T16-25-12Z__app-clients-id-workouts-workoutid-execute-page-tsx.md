---
target: clients/17/workouts/183/execute
total_score: 27
p0_count: 0
p1_count: 2
timestamp: 2026-06-02T16-25-12Z
slug: app-clients-id-workouts-workoutid-execute-page-tsx
---
# Critique: Workout execute (session logging)

**Target:** `/clients/17/workouts/183/execute` (representative)  
**Resolved:** `frontend/app/clients/[id]/workouts/[workoutId]/execute/page.tsx`

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Sticky progress + Logged badges; saving state on primary CTA only |
| 2 | Match System / Real World | 4 | Gym-floor copy, large inputs, pre-session check-in fits coaching |
| 3 | User Control and Freedom | 2 | Exit leaves without unsaved-work warning; survey skippable but modal is blocking |
| 4 | Consistency and Standards | 2 | Card-heavy stack vs newer panel lists; footer `lg:left-64` vs edit `17.5rem` |
| 5 | Error Prevention | 3 | Check-in flags scaling; progress can mark "logged" on rating-only |
| 6 | Recognition Rather Than Recall | 3 | Prescription badges + "Use prescription" reduce re-entry |
| 7 | Flexibility and Efficiency | 3 | Quick totals vs per-set; auto-expand first pending; no save shortcut |
| 8 | Aesthetic and Minimalist Design | 2 | Stacked `rounded-2xl` bordered accordions + nested set panels |
| 9 | Error Recovery | 2 | Generic load/save errors; partial session lost on Exit |
| 10 | Help and Documentation | 3 | Survey hints and exercise helper line; wrap-up labels clear |
| **Total** | | **27/40** | **Acceptable** |

## Anti-Patterns Verdict

**LLM assessment:** Purpose-built gym-floor UI, not marketing slop. The tells are mobile-workout-app patterns: thick `border-2` accordion cards, emoji face rating tiles, and many secondary badges per exercise. That is appropriate for the context but visually heavier than the flatter panel + list direction on exercise library and workout edit. `ExerciseInputCard.tsx` exists but is unused; the live path is `ExerciseLogCard` only (drift).

**Deterministic scan:** Clean (`[]` on `frontend/app/clients/[id]/workouts/[workoutId]/execute`).

**Browser visualization:** Dev server returned `200` for the route. Overlays were not injected in this session (no browser automation in the agent harness). Assessment is from source review and CLI scan.

## Overall Impression

The flow is thoughtfully built for logging on the floor: check-in, sticky progress, one expanded exercise at a time, large inputs, and a fat Save bar. The biggest gaps are **data safety on Exit**, **progress honesty** (what counts as logged), and **visual/system alignment** with the rest of Scout now that edit and library use lighter panels.

## What's Working

1. **Pre-workout survey** uses fast yes/no and readiness taps with an optional skip; concern summary collapses after submit.
2. **ExerciseLogCard** progressive disclosure keeps cognitive load manageable: one exercise open, prev/next, prescription shortcuts.
3. **Touch-first chrome** (56px footer buttons, large rep/weight fields, safe-area padding) matches the AppShell description for phone/tablet use.

## Priority Issues

### [P1] Exit discards in-progress logs with no confirmation
- **Why it matters:** Coaches tap Exit to check a client detail and lose reps, ratings, and notes entered so far.
- **Fix:** Mirror workout edit: track dirty state from performance data and confirm before `router.push` to client.
- **Suggested command:** `/impeccable harden`

### [P1] "Logged" / progress counts exercise_rating alone
- **Why it matters:** Tapping a face emoji marks the exercise complete in the sticky bar without reps or weight; progress misleads the coach and client record.
- **Fix:** Tighten `hasLoggedData` to require reps, weight, or at least one filled set before `completed` status (keep rating optional).
- **Suggested command:** `/impeccable harden`

### [P2] Sticky footer offset inconsistent with AppShell sidebar
- **Why it matters:** Execute uses `lg:left-64` (16rem) while workout edit sticky footer uses `lg:left-[17.5rem]`; on wide layouts the bar can sit under the sidebar or leave a gap.
- **Fix:** Share one token from `AppShell` / layout for sidebar width and apply to all fixed footers.
- **Suggested command:** `/impeccable layout`

### [P2] Completed or skipped sessions are not gated on execute
- **Why it matters:** Edit page blocks completed workouts; execute still loads the logging UI if the API returns the workout, risking duplicate completion submits.
- **Fix:** Early return with view-only or redirect, same as edit.
- **Suggested command:** `/impeccable harden`

### [P2] Nested bordered "set cards" inside accordion cards
- **Why it matters:** Per-set mode stacks `border-2` panels inside an already heavy exercise card; scan and scroll cost add up across 6+ movements.
- **Fix:** Flatten to divided rows (set number + two inputs + remove) like library list rhythm, or one muted band for all sets.
- **Suggested command:** `/impeccable layout`

## Persona Red Flags

**Casey (Mobile):** Save and Exit in the footer are thumb-friendly, but sticky progress at `top-0` plus expanded card `scrollIntoView` can jitter scroll while logging sets.

**Alex (Power User):** No Cmd/Ctrl+S on execute (unlike edit). Must expand each exercise; cannot log two movements side by side. Survey modal cannot be dismissed with Escape (intentional, but blocks fast path).

**Jordan (First-Timer):** "Logged" badge after only picking a face may feel like the exercise is done when reps are still empty. "Finish exercise list" vs "Save & complete session" are two different endings.

**Sam (Accessibility):** Accordion header is a proper `button`; face ratings have `aria-label`s. Native `<details>` for check-in summary lacks an accessible name beyond visible text. Progress region is not a live region when counts change.

## Minor Observations

- Dead code: `ExerciseInputCard.tsx` is not imported anywhere.
- `WorkoutRatingSection` still uses a `Card` inside an already card-heavy page.
- Save success navigates to client hub with no brief success confirmation.
- Warm-up/cool-down `<details>` is easy to miss below progress.

## Questions to Consider

- Should Exit offer "Save draft" vs "Discard" vs "Stay"?
- Should logged status require at least reps or weight?
- Is the execute surface ready for the same panel + list layout as workout edit?
