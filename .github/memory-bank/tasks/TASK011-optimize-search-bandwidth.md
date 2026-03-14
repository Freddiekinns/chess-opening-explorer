# Task 011: Optimize Search Bandwidth & Resolve Vercel Data Limits

## Context

In March 2026, the Vercel "Fast Origin Transfer" threshold hit 20.39 GB, vastly
exceeding the 10 GB Hobby tier limit. Analytics showed a spike of ~3,900 page
views from only ~26 visitors, typical of a web crawler (like Googlebot) indexing
the site.

## Root Cause Investigation

1. **The Payload:** Components like `GlobalHeader.tsx` and
   `OpeningDetailPage.tsx` were executing `fetch('/api/openings/all')` on every
   component mount to power the client-side `SearchBar.tsx`.
2. **The Size:** The backend executed `ecoService.getAllOpenings()`, returning
   every opening, all `analysis_json` descriptions, fens, style tags, and
   statistics. This monolithic JSON payload is **24.8 MB** per request.
3. **The Multiplier:** When a crawler visits 3,907 pages, the serverless
   function regenerates and sends this 25 MB file every single time (3907 \*
   24.8 MB = ~96.8 GB of transfer).
4. **Vercel Billing:** Because the Express endpoints inside Vercel's `api/`
   directory lacked Edge Cache headers (`Cache-Control: s-maxage=X`), Vercel
   treated every hit as dynamic, passing the data out of the Lambda function and
   counting it against the strict "Fast Origin Transfer" quota, rather than the
   more generous 100 GB "Fast Data Transfer" quota.

## Solution Matrix

### Option 1: Switch to `search-index` Endpoint (Client-Side)

Swap `/api/openings/all` for `/api/openings/search-index` which strips out the
heavy descriptions and plans.

- **Pros:** Immediate 94% payload reduction (24.8 MB -> 1.6 MB). Very fast
  client-side typing since data remains local. Easy to implement.
- **Cons:** **Severe degradation of search quality**. The frontend
  `SearchBar.tsx` currently relies on `analysis_json.description` and
  `style_tags` to score matches. The search index removes these, meaning
  searches for "Aggressive" or "Solid" will stop returning correct results.

### Option 2: Server-Side Semantic Search (Recommended)

Refactor `SearchBar.tsx` to stop pre-fetching data on load. Instead, use an
`onChange` debouncer to query the already existing backend endpoint
`/api/openings/semantic-search?q=...`.

