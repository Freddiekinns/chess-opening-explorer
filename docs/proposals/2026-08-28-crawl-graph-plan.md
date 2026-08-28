# Crawl Graph Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the 12,106 opening pages a crawlable link graph, an honest HTTP
status for URLs that are not pages, and a `lastmod` that means something.

**Architecture:** One shared `STATIC_ROUTES` constant becomes the single source
of truth for which paths are real pages; `App.tsx` and `middleware.ts` both
consume it. `scripts/generate-seo-lookup.js` gains two tuple slots holding
ancestor and related-opening links, computed at build time by the existing
`TreeService`, and `middleware.ts` renders them into the pre-hydration `#root`.
`scripts/generate-sitemaps.js` derives `lastmod` from the source data's mtime.

**Tech Stack:** TypeScript (Vercel Edge middleware, React 19 + Vite), CommonJS
Node build scripts, Jest for backend/root tests, Vitest for `packages/web`,
esbuild for bundling the real middleware inside its test.

**Design doc:** `docs/proposals/2026-08-28-crawl-graph-design.md`

## Global Constraints

- **Test-first, always.** Write the failing test, run it, confirm it fails for
  the reason you expect, then write the code. Per AGENTS.md (added in #69).
- **Never skip, disable or quarantine a test.**
  `.claude/hooks/test-integrity.js` blocks `.skip` / `.only` / `xit` in test
  files. The escape hatch is `ALLOW_TEST_SKIP=1` and it does not apply to
  anything in this plan.
- **Mutate the branch to confirm coverage.** When you touch
  `seo-middleware.test.js`, break the code path you believe you just covered and
  confirm the suite goes red. `seoShardCache` is at module scope, which has
  silently voided tests in this file before.
- **Fresh middleware instance per test.** `beforeEach` already calls
  `loadMiddleware()`. Do not hoist it.
- **British English in user-facing copy** (analyse, colour, practise as a verb).
- **Run `npm run format` before committing.** Prettier owns formatting; ESLint
  is code quality only.
- **Conventional commits** (`feat`/`fix`/`chore`/`docs`/`refactor`/`test`).
- **Commit normally.** Do not pass `--no-verify` or override `core.hooksPath`.
  If a husky hook is not bound, run `npm ci` first.
- **Do not put `description` back in `FUSE_OPTIONS.keys`** and do not add a
  `/api/explorer` entry to `vercel.json` — `tests/unit/repo-invariants.test.js`
  guards both and neither is in scope here.

## File Structure

| File                                      | Responsibility                                     | Task |
| ----------------------------------------- | -------------------------------------------------- | ---- |
| `vercel.json`                             | Host and path redirects resolved before middleware | 1    |
| `packages/web/src/App.tsx`                | Route table, built from `STATIC_ROUTES`            | 1, 2 |
| `packages/web/src/lib/siteConfig.ts`      | Site constants shared by app and middleware        | 2    |
| `middleware.ts`                           | Edge SEO handler: status, meta, pre-hydration body | 3, 5 |
| `scripts/generate-seo-lookup.js`          | Build-time shard generator                         | 4    |
| `scripts/generate-sitemaps.js`            | Build-time sitemap generator                       | 6    |
| `tests/unit/repo-invariants.test.js`      | Guards for AGENTS.md rules                         | 1, 3 |
| `tests/unit/seo-middleware.test.js`       | Real middleware against real index.html            | 3, 5 |
| `tests/unit/seo-lookup-shards.test.js`    | Shard hash and payload shape                       | 4    |
| `tests/unit/generate-sitemaps.test.js`    | **New.** Sitemap output shape                      | 6    |
| `packages/web/src/__tests__/App.test.tsx` | Route rendering                                    | 2    |
| `AGENTS.md`                               | Gotchas that are load-bearing                      | 7    |

---

### Task 1: `/personal-explorer` becomes a real redirect

`/personal-explorer` currently renders a component that calls
`window.location.replace('/analyse')`. It answers HTTP 200 and then redirects in
the browser — a URL that is not a page returning a status that says it is.
Vercel resolves `redirects` before middleware, so moving it to config takes it
out of the request path entirely.

**Files:**

- Modify: `vercel.json` (the `redirects` array, currently one entry)
- Modify: `packages/web/src/App.tsx:17-22` (delete `AnalyseRedirect`), `:51`
  (delete its `<Route>`)
- Test: `tests/unit/repo-invariants.test.js`

**Interfaces:**

- Consumes: nothing.
- Produces: `/personal-explorer` is no longer an app route. Task 2 must not list
  it in `STATIC_ROUTES`.

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/repo-invariants.test.js`:

```js
describe('/personal-explorer redirects at the edge, not in the browser', () => {
  /**
   * It used to render a component that called window.location.replace, so the
   * URL answered 200 and then moved — the same "status that lies about what
   * this URL is" failure as a soft 404, and Google reads a 200-then-client-
   * redirect as a weak signal where a 301 is unambiguous. Vercel resolves
   * redirects before middleware, so config is the right home for it.
   */
  const vercel = JSON.parse(read('vercel.json'));
  const app = read('packages/web/src/App.tsx');

  test('vercel.json redirects it permanently to /analyse', () => {
    const rule = (vercel.redirects || []).find(
      (r) => r.source === '/personal-explorer'
    );
    expect(rule).toBeDefined();
    expect(rule.destination).toBe('/analyse');
    expect(rule.permanent).toBe(true);
  });

  test('the www redirect it was modelled on is still there', () => {
    const sources = (vercel.redirects || []).map((r) => r.source);
    expect(sources).toContain('/:path*');
  });

  test('App.tsx no longer routes it', () => {
    expect(app).not.toContain('/personal-explorer');
    expect(app).not.toContain('AnalyseRedirect');
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx jest tests/unit/repo-invariants.test.js -t "personal-explorer"`

Expected: FAIL — two failures. `rule` is `undefined`
(`expect(received).toBeDefined()`), and `App.tsx no longer routes it` fails
because the string is present. The third test should already pass.

- [ ] **Step 3: Add the redirect to `vercel.json`**

In the `redirects` array, add as the first entry, before the existing www rule:

```json
{
  "source": "/personal-explorer",
  "destination": "/analyse",
  "permanent": true
}
```

- [ ] **Step 4: Delete the component and its route from `App.tsx`**

Delete this block entirely (currently lines 17–22):

```tsx
const AnalyseRedirect = () => {
  useEffect(() => {
    window.location.replace('/analyse');
  }, []);
  return null;
};
```

Delete this line from `<Routes>`:

```tsx
<Route path="/personal-explorer" element={<AnalyseRedirect />} />
```

`useEffect` is still imported and still used by `ScrollToTop`, so leave the
import alone.

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npx jest tests/unit/repo-invariants.test.js` Expected: PASS, all tests in
the file.

Run: `npm run test:frontend` Expected: PASS. `App.test.tsx` renders the app; it
does not assert on `/personal-explorer`.

- [ ] **Step 6: Commit**

```bash
npm run format
git add vercel.json packages/web/src/App.tsx tests/unit/repo-invariants.test.js
git commit -m "fix(seo): redirect /personal-explorer at the edge instead of in the browser"
```

---

### Task 2: Shared `STATIC_ROUTES` constant

`middleware.ts` is about to need to know which paths are real pages. Rather than
let it keep a second copy of the route list, both sides read one constant, and
the `Record` typing makes divergence a compile error.

**Files:**

- Modify: `packages/web/src/lib/siteConfig.ts` (append)
- Modify: `packages/web/src/App.tsx` (route table)
- Test: `packages/web/src/__tests__/App.test.tsx`

**Interfaces:**

- Consumes: Task 1's removal of `/personal-explorer`.
- Produces:
  - `STATIC_ROUTES: readonly ['/', '/analyse', '/repertoire']` exported from
    `packages/web/src/lib/siteConfig.ts`
  - `type StaticRoute = (typeof STATIC_ROUTES)[number]`
  - Task 3 imports `STATIC_ROUTES` into `middleware.ts`.

- [ ] **Step 1: Write the failing test**

Append to `packages/web/src/__tests__/App.test.tsx`:

```tsx
import { STATIC_ROUTES } from '../lib/siteConfig';

describe('STATIC_ROUTES is the route table', () => {
  it('lists every static page and nothing that is not one', () => {
    expect([...STATIC_ROUTES]).toEqual(['/', '/analyse', '/repertoire']);
  });

  it('does not list the dynamic opening route, which middleware handles by prefix', () => {
    expect(STATIC_ROUTES.some((route) => route.includes(':'))).toBe(false);
    expect([...STATIC_ROUTES]).not.toContain('/opening');
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm run test --workspace=packages/web -- --run App.test.tsx`

Expected: FAIL at import — `STATIC_ROUTES` is not exported from
`../lib/siteConfig`.

- [ ] **Step 3: Add the constant to `siteConfig.ts`**

Append to `packages/web/src/lib/siteConfig.ts`:

```ts
/**
 * Every path that is a real page and is not an opening.
 *
 * `App.tsx` builds its route table from this and `middleware.ts` decides what
 * to 404 from it, so the two cannot drift: the `Record<StaticRoute, ...>` in
 * App.tsx makes adding a route without listing it here a compile error, and
 * `repo-invariants.test.js` asserts the middleware still reads it.
 *
 * `/opening/:fen` is deliberately absent — the middleware matches it by prefix
 * and answers from the seo-lookup shard, which is the only thing that knows
 * whether a given position exists.
 */
export const STATIC_ROUTES = ['/', '/analyse', '/repertoire'] as const;
export type StaticRoute = (typeof STATIC_ROUTES)[number];
```

- [ ] **Step 4: Build the route table from it in `App.tsx`**

Add to the imports at the top:

```tsx
import type { ReactElement } from 'react';
import { STATIC_ROUTES, type StaticRoute } from './lib/siteConfig';
```

Add above `function App()`:

```tsx
/** Keyed by StaticRoute, so a route added to one and not the other does not
 *  compile. The catch-all and the opening route are not static pages and are
 *  declared separately below. */
const STATIC_ROUTE_ELEMENTS: Record<StaticRoute, ReactElement> = {
  '/': <LandingPage />,
  '/analyse': <AnalyseGamesPage />,
  '/repertoire': <RepertoirePage />,
};
```

Replace the `<Routes>` block with:

```tsx
<Routes>
  {STATIC_ROUTES.map((path) => (
    <Route key={path} path={path} element={STATIC_ROUTE_ELEMENTS[path]} />
  ))}
  <Route path="/opening/:fen" element={<OpeningDetailPage />} />
  <Route path="*" element={<LandingPage />} />
</Routes>
```

- [ ] **Step 5: Run the tests and the type-check**

Run: `npm run test --workspace=packages/web -- --run App.test.tsx` Expected:
PASS.

Run: `npm run type-check --workspace=packages/web` Expected: PASS, no errors.

- [ ] **Step 6: Prove the type guard actually guards**

Temporarily add `'/nonsense': <LandingPage />,` to `STATIC_ROUTE_ELEMENTS` and
run `npm run type-check --workspace=packages/web`.

Expected: FAIL — "Object literal may only specify known properties, and
`'/nonsense'` does not exist in type `Record<StaticRoute, ReactElement>`".

Then temporarily add `'/repertoire-v2'` to `STATIC_ROUTES` and re-run.

Expected: FAIL — `Property '/repertoire-v2' is missing in type ...`.

Revert both. If either passed, the `Record` typing is wrong and the whole guard
is decorative.

- [ ] **Step 7: Commit**

```bash
npm run format
git add packages/web/src/lib/siteConfig.ts packages/web/src/App.tsx packages/web/src/__tests__/App.test.tsx
git commit -m "refactor(web): build the route table from a shared STATIC_ROUTES constant"
```

---

### Task 3: A real 404 for unknown paths

`https://openingbook.xyz/some-random-page` returns 200 with the landing page
behind it, because the middleware early-returns `fetch(request)` for anything
outside `/opening/` and `App.tsx`'s `<Route path="*">` renders `LandingPage`.
Search Console reports 42 soft 404s.

**Files:**

- Modify: `middleware.ts:200-204` (the early return) and the `/analyse` branch
- Test: `tests/unit/seo-middleware.test.js`,
  `tests/unit/repo-invariants.test.js`

**Interfaces:**

- Consumes: `STATIC_ROUTES` from Task 2.
- Produces: an exported-by-behaviour contract — unknown extensionless paths
  return 404; paths containing `.` pass through untouched. Task 5 does not
  depend on this.

- [ ] **Step 1: Write the failing tests**

Append to `tests/unit/seo-middleware.test.js`, after the
`SEO middleware — untouched routes` describe block:

```js
describe('SEO middleware — paths that are not pages', () => {
  /**
   * App.tsx renders LandingPage for `*`, so before this branch every typo and
   * every stale URL answered 200 with the landing page behind it. Search
   * Console was reporting 42 of them as soft 404s.
   */
  it('404s a path that is not a route instead of serving the landing page', async () => {
    const res = await get('/some-random-page');
    expect(res.status).toBe(404);
    const html = await res.text();
    expect(html).toContain('Opening not found');
  });

  it.each([['/'], ['/analyse'], ['/repertoire']])(
    'still serves %s at 200',
    async (pathname) => {
      const res = await get(pathname);
      expect(res.status).toBe(200);
    }
  );

  /**
   * The matcher already excludes every static file the build emits, but a 404
   * served over a real asset is a worse failure than a soft 404 — so anything
   * that looks like a file is handed straight to the origin.
   */
  it('passes a path with a file extension through to the origin', async () => {
    const res = await get('/manifest.webmanifest');
    expect(res.status).not.toBe(404);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://openingbook.xyz/manifest.webmanifest',
      })
    );
  });

  it('does not 404 an opening that exists', async () => {
    const res = await get(openingUrl(AMAR_FEN));
    expect(res.status).toBe(200);
  });
});
```

Append to `tests/unit/repo-invariants.test.js`:

```js
describe('the middleware reads the shared route list', () => {
  /**
   * The Record<StaticRoute, ReactElement> in App.tsx stops the app and the
   * constant drifting. Nothing but this stops the *middleware* quietly going
   * back to a hardcoded list, which is how it would start 404ing a real page.
   */
  const source = read('middleware.ts');

  test('middleware.ts imports STATIC_ROUTES from siteConfig', () => {
    expect(source).toMatch(
      /import\s*{[^}]*STATIC_ROUTES[^}]*}\s*from\s*'\.\/packages\/web\/src\/lib\/siteConfig'/s
    );
  });

  test('middleware.ts does not keep its own literal route list', () => {
    expect(source).not.toMatch(/\[\s*'\/'\s*,\s*'\/analyse'/);
  });
});
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx jest tests/unit/seo-middleware.test.js -t "paths that are not pages"`
Expected: FAIL — `/some-random-page` returns 200, not 404.

Run: `npx jest tests/unit/repo-invariants.test.js -t "shared route list"`
Expected: FAIL — `middleware.ts` does not import `STATIC_ROUTES`.

- [ ] **Step 3: Import the constant and rewrite the dispatch**

In `middleware.ts`, extend the existing import:

```ts
import {
  buildOpeningDescription,
  buildSiteUrl,
  LEGACY_VERCEL_HOST,
  SITE_NAME,
  STATIC_ROUTES,
} from './packages/web/src/lib/siteConfig';
```

Replace this block:

```ts
// Only process opening and analyse routes
if (!pathname.startsWith('/opening/') && pathname !== '/analyse') {
  return fetch(request);
}
```

with:

```ts
// Anything that looks like a file goes straight to the origin. The matcher
// already excludes every static file the build emits, but a 404 served over
// a real asset is a worse failure than the soft 404 this branch exists to
// fix, so the check earns its line.
if (!pathname.startsWith('/opening/') && pathname.includes('.')) {
  return fetch(request);
}

const isStaticRoute = (STATIC_ROUTES as readonly string[]).includes(pathname);

// A path that is neither an opening nor a page is not a page. App.tsx renders
// LandingPage for `*`, so without this every typo answered 200 with the
// landing page behind it — 42 of them reported as soft 404s.
if (!pathname.startsWith('/opening/') && !isStaticRoute) {
  return notFoundResponse(await fetchIndexHtml(url.origin));
}
```

- [ ] **Step 4: Extract the two helpers the branch above needs**

The 404 body and the HTML assembly already exist inline at the end of
`middleware()`. Lift them so the early return can reuse them rather than
duplicating the string. Add above `export default async function middleware`:

```ts
const NOT_FOUND_BODY =
  `<main style="max-width:44rem;margin:0 auto;padding:3rem 1.25rem">` +
  `<h1 style="font-family:'Bricolage Grotesque',serif;font-size:2rem;margin:0 0 .5rem">Page not found</h1>` +
  `<p style="color:var(--color-text-secondary)">We could not find that page. <a href="/" style="color:var(--color-brand-orange)">Search the openings</a>.</p>` +
  `</main>`;

async function fetchIndexHtml(origin: string): Promise<string> {
  const res = await fetch(new URL('/index.html', origin));
  return res.text();
}
```

Then add, also above the handler:

```ts
function notFoundResponse(html: string): Response {
  const metaTags = buildMetaTags({
    title: `Page not found — ${SITE_NAME}`,
    description: 'This page could not be found.',
    url: buildSiteUrl('/'),
    canonical: buildSiteUrl('/'),
  });
  return new Response(injectIntoHtml(html, metaTags, NOT_FOUND_BODY), {
    status: 404,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 's-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
```

Now extract the HTML rewriting the handler already does into a function both
paths use. Move the five `modifiedHtml = modifiedHtml.replace(...)` calls and
the `#root` swap out of `middleware()` into:

```ts
function injectIntoHtml(html: string, metaTags: string, body: string): string {
  let out = html;
  out = out.replace(/<title>[^<]*<\/title>/, '');
  out = out.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/, '');
  out = out.replace(/<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/, '');
  out = out.replace(/<meta\s+(?:property="og:|name="twitter:)[^>]*\/?>/g, '');
  out = out.replace('</head>', `    ${metaTags}\n  </head>`);

  // Swap the loading spinner for the page's own content. React replaces #root
  // on mount, so this is the pre-hydration state of the same page. Greedy to
  // the last </div> that closes the block, so the nested spinner markup goes
  // with it — a non-greedy match stops at the spinner's own closing tag and
  // leaves a stray </div> behind.
  if (body) {
    out = out.replace(
      /<div id="root">[\s\S]*<\/div>(?=\s*(?:<script|<\/body>))/,
      `<div id="root">${body}</div>`
    );
  }
  return out;
}
```

Rewrite the tail of `middleware()` to call it:

```ts
const html = await fetchIndexHtml(url.origin);
const metaTags = buildMetaTags({
  title,
  description,
  url: requestUrl,
  canonical: canonicalUrl,
  jsonLd,
});

return new Response(injectIntoHtml(html, metaTags, body), {
  status,
  headers: {
    'content-type': 'text/html; charset=utf-8',
    'cache-control': degraded
      ? 's-maxage=60, stale-while-revalidate=60'
      : status === 404
        ? 's-maxage=3600, stale-while-revalidate=86400'
        : 's-maxage=86400, stale-while-revalidate=604800',
  },
});
```

The existing unknown-FEN 404 branch inside `/opening/` keeps its own body and
copy ("Opening not found") — it is a more specific message than the generic one
and the test at line 268 asserts it.

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npx jest tests/unit/seo-middleware.test.js` Expected: PASS, all 21+ tests.
The extraction in Step 4 touched every response path in the file, so a
regression here is likely and the whole file must be green, not just the new
block.

Run: `npx jest tests/unit/repo-invariants.test.js` Expected: PASS.

- [ ] **Step 6: Mutate to prove the coverage is real**

Change the new branch to
`if (false && !pathname.startsWith('/opening/') && !isStaticRoute)` and run
`npx jest tests/unit/seo-middleware.test.js`.

Expected: FAIL on "404s a path that is not a route". If it passes, the test is
not reaching the branch — `seoShardCache` and the shared `global.fetch` mock
have voided tests in this file before. Revert the mutation.

Then change `pathname.includes('.')` to `false` and re-run.

Expected: FAIL on "passes a path with a file extension through to the origin".
Revert.

- [ ] **Step 7: Commit**

```bash
npm run format
git add middleware.ts tests/unit/seo-middleware.test.js tests/unit/repo-invariants.test.js
git commit -m "fix(seo): 404 paths that are not pages instead of serving the landing page"
```

---

### Task 4: Generator emits ancestor and related links

The shard payload gains the two slots the middleware needs.
`TreeService.getTreeContext` is pure over `api/data/eco` and
`api/data/popularity_stats.json` — the two files `readOpenings` already reads —
so the build can compute exactly what the React navigator shows at runtime.

**Files:**

- Modify: `scripts/generate-seo-lookup.js`
- Test: `tests/unit/seo-lookup-shards.test.js`

**Interfaces:**

- Consumes: `TreeService` from `packages/api/src/services/tree-service`
  (CommonJS; `getTreeContext(fen)` returns
  `{ current, ancestors, siblings, children } | null`, where each node has
  `.fen`, `.name` and may have `.games`).
- Produces: two new `SeoEntry` slots, read by Task 5:
  - `[10] ancestors: [fen, name][]` — root first, deduplicated by fen
  - `[11] related: [fen, name][]` — siblings and children merged, sorted by
    games descending, truncated to 8
  - `MAX_RELATED = 8` exported from `scripts/generate-seo-lookup.js`

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/seo-lookup-shards.test.js`:

```js
describe('seo-lookup link payload', () => {
  const {
    buildLinks,
    MAX_RELATED,
  } = require('../../scripts/generate-seo-lookup');

  const node = (fen, name, games) => ({ fen, name, games });

  it('puts ancestors root first and drops repeats', () => {
    const { ancestors } = buildLinks({
      ancestors: [
        node('f1', 'Indian Defence'),
        node('f1', 'Indian Defence'),
        node('f2', "King's Indian"),
      ],
      siblings: [],
      children: [],
    });
    expect(ancestors).toEqual([
      ['f1', 'Indian Defence'],
      ['f2', "King's Indian"],
    ]);
  });

  it('merges siblings and children into one list ordered by games', () => {
    const { related } = buildLinks({
      ancestors: [],
      siblings: [
        node('s1', 'Quiet sibling', 10),
        node('s2', 'Busy sibling', 5000),
      ],
      children: [node('c1', 'Busy child', 900)],
    });
    expect(related).toEqual([
      ['s2', 'Busy sibling'],
      ['c1', 'Busy child'],
      ['s1', 'Quiet sibling'],
    ]);
  });

  it('caps related at MAX_RELATED, keeping the most played', () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      node(`s${i}`, `Line ${i}`, i)
    );
    const { related } = buildLinks({
      ancestors: [],
      siblings: many,
      children: [],
    });
    expect(MAX_RELATED).toBe(8);
    expect(related).toHaveLength(8);
    expect(related[0]).toEqual(['s19', 'Line 19']);
    expect(related[7]).toEqual(['s12', 'Line 12']);
  });

  it('treats a missing tree context as no links rather than throwing', () => {
    expect(buildLinks(null)).toEqual({ ancestors: [], related: [] });
  });

  it('sorts a node with no games last rather than treating it as popular', () => {
    const { related } = buildLinks({
      ancestors: [],
      siblings: [node('s1', 'No data'), node('s2', 'Played', 1)],
      children: [],
    });
    expect(related).toEqual([
      ['s2', 'Played'],
      ['s1', 'No data'],
    ]);
  });
});

describe('seo-lookup tuple trimming still applies with the link slots', () => {
  const { buildEntry } = require('../../scripts/generate-seo-lookup');

  it('trims both link slots off an opening that has neither', () => {
    const entry = buildEntry(
      {
        name: 'Lonely Line',
        eco: 'A00',
        moves: '1. a3',
        description: 'd',
        games: null,
      },
      { ancestors: [], related: [] }
    );
    expect(entry).toEqual(['Lonely Line', 'A00', '1. a3', 'd']);
  });

  it('keeps an empty ancestors slot when related has content, so indices do not shift', () => {
    const entry = buildEntry(
      {
        name: 'Root',
        eco: 'A00',
        moves: '1. e4',
        description: 'd',
        games: null,
      },
      { ancestors: [], related: [['f', 'Child']] }
    );
    expect(entry[9]).toBeNull();
    expect(entry[10]).toEqual([]);
    expect(entry[11]).toEqual([['f', 'Child']]);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx jest tests/unit/seo-lookup-shards.test.js -t "link payload"`

Expected: FAIL — `buildLinks is not a function`.

- [ ] **Step 3: Implement `buildLinks` and `buildEntry`**

Add to `scripts/generate-seo-lookup.js`, above `generateSeoLookup`:

```js
// Eight is what fits one readable line in the pre-render. Ancestors are
// uncapped because the chain is short by construction — the deepest opening in
// the corpus is a handful of named positions from the root.
const MAX_RELATED = 8;

/**
 * The links the pre-rendered page carries.
 *
 * Siblings and children go into one list rather than two, ordered by games:
 * the row renders as a single sentence, so grouping siblings first would put a
 * line nobody plays ahead of one they do. A node with no recorded games sorts
 * last rather than first — `|| 0` is doing real work here.
 */
function buildLinks(treeContext) {
  if (!treeContext) return { ancestors: [], related: [] };

  const seen = new Set();
  const ancestors = [];
  for (const node of treeContext.ancestors || []) {
    if (!node || !node.fen || seen.has(node.fen)) continue;
    seen.add(node.fen);
    ancestors.push([node.fen, node.name || 'Unknown Opening']);
  }

  const related = [
    ...(treeContext.siblings || []),
    ...(treeContext.children || []),
  ]
    .filter((node) => node && node.fen)
    .sort((a, b) => (b.games || 0) - (a.games || 0))
    .slice(0, MAX_RELATED)
    .map((node) => [node.fen, node.name || 'Unknown Opening']);

  return { ancestors, related };
}

/** The compact positional payload, with trailing nulls trimmed off the end. */
function buildEntry(row, links) {
  const entry = [
    row.name,
    row.eco,
    row.moves,
    row.description,
    row.games,
    row.white,
    row.draw,
    row.black,
    row.canonical,
    row.sharesName ? 1 : null,
    links.ancestors,
    links.related,
  ];
  // An empty array is not null, so a page with ancestors but no related lines
  // keeps slot 10 and drops slot 11 — the indices below 10 never shift.
  while (
    entry.length > 4 &&
    (entry[entry.length - 1] == null || isEmptyArray(entry[entry.length - 1]))
  ) {
    entry.pop();
  }
  return entry;
}

function isEmptyArray(value) {
  return Array.isArray(value) && value.length === 0;
}
```

- [ ] **Step 4: Wire it into `generateSeoLookup`**

Add near the top of the file, after the other requires:

```js
const TreeService = require('../packages/api/src/services/tree-service');
```

Replace the body of the `for (const row of rows)` loop in `generateSeoLookup`
with:

```js
const treeService = new TreeService();
for (const row of rows) {
  const links = buildLinks(treeService.getTreeContext(row.fen));
  shards[shardForFen(row.fen)][row.fen] = buildEntry(row, links);
}
```

Add to the console summary, after the "Titles disambiguated" line:

```js
const linked = rows.filter(
  (row) => shards[shardForFen(row.fen)][row.fen].length > 10
).length;
console.log(`  Pages carrying internal links: ${linked}`);
```

Extend the module exports:

```js
module.exports = {
  shardForFen,
  positionKey,
  resolveCanonicals,
  readOpenings,
  buildLinks,
  buildEntry,
  MAX_RELATED,
  SHARD_COUNT,
};
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npx jest tests/unit/seo-lookup-shards.test.js` Expected: PASS, all tests
including the pre-existing hash goldens (which do not change — they pin djb2,
not the tuple).

- [ ] **Step 6: Run the generator for real and check the measured cost held**

Run: `node scripts/generate-seo-lookup.js`

Expected output includes `Pages carrying internal links:` at roughly 12,000, and
a size line near `mean 194 KB, largest 235 KB`. The script warns above 300 KB;
if it warns, stop and report rather than raising `SHARD_COUNT`, because the
design signed off on a measured number and a miss means the measurement was
wrong.

- [ ] **Step 7: Commit**

```bash
npm run format
git add scripts/generate-seo-lookup.js tests/unit/seo-lookup-shards.test.js
git commit -m "feat(seo): carry ancestor and related-opening links in the lookup shards"
```

Do not commit the regenerated `packages/web/public/seo-lookup/` — it is a build
artefact written by `build:vercel` and is not in git.

---

### Task 5: Middleware renders the links

The pre-hydration `#root` currently contains a heading, a description and a
win-rate list, and no links at all. This is the change the whole plan exists
for.

**Files:**

- Modify: `middleware.ts` (the `SeoEntry` type and `buildOpeningBody`)
- Test: `tests/unit/seo-middleware.test.js`

**Interfaces:**

- Consumes: slots `[10]` and `[11]` from Task 4.
- Produces: nothing downstream.

- [ ] **Step 1: Write the failing test**

In `tests/unit/seo-middleware.test.js`, extend the `SHARD` fixture. Replace the
`AMAR_FEN` line with:

```js
  [AMAR_FEN]: ['Amar Opening', 'A00', '1. Nh3', DESCRIPTION, 1533432, 0.4284, 0.0498, 0.5216, null, null, [[SHARED_A, "King's Pawn Game"]], [[SHARED_B, 'Paris Gambit'], [DUPLICATE_FEN, 'Amar Gambit']]], // prettier-ignore
```

Then append a new describe block:

```js
describe('SEO middleware — internal links in the pre-render', () => {
  /**
   * The navigator links exist only in the React render, so the pre-hydration
   * body was a dead end and the sitemap was Google's only route into the
   * corpus. 3,615 pages sat in "Discovered - currently not indexed".
   */
  it('renders the ancestor breadcrumb as real anchors', async () => {
    const html = await (await get(openingUrl(AMAR_FEN))).text();
    const body = html.slice(html.indexOf('<div id="root">'));

    expect(body).toContain('Part of:');
    expect(body).toContain(`href="/opening/${encodeURIComponent(SHARED_A)}"`);
    expect(body).toContain("King's Pawn Game");
  });

  it('renders the related lines as real anchors', async () => {
    const html = await (await get(openingUrl(AMAR_FEN))).text();
    const body = html.slice(html.indexOf('<div id="root">'));

    expect(body).toContain('Related lines:');
    expect(body).toContain(`href="/opening/${encodeURIComponent(SHARED_B)}"`);
    expect(body).toContain('Paris Gambit');
    expect(body).toContain('Amar Gambit');
  });

  it('escapes a name that contains markup rather than injecting it', async () => {
    const html = await (await get(openingUrl(AMAR_FEN))).text();
    expect(html).not.toContain('<script>alert');
  });

  it('omits both rows entirely for an opening with no links', async () => {
    const html = await (await get(openingUrl(NO_STATS_FEN))).text();
    const body = html.slice(
      html.indexOf('<div id="root">'),
      html.indexOf('</body>')
    );

    expect(body).toContain('Quiet Line');
    expect(body).not.toContain('Part of:');
    expect(body).not.toContain('Related lines:');
  });

  it('leaves the body well-formed with the link rows present', async () => {
    const html = await (await get(openingUrl(AMAR_FEN))).text();
    const body = html.slice(html.indexOf('<body>'), html.indexOf('</body>'));
    expect((body.match(/<div/g) || []).length).toBe(
      (body.match(/<\/div>/g) || []).length
    );
    expect((body.match(/<a /g) || []).length).toBe(
      (body.match(/<\/a>/g) || []).length
    );
  });
});
```

Add a fixture whose name carries markup, so the escaping test has something to
bite on. Add to `SHARD`:

```js
  [XSS_FEN]: ['Nasty Line', 'A00', '1. h4', 'A sideline.', 5, 0.5, 0.1, 0.4, null, null, [], [['f', '<script>alert(1)</script>']]], // prettier-ignore
```

and define it beside the other FEN constants:

```js
const XSS_FEN = 'rnbqkbnr/pppppppp/8/8/7P/8/PPPPPPP1/RNBQKBNR b KQkq h3 0 1';
```

then change the escaping test to fetch `XSS_FEN` instead of `AMAR_FEN`.

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx jest tests/unit/seo-middleware.test.js -t "internal links"`

Expected: FAIL — "Part of:" is not in the body.

- [ ] **Step 3: Widen the `SeoEntry` type**

In `middleware.ts`, add two members to the tuple type:

```ts
type SeoLink = [fen: string, name: string];

type SeoEntry = [
  name: string,
  eco: string,
  moves: string,
  description?: string,
  games?: number | null,
  white?: number | null,
  draw?: number | null,
  black?: number | null,
  canonical?: string | null,
  sharesName?: 1 | null,
  ancestors?: SeoLink[] | null,
  related?: SeoLink[] | null,
];
```

- [ ] **Step 4: Render the rows**

In `middleware.ts`, add above `buildOpeningBody`:

```ts
/**
 * A row of links, or nothing at all. An empty row would be a label with no
 * content — worse than its absence for both a reader and a crawler.
 */
function buildLinkRow(
  label: string,
  links: SeoLink[] | null | undefined,
  separator: string
): string {
  if (!links || links.length === 0) return '';
  const anchors = links
    .map(
      ([fen, name]) =>
        `<a href="/opening/${encodeURIComponent(fen)}" style="color:var(--color-brand-orange)">${escapeHtml(name)}</a>`
    )
    .join(separator);
  return `<p style="color:var(--color-text-secondary);margin:0 0 .5rem">${label} ${anchors}</p>`;
}
```

In `buildOpeningBody`, widen the destructure and append the rows. Replace the
first line:

```ts
const [
  ,
  ,
  moves,
  description,
  games,
  white,
  draw,
  black,
  ,
  ,
  ancestors,
  related,
] = entry;
```

and add before the `return`:

```ts
// The links the navigator already draws after hydration, in the HTML a
// crawler reads without it. Ancestors use › because they are a path;
// related lines use · because they are a set.
parts.push(buildLinkRow('Part of:', ancestors, ' › '));
parts.push(buildLinkRow('Related lines:', related, ' · '));
```

`parts.join('')` already tolerates the empty strings `buildLinkRow` returns for
a page with no links.

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npx jest tests/unit/seo-middleware.test.js` Expected: PASS, the whole
file.

- [ ] **Step 6: Mutate to prove the coverage is real**

Change `buildLinkRow` to `return '';` unconditionally and run
`npx jest tests/unit/seo-middleware.test.js`.

Expected: FAIL on both "renders the ancestor breadcrumb" and "renders the
related lines". Revert.

Then remove the `escapeHtml(name)` call, leaving `${name}`, and re-run.

Expected: FAIL on "escapes a name that contains markup". Revert.

- [ ] **Step 7: Verify against the real built HTML**

Run: `node scripts/generate-seo-lookup.js && npm run build:web`

Then start the preview and fetch an opening page as a crawler would. The
middleware does not run under `vite preview`, so verify the shard content
directly instead:

```bash
node -e "const fs=require('fs');const {shardForFen}=require('./scripts/generate-seo-lookup');const fen='rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';const s=JSON.parse(fs.readFileSync('packages/web/public/seo-lookup/'+shardForFen(fen).toString(16)+'.json','utf8'));console.log(JSON.stringify(s[fen],null,1))"
```

Expected: the entry prints with slots 10 and 11 populated with `[fen, name]`
pairs.

- [ ] **Step 8: Commit**

```bash
npm run format
git add middleware.ts tests/unit/seo-middleware.test.js
git commit -m "feat(seo): render ancestor and related-opening links before hydration"
```

---

### Task 6: Honest per-URL `lastmod`

The sitemap index stamps `new Date()` on every deploy and the URLs carry no
`lastmod` at all. A date that always says "now" is one Google learns to
discount.

**Files:**

- Modify: `scripts/generate-sitemaps.js`
- Test: `tests/unit/generate-sitemaps.test.js` (new)

**Interfaces:**

- Consumes: nothing from earlier tasks.
- Produces: `dataLastModified(): string` exported from
  `scripts/generate-sitemaps.js`, returning `YYYY-MM-DD`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/generate-sitemaps.test.js`:

```js
const fs = require('fs');
const path = require('path');

const {
  dataLastModified,
  tierFor,
  URLS_PER_SITEMAP,
} = require('../../scripts/generate-sitemaps');

const ROOT = path.join(__dirname, '..', '..');

describe('sitemap lastmod tells the truth about the data', () => {
  /**
   * The index used to stamp `new Date()` on every deploy, and the URLs carried
   * no lastmod at all. A date that always says "now" for 12,106 URLs is a claim
   * that is false for almost all of them, and Google discounts a lastmod it
   * cannot trust. The openings change when their pipelines rewrite these files,
   * so that is the date worth sending.
   */
  it('is a plain YYYY-MM-DD date', () => {
    expect(dataLastModified()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('is the newest mtime across the ECO shards and the popularity stats', () => {
    const sources = [
      ...['ecoA', 'ecoB', 'ecoC', 'ecoD', 'ecoE'].map((n) =>
        path.join(ROOT, 'api', 'data', 'eco', `${n}.json`)
      ),
      path.join(ROOT, 'api', 'data', 'popularity_stats.json'),
    ].filter((file) => fs.existsSync(file));

    const newest = Math.max(
      ...sources.map((file) => fs.statSync(file).mtimeMs)
    );
    expect(dataLastModified()).toBe(
      new Date(newest).toISOString().slice(0, 10)
    );
  });

  it('is not simply today, unless the data really did change today', () => {
    // Guards the regression directly: a `new Date()` implementation passes the
    // two tests above on the day the data changed and lies every other day.
    const source = fs.readFileSync(
      path.join(ROOT, 'scripts', 'generate-sitemaps.js'),
      'utf-8'
    );
    expect(source).not.toMatch(/const lastmod = new Date\(\)/);
  });
});

describe('sitemap tiers are unchanged by the lastmod work', () => {
  it('puts the first 2000 openings in the weekly tier', () => {
    expect(tierFor(0).changefreq).toBe('weekly');
    expect(tierFor(1999).priority).toBe('0.9');
    expect(tierFor(2000).changefreq).toBe('monthly');
  });

  it('still chunks at 2000 URLs per file', () => {
    expect(URLS_PER_SITEMAP).toBe(2000);
  });
});
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npx jest tests/unit/generate-sitemaps.test.js`

Expected: FAIL — `dataLastModified is not a function`.

- [ ] **Step 3: Implement `dataLastModified` and use it**

In `scripts/generate-sitemaps.js`, add after the `PRIMARY_SITE_URL` block:

```js
const DATA_DIR = path.join(__dirname, '..', 'api', 'data');
const DATA_SOURCES = [
  ...['ecoA', 'ecoB', 'ecoC', 'ecoD', 'ecoE'].map((name) =>
    path.join(DATA_DIR, 'eco', `${name}.json`)
  ),
  path.join(DATA_DIR, 'popularity_stats.json'),
];

/**
 * The date the openings last changed, not the date we last deployed.
 *
 * These files are rewritten wholesale by their pipelines rather than per
 * opening, so one date covers every URL. Stamping today on 12,106 URLs every
 * deploy is a claim that is false for almost all of them, and a lastmod that
 * always says now is one Google stops reading.
 */
function dataLastModified() {
  const times = DATA_SOURCES.filter((file) => fs.existsSync(file)).map(
    (file) => fs.statSync(file).mtimeMs
  );
  if (times.length === 0) {
    throw new Error('Could not stat any opening data file to derive lastmod');
  }
  return new Date(Math.max(...times)).toISOString().slice(0, 10);
}
```

Change `urlEntry` to carry the date:

```js
function urlEntry({ loc, priority, changefreq, lastmod }) {
  return (
    `<url><loc>${xmlEscape(PRIMARY_SITE_URL + loc)}</loc>` +
    `<lastmod>${lastmod}</lastmod>` +
    `<changefreq>${changefreq}</changefreq>` +
    `<priority>${priority}</priority></url>`
  );
}
```

In `generateSitemaps`, replace
`const lastmod = new Date().toISOString().slice(0, 10);` with
`const lastmod = dataLastModified();` and move it above the `entries`
assignment. Then pass it through both call sites:

```js
const entries = STATIC_PAGES.map((page) =>
  urlEntry({ ...page, lastmod })
).concat(
  indexable.map((row, rank) => {
    const tier = tierFor(rank);
    return urlEntry({
      loc: `/opening/${encodeURIComponent(row.fen)}`,
      priority: tier.priority,
      changefreq: tier.changefreq,
      lastmod,
    });
  })
);
```

Extend the exports:

```js
module.exports = {
  generateSitemaps,
  dataLastModified,
  tierFor,
  URLS_PER_SITEMAP,
};
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npx jest tests/unit/generate-sitemaps.test.js` Expected: PASS.

- [ ] **Step 5: Run the generator and check the output**

Run:
`node scripts/generate-sitemaps.js && head -c 400 packages/web/public/sitemaps/sitemap-1.xml`

Expected: each `<url>` carries a `<lastmod>` and the `lastmod:` line in the
summary is the data's date, not necessarily today.

- [ ] **Step 6: Commit**

```bash
npm run format
git add scripts/generate-sitemaps.js tests/unit/generate-sitemaps.test.js
git commit -m "fix(seo): derive sitemap lastmod from the data, not the deploy"
```

---

### Task 7: Documentation

Every rule in this plan that could be undone by someone who did not read it
needs to be written where they will look.

**Files:**

- Modify: `AGENTS.md` (the "Deployment and SEO" gotchas)
- Modify: `.github/memory-bank/activeContext.md`,
  `.github/memory-bank/progress.md`

- [ ] **Step 1: Add the gotchas**

Append to the "Deployment and SEO" section of `AGENTS.md`. Use the `Write` or
`Edit` tool, not a shell heredoc — writing about the test-integrity hook in a
heredoc trips it.

```markdown
- **`STATIC_ROUTES` is the one list of what is a page.** `App.tsx` builds its
  route table from it as a `Record<StaticRoute, ReactElement>`, so adding a
  route without listing it does not compile; `middleware.ts` decides what to 404
  from the same constant, and `repo-invariants.test.js` asserts it still reads
  it. Before this, the middleware passed everything it did not recognise through
  to `index.html`, and `<Route path="*">` rendered the landing page at 200 — 42
  soft 404s in Search Console. A path containing `.` is handed to the origin
  untouched: the matcher already excludes the build's static files, but a 404
  over a real asset is worse than the bug this fixes.

- **The pre-render carries links, and that is the point.** Slots `[10]` and
  `[11]` of the `SeoEntry` tuple hold ancestor and related-opening links,
  computed at build time by `TreeService` and rendered into `#root` by
  `buildOpeningBody`. `OpeningNavigator` and `OpeningTree` draw the same links
  after hydration; before August 2026 that was the _only_ place they existed, so
  a crawler that did not run the JS found 12,106 dead ends and the sitemap was
  Google's sole route in — 3,615 pages sat in "Discovered — currently not
  indexed" while 5,750 indexed pages earned 4,810 impressions in 90 days. **Do
  not take the links back out of the pre-render**, and note that empty arrays
  are trimmed like trailing nulls, so read both slots defensively.

- **Sitemap `lastmod` is the data's mtime, not the build's clock.** It comes
  from the newest mtime across `api/data/eco/*.json` and `popularity_stats.json`
  via `dataLastModified()`. Stamping the deploy date on 12,106 URLs every push
  is false for almost all of them, and a `lastmod` that always says now is one
  Google stops reading. `generate-sitemaps.test.js` fails the build if
  `new Date()` comes back.
```

- [ ] **Step 2: Update the memory bank**

**Replace** the current-task section of `.github/memory-bank/activeContext.md` —
never append; the file is capped at 50 lines and holds the current task plus the
previous one only. Demote whatever was the current task to "Previous task", and
move the detail it loses to `archive.md`. The new section:

```markdown
## Current task — crawl graph for the opening corpus

The July de-indexing fix worked (production serves real pre-hydration content,
descriptions are real for all 12,377 openings) but impressions did not recover:
5,750 pages indexed earned 4,810 impressions in the 90 days to 2026-08-26, at
average position 12. The pages are indexed and not served.

Cause: nothing links into the corpus. The navigator links existed only in the
React render, so the sitemap was Google's only route in and 3,615 pages sat in
"Discovered — currently not indexed".

Shipped: ancestor and related-opening links in the middleware pre-render
(`SeoEntry` slots 10/11, built by `TreeService` at build time); a real 404 for
paths that are not pages, driven by a shared `STATIC_ROUTES` constant;
`/personal-explorer` moved to a `vercel.json` 301; sitemap `lastmod` derived
from the data's mtime.

Deferred with reasons in `docs/proposals/2026-08-28-crawl-graph-design.md` §7:
slug URLs (696 slugs collide across 2,142 pages) and family/ECO hub pages.

Success metric: "Discovered — currently not indexed", 3,615 on 2026-08-28,
re-checked in four to eight weeks. Not impressions.
```

Add one line to `.github/memory-bank/progress.md` (capped at 100 lines, one line
per completed task), matching the existing format:

```markdown
- Crawl graph: internal links in the SEO pre-render, real 404s for non-pages,
  honest sitemap lastmod (2026-08-28)
```

- [ ] **Step 3: Commit**

```bash
npm run format
git add AGENTS.md .github/memory-bank/
git commit -m "docs: record the crawl-graph rules as gotchas"
```

---

### Task 8: Full verification before the PR

**Files:** none modified.

- [ ] **Step 1: Run everything**

```bash
npm run test:all
```

Expected: PASS. This is what the husky `pre-push` hook runs, so a failure here
blocks the push anyway.

- [ ] **Step 2: Type-check and lint**

```bash
npm run build && npm run format:check
```

Expected: PASS, including the `Record<StaticRoute, ReactElement>` guard from
Task 2.

- [ ] **Step 3: Run the full production build the way Vercel does**

```bash
npm run build:vercel
```

Expected: PASS. Confirm the generator's size summary is near
`mean 194 KB, largest 235 KB` and that no
`WARNING: largest shard exceeds 300 KB` appears. The build is expected to take
roughly 18s longer than before.

- [ ] **Step 4: Open the PR**

Branch off `main`, push, and open a PR. The body should state what changed, the
measured shard growth, and that the success metric is "Discovered – currently
not indexed" (3,615 on 2026-08-28) over the following four to eight weeks — not
impressions.

Per AGENTS.md: do not schedule a recurring check-in on the PR, and unsubscribe
from PR activity once CI is green.

---

## Post-merge

Nothing to do for several weeks. The metric is Search Console's "Discovered –
currently not indexed", which was **3,615** on 2026-08-28. If it has not fallen
meaningfully in four to eight weeks, the hypothesis in the design doc was wrong
and hub pages are the next lever — not more of this.
