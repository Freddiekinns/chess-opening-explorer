---
description: "JavaScript and Node.js development standards for scripts and utilities"
applyTo: "**/*.js, **/*.mjs"
---

# JavaScript Development Standards

## Project Context

JavaScript/Node.js is used in this project for:

- Build scripts and automation
- Video discovery pipeline
- Data consolidation scripts
- Utility functions
- Development tooling

## JavaScript Version

- **Target**: ES2020+ (Node.js 14+)
- Use modern JavaScript features (async/await, optional chaining, nullish coalescing)
- Prefer ESM (ES Modules) over CommonJS when possible

## Code Style

### Naming Conventions

```javascript
// Variables and functions: camelCase
const openingName = "Sicilian Defense";
function calculateWinRate(wins, total) {}

// Classes: PascalCase
class OpeningAnalyzer {}

// Constants: UPPER_SNAKE_CASE
const MAX_RETRIES = 3;
const API_BASE_URL = "https://api.example.com";

// Private fields: # prefix (ES2022)
class DataCache {
  #cache = new Map();

  #internalMethod() {}
}
```

### Modern JavaScript Features

**Destructuring**

```javascript
// Object destructuring
const { name, ecoCode, moves } = opening;
const { name: openingName, eco: ecoCode } = data;

// Array destructuring
const [first, second, ...rest] = moves;

// Function parameters
function processOpening({ name, ecoCode, moves = [] }) {
  // ...
}
```

**Spread and Rest**

```javascript
// Spread operator
const enhanced = { ...opening, popularity: 0.15 };
const allMoves = [...opening.moves, ...variation.moves];

// Rest parameters
function combineOpenings(...openings) {
  return openings.flat();
}
```

**Optional Chaining and Nullish Coalescing**

```javascript
// Optional chaining
const popularity = opening?.stats?.popularity;
const firstVideo = opening?.videos?.[0];

// Nullish coalescing
const displayName = opening.name ?? "Unknown Opening";
const maxResults = config.maxResults ?? 100;
```

**Template Literals**

```javascript
// String interpolation
const message = `Processing ${opening.name} (${opening.ecoCode})`;

// Multi-line strings
const query = `
  SELECT * FROM openings
  WHERE eco_code = '${ecoCode}'
  AND popularity > ${threshold}
`;
```

## Async/Await

**Prefer async/await over Promises**

```javascript
// Good: async/await
async function fetchOpeningData(ecoCode) {
  try {
    const opening = await fetchOpening(ecoCode);
    const stats = await fetchStats(opening.id);
    const videos = await fetchVideos(opening.id);

    return { opening, stats, videos };
  } catch (error) {
    console.error(`Failed to fetch data for ${ecoCode}:`, error);
    throw error;
  }
}

// Avoid: Promise chains (unless necessary)
function fetchOpeningData(ecoCode) {
  return fetchOpening(ecoCode).then((opening) =>
    fetchStats(opening.id).then((stats) =>
      fetchVideos(opening.id).then((videos) => ({ opening, stats, videos })),
    ),
  );
}
```

**Parallel Async Operations**

```javascript
// Sequential (slow)
const opening = await fetchOpening(id);
const stats = await fetchStats(id);
const videos = await fetchVideos(id);

// Parallel (fast)
const [opening, stats, videos] = await Promise.all([
  fetchOpening(id),
  fetchStats(id),
  fetchVideos(id),
]);

// Parallel with error handling
const results = await Promise.allSettled([
  fetchOpening(id),
  fetchStats(id),
  fetchVideos(id),
]);

const [opening, stats, videos] = results.map((r) =>
  r.status === "fulfilled" ? r.value : null,
);
```

## Error Handling

**Try-Catch with Async/Await**

```javascript
async function processOpening(ecoCode) {
  try {
    const data = await fetchData(ecoCode);
    return processData(data);
  } catch (error) {
    if (error.code === "ENOTFOUND") {
      console.error("Network error:", error.message);
      return null;
    }

    if (error.response?.status === 404) {
      console.warn(`Opening ${ecoCode} not found`);
      return null;
    }

    // Unexpected error - rethrow
    console.error("Unexpected error:", error);
    throw error;
  }
}
```

**Custom Error Classes**

