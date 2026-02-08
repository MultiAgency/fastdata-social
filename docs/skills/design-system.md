# Design System

## Color Tokens (OKLCh)

All colors use OKLCh in `src/index.css`. Dark theme only (no light mode).

| Token | OKLCh | Use |
|---|---|---|
| `--primary` | `oklch(0.82 0.19 155)` | Green. Buttons, active tabs, focus rings |
| `--primary-foreground` | `oklch(0.13 0.04 155)` | Text on primary |
| `--accent` | `oklch(0.75 0.15 55)` | Amber. Secondary highlights |
| `--destructive` | `oklch(0.65 0.22 25)` | Red. Errors, delete actions |
| `--background` | `oklch(0.11 0.02 260)` | Page background |
| `--card` | `oklch(0.15 0.02 260)` | Card background |
| `--border` | `oklch(0.24 0.02 260)` | Borders |
| `--muted-foreground` | `oklch(0.6 0.02 260)` | Secondary text |
| `--foreground` | `oklch(0.93 0.01 260)` | Primary text |

Glow variables: `--glow-primary` and `--glow-accent` are 15% opacity versions for ambient effects.

## Fonts

- **Sans**: `Outfit` (headings, body text) — `font-sans`
- **Mono**: `JetBrains Mono` (labels, data, code) — `font-mono`

## Glow Effects

```html
<!-- Primary glow on buttons/active elements -->
<button class="glow-primary">...</button>

<!-- Animated pulsing glow -->
<div class="animate-pulse-glow">...</div>
```

Defined in `src/index.css` as box-shadow rules.

## Underscore Suffix Labels

Status labels use trailing underscores with `font-mono`:

```html
<p class="text-sm text-muted-foreground font-mono">initializing_</p>
<p class="text-sm text-muted-foreground font-mono">loading_</p>
<p class="text-sm text-muted-foreground font-mono">explore_</p>
<p class="text-sm text-muted-foreground font-mono">failed_</p>
```

This is a deliberate aesthetic. Use it for any loading/status indicators.

## Card Pattern

```html
<div class="p-5 rounded-xl border border-border bg-card/50">
  <h3 class="text-sm font-mono text-muted-foreground mb-3">Section Title</h3>
  <!-- content -->
</div>
```

## Animations

```html
<!-- Page entry: fades up on mount -->
<div class="animate-fade-up">...</div>

<!-- Staggered list: children fade up in sequence (50ms delay per child, up to 6) -->
<div class="animate-fade-up-stagger">
  <div>first</div>
  <div>second</div>
</div>

<!-- Mobile menu slide-up -->
<div class="animate-slide-up">...</div>
```

## Navigation

Nav links live in `src/Header/Header.tsx`. Desktop: inline links after logo. Mobile: hamburger dropdown. Active link uses `text-primary bg-primary/10 border border-primary/20`. Inactive uses `text-muted-foreground hover:text-primary`. Links use trailing underscore format: `directory_`, `graph_`.

## Grid Layouts

```html
<!-- Responsive two-column -->
<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">...</div>

<!-- Page container -->
<div class="max-w-5xl mx-auto px-4 sm:px-6 pb-12">...</div>
```

## shadcn/ui Components

Available in `src/components/ui/`: `Button`, `Input`, `Alert`, `AlertDescription`, `Badge`, `Tabs`.

Use shadcn/ui for interactive elements (buttons, inputs, tabs). Use raw elements with Tailwind for layout, cards, and custom patterns.

### Button variants

```tsx
<Button>Default (primary)</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button size="icon-xs">Small icon</Button>
```

### Badge

```tsx
<Badge variant="outline">label</Badge>
```

## Spinner

```html
<span class="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
```

Use `h-5 w-5` for larger spinners. Use `border-current` or `border-primary-foreground` to match surrounding text.

## Typography Hierarchy

- Page title: `text-2xl font-semibold`
- Section header: `text-sm font-mono text-muted-foreground`
- Body: `text-sm`
- Data/labels: `text-xs font-mono`

## Decorative Classes

```html
<!-- Shimmer gradient on connect button -->
<button class="btn-shimmer">Connect</button>

<!-- Profile header gradient (primary → accent → transparent) -->
<div class="profile-gradient">...</div>

<!-- Subtle dot pattern overlay for profile banner -->
<div class="dot-pattern">...</div>
```

## Background

The body has subtle radial gradients (primary at top, accent at bottom) and a 60px grid overlay. Both are defined in `src/index.css`. Don't override them.
