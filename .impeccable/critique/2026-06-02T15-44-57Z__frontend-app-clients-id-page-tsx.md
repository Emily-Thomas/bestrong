---
target: clients/16?imported=1&tab=workouts
total_score: 30
p0_count: 0
p1_count: 2
timestamp: 2026-06-02T15-44-57Z
slug: frontend-app-clients-id-page-tsx
---
# Critique: Imported-program client detail (`/clients/[id]?imported=1&tab=workouts`)

Resolved target: `frontend/app/clients/[id]/page.tsx` with `ClientDetailTabs`, `ImportProgramSetup`, `WorkoutsSection`.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Bootstrap spinner is clear; URL `tab=workouts` does not match UI until program exists |
| 2 | Match System / Real World | 4 | Coach-facing copy ("Start session", library) fits floor work |
| 3 | User Control and Freedom | 3 | `imported=1` persists across tabs; pre-setup screen ignores workouts tab param |
| 4 | Consistency and Standards | 3 | Imported path still uses full 5-tab chrome as standard clients |
| 5 | Error Prevention | 3 | Numeric bounds on scaffold; no preview of session count impact before create |
| 6 | Recognition Rather Than Recall | 3 | Tab attention dots + aria-labels help; intake tabs still invite wrong detours |
| 7 | Flexibility and Efficiency | 2 | No "next empty session" shortcut; edit buried per card |
| 8 | Aesthetic and Minimalist Design | 2 | Workouts tab keeps gradient header + 3 stat tiles for a fill-in task |
| 9 | Error Recovery | 4 | Bootstrap and load errors are actionable |
| 10 | Help and Documentation | 3 | Workouts helper + scaffold math; setup copy uses internal "imported-program path" |
| **Total** | | **30/40** | **Acceptable — fast path exists but IA and workouts chrome fight it** |

## Anti-Patterns Verdict

**LLM assessment:** Does not read as generic marketing AI on the roster pattern, but the **Workouts** surface still carries dashboard decoration (top gradient wash, "Training" pill, three metric tiles, four schedule sub-tabs) on a flow whose job is "open session, add exercises, go." That is second-order SaaS reflex: task UI dressed like analytics. The imported setup card is appropriately focused. Five equal tabs after bootstrap undermines "skip intake" promise.

**Deterministic scan:** 0 findings on `page.tsx`, `ClientDetailTabs.tsx`, `WorkoutsSection.tsx`, `ImportProgramSetup.tsx`.

**Browser visualization:** Not run (no reliable browser overlay in this session). Review is source-based plus prior dev-server behavior.

## Overall Impression

The imported-program idea is right: minimal profile, scaffold empty sessions, library-based edit. The friction is **navigation honesty** and **chrome weight**. A coach landing on `?imported=1&tab=workouts` before bootstrap still sees a setup form, not workouts. After bootstrap, they wade through the same five-tab shell and a busy workouts dashboard before reaching **Edit** on each session.

## What's Working

1. **ImportProgramSetup** — Three numeric inputs, live session count, single primary CTA, clear next step to first editor.
2. **Imported workouts mode** — Hides `GenerateWorkoutsPanel`; copy points to library edit and **Start session**.
3. **Track fallbacks** — `imported=1`, session storage, and `onboarding_track` reduce the risk of falling back into full intake.

## Priority Issues

### [P1] URL promises Workouts tab before tabs exist
- **Why:** `?tab=workouts` is set on create, but `!setupComplete` renders only Contact + `ImportProgramSetup`. Coaches think they are on Workouts; they are not.
- **Fix:** Until `recommendation` exists, ignore `tab` in URL or show a single-step setup layout without tab chrome; sync URL to setup state.
- **Suggested command:** `/impeccable shape` (imported client detail IA)

### [P1] Five-tab shell contradicts "skip intake"
- **Why:** Questionnaire, InBody, and Coach & plan remain peer tabs; `TrainingPlansSection` still exposes AI/InBody-gated flows. Imported coaches will click in and hit dead ends or noise.
- **Fix:** For `imported_program`, default to a slim nav (Workouts + Overview, optional "Add intake later") or visually mute nonessential tabs until opted in.
- **Suggested command:** `/impeccable distill` (`ClientDetailTabs` + imported mode)

### [P2] Workouts tab optimized for monitoring, not authoring
- **Why:** Gradient hero, stat grid, and four schedule tabs add scroll and decisions before **Edit**. Imported users need a flat list of empty sessions with a primary **Fill exercises** action.
- **Fix:** `importedProgram` variant: compact list, badge for empty vs ready, sticky "Continue building" linking to next incomplete session.
- **Suggested command:** `/impeccable layout` (`WorkoutsSection`)

### [P2] No guided "next session to build"
- **Why:** After creating 12 sessions, coaches must scan week groups to find the next empty workout.
- **Fix:** Surface "Next to build: Week 1 · Session 1" banner with one click to edit.
- **Suggested command:** `/impeccable onboard` (imported workouts tab)

### [P3] Internal tone in setup copy
- **Why:** "imported-program path" reads like engineering, not Scout voice.
- **Fix:** "You're adding a program they already run elsewhere."
- **Suggested command:** `/impeccable clarify` (`ImportProgramSetup`)

## Persona Red Flags

**Alex (power user):** Still blocked by bootstrap before bulk paste or duplicate-week tools. No keyboard path to next empty edit.

**Jordan (first-timer):** `tab=workouts` in the address bar while seeing "Build their program" feels broken. Five tabs reintroduce intimidation after choosing skip intake.

**Sam (accessibility):** Tab triggers include `aria-label` for attention states (good). Workouts sub-tab grid may be dense on mobile; stat tiles are decorative noise for screen reader users.

**Morgan (floor coach, Scout context):** Wants one screen: sessions to fill. Extra hops through Coach & plan or decorative metrics waste between-set time.

**Riley (stress tester):** Refresh on `?imported=1` without session marker may lose track; `setTab` preserves params but pre-setup tab mismatch is confusing on back/forward.

## Minor Observations

- Contact card stacks above setup for new imports; acceptable but adds scroll before scaffold.
- `router.replace` to add `imported=1` when missing is good hardening; can cause a visible URL flicker.
- Post-bootstrap description in AppShell is helpful; could link action ("Open first empty session").

## Questions to Consider

- Should imported clients ever see the full five-tab bar before they voluntarily add intake?
- What if the workouts tab for imported mode were only a build queue, with execution metrics on Overview after the program is filled?
- Could scaffold defaults (4×3) be wrong often enough that presets ("3-day full body", "4-day split") beat three number fields?
