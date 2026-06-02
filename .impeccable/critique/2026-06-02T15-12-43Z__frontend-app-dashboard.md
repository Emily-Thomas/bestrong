---
target: dashboard
total_score: 23
p0_count: 0
p1_count: 3
timestamp: 2026-06-02T15-12-43Z
slug: frontend-app-dashboard
---
# Critique: Dashboard (`frontend/app/dashboard`)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Client count shows 0 while loading; API errors silent; "Coming soon" cards imply missing product |
| 2 | Match System / Real World | 3 | Coach-oriented copy; Scout naming consistent |
| 3 | User Control and Freedom | 3 | Add client + recent links work; no path to full roster when truncated |
| 4 | Consistency and Standards | 3 | Matches AppShell and clients list patterns |
| 5 | Error Prevention | 2 | Misleading metric during load; placeholders read as broken features |
| 6 | Recognition Rather Than Recall | 2 | Three stat cards before the useful list; duplicate Add Client CTAs |
| 7 | Flexibility and Efficiency | 2 | No view-all, search, or intake-status summary for power users |
| 8 | Aesthetic and Minimalist Design | 1 | Hero-metric + two dead cards + heavy list card = low signal density |
| 9 | Error Recovery | 2 | Failed `getAll` leaves empty/zero state with no retry |
| 10 | Help and Documentation | 2 | Placeholders do not explain what to do today; empty state is fine |
| **Total** | | **23/40** | **Acceptable at best — reads as template dashboard, not coach home** |

## Anti-Patterns Verdict

**LLM assessment:** This is the clearest **generic B2B SaaS dashboard** pattern in the app: a **hero metric** ("Total Clients" with large mono number in signal color), **three equal stat cards** (two dashed "Coming soon" placeholders), then a **nested list card** with `shadow-lg`. It matches PRODUCT.md anti-references (hero-metric dashboards, identical icon-card grids) more closely than the improved clients roster. Scout voice in empty/loading copy is fine; the layout still says "AI admin template."

**Deterministic scan:** Clean (0 findings on `frontend/app/dashboard/page.tsx`). The hero-metric pattern is structural, not regex-detected.

**Browser visualization:** Not run (no browser automation this session).

## Overall Impression

The dashboard's **only real data** is client count and up to ten recent profiles. Everything else is scaffolding. For a coach's home screen, that should be one focused surface (roster snapshot + primary action), not three metric tiles where two admit they do not exist yet.

## What's Working

1. **Recent client rows as Links** with hover and initials avatars: keyboard-friendly, consistent with the updated clients list approach.
2. **Empty state** mirrors clients: encouraging copy and a clear "Add Your First Client" CTA.
3. **AppShell integration** gives stable nav and a single primary header action.

## Priority Issues

### [P1] Hero-metric "Total Clients" card
- **Why:** Violates Impeccable absolute ban and PRODUCT anti-reference; big number + small label + corner icon is the cliché the brand rejects.
- **Fix:** Drop the metric tile row or replace with inline text in the page header ("12 clients") or a simple list-first layout without a giant numeral.
- **Suggested command:** `/impeccable distill` on `frontend/app/dashboard/page.tsx`

### [P1] Client count misleading while loading
- **Why:** `clients.length` renders 0 in the metric card before fetch completes; coaches may think they lost data.
- **Fix:** Skeleton or em dash until loaded; or hide the stat row until `loading === false`.
- **Suggested command:** `/impeccable harden`

### [P1] Silent failure when `clientsApi.getAll` fails
- **Why:** Same bug class fixed on clients list; dashboard still swallows errors.
- **Fix:** Alert + retry; do not show empty-first-client state on error.
- **Suggested command:** `/impeccable harden`

### [P2] Two "Coming soon" placeholder cards
- **Why:** Occupy 2/3 of the top grid with no action; feel like broken features (Jordan persona).
- **Fix:** Remove until shipped, or one honest "What's next" line under the header; never two dashed boxes.
- **Suggested command:** `/impeccable distill`

### [P2] "Recent clients" may not be sorted or complete
- **Why:** `slice(0, 10)` without `sort` by `created_at`; no "View all clients" when count > 10.
- **Fix:** Sort newest first; link to `/clients` when truncated.
- **Suggested command:** `/impeccable polish`

### [P3] Duplicate Add Client and heavy shadows
- **Why:** Header, card header, and empty state all offer the same action; `shadow-lg` on a static list card adds weight without affordance.
- **Fix:** One primary CTA in shell; `shadow-sm` on list container.
- **Suggested command:** `/impeccable polish`

## Persona Red Flags

**Alex (power user):** Lands on fake metrics before the list. Cannot jump to full roster or filter by intake status. Two no-op cards waste above-the-fold space.

**Jordan (first-timer):** "Engagement" and "Scout's Plans" with dashed boxes look like errors or locked features. May not realize Dashboard and Clients are different views of the same data.

**Sam (accessibility):** Loading spinner only inside the list card; stat region may announce "0" before content loads if exposed to assistive tech.

**Morgan (gym-floor coach):** Too much scrolling past placeholders to reach recent clients; duplicate Add Client buttons add decisions without value.

## Cognitive Load

Failures: **hero metric row**, **two placeholder cards**, **duplicate CTAs**, **nested card for list**. Rating: **high extraneous load**, low task focus.

## Questions to Consider

- If the dashboard only shows clients today, should it redirect to `/clients` or merge with that page?
- What is the one number or status a coach actually needs on login (e.g. clients awaiting intake)?
- Can placeholders wait in a backlog doc instead of on the home screen?
