---
target: trainers
total_score: 24
p0_count: 1
p1_count: 3
timestamp: 2026-06-02T16-30-19Z
slug: frontend-app-trainers-page-tsx
---
# Critique: Trainers (`frontend/app/trainers`)

**Scope:** List (`page.tsx`) and detail (`[id]/page.tsx`). Slug: `frontend-app-trainers-page-tsx`.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | List API failure masquerades as empty roster; no save success feedback |
| 2 | Match System / Real World | 2 | "AI context", "Prompt injection block" speak to engineers, not coaches |
| 3 | User Control and Freedom | 3 | Cancel/back work; no delete; regenerate persona has no confirm |
| 4 | Consistency and Standards | 2 | Clients use searchable table roster; trainers use card grid + modal |
| 5 | Error Prevention | 2 | Inline form validation good; stale persona easy to miss on list |
| 6 | Recognition Rather Than Recall | 3 | Badges help; Draft/Persona/Stale meanings never explained |
| 7 | Flexibility and Efficiency | 2 | No search/sort; edit buried in ghost icon vs primary list pattern |
| 8 | Aesthetic and Minimalist Design | 2 | Repeated profile cards + decorative gradient hero on detail |
| 9 | Error Recovery | 3 | Form errors clear; gen errors plain; list load recovery missing |
| 10 | Help and Documentation | 2 | Placeholders help; persona workflow not guided on first visit |
| **Total** | | **24/40** | **Acceptable** (significant improvements before coaches are happy) |

**Cognitive load:** 4 checklist failures (modal wall of fields, inconsistent roster pattern, busy cards, duplicate generate CTAs on detail). **Moderate–high.**

**Emotional journey:** Empty state copy is warm. Valley at failed load (false empty) and long silent persona generation. Stale warning on detail is reassuring.

## Anti-Patterns Verdict

**LLM assessment:** Reads as competent shadcn product UI with noticeable AI-generation tells: Sparkles on empty state, badges, and every generate action; 2–3 column profile card grid; detail hero with `bg-gradient-to-br` and `blur-3xl` orb. Not full slop, but a coach comparing to **Clients** will feel two different products.

**Deterministic scan:** `detect.mjs` on `frontend/app/trainers` returned **0 findings** (clean).

**Browser visualization:** Not available (no browser automation in this session; dev server not verified for `/trainers`). No reliable overlay.

## Overall Impression

The persona concept is strong and stale-state handling on detail is thoughtful. The biggest gap is **roster parity**: Clients teaches a dense, scannable, error-aware list; Trainers hides edit, skips search/sort, and can lie about an empty gym when the API fails.

## What's Working

1. **Stale persona messaging** on detail explains why regenerate matters, with amber treatment that is not color-only.
2. **Human form labels** ("What defines them as a trainer") and placeholders match coach language better than the AI tab labels.
3. **Progressive raw text** via collapsible on detail keeps advanced content tucked away.

## Priority Issues

### [P0] Failed load shows "first trainer" empty state
**Why:** If `getAll` fails, `trainers` stays `[]` and the UI invites "Add Your First Trainer," which is wrong and wastes time.
**Fix:** Mirror `clients/page.tsx`: `loadError` state, `Alert` + Try again, distinct copy from true empty roster.
**Suggested command:** `/impeccable harden`

### [P1] Roster pattern diverges from Clients
**Why:** Power users expect search, sort, and a single scannable surface; card grid with corner pencil edit is slower and inconsistent.
**Fix:** Reuse clients roster shell (bordered card, search, sort, row links) or a compact table with status column and row actions.
**Suggested command:** `/impeccable shape` then `/impeccable layout`

### [P1] Detail hero uses decorative gradient + blur orb
**Why:** Violates Scout "flat until state" and No-Glass guidance; reads as marketing hero on a tool screen.
**Fix:** Flat bone-soft header band: avatar, name, badges, actions. Drop `blur-3xl` and gradient wash.
**Suggested command:** `/impeccable quieter`

### [P1] Persona generation blocks with only button spinner
**Why:** Sync AI call may run 30s+; no step copy, no leave-and-return story per product principles.
**Fix:** Job-based flow with step label, or inline progress panel ("Reading your notes…", "Building pillars…").
**Suggested command:** `/impeccable harden` or `/impeccable shape`

### [P2] Add/Edit crammed into one modal
**Why:** Six fields + two large textareas exceed working memory; modal-first for primary create path.
**Fix:** Dedicated `/trainers/new` route or stepped sheet (Basics → Coaching notes → Review).
**Suggested command:** `/impeccable distill` or `/impeccable shape`

## Persona Red Flags

**Alex (Power User):** No search or sort on list. Must open each card to scan persona state. Edit is a ghost icon, not a row action. Generate blocks the page with no job ID to resume.

**Jordan (First-Timer):** "Draft", "Persona", "Stale" on cards with no legend. Two "Generate" buttons when no persona exists (hero + card). Tab labeled "AI context" sounds technical.

**Sam (Accessibility):** `AvatarImage` uses `alt=""`. Badge text at `text-[10px]` is hard to read. Stale/Draft distinction relies on amber/emerald color.

**Morgan (Head coach, project):** Cannot quickly answer "which coaches are ready for program generation?" without opening profiles. Roster does not match Clients muscle memory.

## Minor Observations

- Loading copy "Loading trainers..." vs Clients "Scout's pulling up your roster..."
- `shadow-lg` on empty-state card vs Clients `shadow-sm` border shell
- Uppercase tracked "Headline" eyebrow on detail overview tab
- Duplicate generate CTA when `!p`
- Delete API exists but no UI
- Save closes dialog with no toast/confirmation

## Questions to Consider

- Should trainers be a **table roster** like clients, with persona status as a column?
- Is the card grid justified only at very small team sizes (≤6)?
- Should "AI context" be renamed for coaches ("How Scout uses this coach") and moved out of a tab into a collapsible?
