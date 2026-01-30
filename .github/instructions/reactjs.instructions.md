---
description: "React standards for this project"
applyTo: "**/*.jsx, **/*.tsx"
---

# React Standards

## Project Context

- React 19 with TypeScript
- Vite build tool
- Single CSS file: `packages/web/src/styles/simplified.css`
- Testing with Vitest + React Testing Library

## Project-Specific Rules

### Styling (Critical)

**All styles go in `simplified.css`** - no new CSS files.

```css
/* In simplified.css */
.opening-card { /* ... */ }
.opening-card__title { /* ... */ }
```

### Component Structure

```typescript
// Functional components with hooks
export function OpeningCard({ opening, onClick }: OpeningCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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
  <h3 className="card-header__title card-header__title--accent">
    {title}
  </h3>
  <span className="eco-pill">{ecoCode}</span>
</div>
```

## Key Rules

1. **Functional components only** - no class components
2. **Single CSS file** - add to `simplified.css`
3. **Tests in `packages/web`** - use Vitest, not Jest
4. **Named exports** for utilities, default for page components
5. **Respect `prefers-reduced-motion`** for animations
