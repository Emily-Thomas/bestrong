---
target: clients
total_score: 25
p0_count: 0
p1_count: 3
timestamp: 2026-06-02T15-00-07Z
slug: frontend-app-clients
---
# Critique: Clients (`frontend/app/clients`)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loaders on list/detail; roster API failure is silent |
| 2 | Match System / Real World | 3 | Coach-facing labels; arrow notation in AppShell descriptions |
| 3 | User Control and Freedom | 3 | Delete confirm + back nav; delete failure gives no user message |
| 4 | Consistency and Standards | 2 | Ad-hoc emerald/violet/amber vs Milo semantic tokens; shadow-lg on static tables |
| 5 | Error Prevention | 3 | Destructive confirm; form validation on create |
| 6 | Recognition Rather Than Recall | 2 | Five post-setup tabs; TrainingPlans density hides next action |
| 7 | Flexibility and Efficiency | 2 | No roster search/sort; table rows are click-only (no keyboard link) |
| 8 | Aesthetic and Minimalist Design | 2 | Card-in-card list; gradient plan-mode tiles compete for attention |
| 9 | Error Recovery | 2 | List load errors swallowed; delete errors only reset spinner |
| 10 | Help and Documentation | 3 | Setup accordion + Workouts tab helper copy; no roster empty-search help |
| **Total** | | **25/40** | **Acceptable — meaningful UX work before coaches feel at home** |

## Anti-Patterns Verdict

**LLM assessment:** Does not read as generic AI landing-page slop. The roster table, AppShell, and intake accordion feel like a real coaching tool. The tell is **deeper in client detail**: thick `border-l-4` status accents on workout cards and plan templates, gradient **three-tile plan pickers** (primary/violet/amber), and uppercase micro-badges (`W1 · S1`) echo common AI product patterns. Milo voice shows up in empty states; loading strings are still generic ("Loading your clients...").

**Deterministic scan:** 2 warnings (`side-tab`, severity warning):
- `TrainingPlansSection.tsx` line 1364 (`border-l-4` on plan template rows)
- `WorkoutsSection.tsx` line 334 (`border-l-4` + status-colored left bar on workout cards)

**Browser visualization:** Not run — no browser automation in this session. No live overlay; findings are from source + CLI scan only.

## Overall Impression

The clients area has a **solid product skeleton**: familiar shell, table roster, phased setup (intake → coach/plan → tabbed record), and encouraging empty state. The biggest gap is **efficiency and trust at scale** (find a client fast, know when the API failed, operate keyboard-only) plus **visual discipline** on detail surfaces where decoration and banned side-stripes creep in.

## What's Working

1. **Phased client detail** — Incomplete setup stays on a focused intake accordion; complete clients get tabs. That matches how coaches actually onboard vs maintain a record.
2. **Empty roster** — "Ready to add your first client?" with a clear primary CTA; not a sterile "No data" block.
3. **Workouts tab preamble** — Short inline guidance on library vs generate vs review ties tabs together without a manual.

## Priority Issues

### [P1] Side-tab accent borders on plan and workout cards
- **Why:** Violates Milo/Impeccable absolute ban; reads as AI-generated list decoration; status is already in badges.
- **Fix:** Remove `border-l-4`; use badge tint, row background, or icon leading edge only.
- **Suggested command:** `/impeccable quieter` (TrainingPlansSection, WorkoutsSection)

### [P1] Roster fails silently when `getAll` does not succeed
- **Why:** Coach sees endless loading or empty table with no recovery path; erodes trust on the busiest screen.
- **Fix:** On failure, show destructive `Alert` with retry; distinguish empty vs error.
- **Suggested command:** `/impeccable harden` (`frontend/app/clients/page.tsx`)

### [P1] Client table rows are not keyboard-operable
- **Why:** `onClick` on `<tr>` without `tabIndex`, `role="link"`, or Enter handler blocks Sam and hurts power users.
- **Fix:** Use `<Link>` wrapping name cell or `tr` with keyboard activation + visible focus.
- **Suggested command:** `/impeccable audit` (clients list table)

### [P2] No search, filter, or sort on the client roster
- **Why:** Alex with 30+ clients must scan visually; violates efficiency for a daily hub.
- **Fix:** Sticky filter input (name/email), optional sort by added date; preserve URL query for shareable filtered views.
- **Suggested command:** `/impeccable shape` then `/impeccable craft` (clients list)

### [P2] Plan-mode selector uses off-brand violet/amber gradients
- **Why:** Breaks signal rarity and DESIGN.md restrained palette; three competing saturated tiles feel like template SaaS, not Milo.
- **Fix:** Three equal-weight outline/secondary tiles; signal only on selected; semantic tokens for state.
- **Suggested command:** `/impeccable colorize` (TrainingPlansSection initial plan mode)

### [P3] Static list wrapped in elevated `shadow-lg` cards
- **Why:** DESIGN.md says shadow signals interactivity; list card feels heavier than content.
- **Fix:** Table flush in shell or `shadow-sm` / border-only container.
- **Suggested command:** `/impeccable distill` (clients list + loading states)

## Persona Red Flags

**Alex (power user):** No roster search or sort. Entire row click with no keyboard shortcut to open client. Five tabs with no quick-jump (command palette / shortcuts). "Create without checklist" vs "Create and open setup" adds a decision on every add.

**Sam (accessibility):** Client list `<tr onClick>` is mouse-first. Workout status conveyed partly via `border-l-emerald-500` / amber bars without guaranteed text parity. Focus on table rows unclear.

**Jordan (first-timer):** New-client page offers two similar primary paths without a recommended default highlighted. Post-setup tab bar has five peers; "Coach & plan" vs "Workouts" boundary needs the helper paragraph (good) but Overview duplicates profile info.

**Morgan (gym-floor coach, project persona):** TrainingPlansSection + embedded scroll regions on phone mean lots of nested scrolling between intake and plan lock. Description strings with `→` are easy to misread mid-session.

## Minor Observations

- Loading copy: prefer Milo voice ("Milo's pulling up your roster...") per brand rules.
- `text-emerald-*` and `violet-*` appear often; map to `success` / `info` / token classes for dark mode parity.
- `WorkoutsSection` uppercase `tracking-wide` session chips are eyebrow-adjacent on every card.
- Delete client failure: `setDeleting(false)` only; no inline error on the dialog.
- List page does not surface `response.error` from API layer.

## Cognitive Load

Checklist failures (~4): **5 tabs** at decision point; **nested cards** on list; **TrainingPlans** as a wall of modes; **working memory** across tabs for workouts vs coach/plan. Rating: **high extraneous load on detail**, moderate on list.

## Questions to Consider

- What if the roster were a simple searchable list without a card wrapper?
- Does plan creation need three gradient billboards, or one recommended path with "Other ways"?
- Could tab state show a completion dot per tab so coaches know where attention is needed without opening each?
