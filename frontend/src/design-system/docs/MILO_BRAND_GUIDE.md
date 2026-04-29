# Milo Brand Guide

**Version:** 1.0  
**Last Updated:** April 22, 2026

---

## Brand Identity

### Name & Tagline

**Milo** - Your AI Training Companion

The name "Milo" evokes the loyal gym dog—always at your side, supportive but never in your way. This embodies our product philosophy: intelligent assistance that empowers coaches without taking over.

### Brand Story

Just like a great gym dog, Milo:
- **Shows up every day** - Reliable, consistent, always there
- **Reads the room** - Adapts to your coaching style (trainer personas)
- **Supports without demanding attention** - Powerful when needed, invisible when not
- **Makes the work easier** - Carries the load (programming) so you can focus on coaching
- **Grows with you** - Learns patterns, gets better over time

---

## Brand Positioning

**Tagline:** "Smart programming for coaches who care"

**Target Audience:** Personal trainers, strength coaches, gym owners managing 10-100+ clients

**Value Proposition:** Build personalized training plans 10x faster without losing your coaching touch

**Brand Personality:**
- **Loyal & Reliable** - Always at your side, dependable results
- **Intelligent but Humble** - Smart assistance without ego
- **Energetic & Positive** - Makes work feel lighter, not heavier
- **Intuitive** - Anticipates needs, low friction
- **Professional Companion** - Serious tool, friendly presence

**We are NOT:**
- Cute or overly playful (still B2B software)
- Aggressive or pushy (gym dog, not guard dog)
- Passive or limited (capable and powerful when needed)

---

## Visual Identity

### Logo

**Primary Logo:** Goldendoodle silhouette in sitting position (alert, friendly)
- **Inspiration:** Cream-colored goldendoodle (the real Milo!)
- **Style:** Modern, geometric line art with "MILO" wordmark
- **Format:** PNG (high-quality rasterized)

**Primary assets (SVG, in `frontend/public/`):**
- **`milo-mark.svg`** — logomark (round mark + signal collar) for compact UI, favicon-style use, and icon-scale touchpoints
- **`milo-wordmark.svg`** — mark + “milo” wordmark; use in app shell, headers, and marketing

The wordmark references **General Sans** in the SVG; the app loads it via Fontshare in `app/layout.tsx` (embedded SVG text may still use a system fallback when the file is used as an `<img>`).

**Logo usage guidelines:**
- Minimum size: 32x32px
- Clear space: 8px around logo
- Works on light or dark backgrounds
- Never distort or change aspect ratio
- Alt text: "Milo" or "Milo logo" or "Milo mascot"
- Use Next.js `Image` for optimization

**Alternative Concepts Available:**
1. Full goldendoodle illustration with wordmark
2. "M" monogram with subtle ear details
3. Circular badge with goldendoodle head
4. Original husky-style concept (archived)

### Color Palette

**Core (named roles)**  
- **bone** `#F8F8F5` — default app surface, paper feel  
- **ink** `#141416` — primary type and high emphasis  
- **signal** `#D4FB3C` — primary action, focus, `primary` in the UI system  
- **fog** `#6E6E75` — secondary / muted copy (see **ink-mute**; same value)  
- **collar** `#E07856` — brand warmth, secondary CTAs, `accent` in the UI system  

**Neutrals & tints (surfaces + borders + type steps)**  
- `bone-soft` `#FFFFFF` · `bone` `#F8F8F5` · `bone-deep` `#EEEEE8`  
- `fog-1` `#E5E5E1` · `fog-2` `#CFCFCA` · `fog-3` `#9A9A95`  
- `ink-mute` `#6E6E75` (alias: fog) · `ink-soft` `#2E2E33` · `ink` `#141416`  

**Semantic**  
- **Signal** (primary CTA) · **Success** `#2E8B57` (streak, goal met) · **Info** `#3B6EA8` (notes, hints) · **Danger** `#D64545` (errors, destructive) · **Warning** `#B8860B` (caution, reversible)  

