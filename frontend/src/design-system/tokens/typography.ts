/**
 * Milo Design System - Typography Tokens
 * 
 * Font families, sizes, weights, and line heights
 */

export const typography = {
  // Font Families
  fontFamily: {
    display: 'var(--font-display)', // Manrope - Brand/Marketing
    sans: 'var(--font-sans)', // Geist - UI/Interface
    mono: 'var(--font-mono)', // Geist Mono - Code/Numbers
  },

  // Font Sizes (Mobile-first scale)
  fontSize: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    base: '1rem', // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem', // 48px
    '6xl': '3.75rem', // 60px
    '7xl': '4.5rem', // 72px
  },

  // Font Weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  // Line Heights
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },

  // Letter Spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },
} as const;

// Typography Presets for common use cases
export const typographyPresets = {
  // Display styles (Marketing, Hero sections)
  display: {
    '2xl': {
      fontFamily: 'var(--font-display)',
      fontSize: '4.5rem',
      fontWeight: '700',
      lineHeight: '1',
      letterSpacing: '-0.025em',
    },
    xl: {
      fontFamily: 'var(--font-display)',
      fontSize: '3.75rem',
      fontWeight: '700',
      lineHeight: '1',
      letterSpacing: '-0.025em',
    },
    lg: {
      fontFamily: 'var(--font-display)',
      fontSize: '3rem',
      fontWeight: '700',
      lineHeight: '1.1',
      letterSpacing: '-0.025em',
    },
  },
  
  // Heading styles (UI Headings)
  heading: {
    h1: {
      fontFamily: 'var(--font-sans)',
      fontSize: '2.25rem',
      fontWeight: '600',
      lineHeight: '1.25',
      letterSpacing: '-0.025em',
    },
    h2: {
      fontFamily: 'var(--font-sans)',
      fontSize: '1.875rem',
      fontWeight: '600',
      lineHeight: '1.3',
      letterSpacing: '-0.025em',
    },
    h3: {
      fontFamily: 'var(--font-sans)',
      fontSize: '1.5rem',
      fontWeight: '600',
      lineHeight: '1.375',
      letterSpacing: '0em',
    },
    h4: {
      fontFamily: 'var(--font-sans)',
      fontSize: '1.25rem',
      fontWeight: '600',
      lineHeight: '1.375',
      letterSpacing: '0em',
    },
  },

  // Body text styles
  body: {
    lg: {
      fontFamily: 'var(--font-sans)',
      fontSize: '1.125rem',
      fontWeight: '400',
      lineHeight: '1.625',
      letterSpacing: '0em',
    },
    base: {
      fontFamily: 'var(--font-sans)',
      fontSize: '1rem',
      fontWeight: '400',
      lineHeight: '1.5',
      letterSpacing: '0em',
    },
    sm: {
      fontFamily: 'var(--font-sans)',
      fontSize: '0.875rem',
      fontWeight: '400',
      lineHeight: '1.5',
      letterSpacing: '0em',
    },
  },
} as const;
