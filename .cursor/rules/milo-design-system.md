# Milo Design System - Agent Rules

**Purpose:** Guide AI agents (Claude, Cursor) on implementing consistent UI that matches Milo's brand identity.

---

## Quick Reference

### When Creating Any UI Component

1. **Read the brand guide first:** `/frontend/src/design-system/docs/MILO_BRAND_GUIDE.md`
2. **Use design tokens:** Import from `/frontend/src/design-system/tokens/`
3. **Apply Milo voice:** Supportive, clear, warm (not corporate)
4. **Use correct logo:** `milo-logo-gold.png` everywhere (nav, marketing, all UI)
5. **Apply display font:** Use Manrope for "Milo" brand name
6. **Warm shadows:** Always use amber-tinted shadows
7. **Check accessibility:** Focus states, contrast, keyboard nav

---

## Logo Implementation

### Logo File

```typescript
// All surfaces: navigation, headers, footers, marketing, in-app
<Image src="/milo-logo-gold.png" alt="Milo" width={40} height={40} />
```

Larger marketing blocks can use a bigger `width` / `height` with the same asset.

### Logo Rules

- **Single default:** `milo-logo-gold.png` (warm goldendoodle mark) everywhere
- **Minimum size:** 32x32px
- **Alt text:** "Milo" or "Milo logo" or "Milo mascot"
- **Never distort:** Maintain aspect ratio
- **Format:** PNG; use Next.js `Image` for optimization

---

## Color Application

### Design Tokens Usage

```typescript
// Import tokens
import { colors } from '@/design-system/tokens';

// Use in components
const primaryColor = colors.brand.primary[600]; // #3B5FE8
const companionColor = colors.brand.companion[500]; // #F5A623
```

### CSS Variables

```tsx
// Primary brand blue
<div className="text-primary bg-primary/10">

// Companion gold (use sparingly)
<div className="text-accent bg-accent/10">

// Custom styles
<div style={{ color: 'var(--brand-primary)' }}>
```

### Color Decision Tree

**For buttons:**
- Primary action → `bg-primary text-primary-foreground`
- Secondary action → `variant="outline"` or `variant="ghost"`
- Destructive action → `variant="destructive"` (accent red)

**For backgrounds:**
- Cards → `bg-card` (uses theme)
- Subtle highlights → `bg-accent/10` (gold tint)
- Strong emphasis → `bg-primary/10` (blue tint)

**For text:**
- Primary text → `text-foreground` (default)
- Muted text → `text-muted-foreground`
- Links/interactive → `text-primary`
- Success → `text-green-600` or semantic success color
- Error → `text-destructive`

---

## Typography Rules

### Font Family Application

```tsx
// Brand name "Milo" - ALWAYS use display font
<h1 style={{ fontFamily: 'var(--font-display)' }}>Milo</h1>

// Hero headings - display font
<h1 className="text-5xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
  Smart programming for coaches
</h1>

// UI text - default sans (Geist)
<p className="text-base">Regular interface text</p>

// Metrics and data - mono font
<span className="font-mono text-2xl">123</span>
```

### Typography Patterns

**Page Titles:**
```tsx
<h1 className="text-3xl font-semibold tracking-tight">
  {title}
</h1>
```

**Section Headers:**
```tsx
<h2 className="text-2xl font-semibold mb-4">
  {section}
</h2>
```

**Marketing Headlines:**
```tsx
<h1 
  className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight"
  style={{ fontFamily: 'var(--font-display)' }}
>
  {headline}
</h1>
```

---

## Shadow System

### Correct Shadow Usage

```tsx
// Small elements (inputs, small cards)
<Input className="shadow-sm" />

// Standard cards
<Card className="shadow-md">

// Elevated content (modals, important cards)
<Card className="shadow-lg">

// Hero sections, major CTAs
<div className="shadow-xl">
```

### Why Warm Shadows?

- Milo's brand uses warm, amber-tinted shadows
- Represents the companion gold color
- Makes UI feel friendly, not cold
- Defined in globals.css with `hsl(38 50% 10% / 0.1)`

**Never use:**
- `shadow-gray-500`
- `shadow-black`
- Pure black/gray shadows

---

## Voice & Microcopy

### Empty States

**Bad:**
```tsx
<p>No programs found</p>
```

