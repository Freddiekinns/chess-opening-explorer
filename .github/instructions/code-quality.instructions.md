---
description: "General code quality standards and best practices for all languages"
applyTo: "**"
---

# Code Quality Standards

## Core Principles

1. **Readability First**: Code is read far more often than it's written
2. **Simplicity Over Cleverness**: Prefer straightforward solutions
3. **Consistency**: Follow established patterns in the codebase
4. **Maintainability**: Write code that's easy to change
5. **Testability**: Design for easy testing

## General Standards

### Naming Conventions

**Variables and Functions**

- Use descriptive, meaningful names
- Avoid abbreviations unless universally understood
- Use camelCase for JavaScript/TypeScript
- Use snake_case for Python

```javascript
// Bad
const d = new Date();
const usr = getUsr();

// Good
const currentDate = new Date();
const currentUser = getCurrentUser();
```

**Constants**

- Use UPPER_SNAKE_CASE for true constants
- Group related constants together

```javascript
const MAX_RETRIES = 3;
const API_TIMEOUT_MS = 5000;
const DEFAULT_PAGE_SIZE = 20;
```

**Classes and Components**

- Use PascalCase
- Name should describe what it represents

```javascript
class OpeningAnalyzer {}
class VideoMatcher {}
```

### Function Design

**Single Responsibility**

- Each function should do one thing well
- If you need "and" to describe it, split it

```javascript
// Bad
function fetchAndProcessAndSaveData() {}

// Good
function fetchData() {}
function processData(data) {}
function saveData(data) {}
```

**Function Length**

- Keep functions short (ideally < 50 lines)
- Extract complex logic into helper functions
- Use early returns to reduce nesting

```javascript
// Bad
function processOpening(opening) {
  if (opening) {
    if (opening.ecoCode) {
      if (opening.moves) {
        // ... deep nesting
      }
    }
  }
}

// Good
function processOpening(opening) {
  if (!opening) return null;
  if (!opening.ecoCode) return null;
  if (!opening.moves) return null;

  // ... main logic
}
```

**Parameters**

- Limit to 3-4 parameters
- Use object destructuring for many parameters
- Provide sensible defaults

```javascript
// Bad
function createOpening(
  name,
  eco,
  moves,
  popularity,
  description,
  videos,
  stats,
) {}

// Good
function createOpening({
  name,
  eco,
  moves,
  popularity,
  description,
  videos,
  stats,
}) {}
```

### Error Handling

**Be Explicit**

- Handle errors at appropriate levels
- Don't swallow errors silently
- Provide context in error messages

```javascript
// Bad
try {
  processData();
} catch (e) {
  console.log("Error");
}

// Good
try {
  processData();
} catch (error) {
  logger.error("Failed to process opening data", {
    error: error.message,
    stack: error.stack,
    context: { openingId },
  });
  throw new ProcessingError("Opening data processing failed", { cause: error });
}
```

**Fail Fast**

- Validate inputs early
- Use guard clauses
- Throw meaningful errors

```javascript
function calculateWinRate(wins, total) {
  if (typeof wins !== "number" || typeof total !== "number") {
    throw new TypeError("wins and total must be numbers");
  }
  if (total === 0) {
    throw new Error("Cannot calculate win rate with zero total games");
  }
  if (wins > total) {
    throw new Error("Wins cannot exceed total games");
  }

  return (wins / total) * 100;
}
```

### Code Organization

**File Structure**

- One primary export per file
- Group related functionality
- Keep files focused and cohesive

```
// Good structure
components/
  OpeningCard/
    OpeningCard.jsx
    OpeningCard.module.css
    OpeningCard.test.js
    index.js
```

**Import Organization**

```javascript
// 1. External dependencies
import React from "react";
import { useState } from "react";

// 2. Internal modules
import { fetchOpenings } from "@/lib/api";
import { formatEcoCode } from "@/lib/utils";

// 3. Components
import OpeningCard from "@/components/OpeningCard";

// 4. Styles
import styles from "./OpeningList.module.css";
```

**Exports**

- Prefer named exports for utilities
- Use default exports for components
- Be consistent within a module type

### DRY (Don't Repeat Yourself)

