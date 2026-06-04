export { touchActionClass } from '@/lib/touch-targets';

/** Readable secondary text on signal-tinted group surfaces */
export const EDIT_ON_TINT_MUTED = 'text-foreground/75';

/** Main column: session panels stack with clear section breaks */
export const EDIT_PAGE_CONTAINER =
  'mx-auto flex w-full max-w-5xl flex-col gap-8';

export const EDIT_PAGE_INNER = 'mx-auto w-full max-w-5xl px-4 sm:px-6';

export const EDIT_PANEL_CLASS =
  'overflow-hidden rounded-xl border border-border bg-card shadow-sm';

export const EDIT_PANEL_HEADER =
  'border-b border-border bg-muted/20 px-4 py-4 sm:px-6 sm:py-5';

export const EDIT_PANEL_BODY = 'px-4 py-5 sm:px-6 sm:py-6';

/** Exercise list inside the Exercises panel */
export const EDIT_EXERCISES_LIST =
  'flex flex-col gap-6 px-4 py-5 sm:gap-8 sm:px-6 sm:py-6';

export const EDIT_LINK_TOOLBAR_WRAP =
  'border-b border-primary/20 bg-primary/[0.06] px-4 py-3 sm:px-6';

/** Standalone / group row: title + actions on wide screens */
export const WORKOUT_EXERCISE_ROW_GRID =
  'sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start';

export const EDIT_MOVEMENT_PRESCRIPTION =
  'border-t border-border/70 bg-muted/10 px-4 py-4 sm:px-5 sm:py-5';

export const EDIT_GROUP_INNER_BODY = 'space-y-4 px-4 pb-5 pt-2 sm:px-5 sm:pb-6';

export const EDIT_GROUP_MOVEMENTS_STACK =
  'divide-y divide-border/80 overflow-hidden rounded-lg border border-border/80 bg-background';

export const EXERCISES_SECTION_HELPER =
  'Drag to reorder blocks and movements. Link pair between singles, use Link with… on a row, or select several singles and link them into a block.';

/** Sortable settle (ease-out-quart); disabled when prefers-reduced-motion */
export const DRAG_SORTABLE_TRANSITION =
  'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)';

export const DRAG_SEGMENT_GHOST_CLASS =
  'opacity-90 shadow-xl ring-2 ring-primary/35';
