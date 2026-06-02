---
name: Scout
description: Your AI Training Companion — coach-facing product UI
colors:
  signal: "#D4FB3C"
  signal-emphasis: "#BFE836"
  collar: "#E07856"
  bone-soft: "#FFFFFF"
  bone: "#F8F8F5"
  bone-deep: "#EEEEE8"
  fog-1: "#E5E5E1"
  fog-2: "#CFCFCA"
  fog-3: "#9A9A95"
  ink-mute: "#6E6E75"
  ink-soft: "#2E2E33"
  ink: "#141416"
  success: "#2E8B57"
  info: "#3B6EA8"
  danger: "#D64545"
  warning: "#B8860B"
typography:
  display:
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.375
    letterSpacing: "0em"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "0em"
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
rounded:
  sm: "6px"
  md: "10px"
  lg: "12px"
  xl: "16px"
spacing:
  xs: "8px"
  sm: "16px"
  md: "24px"
  lg: "32px"
  xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.signal-emphasis}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "{colors.bone-deep}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-destructive:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.bone-soft}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  input-default:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
    height: "36px"
  card-default:
    backgroundColor: "{colors.bone-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "24px"
---

# Design System: Scout

## Overview

**Creative North Star: "The Floor Coach"**

Scout's interface should feel like a capable colleague on the gym floor: energetic enough to keep momentum, direct enough to respect a coach's time, warm enough to feel human. The visual system is **restrained product UI** on an ink-and-bone base: dark ink surfaces, fog neutrals, chartreuse signal for primary action, terracotta collar for secondary warmth. Density is practical (tables, forms, client records), not marketing-sparse.

This system explicitly rejects generic B2B SaaS (navy-purple gradients, hero-metric dashboards, identical icon-card grids) and obvious AI UI grammar (gradient text, glass cards, uppercase eyebrows on every section). Familiarity matters: buttons, inputs, and navigation should match what coaches expect from serious tools (Linear, Notion, Stripe-class polish), with Scout's accent used sparingly so signal stays meaningful.

**Key Characteristics:**

- Restrained color: signal and collar on actions and state, not decoration
- Fixed rem type scale (Geist UI, Manrope for brand wordmark moments only)
- Ink-tinted elevation, flat at rest, shadow on cards and hovers
- shadcn/Radix component vocabulary with Scout token wiring
- WCAG 2.1 AA contrast; focus rings use signal
- State-rich controls: hover, focus, disabled, loading, error on every interactive pattern

## Colors

The palette reads as **ink, bone type, and two accents**: chartreuse for "go" and terracotta for human warmth. The app ships **dark-first**: ink background, ink-soft cards, bone foreground, 12% bone-mix borders.

### Primary

