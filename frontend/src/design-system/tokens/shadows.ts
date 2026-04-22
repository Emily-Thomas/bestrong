/**
 * Milo Design System - Shadow Tokens
 * 
 * Elevation system with subtle warm tints
 */

export const shadows = {
  // Warm shadows with subtle amber tint (Milo's companion warmth)
  xs: '0 1px 2px 0px hsl(38 50% 10% / 0.05)',
  sm: '0 1px 3px 0px hsl(38 50% 10% / 0.1), 0 1px 2px -1px hsl(38 50% 10% / 0.1)',
  base: '0 1px 3px 0px hsl(38 50% 10% / 0.1), 0 1px 2px -1px hsl(38 50% 10% / 0.1)',
  md: '0 4px 6px -1px hsl(38 50% 10% / 0.1), 0 2px 4px -2px hsl(38 50% 10% / 0.1)',
  lg: '0 10px 15px -3px hsl(38 50% 10% / 0.1), 0 4px 6px -4px hsl(38 50% 10% / 0.1)',
  xl: '0 20px 25px -5px hsl(38 50% 10% / 0.1), 0 8px 10px -6px hsl(38 50% 10% / 0.1)',
  '2xl': '0 25px 50px -12px hsl(38 50% 10% / 0.25)',
  
  // Special shadows
  inner: 'inset 0 2px 4px 0 hsl(0 0% 0% / 0.05)',
  none: 'none',
} as const;

// Focus rings
export const focusRings = {
  default: '0 0 0 2px hsl(220 85% 55% / 0.5)',
  error: '0 0 0 2px hsl(352 124% 41% / 0.5)',
  success: '0 0 0 2px hsl(142 76% 45% / 0.5)',
} as const;
