/**
 * Milo Design System - Design Tokens
 * 
 * Central export for all design tokens
 */

export { colors, chartColors } from './colors';
export { typography, typographyPresets } from './typography';
export { spacing, spacingPatterns } from './spacing';
export { shadows, focusRings } from './shadows';
export { radii, contextualRadii } from './radii';

// Utility type for extracting token values
export type ColorToken = keyof typeof import('./colors').colors;
export type SpacingToken = keyof typeof import('./spacing').spacing;
export type ShadowToken = keyof typeof import('./shadows').shadows;
export type RadiusToken = keyof typeof import('./radii').radii;
