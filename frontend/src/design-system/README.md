# Milo Design System

Welcome to the Milo Design System—a comprehensive set of design tokens, components, and guidelines for building the Milo AI Training Companion.

## Overview

The Milo Design System embodies our brand philosophy: **intelligent assistance that empowers coaches without taking over**. Just like a loyal gym dog, our design is supportive, reliable, and never in the way.

## Quick Start

### Using Design Tokens

```typescript
// Import tokens in TypeScript
import { colors, typography, spacing, shadows } from '@/design-system/tokens';

// Access specific tokens
const action = colors.core.signal
const bodyBg = colors.neutral.bone
const displayFont = typography.fontFamily.display
```

### Using CSS Variables

```tsx
// In React components
<h1 style={{ fontFamily: 'var(--font-display)' }}>Milo</h1>

// shadcn + explicit Milo palette in Tailwind
<div className="text-primary-foreground bg-primary shadow-lg">Primary CTA</div>
<div className="bg-milo-bone text-milo-ink">Paper surface</div>
```

## Structure

```
design-system/
├── tokens/              # Design tokens (colors, typography, spacing, etc.)
│   ├── colors.ts
│   ├── typography.ts
│   ├── spacing.ts
│   ├── shadows.ts
│   ├── radii.ts
│   └── index.ts
├── docs/               # Documentation and guidelines
│   └── MILO_BRAND_GUIDE.md
└── README.md          # This file
```

## Key Design Principles

### 1. Loyal & Reliable
Design choices should feel dependable and consistent. Users should trust that Milo will work the same way every time.

### 2. Intelligent but Humble
Smart features should feel helpful, not showy. The AI assists but doesn't take center stage.

### 3. Professional but Approachable
We're a B2B tool with a friendly personality. Professional enough for serious coaches, approachable enough to use daily.

### 4. Supportive, Not Intrusive
UI elements should help without getting in the way. Like a gym dog that knows when to approach and when to hang back.

## Brand colors

- **core** — `bone`, `ink`, `signal` (primary action), `fog`, `collar` (accent warmth)  
- **neutral** — bone tints, fog-1/2/3, ink / ink-mute / ink-soft  
- **semantic** — `signal`, `success`, `info`, `danger`, `warning`

```typescript
import { colors, chartColors } from '@/design-system/tokens';

colors.core.signal   // #D4FB3C — maps to `primary`, `--milo-signal`
colors.core.collar   // #E07856 — maps to `accent`, `--milo-collar`
colors.neutral.ink
chartColors[1]       // chart series aligned to globals.css --chart-1..5
```

UI mapping: `primary` / `bg-primary` = **signal** (ink foreground); `accent` = **collar**. Raw palette: `bg-milo-bone`, `text-milo-ink-mute`, etc.

## Typography

### Font Families

- **Manrope** (`--font-display`) - Display/Brand
  - Hero headings, marketing copy, brand moments
  
- **Geist** (`--font-sans`) - UI/Interface
  - Body text, UI components, navigation
  
- **Geist Mono** (`--font-mono`) - Code/Data
  - Numbers, metrics, code blocks

### Usage Example

```tsx
// Display font for brand moments
<h1 className="text-4xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
  Welcome to Milo
</h1>

// UI font for interface
<p className="text-base">Regular interface text</p>

// Mono font for metrics
<span className="font-mono">123.45</span>
```

## Spacing

Based on 4px (0.25rem) scale:

```typescript
spacing[4]  // 1rem (16px)
spacing[8]  // 2rem (32px)
spacing[12] // 3rem (48px)
```

Common patterns:
- Component gaps: 8-16px
- Section padding: 24-48px
- Page margins: 32-64px

## Shadows

Neutral, ink-tinted elevation (`--ink-shadow` in `globals.css`):

```css
shadow-sm
shadow
shadow-md
shadow-lg
shadow-xl
```

## Components

All UI components live in `/src/components/ui/` and are built on:
- **Radix UI** - Accessible primitives
- **Tailwind CSS** - Utility-first styling
- **class-variance-authority** - Component variants

Components automatically use design tokens from the system.

`Alert` supports `variant="default" | "destructive" | "success" | "info" | "warning" | "signal"` (aligned to Milo semantic colors; `signal` = in-progress / primary callout).

## Voice & Tone

### Do:
- Use "you" to address coaches directly
- Keep sentences short and actionable
- Celebrate wins
- Offer help proactively

### Don't:
- Use jargon or buzzwords
- Be overly technical
- Be cutesy or use excessive emojis
- Oversell capabilities

### Example Microcopy

```typescript
// Good
"Ready to build your first program?"
"Milo's working on it..."
"Got it! Your program is ready."

// Avoid
"No programs found." (too sterile)
"Processing your request..." (too corporate)
"Success!" (too generic)
```

## Documentation

For complete brand guidelines, see:
- **[Milo Brand Guide](./docs/MILO_BRAND_GUIDE.md)** - Comprehensive brand identity, visual system, and usage guidelines

## Contributing

When adding new design tokens or patterns:

1. Add to appropriate token file in `/tokens/`
2. Update CSS variables in `/app/globals.css` if needed
3. Document usage in this README or brand guide
4. Ensure accessibility standards (WCAG 2.1 AA)
5. Test in both light and dark modes

## Questions?

When in doubt, ask:
1. Is it supportive and helpful (like a gym dog)?
2. Is it professional enough for B2B?
3. Does it make the coach's life easier?

If yes to all three, you're thinking like Milo!