```javascript
class DataPipelineError extends Error {
  constructor(message, { cause, context } = {}) {
    super(message);
    this.name = "DataPipelineError";
    this.cause = cause;
    this.context = context;
  }
}

class APIError extends DataPipelineError {
  constructor(message, { statusCode, ...rest } = {}) {
    super(message, rest);
    this.name = "APIError";
    this.statusCode = statusCode;
  }
}

// Usage
throw new APIError("Failed to fetch opening", {
  statusCode: 500,
  context: { ecoCode: "E60" },
});
```

## Modules

**ES Modules (Preferred)**

```javascript
// Named exports
export function calculateWinRate(wins, total) {
  return (wins / total) * 100;
}

export const MAX_RETRIES = 3;

// Default export
export default class OpeningAnalyzer {
  // ...
}

// Import
import OpeningAnalyzer, { calculateWinRate, MAX_RETRIES } from "./analyzer.js";
```

**Module Organization**

```javascript
// Good: Organized exports
// utils.js
export function formatEcoCode(code) {}
export function parseMovesString(moves) {}
export function validateOpening(data) {}

// index.js
export { formatEcoCode, parseMovesString } from "./utils.js";
export { OpeningAnalyzer } from "./analyzer.js";
export { DataFetcher } from "./fetcher.js";
```

## Functions

**Arrow Functions**

```javascript
// Use arrow functions for callbacks
const popular = openings.filter((o) => o.popularity > 0.1);
const names = openings.map((o) => o.name);

// Use regular functions for methods
class OpeningProcessor {
  process(opening) {
    // 'this' works correctly
    return this.transform(opening);
  }
}

// Use arrow functions for lexical 'this'
class EventHandler {
  constructor() {
    this.count = 0;
  }

  handleEvent = () => {
    // 'this' refers to instance
    this.count++;
  };
}
```

**Default Parameters**

```javascript
function fetchOpenings(ecoPrefix = "E", limit = 100, includeStats = true) {
  // ...
}

// Object destructuring with defaults
function processOpening({ name, ecoCode, moves = [], popularity = 0 } = {}) {
  // ...
}
```

## Arrays and Objects

**Array Methods**

```javascript
// Map, filter, reduce
const ecoCodess = openings.map((o) => o.ecoCode);
const popular = openings.filter((o) => o.popularity > 0.1);
const total = stats.reduce((sum, s) => sum + s.games, 0);

// Find and some/every
const opening = openings.find((o) => o.ecoCode === "E60");
const hasPopular = openings.some((o) => o.popularity > 0.2);
const allValid = openings.every((o) => o.ecoCode.match(/^[A-E]\d{2}$/));

// Sort (be careful - mutates array)
const sorted = [...openings].sort((a, b) => b.popularity - a.popularity);
```

**Object Methods**

```javascript
// Object.keys, values, entries
const codes = Object.keys(openingMap);
const openings = Object.values(openingMap);
const entries = Object.entries(openingMap);

// Object.assign and spread
const enhanced = Object.assign({}, opening, { popularity: 0.15 });
const enhanced2 = { ...opening, popularity: 0.15 };

// Object.fromEntries
const map = Object.fromEntries(openings.map((o) => [o.ecoCode, o]));
```

## File I/O

**Reading Files**

```javascript
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

async function loadOpenings(dataDir) {
  const filePath = join(dataDir, "openings.json");

  try {
    const content = await readFile(filePath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      console.warn(`File not found: ${filePath}`);
      return [];
    }
    throw error;
  }
}

async function saveOpenings(openings, dataDir) {
  const filePath = join(dataDir, "openings.json");
  const content = JSON.stringify(openings, null, 2);

  await writeFile(filePath, content, "utf-8");
  console.log(`Saved ${openings.length} openings to ${filePath}`);
}
```

**Streaming for Large Files**

```javascript
import { createReadStream, createWriteStream } from "fs";
import { createInterface } from "readline";

async function processLargeFile(inputPath, outputPath) {
  const input = createReadStream(inputPath);
  const output = createWriteStream(outputPath);
  const rl = createInterface({ input });

  for await (const line of rl) {
    const processed = processLine(line);
    output.write(processed + "\n");
  }

  output.end();
}
```

## Common Patterns

### Configuration