- **Pros:**
  - Near-zero initial payload (solves the 24.8 MB download permanently).
  - Highly secure against crawlers (they don't trigger typing events).
  - **Improved Search Quality:** The backend uses `Fuse.js` with weighted keys,
    move pattern detection, and intent parsing, which is vastly superior to the
    current frontend `.includes()` implementation.
- **Cons:**
  - Slight network latency when a user types (depends on Vercel cold starts).
  - Requires a moderate frontend refactor to handle async search states, loading
    spinners, and debouncing.

### Option 3: Static Pre-computed JSON in `/public`

Run a build script to generate a static `search-data.json` file containing
everything the frontend needs, and place it in the `packages/web/public/`
folder.

- **Pros:** Served by Vercel's static Edge network. It counts toward the 100 GB
  "Fast Data Transfer" limit rather than the 10 GB Origin limit. Highly
  cacheable by the browser.
- **Cons:** Mobile users still have to download a huge file to use the menu bar,
  ruining Time-to-Interactive (TTI) performance metrics.

### Option 4: Client-Side IndexedDB Caching (PWA Approach)

Download the 24 MB file once, but cache it deeply in the browser's IndexedDB.

- **Pros:** Search remains instantly fast. Subsequent page loads use zero
  bandwidth.
- **Cons:** High complexity. The very first page load for a new human user is
  still exceptionally slow, and crawlers (which don't persist IndexedDB across
  isolated sessions) would still pull the 24MB payload on every URL hit unless
  Edge Caching is perfect.

## Recommended Action Plan

To keep search as strong as possible while completely eliminating the Fast
Origin Transfer risk, we must decouple the search bar from massive pre-loads.

**Phase 1: Edge Caching (Hotfix)**

- Inject `Cache-Control: max-age=0, s-maxage=86400, stale-while-revalidate` into
  all Vercel `api/*.js` wrapper files to immediately prevent the serverless
  environments from re-streaming identical 25MB payloads on a crawl.

**Phase 2: Transition to Server-Side Search (Architecture Fix)**

- Update `GlobalHeader.tsx` and `OpeningDetailPage.tsx` to remove the
  `fetch('/api/openings/all')` call on mount.
- Refactor `SearchBar.tsx`:
  - Add a debounce utility (e.g., 300ms delay).
  - Implement an async `fetch('/api/openings/semantic-search?q=...')` when the
    user types.
  - Render the returned lightweight results (usually <5KB).

**Phase 3: Fallback Pre-fetching (Optional Optimization)**

- If serverless cold-starts make the search feel sluggish, we can configure a
  lightweight pre-warm ping on hover of the search bar, or migrate the Fuse.js
  index to a specialized edge data store (like empty Vercel Edge Config or
  Redis) in the future.

## Implementation — Completed 2026-03-14

### What Was Done

**Phase 1 (Edge Caching) + Phase 2 (Architecture Fix) shipped together.**

| Change                          | File(s)                                               | Detail                                                                                      |
| ------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Edge cache headers              | `vercel.json`                                         | `s-maxage=3600` + `stale-while-revalidate=86400` on static routes; `s-maxage=300` on search |
| GlobalHeader server-side search | `packages/web/src/components/layout/GlobalHeader.tsx` | Removed 24.8 MB preload. 300ms debounced `/api/openings/semantic-search`. Loading spinner.  |
| DetailPage lighter endpoint     | `packages/web/src/pages/OpeningDetailPage.tsx`        | Switched `/api/openings/all` → `/api/openings/search-index` (1.6 MB, 94% smaller)           |
| SearchBar resilience            | `packages/web/src/components/shared/SearchBar.tsx`    | `handleGo` uses current suggestions when `openingsData` is empty                            |
| Test mock updates               | 4 test files                                          | Mocks updated from `/all` to `/search-index`                                                |

### Bandwidth Impact

| Scenario                          | Before                | After                                       |
| --------------------------------- | --------------------- | ------------------------------------------- |
| Single page visit (header+detail) | 2 × 24.8 MB = 49.6 MB | 0 MB (header) + 1.6 MB (detail, CDN-cached) |
| Crawler indexing 3,900 pages      | ~96.8 GB origin       | ~0 MB (CDN-cached, no preload triggers)     |
| User typing 5 searches            | 0 extra (pre-loaded)  | ~25 KB (5 × ~5 KB server responses)         |

### Validation

- TypeScript: `tsc --noEmit` clean
- Frontend: 147/147 tests pass
- Backend: all test suites pass
- No remaining references to `/api/openings/all` in `packages/web/src/`

### Decisions & Trade-offs

- **GlobalHeader uses server-only search** (no client-side data). Acceptable
  because the backend semantic search is superior to the old `.includes()`
  filter, and the header is a simple autocomplete.
- **OpeningDetailPage uses `/search-index`** (not server-only) to preserve
  SearchBar's instant Tier 1 results for ECO codes, chess moves, and
  abbreviations. "Surprise me" button only appears on LandingPage (which still
  loads search-index data), so no feature loss.
- **Phase 3 deferred.** No cold-start complaints yet. Revisit if users report
  sluggish search on first keystroke.

## Prevention Checklist

To avoid repeating this class of issue:

1. **Never fetch large payloads on component mount** — prefer server-side search
   or paginated endpoints for any dataset > 100 KB.
2. **Always set `Cache-Control` headers** on new API routes in `vercel.json`.
   Static data: `s-maxage=3600, stale-while-revalidate=86400`. User-specific
   data: `private, no-store`.
3. **Monitor Vercel usage dashboard** monthly — check Fast Origin Transfer stays
   under 5 GB (50% of limit).
4. **Crawlers amplify everything** — any payload fetched on page render will be
   multiplied by the number of indexed pages (~12,000+). Design for the crawler
   case, not just the single-user case.
