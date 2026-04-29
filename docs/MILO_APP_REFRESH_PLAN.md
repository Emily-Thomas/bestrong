# Milo App Refresh - Implementation Plan

**Date:** April 22, 2026  
**Status:** 🚧 In Progress

---

## Overview

Comprehensive refresh of the entire BeStrong application to align with Milo brand identity, design system, and voice guidelines.

---

## Completed ✅

### Phase 1: Foundation (DONE)
- [x] Logo updated (goldendoodle PNG, blue & gold versions)
- [x] Design token system created
- [x] Brand guide documentation complete
- [x] Agent guidelines (`.cursorrules`, `.cursor/rules/`)
- [x] CSS variables updated (warm shadows, brand colors)
- [x] Typography system (Manrope display, Geist UI)
- [x] Landing/login page fully branded

### Phase 2: Main Pages (DONE)
- [x] Home page (loading state with Milo voice)
- [x] Dashboard page (warm shadows, Milo voice, improved empty state)
- [x] Clients list page (warm shadows, Milo voice, improved empty state)

---

## In Progress 🚧

### Phase 3: Core Pages & Components

#### High Priority
- [ ] Trainers page - Apply Milo branding
- [ ] Exercise library page - Apply Milo branding
- [ ] Client detail page - Main hub, needs comprehensive update
- [ ] New client page - Form styling and voice
- [ ] AppShell refinement - Enhanced styling with warm shadows

#### Component Updates
- [ ] Empty state pattern - Consistent across app
- [ ] Loading state pattern - "Milo's working on it..."
- [ ] Error message pattern - Friendly, actionable
- [ ] Success toast pattern - Rewarding feedback

---

## Detailed Implementation Checklist

### Design System Application

**Warm Shadows:**
- [x] Dashboard cards
- [x] Client list card
- [ ] All other cards throughout app
- [ ] Modals and dialogs
- [ ] Dropdowns and popovers
- [ ] Hover states

**Typography:**
- [x] Display font for brand name "Milo"
- [x] Mono font for metrics/dates
- [ ] Consistent heading hierarchy
- [ ] Body text standardization

**Colors:**
- [x] Primary blue for actions
- [x] Accent gold (used sparingly)
- [ ] Consistent use of semantic colors
- [ ] Remove any hardcoded grays

**Voice & Microcopy:**
- [x] Dashboard empty state
- [x] Client list empty state
- [x] Loading states (dashboard, clients)
- [ ] All other empty states
- [ ] All error messages
- [ ] All success messages
- [ ] All button labels
- [ ] All descriptions

### Page-by-Page Updates

#### ✅ Completed Pages
1. **Home (`/`)** - Loading state with Milo voice
2. **Login (`/login`)** - Full landing page with branding
3. **Dashboard (`/dashboard`)** - Cards with shadows, Milo voice, better empty state
4. **Clients List (`/clients`)** - Table with shadows, Milo voice, better empty state

#### 🚧 Pages to Update

5. **Trainers List (`/trainers`)**
   - Apply same pattern as clients list
   - Warm shadows on cards
   - Milo voice in empty state
   - Better loading state

6. **Exercise Library (`/exercise-library`)**
   - Card grid with warm shadows
   - Milo voice in empty state
   - Search/filter UI improvements

7. **New Client (`/clients/new`)**
   - Form styling consistency
   - Friendly field labels
   - Helpful validation messages

8. **Client Detail (`/clients/[id]`)**
   - Tab styling with warm shadows
   - Section cards with consistent shadows
   - All empty states updated
   - All microcopy reviewed

9. **Client Questionnaire (`/clients/[id]/questionnaire`)**
   - Form styling
   - Progress indicators
   - Friendly field descriptions

10. **Training Plans Section**
    - Card styling
    - Empty states
    - Action buttons

11. **Workouts Section**
    - List/grid styling
    - Status indicators
    - Empty states

12. **InBody Scans Section**
    - Upload UI
    - Scan cards
    - Empty state

13. **Workout Detail (`/clients/[id]/workouts/[workoutId]`)**
    - Exercise cards
    - Action buttons
    - Status displays

14. **Workout Edit (`/clients/[id]/workouts/[workoutId]/edit`)**
    - Form styling
    - Exercise picker UI
    - Save states

