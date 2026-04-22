/**
 * Milo Design System - Color Tokens
 * 
 * Color palette for the Milo AI Training Companion
 * Based on the "loyal companion" brand identity
 */

export const colors = {
  // Brand Colors - Primary (Trust, Intelligence, Professional)
  brand: {
    primary: {
      50: 'hsl(220 95% 97%)',
      100: 'hsl(220 92% 92%)',
      200: 'hsl(220 90% 85%)',
      300: 'hsl(220 88% 75%)',
      400: 'hsl(220 85% 65%)',
      500: 'hsl(220 85% 55%)', // Core brand blue
      600: 'hsl(220 84% 49%)', // Primary action color
      700: 'hsl(220 85% 42%)',
      800: 'hsl(220 87% 32%)',
      900: 'hsl(220 90% 25%)',
    },
    // Companion (Warmth, Loyalty, Approachability)
    companion: {
      50: 'hsl(38 95% 95%)',
      100: 'hsl(38 90% 88%)',
      200: 'hsl(38 88% 78%)',
      300: 'hsl(38 90% 68%)',
      400: 'hsl(38 92% 62%)',
      500: 'hsl(38 92% 50%)', // Warm gold
      600: 'hsl(35 95% 45%)',
      700: 'hsl(32 90% 38%)',
      800: 'hsl(30 88% 30%)',
      900: 'hsl(30 85% 25%)',
    },
    // Accent (Energy, Performance, Action)
    accent: {
      50: 'hsl(355 95% 97%)',
      100: 'hsl(355 92% 92%)',
      200: 'hsl(355 90% 82%)',
      300: 'hsl(355 88% 72%)',
      400: 'hsl(355 85% 62%)',
      500: 'hsl(355 90% 52%)', // Strength red
      600: 'hsl(355 92% 48%)',
      700: 'hsl(355 88% 42%)',
      800: 'hsl(355 85% 35%)',
      900: 'hsl(355 82% 28%)',
    },
  },

  // Semantic Colors
  semantic: {
    success: {
      50: 'hsl(142 80% 95%)',
      100: 'hsl(142 78% 88%)',
      500: 'hsl(142 76% 45%)', // Progress green
      600: 'hsl(142 76% 38%)',
      900: 'hsl(142 72% 25%)',
    },
    warning: {
      50: 'hsl(38 98% 95%)',
      100: 'hsl(38 96% 88%)',
      500: 'hsl(38 95% 55%)', // Caution amber (matches companion)
      600: 'hsl(38 95% 48%)',
      900: 'hsl(38 88% 32%)',
    },
    error: {
      50: 'hsl(352 95% 95%)',
      100: 'hsl(352 92% 88%)',
      500: 'hsl(352 124% 41%)', // Error red
      600: 'hsl(352 120% 35%)',
      900: 'hsl(352 100% 25%)',
    },
    info: {
      50: 'hsl(200 98% 95%)',
      100: 'hsl(200 95% 88%)',
      500: 'hsl(200 95% 55%)', // Information cyan
      600: 'hsl(200 92% 48%)',
      900: 'hsl(200 85% 32%)',
    },
  },

  // Neutral/Gray Scale
  neutral: {
    50: 'hsl(0 0% 98%)',
    100: 'hsl(0 0% 96%)',
    200: 'hsl(0 0% 92%)',
    300: 'hsl(0 0% 87%)',
    400: 'hsl(0 0% 78%)',
    500: 'hsl(0 0% 63%)',
    600: 'hsl(0 0% 45%)',
    700: 'hsl(0 0% 32%)',
    800: 'hsl(0 0% 20%)',
    900: 'hsl(0 0% 15%)',
    950: 'hsl(0 0% 9%)',
  },
} as const;

// Chart colors for data visualization
export const chartColors = {
  1: 'hsl(211.788 101.9718% 78.6759%)',
  2: 'hsl(217.4076 91.3672% 59.5787%)',
  3: 'hsl(221.4336 86.3731% 54.0624%)',
  4: 'hsl(223.6587 78.7180% 47.8635%)',
  5: 'hsl(226.5426 70.0108% 39.9224%)',
} as const;