**Implementation** — all hex live as `--milo-*` in `globals.css`; shadcn tokens (`--primary` = signal, `--accent` = collar, etc.) and Tailwind `milo-*` colors are wired in `@theme inline`.

### Typography

**Font Families:**

1. **Manrope** (Display/Brand)
   - Usage: Hero headings, marketing copy, brand moments
   - Characteristics: Geometric but warm, friendly yet professional
   - Variable: `--font-display`

2. **Geist** (UI/Interface)
   - Usage: Body text, UI components, navigation
   - Characteristics: Highly readable, modern, clean
   - Variable: `--font-sans`

3. **Geist Mono** (Code/Data)
   - Usage: Numbers, metrics, code blocks
   - Characteristics: Tabular, technical
   - Variable: `--font-mono`

**Type Scale:**
- Display: 48px-72px (Hero sections)
- H1: 36px (Page titles)
- H2: 30px (Section headers)
- H3: 24px (Subsections)
- Body Large: 18px (Marketing copy)
- Body: 16px (Standard UI)
- Body Small: 14px (Secondary info)
- Caption: 12px (Labels, metadata)

**Font Weights:**
- Normal: 400 (Body text)
- Medium: 500 (Emphasis)
- Semibold: 600 (Headings, buttons)
- Bold: 700 (Display, strong emphasis)

### Spacing & Layout

**Base Unit:** 4px (0.25rem)

**Common Spacing:**
- Tight: 8px (component gaps)
- Base: 16px (standard padding)
- Relaxed: 24px (section spacing)
- Loose: 48px (page sections)

**Border Radius:**
- Small: 6px (buttons, inputs)
- Base: 8px (cards, smaller components)
- Medium: 10px (standard - current --radius)
- Large: 12px (large cards)
- XL: 16px (modals, hero sections)

### Shadows

**Neutral, ink-tinted** elevation (aligned with the bone/ink system — no default amber):
- 2xs–XL: see `--shadow-*` in `globals.css`
- Use smaller shadows for inputs and list rows, larger for modals and focus moments

**Focus rings:** `signal` at ~45% opacity on focus (`outline` / `ring`); `destructive` and `success` have dedicated focus ring tokens in `design-system/tokens/shadows.ts` where needed

### Iconography

**Icon Library:** Lucide React (line-based, consistent)

**Icon Sizes:**
- Small: 16px (inline with text)
- Base: 20px (buttons, navigation)
- Large: 24px (section headers)
- XL: 32px+ (feature showcases)

**Icon Style:**
- Line-based, consistent stroke width
- Matches overall visual language (geometric, clean)
- **Signal** or **collar** for brand-forward icons; **muted-foreground** for utility

---

## Voice & Tone

### Brand Voice

**Characteristics:**
- **Supportive** - We're here to help, not judge
- **Capable** - We know what we're doing
- **Clear** - No jargon, no confusion
- **Warm** - Professional but approachable

### Tone Guidelines

**Do:**
- Use "you" to address coaches directly
- Keep sentences short and actionable
- Acknowledge the hard work coaches do
- Celebrate wins (program created, client progress)
- Offer help proactively

**Don't:**
- Use corporate jargon or buzzwords
- Be overly technical without explanation
- Make assumptions about coaching style
- Be cutesy or use excessive emojis
- Oversell or exaggerate capabilities

### Example Microcopy

| Context | Milo Voice |
|---------|------------|
| Welcome | "Hey! Milo here. Let's get you set up." |
| Empty state | "Ready to build your first program?" |
| Loading | "Milo's working on it..." |
| Success | "Got it! Your program is ready." |
| Error | "Something went wrong—let's try that again" |
| Helper tip | "Pro tip: You can duplicate this week to save time" |
| Onboarding | "We'll walk through this together" |

### Key Messages

