/**
 * Milo Design System — Color Tokens
 *
 * Paper (bone) base, ink type, signal (primary action), fog neutrals, collar (terracotta warmth)
 * @see `frontend/app/globals.css` for CSS variable wiring and dark theme
 */

export const colors = {
  core: {
    bone: '#F8F8F5',
    ink: '#141416',
    signal: '#D4FB3C',
    fog: '#6E6E75',
    collar: '#E07856',
  },

  /** Neutrals & tints (surfaces, borders, secondary type) */
  neutral: {
    boneSoft: '#FFFFFF',
    bone: '#F8F8F5',
    boneDeep: '#EEEEE8',
    fog1: '#E5E5E1',
    fog2: '#CFCFCA',
    fog3: '#9A9A95',
    /** Same value as `fog` — use for type hierarchy */
    inkMute: '#6E6E75',
    inkSoft: '#2E2E33',
    ink: '#141416',
  },

  /** Semantic: actions & feedback */
  semantic: {
    signal: '#D4FB3C',
    success: '#2E8B57',
    info: '#3B6EA8',
    danger: '#D64545',
    /** Caution: attention without irreversible action */
    warning: '#B8860B',
  },
} as const;

/** Recharts / chart-1..5 in globals.css */
export const chartColors = {
  1: '#D4FB3C',
  2: '#E07856',
  3: '#3B6EA8',
  4: '#2E8B57',
  5: '#9A9A95',
} as const;