- **Floor Signal** (#D4FB3C): Primary CTAs, focus rings, current nav selection tint, chart series 1, progress emphasis. Always pair with ink text (#141416), never white on signal.
- **Pressed Signal** (color-mix 90% signal + 10% ink): Hover and pressed primary buttons without layout shift.

### Secondary

- **Collar Terracotta** (#E07856): Secondary accent, chart series 2, `accent` semantic for warm highlights. Ink text on solid collar for controls.

### Tertiary

- Omitted. Semantic colors (success, info, danger, warning) cover feedback; do not invent a third decorative accent.

### Neutral

- **Ink** (#141416): App background, sidebar base (dark-first default).
- **Ink Soft** (#2E2E33): Card and popover surfaces, secondary fills, nav hover.
- **Bone** (#F8F8F5): Primary text on dark surfaces.
- **Bone Soft / Bone Deep** (#FFFFFF / #EEEEE8): Light-mode legacy surfaces; destructive button text on dark.
- **Fog 1–3** (#E5E5E1 → #9A9A95): Borders (light legacy), muted text (#9A9A95 on dark), chart muted series.
- **Ink Mute** (#6E6E75): Secondary text on light surfaces; on dark use fog-3 for muted foreground.

### Semantic

- **Success** (#2E8B57), **Info** (#3B6EA8), **Danger** (#D64545), **Warning** (#B8860B): Alerts, badges, destructive actions, reversible caution. Pair with text or icons; never color alone.

### Named Rules

**The Signal Rarity Rule.** Chartreuse signal appears on primary actions, focus, and current selection only. If more than ~10% of a screen reads as signal, the accent has lost meaning.

**The Ink-on-Signal Rule.** Primary buttons and sidebar primary use ink foreground on signal background. White on chartreuse fails contrast and reads as generic SaaS.

## Typography

**Display Font:** Manrope (brand wordmark, rare hero moments)
**Body Font:** Geist (UI, headings, body, labels)
**Label/Mono Font:** Geist Mono (metrics, sets/reps, tabular data)

**Character:** Geometric warmth in the brand mark; neutral, readable UI type everywhere else. No display font in buttons, table cells, or form labels.

### Hierarchy

- **Display** (700, 30–48px fixed rem, line-height 1–1.1): "Scout" wordmark, occasional marketing. Use `font-display` / Manrope only here.
- **Headline** (600, 30px / 1.875rem, line-height 1.3): Page titles in AppShell (`h1` scale).
- **Title** (600, 20px / 1.25rem, line-height 1.375): Card titles, section headers.
- **Body** (400, 16px / 1rem, line-height 1.5): Default UI copy; cap prose at 65–75ch where readable.
- **Label** (500, 14px / 0.875rem): Buttons, nav items, form labels, table headers.
- **Mono** (400, 14px): Workout metrics, counts, IDs.

### Named Rules

**The Sans Default Rule.** Headings in app screens use Geist, not Manrope. Manrope is for brand presence, not interface hierarchy.

**The Fixed Scale Rule.** Product UI uses fixed rem steps from the token file, not fluid clamp headings. Coaches view at consistent DPI; sidebars and dense tables need predictable sizes.

## Elevation

Surfaces are **flat by default** on ink. Depth comes from subtle **ink-tinted shadows** and tonal steps (ink → ink-soft), not heavy drop shadows or glass blur.

Cards use `shadow-sm` at rest; hover on primary buttons may use `shadow` without scaling layout. Modals and sheets step up to `shadow-lg` / `shadow-xl`. Borders use low-contrast bone mix (12%), not inverted cream.

### Shadow Vocabulary

- **2xs / xs** (`--shadow-2xs`, `--shadow-xs`): Minimal lift for chips or tight UI.
- **sm / base** (`--shadow-sm`, `--shadow`): Cards, default buttons.
- **md–xl** (`--shadow-md` through `--shadow-xl`): Dropdowns, popovers, dialogs.
- **2xl** (`--shadow-2xl`): Rare maximum elevation.

### Named Rules

**The Flat-Until-State Rule.** Do not add shadow to static list rows or plain sections. Shadow signals interactivity (card, button, overlay), not structure.

**The No-Glass Rule.** Backdrop blur and glassmorphism are forbidden unless a one-off experiment is explicitly approved. Depth is ink shadow and surface steps only.

## Components

Product chrome built on shadcn/ui + Radix. Default radius **10px** (`--radius: 0.625rem`); cards use **12px** (`rounded-xl`).

### Buttons

- **Shape:** Medium rounding (10px), height 36px default (`h-9`), 14px label (`text-sm font-medium`).
- **Primary:** Signal background, ink text, light shadow; hover `bg-primary/90` (maps to signal emphasis mix).
- **Secondary:** Bone-deep fill, ink text, shadow-sm.
- **Outline / Ghost:** Border or transparent; hover toward accent/collar tint sparingly.
- **Destructive:** Danger fill, bone-soft text.
- **Focus:** `ring-1 ring-ring` (signal); never remove focus styles.

### Chips

- Use muted/bone-deep backgrounds with ink or ink-mute text; selected state may use signal tint at low opacity (e.g. 14–20%), not full signal fill for filters unless primary action.

### Cards / Containers

- **Corner Style:** 12px (`rounded-xl`).
- **Background:** Ink-soft (`bg-card`) on ink page.
- **Shadow Strategy:** `shadow-sm` at rest; avoid nested cards.
- **Border:** 1px fog-1 (`border`).
- **Internal Padding:** 24px horizontal (`px-6`), 24px vertical block (`py-6`).

### Inputs / Fields

- **Style:** 36px height, 10px radius, fog-1 border, transparent background, 14px text on md+.
- **Focus:** 1px signal ring (`ring-ring`).
- **Placeholder:** Muted foreground (ink-mute); verify contrast on bone.
- **Error / Disabled:** Destructive ring or opacity-50; pair with message text.

### Navigation

- **App shell:** Sidebar on ink; nav links `rounded-xl`, 14px medium. Active: signal tint background (~20%), semibold text, **left signal bar** (4px × 28px) as wayfinding (not a card side-stripe).
- **Focus:** 2px signal ring with offset.
- **Mobile:** Sheet drawer with same nav list; Scout wordmark uses display font.

### Alerts / Feedback

- Variants: default, destructive, success, info, warning, signal — use semantic tokens, not ad-hoc reds/greens.

### Signature: Scout mark

- Logo asset `scout-logo-gold.png`; wordmark "Scout" in Manrope. Minimum 32×32 for mark.

## Do's and Don'ts

### Do:

- **Do** use `bg-primary` / `text-primary-foreground` for primary CTAs (signal + ink).
- **Do** use Geist for all in-app headings, labels, and body; Manrope only for "Scout" brand moments.
- **Do** use `font-mono` for workout numbers, metrics, and tabular data.
- **Do** keep empty states encouraging with a clear verb+object CTA ("Add client", "Build program").
- **Do** show job progress with steps for async AI work; allow navigation away.
- **Do** use design-system shadows (`shadow-sm` through `shadow-lg`) with ink tint, not pure black gray.
- **Do** meet WCAG 2.1 AA for body text and focus visibility on signal ring.

### Don't:

- **Don't** use generic B2B SaaS patterns: navy-and-purple gradients, hero-metric dashboards, identical icon-card grids, sterile "No data" copy, buzzwords (streamline, empower, seamless).
- **Don't** use obvious AI UI: gradient text, glassmorphism-by-default, uppercase eyebrow kickers on every section, numbered section scaffolding without real sequence.
- **Don't** use `border-left` or `border-right` greater than 1px as colored accents on cards, list items, or alerts (nav wayfinding bar excepted).
- **Don't** put Manrope on buttons, table cells, or form labels.
- **Don't** fill large background areas with signal or collar; accents stay on actions and state.
- **Don't** use white text on signal or unpaired color for state (always text + icon).
- **Don't** nest cards or default to card grids when a simple list or table is clearer.