**Good (Milo voice):**
```tsx
<div className="text-center py-12">
  <p className="text-lg text-muted-foreground mb-4">
    Ready to build your first program?
  </p>
  <Button>Get Started</Button>
</div>
```

### Loading States

**Bad:**
```tsx
<Spinner />
```

**Good (Milo voice):**
```tsx
<div className="flex items-center gap-2">
  <Spinner />
  <span>Milo's working on it...</span>
</div>
```

### Error Messages

**Bad:**
```tsx
<Alert variant="destructive">
  Error: Request failed
</Alert>
```

**Good (Milo voice):**
```tsx
<Alert variant="destructive">
  <AlertDescription>
    Something went wrong—let's try that again
  </AlertDescription>
</Alert>
```

### Success Messages

**Bad:**
```tsx
<Alert>Success!</Alert>
```

**Good (Milo voice):**
```tsx
<Alert>
  <AlertDescription>
    Got it! Your program is ready.
  </AlertDescription>
</Alert>
```

### Button Labels

**Bad:** Generic, corporate
- "Submit"
- "Proceed"
- "Continue"
- "OK"

**Good:** Action-oriented, clear
- "Create Program"
- "Save Changes"
- "Let's Go"
- "Get Started"
- "Build Workouts"

---

## Component Patterns

### Cards

```tsx
// Standard card
<Card className="shadow-md">
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
</Card>

// Accent card (warm highlight)
<Card className="bg-accent/5 border-accent/20">
  <CardContent className="pt-6">
    <p className="text-sm font-medium mb-2">Heading</p>
    <p className="text-xs text-muted-foreground">Description</p>
  </CardContent>
</Card>

// Hover effect
<Card className="shadow-md hover:shadow-lg transition-shadow">
```

### Buttons

```tsx
// Primary action
<Button>Create Program</Button>

// Secondary action
<Button variant="outline">Cancel</Button>

// Destructive action
<Button variant="destructive">Delete</Button>

// Loading state
<Button disabled>
  <Spinner className="mr-2" />
  Creating...
</Button>
```

### Form Fields

```tsx
<div className="grid gap-2">
  <Label htmlFor="field">Field Label</Label>
  <Input
    id="field"
    placeholder="Helpful placeholder"
    className="shadow-sm"
  />
  <p className="text-xs text-muted-foreground">
    Optional helpful description
  </p>
</div>
```

### Empty States Pattern

```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  {/* Optional: Icon or illustration */}
  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
    <Icon className="h-8 w-8 text-primary" />
  </div>
  
  <h3 className="text-lg font-semibold mb-2">
    No {items} yet
  </h3>
  
  <p className="text-muted-foreground mb-6 max-w-md">
    Ready to create your first {item}?
  </p>
  
  <Button>
    Create {Item}
  </Button>
</div>
```

---

## Responsive Design

### Breakpoints

- **Mobile first:** Start with mobile layout
- **sm:** 640px (tablet)
- **md:** 768px (small desktop)
- **lg:** 1024px (desktop)
- **xl:** 1280px (large desktop)

### Responsive Patterns

```tsx
// Responsive text size
<h1 className="text-3xl sm:text-4xl lg:text-5xl">

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

// Responsive padding
<div className="px-4 sm:px-6 lg:px-8">

// Show/hide on mobile
<div className="hidden lg:flex"> {/* Desktop only */}
<div className="lg:hidden"> {/* Mobile only */}
```

---

## Accessibility Checklist

When creating any UI component:

- [ ] **Focus states:** All interactive elements have visible focus rings
- [ ] **Keyboard navigation:** Can be operated without mouse
- [ ] **Color contrast:** Text meets WCAG 2.1 AA (4.5:1 for normal text)
- [ ] **Alt text:** All images have descriptive alt attributes
- [ ] **Labels:** Form inputs have associated labels
- [ ] **ARIA:** Use ARIA attributes for complex components
- [ ] **Semantic HTML:** Use proper HTML elements (button, nav, main, etc.)

### Focus Ring Example

```tsx
// Correct - uses brand primary with opacity
<button className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">

// Radix components handle this automatically
<Button> {/* Already has proper focus states */}
```

---

## Common Mistakes to Avoid

### ❌ Don't Do This

