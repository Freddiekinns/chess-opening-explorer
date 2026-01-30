---
description: "Code quality, commenting, and performance standards"
applyTo: "**"
---

# Code Standards

## Core Principles

1. **Readability First** - Code is read more than written
2. **Simplicity Over Cleverness** - Prefer straightforward solutions
3. **Consistency** - Follow established patterns in the codebase
4. **Measure Before Optimizing** - Profile first, optimize second

## Naming

```javascript
// Variables/functions: camelCase (JS) or snake_case (Python)
const openingName = "Sicilian Defense";

// Constants: UPPER_SNAKE_CASE
const MAX_RETRIES = 3;

// Classes/Components: PascalCase
class OpeningAnalyzer {}
```

## Functions

- **Single responsibility** - one function, one job
- **Keep short** - ideally < 50 lines
- **Early returns** - reduce nesting with guard clauses
- **Limit parameters** - max 3-4, use object destructuring for more

```javascript
// Good: Early returns
function processOpening(opening) {
  if (!opening) return null;
  if (!opening.ecoCode) return null;
  // main logic here
}

// Good: Object params for many arguments
function createOpening({ name, eco, moves, popularity }) {}
```

## Error Handling

- Handle errors at appropriate levels
- Don't swallow errors silently
- Provide context in error messages
- Validate inputs early (fail fast)

```javascript
try {
  processData();
} catch (error) {
  logger.error("Failed to process opening data", { error: error.message, openingId });
  throw new ProcessingError("Opening data processing failed", { cause: error });
}
```

## Comments

**Write code that speaks for itself. Comment only to explain WHY, not WHAT.**

### Avoid
```javascript
let counter = 0;  // Initialize counter to zero  ❌
```

### Write
```javascript
// GitHub API rate limit: 5000 requests/hour for authenticated users
await rateLimiter.wait();

// Using Floyd-Warshall because we need all-pairs shortest paths
for (let k = 0; k < vertices; k++) { /* ... */ }
```

### Annotations
```javascript
// TODO: Replace after security review
// FIXME: Memory leak - investigate connection pooling
// HACK: Workaround for library bug v2.1.0
```

## Performance (When It Matters)

### Frontend
- Batch DOM updates
- Use `React.memo`, `useMemo`, `useCallback` to prevent re-renders
- Lazy load images: `loading="lazy"`
- Debounce/throttle event handlers

### Backend
- Use async I/O - never block
- Batch database/API calls
- Cache expensive computations
- Stream large data sets

### Database
- Index frequently queried columns
- Avoid `SELECT *`
- Use `LIMIT` for large result sets
- Analyze query plans with `EXPLAIN`

## Code Review Checklist

- [ ] Names are clear and descriptive
- [ ] Functions have single responsibility
- [ ] No magic numbers or strings
- [ ] Error handling is appropriate
- [ ] No code duplication
- [ ] Comments explain WHY, not WHAT
- [ ] Tests cover new functionality
