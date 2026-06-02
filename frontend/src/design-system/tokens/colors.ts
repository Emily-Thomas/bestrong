/**
 * Scout Design System — Color Tokens
 *
 * Dark-first product UI: ink surfaces, bone type, signal (primary action), fog neutrals, collar (terracotta warmth).
 * Literal `core` / `neutral` hex values are brand constants (signal-on-ink CTAs).
 * @see `frontend/app/globals.css` for semantic token wiring
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
    warning: '#B8860B',
  },

  /** Dark-first surface mapping (CSS variables in globals.css) */
  surfaces: {
    background: '#141416',
    foreground: '#F8F8F5',
    card: '#2E2E33',
    muted: '#2E2E33',
    mutedForeground: '#9A9A95',
    border: 'color-mix(in srgb, #F8F8F5 12%, transparent)',
  },
} as const;

/** Recharts / chart-1..5 in globals.css */
export const chartColors = {
  1: '#D4FB3C',
  2: '#E07856',
  3: '#5B8CCE',
  4: '#3CB87A',
  5: '#9A9A95',
} as const;