- "Your loyal programming companion"
- "Always ready to help, never in your way"
- "Smart assistance for coaches who care"
- "Built by coaches, for coaches, with AI at your side"
- "Scale your impact without losing your touch"

---

## UI Patterns

### Component Personality

**Friendly Professional Aesthetic:**
- Slightly warmer shadows (amber tint vs pure gray)
- Smooth, snappy transitions (responsive feel)
- Success states feel rewarding
- Empty states are encouraging, not sterile
- Errors are reassuring ("we'll figure this out")

### Special Milo Patterns

**Helper Cards**
Contextual tips/suggestions with Milo's voice
- Light companion gold background
- Optional small Milo icon
- Dismissible but helpful

**Progress Celebrations**
Acknowledge coach achievements
- Program created, milestone reached
- Subtle animation or toast
- Positive reinforcement

**Smart Defaults**
Milo anticipating needs based on patterns
- Pre-filled common values
- Suggested exercises
- Pattern recognition ("You usually...")

**Gentle Nudges**
Reminders that feel helpful, not nagging
- Warm tone, never demanding
- Easy to dismiss or snooze
- Context-aware timing

---

## Implementation

### CSS Variables

All design tokens are available as CSS variables in `globals.css`:

```css
/* Canonical Milo (examples — see full list in app/globals.css) */
--milo-bone: #F8F8F5;
--milo-ink: #141416;
--milo-signal: #D4FB3C;
--milo-collar: #E07856;

/* shadcn bridge */
--primary: var(--milo-signal);
--accent: var(--milo-collar);
--brand-primary: var(--milo-signal);
--brand-companion: var(--milo-collar);
--brand-accent: var(--milo-collar);

/* Typography */
--font-display: var(--font-manrope);
--font-sans: var(--font-geist-sans);
--font-mono: var(--font-geist-mono);

/* Shadows */
--shadow-sm, --shadow, --shadow-md, --shadow-lg, etc.
```

### TypeScript Tokens

Design tokens are also available as TypeScript constants:

```typescript
import { colors, typography, spacing } from '@/design-system/tokens';
```

### Using the Design System

**In Components:**
```tsx
// shadcn tokens: primary = signal, accent = collar
<div className="text-primary-foreground bg-primary">CTA</div>
<div className="text-milo-ink bg-milo-bone">Surface</div>

// Use display font for brand moments
<h1 style={{ fontFamily: 'var(--font-display)' }}>
  Milo
</h1>

// Use warm shadows
<Card className="shadow-lg">
  Content
</Card>
```

**In Custom CSS:**
```css
.my-component {
  color: var(--milo-signal);
  font-family: var(--font-display);
  box-shadow: var(--shadow-md);
}
```

---

## File Structure

```
frontend/src/design-system/
├── tokens/
│   ├── colors.ts          # Color palette
│   ├── typography.ts      # Font tokens
│   ├── spacing.ts         # Spacing scale
│   ├── shadows.ts         # Shadow system
│   ├── radii.ts           # Border radius
│   └── index.ts           # Exports all tokens
├── docs/
│   └── MILO_BRAND_GUIDE.md  # This file
└── (future)
    ├── patterns/          # Composed patterns
    └── foundations/       # Breakpoints, motion, z-index
```

---

## Resources

**Logo Files:**
- `/frontend/public/milo-logo-gold.png` - Primary brand logo (use app-wide)
- `/frontend/public/milo-logo-blue.png` - Optional alternate (not default)
- Concept images in `/.cursor/projects/.../assets/`

**Design Tokens:**
- `/frontend/src/design-system/tokens/` - TypeScript token files
- `/frontend/app/globals.css` - CSS variable definitions

**Component Library:**
- `/frontend/src/components/ui/` - Base components (Radix + Tailwind)

---

## Questions?

When in doubt:
1. Is it supportive and helpful (like a gym dog)?
2. Is it professional enough for B2B?
3. Does it make the coach's life easier?

If yes to all three, you're thinking like Milo.
