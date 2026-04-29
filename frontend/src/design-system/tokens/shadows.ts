/**
 * Milo Design System - Shadow tokens
 *
 * Elevation with a neutral ~ink-tinted shadow (see `--ink-shadow` in `globals.css`)
 */

export const shadows = {
  '2xs': '0 0.5px 1.5px 0 hsl(240 5% 6% / 0.04)',
  xs: '0 1px 2px 0px hsl(240 5% 6% / 0.05)',
  sm: '0 1px 3px 0px hsl(240 4% 10% / 0.1), 0 1px 2px -1px hsl(240 4% 10% / 0.1)',
  base: '0 1px 3px 0px hsl(240 4% 10% / 0.1), 0 1px 2px -1px hsl(240 4% 10% / 0.1)',
  md: '0 4px 6px -1px hsl(240 4% 10% / 0.1), 0 2px 4px -2px hsl(240 4% 10% / 0.1)',
  lg: '0 10px 15px -3px hsl(240 4% 10% / 0.1), 0 4px 6px -4px hsl(240 4% 10% / 0.1)',
  xl: '0 20px 25px -5px hsl(240 4% 10% / 0.1), 0 8px 10px -6px hsl(240 4% 10% / 0.1)',
  '2xl': '0 25px 50px -12px hsl(240 4% 10% / 0.25)',

  inner: 'inset 0 2px 4px 0 hsl(0 0% 0% / 0.05)',
  none: 'none',
} as const;

export const focusRings = {
  default: '0 0 0 2px hsl(81 95% 61% / 0.45)' /* #D4FB3C / signal */,
  error: '0 0 0 2px hsl(0 60% 55% / 0.5)' /* danger */,
  success: '0 0 0 2px hsl(147 50% 36% / 0.5)' /* success */,
} as const;
