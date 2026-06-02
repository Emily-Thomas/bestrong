export { touchActionClass } from '@/lib/touch-targets';

/** Main column width — matches exercise library and sticky footer */
export const EDIT_PAGE_CONTAINER =
  'mx-auto flex w-full max-w-5xl flex-col gap-6';

export const EDIT_PAGE_INNER = 'mx-auto w-full max-w-5xl px-4 sm:px-6';

export const EDIT_PANEL_CLASS =
  'overflow-hidden rounded-xl border border-border bg-card shadow-sm';

export const EDIT_PANEL_HEADER =
  'border-b border-border bg-muted/20 px-4 py-4 sm:px-6';

export const EDIT_PANEL_BODY = 'px-4 py-4 sm:px-6 sm:py-5';

/** Exercise row header: title block + action toolbar */
export const WORKOUT_EXERCISE_ROW_GRID =
  'sm:grid-cols-[minmax(0,1fr)_auto]';
