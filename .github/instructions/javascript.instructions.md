---
description: 'JavaScript/Node.js standards for this project'
applyTo: '**/*.js, **/*.mjs'
---

# JavaScript Standards

## Project Context

JavaScript/Node.js is used for:

- Build scripts and automation (`scripts/`)
- Video discovery pipeline (`tools/video-pipeline/`)
- Data consolidation scripts
- Development tooling

**Target**: ES2020+ (Node.js 14+), ESM preferred over CommonJS.

## Project-Specific Patterns

### File I/O Pattern

```javascript
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

async function loadData(dataDir) {
  const filePath = join(dataDir, 'openings.json');
  const content = await readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

async function saveData(data, outputPath) {
  const content = JSON.stringify(data, null, 2);
  await writeFile(outputPath, content, 'utf-8');
}
```

### Rate Limiting (for API calls)

```javascript
class RateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = [];
  }

  async acquire() {
    const now = Date.now();
    this.requests = this.requests.filter((time) => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      const waitTime = this.windowMs - (now - this.requests[0]);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return this.acquire();
    }
    this.requests.push(now);
  }
}
```

### Retry Logic

```javascript
async function retry(fn, { maxAttempts = 3, delay = 1000, backoff = 2 } = {}) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      const waitTime = delay * Math.pow(backoff, attempt - 1);
      console.warn(`Attempt ${attempt} failed. Retrying in ${waitTime}ms...`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }
}
```

### Progress Tracking

```javascript
async function processWithProgress(items, processor) {
  const total = items.length;
  for (let i = 0; i < total; i++) {
    await processor(items[i]);
    process.stdout.write(`\rProgress: ${i + 1}/${total}`);
  }
  console.log('\nComplete!');
}
```

## Configuration Pattern

```javascript
import { config } from 'dotenv';
config();

export const CONFIG = {
  dataDir: process.env.DATA_DIR || './data',
  apiKey: process.env.API_KEY || '',
  maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
};

if (!CONFIG.apiKey) {
  throw new Error('API_KEY environment variable is required');
}
```

## Key Rules

1. **Use async/await** over Promise chains
2. **Use parallel execution** with `Promise.all()` when operations are
   independent
3. **Always handle errors** with try-catch and meaningful messages
4. **Don't mutate arrays** - use spread operator: `[...arr].sort()`
5. **Use strict equality** (`===` and `!==`)

## Tools

- **Linting**: ESLint
- **Formatting**: Prettier
- **Testing**: Jest
