---
target: exercise-library
total_score: 30
p0_count: 0
p1_count: 0
timestamp: 2026-06-02T16-19-53Z
slug: frontend-app-exercise-library-page-tsx
---
# Critique: Exercise library

**Target:** `/exercise-library`  
**Resolved:** `frontend/app/exercise-library/page.tsx`

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading skeleton, save success, archive notice; reload clears notices |
| 2 | Match System / Real World | 4 | Coach-oriented labels and exercise vocabulary throughout |
| 3 | User Control and Freedom | 3 | Discard dialog, clear filters, type-to-archive; no unarchive path |
| 4 | Consistency and Standards | 3 | Roster-style panel matches clients list; create vs edit sheet behavior differs |
| 5 | Error Prevention | 4 | Name required before save; archive requires typing exercise name |
| 6 | Recognition Rather Than Recall | 3 | Taxonomy comboboxes surface existing tags; filters are visible on desktop |
| 7 | Flexibility and Efficiency | 2 | No bulk actions, shortcuts, or list keyboard accelerators |
| 8 | Aesthetic and Minimalist Design | 3 | Row list is focused; first-run empty still uses icon-halo pattern |
| 9 | Error Recovery | 3 | Sheet stays open on failed save; dismissible error and success alerts |
| 10 | Help and Documentation | 2 | Form section copy helps; no guidance on consistent taxonomy tagging |
| **Total** | | **30/40** | **Good** |

## Anti-Patterns Verdict

**LLM assessment:** No longer reads as generic card-grid slop. The surface aligns with Scout product UI: roster panel, row list, right sheet for edit, Scout voice in empty and loading copy. Remaining tells are mild: first-run **icon in circular halo** empty state (shared with clients roster), and a **filter band with four controls** on large screens that can feel like admin chrome rather than gym-floor speed.

**Deterministic scan:** Clean (`[]` on `frontend/app/exercise-library`).

**Browser visualization:** Dev server responded (`200` on `http://localhost:3000/exercise-library`). Browser injection and `[Human]` overlays were not run in this session (no browser automation in the agent harness). Assessment relied on source review plus CLI detector.

## Overall Impression

A solid step up from the earlier card-grid library manager. The core coach workflow (scan, filter, edit in place, archive safely) is credible and on-brand. The biggest remaining gap is **power-user throughput** (bulk cleanup, consistent taxonomy, unarchive) and **mobile risk** on archive beside edit.

## What's Working

1. **Row list + edit sheet** matches the distilled workout-edit pattern: scan name, muscle, defaults without card chrome.
2. **High-stakes archive** uses type-to-confirm plus a success notice that explains Show archived.
3. **Status layering** is clear: skeleton load, inline form errors, dismissible list alerts, editing row highlight tied to open sheet.

## Priority Issues

### [P2] No way to restore an archived exercise
- **Why it matters:** Coaches who archive by mistake must leave the app or ask support; the success copy points to Show archived but not how to undo.
- **Fix:** Add Restore active (or Unarchive) on archived rows when Show archived is on, with the same confirm pattern or a lighter confirm.
- **Suggested command:** `/impeccable harden`

### [P2] Mobile archive control sits beside edit in the row action strip
- **Why it matters:** One-handed gym-floor use; destructive icon adjacent to primary edit increases mis-tap risk even with dialog confirm.
- **Fix:** Move archive into an overflow menu, a long-press affordance, or a sheet-only action when editing; keep edit as the only prominent row action on small screens.
- **Suggested command:** `/impeccable adapt`

### [P2] Create closes the sheet; edit keeps it open for the next row
- **Why it matters:** Inconsistent mental model; bulk add sessions feel slower than bulk tag cleanup.
- **Fix:** Either keep the sheet open after create (focus name field, reset form) or close after edit too; pick one flow and document it in the sheet description.
- **Suggested command:** `/impeccable clarify`

### [P2] Taxonomy combobox allows duplicate tags with different casing
- **Why it matters:** Filters split ("Chest" vs "chest"); Alex sees duplicate filter options and Jordan thinks the library is messy.
- **Fix:** Normalize on save (trim, title-case or canonical map) or block create when case-insensitive match exists.
- **Suggested command:** `/impeccable harden`

### [P2] Filter band exposes five decisions at once on desktop
- **Why it matters:** Cognitive load at the top of every visit (search + three selects + archived toggle).
- **Fix:** Default to search + one Filters control until expanded, or collapse muscle/equipment into a single "Tags" filter with chips.
- **Suggested command:** `/impeccable distill`

## Persona Red Flags

**Alex (Power User):** Still paginated 24 at a time with no multi-select, no keyboard shortcut to jump rows, and archive only per row. Editing many exercises means open sheet, save, click next row repeatedly.

**Jordan (First-Timer):** Show archived is a small checkbox with no upfront explanation; archived items disappear until they discover the toggle or read the post-archive notice.

**Sam (Accessibility):** Editing state is mostly visual (`bg-primary/[0.08]`); add `aria-current="true"` or an sr-only "Currently editing" on the active row. Archive dialog is strong; row primary button label is only the exercise name (acceptable but dense).

**Casey (Mobile):** Bottom filter sheet is good; row still stacks edit + archive icons in one thumb zone at the bottom of each row.

## Minor Observations

- Reload clears `listNotice` as part of load; intentional but easy to miss a success message.
- `text-xs` status labels (Active/Archived) are small for quick floor glances.
- Duplicate edit entry points on mobile (full-row button plus pencil icon).

## Questions to Consider

- Should new exercises stay in the sheet for rapid entry (like edit-in-place for many rows)?
- Is archive better as an action only inside the edit sheet on mobile?
- Do you want canonical muscle/equipment tags enforced at save time?