15. **Workout Execute (`/clients/[id]/workouts/[workoutId]/execute`)**
    - Exercise input cards
    - Progress tracking
    - Completion flow

16. **Recommendations (`/clients/[id]/recommendations/[recId]`)**
    - Overview cards
    - Week breakdown
    - Action buttons

17. **Workout Review (`/clients/[id]/recommendations/[recId]/workouts-review`)**
    - Week rail styling
    - Session cards
    - Exercise swap dialog

18. **InBody Compare (`/clients/[id]/compare/[batchId]`)**
    - Chart styling
    - Metric cards
    - Comparison UI

19. **Trainer Detail (`/trainers/[id]`)**
    - Same pattern as client detail

---

## Component Patterns to Standardize

### Empty States
**Current pattern (inconsistent):**
```tsx
<div className="text-center py-12">
  <Icon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
  <p className="text-muted-foreground mb-4">No items yet.</p>
  <Button>Create</Button>
</div>
```

**New Milo pattern:**
```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
    <Icon className="h-8 w-8 text-primary" />
  </div>
  <h3 className="text-lg font-semibold mb-2">Ready to [action]?</h3>
  <p className="text-muted-foreground mb-6 max-w-sm">
    [Encouraging description of what they can do]
  </p>
  <Button>[Actionable Label]</Button>
</div>
```

### Loading States
**Old:** Generic spinner
**New:** "Milo's working on it..." with context

```tsx
<div className="flex flex-col items-center justify-center py-16">
  <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
  <p className="text-sm text-muted-foreground">Milo's [specific action]...</p>
</div>
```

### Cards
**Consistent shadow application:**
- Small cards: `shadow-md`
- Important cards: `shadow-lg`
- Hover effects: `hover:shadow-lg transition-shadow`

### Buttons
**Labels:**
- Action-oriented: "Create Program" not "Submit"
- Clear and friendly: "Let's Go" not "Continue"
- Specific: "Add Client" not "Add"

---

## Technical Checklist

### Code Quality
- [ ] Remove console.log statements
- [ ] Fix any TypeScript errors
- [ ] Fix any linter warnings
- [ ] Ensure all imports are correct
- [ ] Remove unused imports

### Accessibility
- [ ] All images have alt text
- [ ] All form inputs have labels
- [ ] Keyboard navigation works
- [ ] Focus states visible
- [ ] Color contrast meets WCAG AA

### Performance
- [ ] Images optimized (Next.js Image component)
- [ ] No unnecessary re-renders
- [ ] Loading states prevent layout shift
- [ ] Proper error boundaries

---

## Implementation Strategy

### Approach
Given the scope, implementing changes systematically:

1. **Pattern first** - Establish consistent patterns for:
   - Empty states
   - Loading states
   - Error messages
   - Cards
   - Buttons

2. **High-traffic pages** - Prioritize pages users see most:
   - Dashboard ✅
   - Clients list ✅
   - Client detail (next)
   - Workout pages

3. **Component library** - Update base UI components if needed

4. **Testing** - Test each section after updates

### Time Estimate
- Core pages (dashboard, clients): ✅ DONE
- Remaining main pages: ~20-30 updates
- Client detail & workflows: ~30-40 updates
- Workout pages: ~20-30 updates
- Component polish: ~10-20 updates
- Total: ~80-120 file changes

---

## Current Status Summary

### What's Done ✅
- Foundation (design system, tokens, documentation)
- Landing page (fully branded)
- Dashboard (warm shadows, Milo voice)
- Clients list (warm shadows, Milo voice)
- Home/loading page (Milo voice)

### Next Steps
1. Update remaining main pages (trainers, exercise library, new client)
2. Update client detail page (major hub)
3. Update workout execution flow
4. Update all empty states app-wide
5. Polish all loading states
6. Review and update all button labels
7. Test and fix linter errors
8. Final QA pass

---

## Notes

- This is a comprehensive refresh affecting ~100 pages/components
- Focus on consistency: warm shadows, Milo voice, design tokens
- Test incrementally to catch issues early
- Document any patterns that emerge for future reference
- Keep .cursorrules updated with new patterns

---

**Status:** Foundation complete, main pages in progress. Systematic updates continuing.