```tsx
// Wrong: Raw img without Next Image / wrong path
<img src="/milo-logo.png" />

// Wrong: Hardcoded "BeStrong"
<h1>BeStrong</h1>

// Wrong: Generic sans for brand name
<span className="font-sans">Milo</span>

// Wrong: Cold gray shadow
<Card className="shadow-gray-500">

// Wrong: Corporate jargon
<p>Your request has been processed successfully.</p>

// Wrong: Sterile empty state
<p>No data available</p>

// Wrong: Generic button label
<Button>Submit</Button>

// Wrong: Using companion gold everywhere
<div className="bg-accent text-accent-foreground"> {/* Too much gold */}
```

### ✅ Do This Instead

```tsx
// Correct: Gold brand logo
<Image src="/milo-logo-gold.png" alt="Milo" width={40} height={40} />

// Correct: Milo branding
<h1 style={{ fontFamily: 'var(--font-display)' }}>Milo</h1>

// Correct: Display font for brand
<span style={{ fontFamily: 'var(--font-display)' }}>Milo</span>

// Correct: Warm shadow
<Card className="shadow-md">

// Correct: Milo voice
<p>Got it! Your program is ready.</p>

// Correct: Encouraging empty state
<p>Ready to build your first program?</p>

// Correct: Action-oriented label
<Button>Create Program</Button>

// Correct: Gold as subtle accent only
<div className="bg-accent/10 border-accent/20"> {/* Subtle gold hint */}
```

---

## Integration with Existing UI

### Updating Existing Components

When modifying existing UI to match Milo brand:

1. **Replace logo references:**
   - Use `milo-logo-gold.png` for the brand mark everywhere
   
2. **Apply display font to brand name:**
   - Add `style={{ fontFamily: 'var(--font-display)' }}` to "Milo"
   
3. **Update copy to Milo voice:**
   - Remove corporate speak
   - Make it supportive and clear
   
4. **Check shadows:**
   - Ensure using Tailwind shadow classes (warm)
   
5. **Verify color usage:**
   - Use design tokens or CSS variables
   - Gold should be accent only (not dominant)

---

## Testing Checklist

Before considering UI complete:

### Visual
- [ ] Logo is `milo-logo-gold.png` app-wide
- [ ] "Milo" uses display font (Manrope)
- [ ] Shadows look warm (not cold gray)
- [ ] Colors match brand palette
- [ ] Spacing feels consistent

### Content
- [ ] Copy uses Milo voice (supportive, clear, warm)
- [ ] No corporate jargon or generic phrases
- [ ] Empty states are encouraging
- [ ] Error messages are friendly
- [ ] Button labels are action-oriented

### Functionality
- [ ] Keyboard navigation works
- [ ] Focus states are visible
- [ ] Hover states feel responsive
- [ ] Loading states are informative
- [ ] Mobile responsive

### Code Quality
- [ ] Uses design tokens (not hardcoded values)
- [ ] No "BeStrong" references remain
- [ ] TypeScript types are correct
- [ ] No console.log statements
- [ ] Follows existing patterns

---

## Quick Commands for Agents

### When asked to create a new page:

1. Read: `/frontend/src/design-system/docs/MILO_BRAND_GUIDE.md`
2. Import: `import { colors, typography, spacing } from '@/design-system/tokens'`
3. Use logo: `<Image src="/milo-logo-gold.png" alt="Milo" width={40} height={40} />`
4. Apply voice: Supportive, clear, warm copy
5. Check: Run through testing checklist

### When asked to update branding:

1. Use `milo-logo-gold.png` for the brand mark
2. Apply display font to "Milo"
3. Update copy to Milo voice
4. Verify warm shadows
5. Check color usage (gold sparingly)

### When asked to create a component:

1. Use design tokens
2. Apply Milo voice to text
3. Use warm shadows
4. Ensure accessibility
5. Test keyboard navigation

---

## Resources

- **Brand Guide:** `/frontend/src/design-system/docs/MILO_BRAND_GUIDE.md` (comprehensive)
- **Design Tokens:** `/frontend/src/design-system/tokens/` (TypeScript constants)
- **Quick Start:** `/frontend/src/design-system/README.md` (overview)
- **Summary:** `/MILO_REBRAND_SUMMARY.md` (what was done)
- **This File:** `.cursor/rules/milo-design-system.md` (implementation guide)

---

## Remember

**Milo is a cream-colored goldendoodle** - think loyal gym dog:
- Supportive (always ready to help)
- Intelligent (smart but humble)
- Friendly (warm but professional)
- Reliable (shows up every day)
- Never in the way (helpful, not intrusive)

Every design decision should reflect this personality.
