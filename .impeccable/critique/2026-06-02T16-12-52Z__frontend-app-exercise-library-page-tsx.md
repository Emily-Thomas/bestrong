---
target: exercise-library
total_score: 22
p0_count: 0
p1_count: 3
timestamp: 2026-06-02T16-12-52Z
slug: frontend-app-exercise-library-page-tsx
---
# Critique: Exercise library

**Target:** `/exercise-library`  
**Resolved:** `frontend/app/exercise-library/page.tsx`

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | No loading or save/archive feedback; failures are silent |
| 2 | Match System / Real World | 3 | Coach-oriented labels; taxonomy is free-text only |
| 3 | User Control and Freedom | 2 | Archive is one click, no undo; reload changes dataset rules |
| 4 | Consistency and Standards | 2 | Card grid differs from workout edit list picker; native checkbox styling |
| 5 | Error Prevention | 2 | Archive without confirm; empty name blocks save with no message |
| 6 | Recognition Rather Than Recall | 3 | Badges and pagination aid scan; card chrome repeats |
| 7 | Flexibility and Efficiency | 3 | Search, three filters, pagination, archived toggle |
| 8 | Aesthetic and Minimalist Design | 2 | Duplicate intro copy; identical two-column card grid |
| 9 | Error Recovery | 1 | Dialog closes even when API save fails |
| 10 | Help and Documentation | 2 | Placeholders help; no guidance on consistent muscle/equipment tags |
| **Total** | | **22/40** | **Acceptable** |

## Anti-Patterns Verdict

**LLM assessment:** Functional admin surface, not marketing slop. Tells: dashed empty state with icon halo, `shadow-lg` wrapper card, and a uniform **icon + title + badges + actions** card grid (the pattern you moved away from on workout edit). Reads as "default shadcn library manager," not Scout-specific craft.

**Deterministic scan:** Clean (`[]`).

**Browser visualization:** Not run this session.

## Overall Impression

The page covers the core job (search, filter, paginate, create, edit, archive) but feels like an earlier-generation UI compared to the refined workout edit flow. The biggest risks are **silent failures**, **non-keyboard card rows**, and **accidental archive** while browsing.

## What's Working

1. **Dual empty states** distinguish "no library yet" vs "no filter matches" with a clear CTA on first run.
2. **Filter + pagination** keep large libraries usable without rendering hundreds of cards at once.
3. **Scout voice** in AppShell description and first-run empty copy is warm and specific.

## Priority Issues

### [P1] Save dialog closes even when the API fails
- **Fix:** Only `setFormOpen(false)` on `response.success`; surface error in dialog.
- **Command:** `/impeccable harden`

### [P1] Archive with no confirmation
- **Fix:** Confirm dialog naming the exercise; optional undo window or archive-only from edit dialog.
- **Command:** `/impeccable harden`

### [P1] Exercise cards are click-only (poor keyboard / AT support)
- **Fix:** Use `<button>` row pattern or `role="button"` + keyboard handlers; keep explicit Edit control.
- **Command:** `/impeccable harden`

### [P2] No loading or error status for list / mutations
- **Fix:** Skeleton or spinner on load; toast or inline alert on save, archive, reload failure.
- **Command:** `/impeccable harden`

### [P2] Identical card grid vs distilled list elsewhere
- **Fix:** Row list with name, muscle, defaults (match workout edit picker); reserve cards for empty state only.
- **Command:** `/impeccable distill`

### [P2] Intro duplicates AppShell description
- **Fix:** Remove redundant paragraph under header; one line in shell description is enough.
- **Command:** `/impeccable clarify`

### [P2] Reload vs initial fetch inconsistency
- **Fix:** Align `getAll` status with `showArchived` on mount and refresh.
- **Command:** `/impeccable harden`

### [P3] Filter bar wraps awkwardly on narrow viewports
- **Fix:** Collapse filters into one "Filters" sheet on mobile.
- **Command:** `/impeccable adapt`

## Persona Red Flags

**Alex (Power User):** No keyboard path through grid; archive icon beside edit is easy to mis-click; free-text muscle tags create duplicate filter values ("Chest" vs "chest").

**Jordan (First-Timer):** "Reload" vs initial load behavior unclear; saving with blank name does nothing visible; archived exercises disappear without explanation until checkbox found.

**Sam (Mobile):** Three 150px selects + checkbox in one row wrap into a wall; 32px icon buttons for edit/archive.

## Minor Observations

- Empty-name save returns silently (no inline error).
- `text-[10px]` status label is very small for gym-floor glance.
- No debounced search (fine at PAGE_SIZE 24, noisy if pagination removed).

## Questions to Consider

- Should muscle/equipment be selects from existing values instead of free text?
- Would row-based layout + side panel edit beat modal for faster bulk cleanup?
- Should archive require typing the exercise name once?