```javascript
import { config } from "dotenv";
import { join } from "path";

// Load environment variables
config();

export const CONFIG = {
  dataDir: process.env.DATA_DIR || join(process.cwd(), "data"),
  apiKey: process.env.API_KEY || "",
  maxRetries: parseInt(process.env.MAX_RETRIES || "3", 10),
  timeout: parseInt(process.env.TIMEOUT || "30000", 10),
  isDevelopment: process.env.NODE_ENV === "development",
};

// Validate required config
if (!CONFIG.apiKey) {
  throw new Error("API_KEY environment variable is required");
}
```

### Retry Logic

```javascript
async function retry(fn, options = {}) {
  const { maxAttempts = 3, delay = 1000, backoff = 2 } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }

      const waitTime = delay * Math.pow(backoff, attempt - 1);
      console.warn(
        `Attempt ${attempt} failed: ${error.message}. ` +
          `Retrying in ${waitTime}ms...`,
      );

      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }
}

// Usage
const data = await retry(() => fetchData(url), {
  maxAttempts: 3,
  delay: 1000,
  backoff: 2,
});
```

### Rate Limiting

```javascript
class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  async acquire() {
    const now = Date.now();

    // Remove old requests outside the window
    this.requests = this.requests.filter((time) => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest);

      console.log(`Rate limit reached. Waiting ${waitTime}ms...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));

      return this.acquire();
    }

    this.requests.push(now);
  }
}

// Usage
const limiter = new RateLimiter(10, 60000); // 10 requests per minute

async function fetchWithRateLimit(url) {
  await limiter.acquire();
  return fetch(url);
}
```

### Progress Tracking

```javascript
async function processWithProgress(items, processor) {
  const total = items.length;
  let completed = 0;

  for (const item of items) {
    await processor(item);
    completed++;

    const percent = ((completed / total) * 100).toFixed(1);
    process.stdout.write(`\rProgress: ${completed}/${total} (${percent}%)`);
  }

  console.log("\nComplete!");
}

// Usage
await processWithProgress(openings, async (opening) => {
  await enrichOpening(opening);
});
```

## Testing

**Use Jest or Mocha**

```javascript
import { describe, it, expect, beforeEach } from "@jest/globals";
import { calculateWinRate } from "./stats.js";

describe("calculateWinRate", () => {
  it("calculates win rate correctly", () => {
    expect(calculateWinRate(50, 100)).toBe(50);
    expect(calculateWinRate(0, 100)).toBe(0);
    expect(calculateWinRate(100, 100)).toBe(100);
  });

  it("throws error for zero total", () => {
    expect(() => calculateWinRate(10, 0)).toThrow(
      "total must be greater than zero",
    );
  });
});

describe("OpeningAnalyzer", () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new OpeningAnalyzer();
  });

  it("processes opening correctly", async () => {
    const opening = {
      name: "King's Indian Defense",
      ecoCode: "E60",
      moves: ["d4", "Nf6", "c4", "g6"],
    };

    const result = await analyzer.process(opening);

    expect(result).toBeDefined();
    expect(result.ecoCode).toBe("E60");
  });
});
```

## Logging

**Console Logging**

```javascript
// Use appropriate log levels
console.log("Processing openings..."); // Info
console.warn("Missing popularity data"); // Warning
console.error("Failed to fetch data:", err); // Error

// Structured logging
console.log(
  JSON.stringify({
    level: "info",
    message: "Processing complete",
    context: {
      openingsProcessed: count,
      duration: elapsed,
    },
  }),
);
```

## Common Pitfalls to Avoid

**Mutation**

```javascript
// Bad: Mutates original array
function sortOpenings(openings) {
  return openings.sort((a, b) => b.popularity - a.popularity);
}

// Good: Creates new array
function sortOpenings(openings) {
  return [...openings].sort((a, b) => b.popularity - a.popularity);
}
```

**Floating Promises**

```javascript
// Bad: Promise not awaited
async function process() {
  saveData(data); // Forgotten await!
  console.log("Done");
}

// Good: Await or handle explicitly
async function process() {
  await saveData(data);
  console.log("Done");
}
```

**== vs ===**

```javascript
// Always use === and !==
if (value === null) {
}
if (count !== 0) {
}

// Avoid == and !=
if (value == null) {
} // Don't do this
```

## Tools and Automation

- **Linting**: ESLint
- **Formatting**: Prettier
- **Testing**: Jest or Mocha
- **Type Checking**: JSDoc comments or TypeScript

## Remember

- Use modern JavaScript features
- Prefer async/await over callbacks
- Handle errors appropriately
- Write testable code
- Keep functions small and focused