**Extract Common Logic**

```javascript
// Bad
function getWhiteWinRate(stats) {
  return (stats.whiteWins / stats.totalGames) * 100;
}
function getBlackWinRate(stats) {
  return (stats.blackWins / stats.totalGames) * 100;
}

// Good
function calculateWinRate(wins, total) {
  return (wins / total) * 100;
}
function getWhiteWinRate(stats) {
  return calculateWinRate(stats.whiteWins, stats.totalGames);
}
function getBlackWinRate(stats) {
  return calculateWinRate(stats.blackWins, stats.totalGames);
}
```

**Use Configuration Over Duplication**

```javascript
// Bad
const sicilianOpenings = openings.filter((o) => o.eco.startsWith("B"));
const frenchOpenings = openings.filter((o) => o.eco.startsWith("C"));

// Good
const ECO_PREFIXES = {
  sicilian: "B",
  french: "C",
  kingsIndian: "E",
};

function getOpeningsByFamily(openings, family) {
  const prefix = ECO_PREFIXES[family];
  return openings.filter((o) => o.eco.startsWith(prefix));
}
```

### Magic Numbers and Strings

**Use Named Constants**

```javascript
// Bad
if (popularity > 0.15) {
  badge = "popular";
}

// Good
const POPULARITY_THRESHOLD = 0.15;
const BADGE_POPULAR = "popular";

if (popularity > POPULARITY_THRESHOLD) {
  badge = BADGE_POPULAR;
}
```

### Type Safety

**Use TypeScript When Possible**

```typescript
interface Opening {
  id: string;
  name: string;
  ecoCode: string;
  moves: string[];
  popularity?: number;
}

function processOpening(opening: Opening): ProcessedOpening {
  // Type-safe processing
}
```

**Validate Runtime Data**

```javascript
function validateOpening(data) {
  const required = ["id", "name", "ecoCode", "moves"];
  const missing = required.filter((field) => !data[field]);

  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(", ")}`);
  }

  return data;
}
```

## Code Review Checklist

Before submitting code, verify:

- [ ] Names are clear and descriptive
- [ ] Functions have single responsibility
- [ ] No magic numbers or strings
- [ ] Error handling is appropriate
- [ ] No code duplication
- [ ] Imports are organized
- [ ] Comments explain WHY, not WHAT
- [ ] Edge cases are handled
- [ ] Code follows project conventions
- [ ] Tests cover new functionality

## Anti-Patterns to Avoid

### Premature Optimization

```javascript
// Bad: Optimizing before measuring
const cache = new Map();
function getOpening(id) {
  if (cache.has(id)) return cache.get(id);
  const opening = fetchOpening(id);
  cache.set(id, opening);
  return opening;
}

// Good: Start simple, optimize if needed
function getOpening(id) {
  return fetchOpening(id);
}
```

### God Objects/Functions

```javascript
// Bad: One function does everything
function handleEverything(data) {
  // 500 lines of code
}

// Good: Decompose into focused functions
function validateData(data) {}
function transformData(data) {}
function saveData(data) {}
```

### Callback Hell

```javascript
// Bad: Nested callbacks
fetchOpening(id, (opening) => {
  fetchStats(opening.id, (stats) => {
    fetchVideos(opening.id, (videos) => {
      // ...
    });
  });
});

// Good: Use async/await
async function loadOpeningData(id) {
  const opening = await fetchOpening(id);
  const stats = await fetchStats(opening.id);
  const videos = await fetchVideos(opening.id);
  return { opening, stats, videos };
}
```

## Language-Specific Notes

For language-specific standards, see:

- [javascript.instructions.md](javascript.instructions.md) - JavaScript/Node.js
- [python.instructions.md](python.instructions.md) - Python
- [reactjs.instructions.md](reactjs.instructions.md) - React

## Tools and Automation

- **Linting**: ESLint (JavaScript), Pylint/Flake8 (Python)
- **Formatting**: Prettier (JavaScript), Black (Python)
- **Type Checking**: TypeScript, mypy (Python)
- **Code Review**: GitHub Pull Requests

## Remember

> "Any fool can write code that a computer can understand. Good programmers write code that humans can understand." - Martin Fowler
