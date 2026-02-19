---
description: 'React standards for this project'
applyTo: '**/*.jsx, **/*.tsx'
---

# React Standards

## Project Context

- React 19 with TypeScript
- Vite build tool
- **CSS Modules migration in progress** — see
  [CSS Modularization](#css-modularization) below
- Legacy global styles in `packages/web/src/styles/simplified.css`
- Testing with Vitest + React Testing Library

## Project-Specific Rules

### Styling (Critical)

**When modifying a component's styles, extract them to a CSS Module.**

New or modified components should use CSS Modules (`.module.css`). The legacy
global `simplified.css` still exists but is being migrated incrementally. See
the [CSS Modularization](#css-modularization) section for the full guide and
checklist.

### Component Structure

```typescript
// Migrated component with CSS Module
import styles from './OpeningCard.module.css';

export function OpeningCard({ opening, onClick }: OpeningCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={styles.card}>
      {/* ... */}
    </div>
  );
}
```

```typescript
// Legacy component (not yet migrated) - still works fine
export function SomeOtherComponent() {
  return (
    <div className="opening-card">
      {/* ... */}
    </div>
  );
}
```

### State Management

- `useState` for local state
- `useReducer` for complex state
- `useContext` for shared state across components
- React Query for server state

### Testing Location

All component tests go in `packages/web/src/**/__tests__/`:

```
packages/web/src/
  components/
    OpeningCard/
      OpeningCard.tsx
      __tests__/
        OpeningCard.test.tsx
```

## Key Patterns

### Height Animation (from AD-010)

Use measured heights instead of CSS max-height:

```typescript
const height = wrapperRef.current?.scrollHeight;
wrapperRef.current.style.height = `${height}px`;
```

### Card Header Pattern (from AD-009)

Consistent header with optional accent bar:

```tsx
<div className="card-header">
  <h3 className="card-header__title card-header__title--accent">{title}</h3>
  <span className="eco-pill">{ecoCode}</span>
</div>
```

### Monorepo Imports (Critical for Vercel builds)

When importing from the shared package in web components, **use relative
imports**, not package names:

```typescript
// CORRECT - works in Vercel
import { SomeType, someUtil } from '../../../../shared/src';

// WRONG - fails in Vercel build
import { SomeType, someUtil } from '@chess-trainer/shared';
```

The package name import doesn't resolve correctly in Vercel's build environment.
Follow the pattern used by existing files like `OpeningDetailPage.tsx`.

## Key Rules

1. **Functional components only** - no class components
2. **CSS Modules for new/modified components** - extract from `simplified.css`
   when touching a component
3. **Tests in `packages/web`** - use Vitest, not Jest
4. **Named exports** for utilities, default for page components
5. **Respect `prefers-reduced-motion`** for animations
6. **Relative imports for shared package** - not `@chess-trainer/shared`

---

## CSS Modularization

### Why

The project uses a single global CSS file (`simplified.css`, ~4,650 lines).
While functional, this creates fragile coupling between components — shared
selectors can break when editing unrelated styles, and dead CSS is invisible.
CSS Modules solve this with automatic scoping and colocated styles, with zero
Vite configuration needed.

### Rule: Modularize When You Touch

**Every time you modify a component's styles, extract that component's CSS into
a `.module.css` file as part of the same PR.** Don't do standalone migration PRs
— piggyback on work you're already doing.

### How to Migrate a Component

#### 1. Create the module file

Place it next to the component:

```
components/shared/OpeningCard.tsx
components/shared/OpeningCard.module.css    <-- new
```

#### 2. Move the styles

Cut the component's CSS rules from `simplified.css` and paste into the new
`.module.css` file. Convert class names from BEM-global to module-local:

```css
/* OpeningCard.module.css */
.card {
  /* was .opening-card in simplified.css */
  background-color: var(--color-bg-alt);
  border: 1px solid var(--color-border);
  /* ... */
}

.header {
  /* was .card-header */
  display: flex;
  justify-content: space-between;
}

.header .title {
  /* was .card-header .title-subsection */
  flex: 1;
}
```

#### 3. Update the component

```typescript
import styles from './OpeningCard.module.css';

// Before: <div className="opening-card">
// After:
<div className={styles.card}>
```

#### 4. Keep using CSS variables

The design tokens (colors, spacing, typography, etc.) stay in the global `:root`
block in `simplified.css`. Reference them normally in module files:

```css
/* OpeningCard.module.css */
.card {
  padding: var(--space-6);
  color: var(--color-text-primary);
}
```

#### 5. Handle dynamic/conditional classes

```typescript
// Ternary
<div className={`${styles.card} ${isActive ? styles.active : ''}`}>

// Multiple
<div className={[styles.card, styles.compact].join(' ')}>
```

#### 6. Handle shared base classes

Some elements use shared base classes (e.g. `.eco-pill`, `.btn`). These stay in
`simplified.css` until all consumers are migrated. A component can mix global
and module classes:

```typescript
<span className={`eco-pill ${styles.badge}`}>
```

#### 7. Remove from simplified.css

After moving styles to the module, delete the corresponding rules from
`simplified.css`. Watch out for comma-separated selectors that share rules with
other components — only remove the selectors for the component you're migrating.

#### 8. Verify

- Vite build passes
- Visual check of the component in browser
- No leftover references to old class names

### What Stays Global

These remain in `simplified.css` and are NOT migrated:

- **CSS variables** (`:root` block) — the design system tokens
- **Base element styles** (`body`, `#root`)
- **Shared base classes** used by multiple components (`.btn`, `.eco-pill`,
  `.complexity-tag`, `.style-pill`) — migrate these only when ALL consumers have
  been migrated
- **`@keyframes`** animations referenced across components
- **`@media (prefers-reduced-motion)`** global accessibility rules

### Migration Checklist

Components ordered by CSS weight (most className references first). Tick off
each one as it gets migrated during normal development work.

#### Pages (3)

- [ ] `OpeningDetailPage` — 84 classNames (largest page, migrate in sections)
- [ ] `LandingPage` — 14 classNames
- [ ] `AnalyseGamesPage` — 7 classNames

#### Detail Components (8)

- [ ] `RelatedOpeningsTab` — 35 classNames
- [ ] `OpeningStats` — 25 classNames
- [ ] `RelatedOpeningsTeaser` — 23 classNames
- [ ] `VideoGallery` — 15 classNames
- [ ] `CommonPlans` — 14 classNames
- [ ] `OpeningHeader` — 14 classNames
- [ ] `RelatedOpeningsModal` — 13 classNames
- [ ] `VariationItem` — 11 classNames

#### Landing Components (2)

- [ ] `StatisticsShowcase` — 23 classNames
- [ ] `PopularOpeningsGrid` — 16 classNames

#### Personal (1)

- [ ] `PersonalOpeningStats` — 125 classNames (largest component, migrate in
      sections)

#### Shared Components (8)

- [ ] `OpeningCard` — 30 classNames
- [ ] `SearchBar` — 17 classNames
- [ ] `PopularityIndicator` — 16 classNames
- [ ] `PGNInputModal` — 15 classNames
- [ ] `MobileSearchOverlay` — 5 classNames
- [ ] `LineTypePill` — 4 classNames
- [ ] `FloatingBackButton` — 4 classNames
- [ ] `VideoErrorBoundary` — 1 className

#### Layout Components (3)

- [ ] `Layout` — 8 classNames
- [ ] `LandingHeader` — 5 classNames
- [ ] `GlobalHeader` — 4 classNames

#### Filters (1)

- [ ] `ComplexityFilters` — 6 classNames

#### Skip (no meaningful CSS)

- `NotFoundPage` — 1 className
- `FeedbackSection` — no CSS
- `OpeningFamily` — no CSS
