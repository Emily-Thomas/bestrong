---
target: clients
total_score: 34
p0_count: 0
p1_count: 0
timestamp: 2026-06-02T15-20-31Z
slug: frontend-app-clients
---
# Critique: Clients (`frontend/app/clients`)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Roster/detail loading, errors, retry, tab dots; partial detail fetch failures not surfaced |
| 2 | Match System / Real World | 4 | Scout voice, coach workflows, plain descriptions |
| 3 | User Control and Freedom | 4 | Search, sort, keyboard rows, back/delete, URL tabs |
| 4 | Consistency and Standards | 4 | Semantic tokens, shadow-sm, merged coach home model |
| 5 | Error Prevention | 3 | Destructive confirm; detail can load client while questionnaire/scan calls fail quietly |
| 6 | Recognition Rather Than Recall | 3 | Five tabs improved by status dots; TrainingPlans still dense |
| 7 | Flexibility and Efficiency | 4 | Roster search/sort; no at-a-glance intake column on list |
| 8 | Aesthetic and Minimalist Design | 3 | Roster is lean; client detail remains section-heavy |
| 9 | Error Recovery | 4 | List/detail retry, delete dialog errors, invalid ID handling |
| 10 | Help and Documentation | 3 | Workouts tab helper + setup copy; tab dots rely on color + title only |
| **Total** | | **34/40** | **Good — coach-home roster is solid; detail depth is the remaining lift** |

## Anti-Patterns Verdict

**LLM assessment:** No longer reads as template SaaS on the **roster**: no hero metric, no placeholder cards, no side-tab borders (grep clean). Consolidation with `/dashboard` makes `/clients` a credible **coach home** — search, sort, inline count in the description, Scout loading copy, error + empty states. AI-slop risk moved to **client detail depth** (large TrainingPlans surface, five tabs) rather than visual tells.

**Deterministic scan:** 0 findings on `frontend/app/clients`.

**Browser visualization:** Not run this session.

## Overall Impression

Large step up from the first critique (25/40). The roster is now the product's front door and behaves like one. Remaining work is **information architecture on the client record** (what coaches need before opening a profile) and **accessibility of tab status dots**, not fundamental layout fixes.

## What's Working

1. **Coach home roster** — Search, sort, keyboard-friendly `Link` rows, destructive alert + retry, no misleading zero during load (full-page loader instead).
2. **Consolidation** — Dashboard redirect + single nav entry removes duplicate surfaces; count in description avoids banned hero-metric cards.
3. **Detail hardening** — Load/delete errors, tab completion dots, workouts presence callback updating the Workouts dot.

## Priority Issues

### [P2] Tab status dots are visual-only for assistive tech
- **Why:** Dots use `aria-hidden` + `title`; tab triggers do not expose "needs attention" in accessible name.
- **Fix:** `aria-label` on `TabsTrigger` when status is `attention` (e.g. "Workouts, needs attention").
- **Suggested command:** `/impeccable audit` (ClientDetailTabs)

### [P2] Roster lacks intake/setup signal per row
- **Why:** Coaches with many clients cannot prioritize who still needs InBody verification or plan lock without opening each profile.
- **Fix:** Optional status chip column (e.g. "Intake", "Plan ready") from lightweight API or cached flags.
- **Suggested command:** `/impeccable shape` then `/impeccable craft` (clients list)

### [P2] Client detail partial-load blindness
- **Why:** `loadData` can show a client while questionnaire or scan requests fail; no banner for degraded data.
- **Fix:** Non-blocking warning when secondary fetches fail; retry section for intake data only.
- **Suggested command:** `/impeccable harden` (`[id]/page.tsx`)

### [P3] TrainingPlansSection cognitive weight
- **Why:** Still the densest surface in the tree; plan-mode UI is cleaner but the section remains a wall for new coaches.
- **Fix:** Progressive disclosure, stronger "next step" callout, or slimmer embedded mode.
- **Suggested command:** `/impeccable distill` (TrainingPlansSection)

### [P3] Empty roster duplicates Add Client CTA
- **Why:** Header and empty state both offer the same action (minor, not blocking).
- **Fix:** Keep header primary; empty state uses text link or secondary button.
- **Suggested command:** `/impeccable polish` (clients list)

## Persona Red Flags

**Alex:** Roster is usable; still must open profiles to see intake state. No bulk actions.

**Jordan:** Tab dots help but are not announced; five tabs remain intimidating.

**Sam:** Table structure with `colSpan` + inner link is acceptable; tab status not in accessible names.

**Morgan:** Roster is fast; detail tabs still mean hunting for the right section mid-session.

## Cognitive Load

Roster: **low** (search/sort, single section). Detail: **moderate** (five tabs, TrainingPlans bulk). Overall down from prior **high** extraneous load.

## Questions to Consider

- Should the roster show one column for "Setup status" before adding more metrics?
- Can TrainingPlans live only on the Coach & plan tab with a slimmer overview summary?
- Are three green dots on every completed-setup tab redundant (always complete except Workouts)?
