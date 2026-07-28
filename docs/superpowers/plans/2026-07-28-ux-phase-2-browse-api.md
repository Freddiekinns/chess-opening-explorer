# UX Review Phase 2 — Browse API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** One endpoint that returns a filtered, sorted, paginated page of
openings **and** the facet counts for the filter bar, computed over the same
corpus in the same request — so the numbers on screen cannot disagree.

**Architecture:** A new `BrowseService` builds a compact in-memory index of all
12,377 openings once per cold start (cached in the existing global cache), then
answers every browse query from that index by filter → facet → sort → slice. The
facet vocabulary (levels, styles, sort keys) lives in
`config/browse_facets.json` so it is data, not code — matching how
`config/video_matching.json` and `config/study_matching.json` already work. A
thin route in `openings.routes.js` parses and clamps query params. **No UI in
this phase.**

**Tech Stack:** Node 18 + Express (CommonJS), Jest + supertest.

**Spec:** `docs/superpowers/specs/2026-07-27-ux-review-implementation-design.md`
§5 Phase 2. Consumed by Phase 3 (faceted filter bar).

**Depends on:** nothing in Phases 0–1 functionally. Branch position only (see
Global Constraints).

---

## Global Constraints

- **Branch:** `ux/phase-2-browse-api`, branched from `ux/phase-1-discover`
  (Phases 0 and 1 are open as PRs #58 and #59 and not yet merged into
  `feat/ux-review`; stacking keeps the chain reviewable). PR goes **into
  `ux/phase-1-discover`**, never `main`.
- **No UI changes in this phase.** Not one file under `packages/web/`. The spec
  is explicit: the endpoint lands first so the bar is never built on numbers
  that do not reconcile. Do not "just wire it up while you're here".
- **Every new route needs a `Cache-Control` entry in `vercel.json`**
  (CLAUDE.md). Crawlers index 12,000+ pages and amplify unbounded payloads into
  origin transfer bills.
- **Page size is capped.** `pageSize` default 24, hard max 48. A caller asking
  for 5,000 gets 48.
- **Never fabricate data.** Win rates come from `popularity_stats.json` or are
  `null` — never defaulted, never synthesised. `getOpeningsByFamily` in
  `eco-service.js:693` seeds a placeholder with `Math.random()`; do not copy
  that pattern, and do not call that method.
- **Sorting must never change set membership.** A sort option that needs a
  minimum-sample filter (any win-rate sort) would make `total` depend on `sort`
  and break the reconciliation invariant below. Rejected — recorded here so it
  is not re-proposed.
- **The reconciliation invariant, stated once:**
  `total === offset + items.length + remaining`, where `total` is the count of
  the filtered set, `offset` is `(page - 1) * pageSize`, and `remaining` is what
  the "Load more (N remaining)" button will show. This is the bug the review
  found and the reason the phase exists.
- **Facet counts use standard faceted-search semantics:** each facet dimension
  is counted with **its own filter excluded** and all other filters applied.
  Without this, selecting a level makes every other level read 0 and the bar
  becomes a dead end.
- **CommonJS**, `require`/`module.exports`, matching every other file in
  `packages/api/src/`.
- **No `console.log` in production code** (CLAUDE.md). `console.warn` for
  cold-start timing only, matching `eco-service.js:106`.
- **Prettier** before committing (`npm run format`). Ignore local `format:check`
  line-ending noise — CRLF working tree vs `endOfLine: lf`.
- **Backend tests** live at repo root in `tests/unit/`, run with
  `npx jest --testPathIgnorePatterns='\.worktrees'`.

---

## Data facts (measured 2026-07-28, do not re-derive)

Every number below was measured against `api/data/`. The plan's expected test
values depend on them.

| Fact                                    | Value                                                                                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Total positions                         | **12,377** — all five `api/data/eco/eco{A..E}.json` merged                                                                                             |
| Positions with `analysis_json`          | 12,377 (100%)                                                                                                                                          |
| Positions with `family_id`              | 12,377 (100%)                                                                                                                                          |
| Positions with popularity stats         | 12,377 (100%) in `api/data/popularity_stats.json` → `.positions`                                                                                       |
| `analysis_json.complexity` distribution | Advanced **7,611** · Intermediate **4,587** · Beginner **179**                                                                                         |
| Distinct raw `style_tags`               | **265**, freeform, with synonym pairs ("Counter-attacking" 3,228 / "Counterattacking" 454; "Closed Position" 1,239 / "Closed Game" 820 / "Closed" 438) |
| Distinct `family_id` values             | **29** — the 28 in `api/data/families.json` plus `uncategorised` (192 openings), which has **no entry** in families.json                               |
| Largest families                        | sicilian 1,710 · kings-indian 1,057 · queens-gambit 1,041 · irregular 940 · ruy-lopez 805                                                              |

**Two findings that shape the design:**

1. **Raw style tags cannot be a facet.** Openings carry ~7 style tags each and
   the top tags are near-universal ("Strategic" 8,501, "Dynamic" 7,912). Any
   grouping that lets an opening belong to several style buckets gives every
   bucket ~50% of the corpus — a filter that filters nothing. **Each opening is
   therefore assigned exactly one primary style**, so the style facet partitions
   the corpus and its counts sum to the total.

2. **"Level" is heavily skewed.** 61% of the corpus is Advanced and 1.4% is
   Beginner. That is the enrichment's judgement, not a bug we can fix here, and
   the facet must show it honestly rather than hide it. Recorded as a follow-up,
   not fixed in this phase.

### The primary-style rule

Measured distribution under this exact rule — the test in Task 3 asserts these
numbers:

| Style        | Count      |
| ------------ | ---------- |
| `positional` | **3,585**  |
| `aggressive` | **3,168**  |
| `gambit`     | **2,182**  |
| `solid`      | **1,271**  |
| `tactical`   | **1,100**  |
| `system`     | **1,068**  |
| _(unstyled)_ | **3**      |
| **Sum**      | **12,377** |

The rule, in order:

1. If the opening's `style_tags` contain `Gambit` or `Sacrificial` → `gambit`.
   Gambit is the most specific and most recognisable label, so it wins outright
   rather than competing on score (under pure scoring it collapses to 220,
   because generic buckets out-score it).
2. Otherwise score each remaining bucket as **the number of its tags present**
   and take the highest score.
3. Ties break by the fixed order
   `aggressive, tactical, positional, solid, system` (first wins). Iterating in
   that order with a strict `>` comparison gives exactly this.
4. No bucket matches → style is `null`. Three openings land here. They appear in
   unfiltered results and in no style facet — never bucketed into a style they
   do not have.

---

## File Structure

**Created:**

| File                                          | Responsibility                                                                                                             |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `config/browse_facets.json`                   | The facet vocabulary: level values, style buckets and their raw tags, sort keys, page-size limits. Single source of truth. |
| `packages/api/src/services/browse-service.js` | Builds the compact index once; filters, facets, sorts and paginates. All the arithmetic lives here.                        |
| `tests/unit/browse-service.test.js`           | Unit tests against a small synthetic corpus — the arithmetic, the style rule, the facet semantics.                         |
| `tests/unit/browse-endpoint.test.js`          | Route tests via supertest — param parsing, clamping, error shapes, response contract.                                      |
| `tests/integration/browse-corpus.test.js`     | Runs the real service against the real `api/data/` corpus and asserts the measured totals above.                           |

**Modified:**

| File                                         | Change                                                                                        |
| -------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `packages/api/src/routes/openings.routes.js` | Add `GET /browse`. Nothing else changes.                                                      |
| `vercel.json`                                | Add a `Cache-Control` header entry for `/api/openings/browse`.                                |
| `.github/memory-bank/activeContext.md`       | Replace the current-task section (stay under 50 lines).                                       |
| `.github/memory-bank/progress.md`            | One line at the top of "What's Done"; drop Phase 2 from "What's Left" (stay under 100 lines). |

**Not touched:** anything under `packages/web/`, `api/openings.js` (the wrapper
mounts the whole router — a new route needs no wrapper change), and
`eco-service.js` (the browse service reads the same files independently rather
than reshaping a method five other routes depend on).

---

## The response contract

```
GET /api/openings/browse?level=Beginner&style=gambit&family=sicilian&sort=popular&page=1&pageSize=24

200 {
  success: true,
  items: [ { fen, name, eco, moves, family_id, family_name, level, style,
             games_analyzed, white_win_rate, draw_rate, black_win_rate,
             avg_rating, analysis_json: { complexity, style_tags } } ],
  total: 137,          // the filtered total — the number the UI shows
  page: 1,
  pageSize: 24,
  offset: 0,
  remaining: 113,      // total - offset - items.length; the Load more number
  facets: {
    level:  [ { value: 'Beginner', label: 'Beginner', count: 12 }, ... ],
    style:  [ { value: 'gambit',   label: 'Gambit',   count: 40 }, ... ],
    family: [ { value: 'sicilian', label: 'Sicilian Defense', count: 137 }, ... ]
  },
  applied: { level: 'Beginner', style: 'gambit', family: 'sicilian', sort: 'popular' }
}
```

Notes an implementer will otherwise get wrong:

- **`success: true` sits alongside `items`, not wrapping it.** The spec writes
  the shape as `{ items, total, facets }`; every other route in this file uses a
  `{ success, data }` envelope. This keeps the spec's field names at the top
  level and adds `success` for consistency with the rest of the router. Do not
  nest `items` under `data`.
- **`analysis_json` is included, slimmed to `{ complexity, style_tags }`.**
  `OpeningCard` reads `opening.analysis_json?.complexity`
  (`OpeningCard.tsx:83`), so Phase 3 can pass a browse item straight into the
  existing card with no adapter. The full `analysis_json` (descriptions, plans,
  books) is ~2 kB per opening and is **excluded** — 48 of those would be a 100
  kB page.
- **`level` mirrors `analysis_json.complexity`** as a flat field for filtering.
  Both are present on purpose; they never disagree because both are derived from
  the same source at index time.
- **`family_name`** is the display name from `families.json`, or **`'Other'`**
  for `uncategorised`, which has no entry. Do not emit the raw id as a label.
- **`applied`** echoes what the server actually used after clamping and
  validation, so the UI never has to guess whether an unknown value was
  honoured.
- **Unknown facet values are a 400**, not a silent empty result. `?style=banana`
  returning `total: 0` is indistinguishable from a genuine empty filter and
  would send Phase 3 hunting for a data bug.

---

## Task 1: The facet vocabulary

**Files:**

- Create: `config/browse_facets.json`

No test of its own — Tasks 2 and 3 consume it and assert against it.

- [ ] **Step 1: Write the config**

```json
{
  "_comment": "Facet vocabulary for GET /api/openings/browse. Single source of truth — the browse service reads it, nothing hardcodes these lists. Style buckets are evaluated by the rule in browse-service.js: gambitOverride first, then highest tag-match count, ties broken by array order here.",
  "pageSize": {
    "default": 24,
    "max": 48
  },
  "levels": [
    { "value": "Beginner", "label": "Beginner" },
    { "value": "Intermediate", "label": "Intermediate" },
    { "value": "Advanced", "label": "Advanced" }
  ],
  "gambitOverride": {
    "value": "gambit",
    "label": "Gambit",
    "tags": ["Gambit", "Sacrificial"]
  },
  "styles": [
    {
      "value": "aggressive",
      "label": "Aggressive",
      "tags": [
        "Aggressive",
        "Attacking",
        "Sharp",
        "Double-edged",
        "Unbalanced",
        "Imbalanced",
        "Unbalanced Position"
      ]
    },
    {
      "value": "tactical",
      "label": "Tactical",
      "tags": [
        "Tactical",
        "Counter-attacking",
        "Counterattacking",
        "Initiative",
        "Provocative"
      ]
    },
    {
      "value": "positional",
      "label": "Positional",
      "tags": [
        "Positional",
        "Maneuvering",
        "Prophylactic",
        "Closed Position",
        "Closed Game",
        "Closed",
        "Space Advantage"
      ]
    },
    {
      "value": "solid",
      "label": "Solid",
      "tags": ["Solid", "Quiet", "Classical"]
    },
    {
      "value": "system",
      "label": "System",
      "tags": ["System-based", "Flexible", "Transpositional", "Hypermodern"]
    }
  ],
  "sorts": [
    { "value": "popular", "label": "Most played" },
    { "value": "name", "label": "A–Z" }
  ],
  "defaultSort": "popular"
}
```

Two sort options is not an oversight. Win-rate sorts were rejected in the Global
Constraints; `avg_rating` was rejected as speculative. If Phase 3 wants more,
add them here — the service reads this file.

**Load it with a static `require()`, never `fs.readFileSync(path.join(...))`.**
This is the first runtime API code to read from `config/` — the two existing
consumers (`youtube-service.js`, `video-processor.js`) are pipeline scripts that
never run on Vercel, and they use a computed path. A computed path is invisible
to Vercel's file tracer, so the file would be missing from the deployed function
and the endpoint would 500 in production while passing every local test. A
literal `require()` specifier is traced and bundled.

- [ ] **Step 2: Verify it parses**

Run:
`node -e "const c=require('./config/browse_facets.json'); console.log(c.styles.length, c.levels.length, c.sorts.length)"`
Expected: `5 3 2`

- [ ] **Step 3: Commit**

```bash
git add config/browse_facets.json
git commit -m "feat(browse): facet vocabulary for the browse endpoint"
```

---

## Task 2: BrowseService — index and the primary-style rule

**Files:**

- Create: `packages/api/src/services/browse-service.js`
- Test: `tests/unit/browse-service.test.js`

**Interfaces:**

- Consumes: `config/browse_facets.json` (Task 1);
  `packages/api/src/utils/path-resolver` (`getECODataPath`,
  `getPopularityStatsPath`, `getDataPath`);
  `packages/api/src/services/cache-service` (`getGlobalCache`).
- Produces: `class BrowseService` with
  - `buildIndex(): IndexEntry[]` — cached, all openings projected
  - `primaryStyle(styleTags: string[]): string | null`
  - `browse(params): { items, total, page, pageSize, offset, remaining, facets, applied }`
  - `getConfig(): object` — the parsed vocabulary, for the route's validation
  - `clearCache(): void` — for tests

  `IndexEntry` =
  `{ fen, name, eco, moves, family_id, family_name, level, style, style_tags, games_analyzed, white_win_rate, draw_rate, black_win_rate, avg_rating }`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/browse-service.test.js`:

```js
const path = require('path');

jest.mock('fs');
jest.mock('../../packages/api/src/utils/path-resolver', () => ({
  getECODataPath: jest.fn(() => '/mock/eco'),
  getPopularityStatsPath: jest.fn(() => '/mock/popularity_stats.json'),
  getDataPath: jest.fn((f) => `/mock/${f}`),
}));

const FEN = (n) => `fen-${n}`;

// Nine openings: enough to exercise every bucket, the gambit override, the
// tie-break, the unstyled case and pagination.
const ECO_FIXTURE = {
  [FEN(1)]: {
    name: 'Alpha Gambit',
    eco: 'A01',
    moves: '1. e4 e5',
    family_id: 'sicilian',
    analysis_json: {
      complexity: 'Beginner',
      style_tags: ['Gambit', 'Positional'],
    },
  },
  [FEN(2)]: {
    name: 'Bravo Attack',
    eco: 'B02',
    moves: '1. e4 c5',
    family_id: 'sicilian',
    analysis_json: {
      complexity: 'Advanced',
      style_tags: ['Aggressive', 'Sharp', 'Solid'],
    },
  },
  [FEN(3)]: {
    name: 'Charlie System',
    eco: 'C03',
    moves: '1. d4 d5',
    family_id: 'london',
    analysis_json: {
      complexity: 'Intermediate',
      style_tags: ['System-based', 'Flexible', 'Solid'],
    },
  },
  [FEN(4)]: {
    name: 'Delta Wall',
    eco: 'D04',
    moves: '1. d4 Nf6',
    family_id: 'london',
    analysis_json: {
      complexity: 'Advanced',
      style_tags: ['Positional', 'Maneuvering'],
    },
  },
  [FEN(5)]: {
    name: 'Echo Quiet',
    eco: 'E05',
    moves: '1. c4 e6',
    family_id: 'english',
    analysis_json: {
      complexity: 'Intermediate',
      style_tags: ['Solid', 'Quiet'],
    },
  },
  [FEN(6)]: {
    name: 'Foxtrot Counter',
    eco: 'B06',
    moves: '1. e4 d6',
    family_id: 'uncategorised',
    analysis_json: {
      complexity: 'Advanced',
      style_tags: ['Tactical', 'Initiative'],
    },
  },
  [FEN(7)]: {
    name: 'Golf Tie',
    eco: 'A07',
    moves: '1. Nf3 d5',
    family_id: 'english',
    // One tag from `aggressive` and one from `positional` — a 1-1 tie that must
    // resolve to `aggressive`, which comes first in the config's styles array.
    analysis_json: {
      complexity: 'Advanced',
      style_tags: ['Sharp', 'Positional'],
    },
  },
  [FEN(8)]: {
    name: 'Hotel Nothing',
    eco: 'A08',
    moves: '1. g3',
    family_id: 'english',
    analysis_json: {
      complexity: 'Advanced',
      style_tags: ['Strategic', 'Dynamic'],
    },
  },
  [FEN(9)]: {
    name: 'India Sac',
    eco: 'B09',
    moves: '1. e4 g6',
    family_id: 'sicilian',
    // `Sacrificial` also triggers the gambit override, even alongside a
    // higher-scoring bucket.
    analysis_json: {
      complexity: 'Beginner',
      style_tags: ['Sacrificial', 'Aggressive', 'Sharp', 'Attacking'],
    },
  },
};

const POPULARITY_FIXTURE = {
  positions: {
    [FEN(1)]: {
      games_analyzed: 900,
      white_win_rate: 0.5,
      draw_rate: 0.1,
      black_win_rate: 0.4,
      avg_rating: 1500,
    },
    [FEN(2)]: {
      games_analyzed: 100,
      white_win_rate: 0.4,
      draw_rate: 0.2,
      black_win_rate: 0.4,
      avg_rating: 1600,
    },
    [FEN(3)]: {
      games_analyzed: 700,
      white_win_rate: 0.5,
      draw_rate: 0.2,
      black_win_rate: 0.3,
      avg_rating: 1700,
    },
    [FEN(4)]: {
      games_analyzed: 600,
      white_win_rate: 0.5,
      draw_rate: 0.2,
      black_win_rate: 0.3,
      avg_rating: 1800,
    },
    [FEN(5)]: {
      games_analyzed: 500,
      white_win_rate: 0.5,
      draw_rate: 0.2,
      black_win_rate: 0.3,
      avg_rating: 1900,
    },
    [FEN(6)]: {
      games_analyzed: 400,
      white_win_rate: 0.5,
      draw_rate: 0.2,
      black_win_rate: 0.3,
      avg_rating: 2000,
    },
    [FEN(7)]: {
      games_analyzed: 300,
      white_win_rate: 0.5,
      draw_rate: 0.2,
      black_win_rate: 0.3,
      avg_rating: 2100,
    },
    [FEN(8)]: {
      games_analyzed: 200,
      white_win_rate: 0.5,
      draw_rate: 0.2,
      black_win_rate: 0.3,
      avg_rating: 2200,
    },
    // FEN(9) deliberately absent — an opening with no popularity row must
    // survive indexing with null rates, never zeroes or invented numbers.
  },
};

const FAMILIES_FIXTURE = {
  sicilian: { id: 'sicilian', display_name: 'Sicilian Defense' },
  london: { id: 'london', display_name: 'London System' },
  english: { id: 'english', display_name: 'English Opening' },
};

let BrowseService;
let service;

beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
  const fs = require('fs');
  fs.existsSync = jest.fn(() => true);
  fs.readFileSync = jest.fn((p) => {
    const file = String(p);
    if (file.includes('ecoA.json')) return JSON.stringify(ECO_FIXTURE);
    if (/eco[BCDE]\.json/.test(file)) return JSON.stringify({});
    if (file.includes('popularity_stats.json'))
      return JSON.stringify(POPULARITY_FIXTURE);
    if (file.includes('families.json')) return JSON.stringify(FAMILIES_FIXTURE);
    throw new Error(`unexpected read: ${file}`);
  });
  // cache-service's getOrSet logs on every hit and miss; the index build logs
  // its timing. Silence both or the suite output is unreadable.
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
  BrowseService = require('../../packages/api/src/services/browse-service');
  service = new BrowseService();
  service.clearCache();
});

describe('BrowseService.primaryStyle', () => {
  test('gambit wins outright, even against a higher-scoring bucket', () => {
    expect(service.primaryStyle(['Gambit', 'Positional'])).toBe('gambit');
    expect(
      service.primaryStyle(['Sacrificial', 'Aggressive', 'Sharp', 'Attacking'])
    ).toBe('gambit');
  });

  test('highest tag-match count wins', () => {
    expect(service.primaryStyle(['Aggressive', 'Sharp', 'Solid'])).toBe(
      'aggressive'
    );
    expect(service.primaryStyle(['System-based', 'Flexible', 'Solid'])).toBe(
      'system'
    );
  });

  test('a tie breaks by config order — aggressive before positional', () => {
    expect(service.primaryStyle(['Sharp', 'Positional'])).toBe('aggressive');
  });

  test('no bucket match is null, not a default bucket', () => {
    expect(service.primaryStyle(['Strategic', 'Dynamic'])).toBeNull();
    expect(service.primaryStyle([])).toBeNull();
  });
});

describe('BrowseService.buildIndex', () => {
  test('projects every opening with resolved level, style and family name', () => {
    const index = service.buildIndex();
    expect(index).toHaveLength(9);

    const alpha = index.find((o) => o.fen === FEN(1));
    expect(alpha).toMatchObject({
      name: 'Alpha Gambit',
      eco: 'A01',
      level: 'Beginner',
      style: 'gambit',
      family_id: 'sicilian',
      family_name: 'Sicilian Defense',
      games_analyzed: 900,
      white_win_rate: 0.5,
    });
  });

  test('uncategorised gets the label "Other", never the raw id', () => {
    const foxtrot = service.buildIndex().find((o) => o.fen === FEN(6));
    expect(foxtrot.family_name).toBe('Other');
  });

  test('an opening with no popularity row keeps null rates and zero games', () => {
    const india = service.buildIndex().find((o) => o.fen === FEN(9));
    expect(india.games_analyzed).toBe(0);
    expect(india.white_win_rate).toBeNull();
    expect(india.draw_rate).toBeNull();
    expect(india.black_win_rate).toBeNull();
    expect(india.avg_rating).toBeNull();
  });
});

describe('BrowseService.browse — sorting', () => {
  test('sort=popular orders by games_analyzed descending', () => {
    const { items } = service.browse({ sort: 'popular', pageSize: 48 });
    const games = items.map((o) => o.games_analyzed);
    expect(games).toEqual([...games].sort((a, b) => b - a));
    expect(items[0].fen).toBe(FEN(1));
  });

  test('sort=popular breaks ties by name so paging is stable', () => {
    const { items } = service.browse({ sort: 'popular', pageSize: 48 });
    // FEN(9) has no popularity row (0 games) and sorts last on its own.
    expect(items[items.length - 1].fen).toBe(FEN(9));
  });

  test('sort=name orders alphabetically', () => {
    const { items } = service.browse({ sort: 'name', pageSize: 48 });
    expect(items.map((o) => o.name)).toEqual(
      [...items.map((o) => o.name)].sort()
    );
  });

  test('sort never changes which openings are in the set', () => {
    const byPopular = service.browse({ sort: 'popular', pageSize: 48 });
    const byName = service.browse({ sort: 'name', pageSize: 48 });
    expect(byPopular.total).toBe(byName.total);
    expect(new Set(byPopular.items.map((o) => o.fen))).toEqual(
      new Set(byName.items.map((o) => o.fen))
    );
  });
});

describe('BrowseService.browse — filtering', () => {
  test('level filters on complexity', () => {
    const { items, total } = service.browse({
      level: 'Beginner',
      pageSize: 48,
    });
    expect(total).toBe(2);
    expect(items.map((o) => o.fen).sort()).toEqual([FEN(1), FEN(9)].sort());
  });

  test('style filters on the resolved primary style', () => {
    const { total } = service.browse({ style: 'gambit', pageSize: 48 });
    expect(total).toBe(2);
  });

  test('family filters on family_id', () => {
    const { total } = service.browse({ family: 'sicilian', pageSize: 48 });
    expect(total).toBe(3);
  });

  test('filters combine with AND', () => {
    const { total, items } = service.browse({
      level: 'Beginner',
      style: 'gambit',
      family: 'sicilian',
      pageSize: 48,
    });
    expect(total).toBe(2);
    expect(items.map((o) => o.fen).sort()).toEqual([FEN(1), FEN(9)].sort());
  });

  test('an unstyled opening survives an unfiltered browse', () => {
    const { items } = service.browse({ pageSize: 48 });
    expect(items.find((o) => o.fen === FEN(8)).style).toBeNull();
  });
});

describe('BrowseService.browse — the reconciliation invariant', () => {
  test('total === offset + items.length + remaining, on every page', () => {
    for (const page of [1, 2, 3, 4, 5]) {
      const r = service.browse({ page, pageSize: 2 });
      expect(r.total).toBe(r.offset + r.items.length + r.remaining);
    }
  });

  test('remaining is 0 on the last page and never negative', () => {
    const last = service.browse({ page: 5, pageSize: 2 });
    expect(last.items).toHaveLength(1);
    expect(last.remaining).toBe(0);

    const past = service.browse({ page: 99, pageSize: 2 });
    expect(past.items).toHaveLength(0);
    expect(past.remaining).toBe(0);
    expect(past.total).toBe(9);
  });

  test('the invariant holds under a filter too', () => {
    const r = service.browse({ family: 'sicilian', page: 1, pageSize: 2 });
    expect(r.total).toBe(3);
    expect(r.remaining).toBe(1);
    expect(r.total).toBe(r.offset + r.items.length + r.remaining);
  });

  test('paging through covers the set exactly once, no gaps or repeats', () => {
    const seen = [];
    for (let page = 1; page <= 5; page += 1) {
      seen.push(
        ...service.browse({ page, pageSize: 2 }).items.map((o) => o.fen)
      );
    }
    expect(seen).toHaveLength(9);
    expect(new Set(seen).size).toBe(9);
  });
});

describe('BrowseService.browse — facet semantics', () => {
  test('with no filters, each facet dimension sums to the total', () => {
    const { facets, total } = service.browse({ pageSize: 48 });
    expect(total).toBe(9);
    const sum = (f) => f.reduce((acc, x) => acc + x.count, 0);
    expect(sum(facets.level)).toBe(9);
    expect(sum(facets.family)).toBe(9);
    // 8, not 9 — one opening has no style and is counted in no bucket.
    expect(sum(facets.style)).toBe(8);
  });

  test('a facet is counted with its own filter excluded', () => {
    const { facets } = service.browse({ level: 'Beginner', pageSize: 48 });
    const advanced = facets.level.find((f) => f.value === 'Advanced');
    // Still visible and non-zero, so the user can switch to it.
    expect(advanced.count).toBe(5);
  });

  test('other dimensions are counted with the active filter applied', () => {
    const { facets } = service.browse({ level: 'Beginner', pageSize: 48 });
    const sicilian = facets.family.find((f) => f.value === 'sicilian');
    expect(sicilian.count).toBe(2);
    const english = facets.family.find((f) => f.value === 'english');
    expect(english).toBeUndefined();
  });

  test('facets carry display labels, not raw ids', () => {
    const { facets } = service.browse({ pageSize: 48 });
    expect(facets.style.find((f) => f.value === 'gambit').label).toBe('Gambit');
    expect(facets.family.find((f) => f.value === 'london').label).toBe(
      'London System'
    );
    expect(facets.family.find((f) => f.value === 'uncategorised').label).toBe(
      'Other'
    );
  });

  test('zero-count facet values are omitted, not sent as zeroes', () => {
    const { facets } = service.browse({ family: 'london', pageSize: 48 });
    expect(facets.level.every((f) => f.count > 0)).toBe(true);
    expect(facets.style.every((f) => f.count > 0)).toBe(true);
  });
});

describe('BrowseService.browse — clamping', () => {
  test('pageSize is clamped to the configured max', () => {
    expect(service.browse({ pageSize: 5000 }).pageSize).toBe(48);
  });

  test('a bad page falls back to 1', () => {
    expect(service.browse({ page: 0 }).page).toBe(1);
    expect(service.browse({ page: -3 }).page).toBe(1);
    expect(service.browse({ page: 'abc' }).page).toBe(1);
  });

  test('applied echoes what the server actually used', () => {
    const { applied } = service.browse({ family: 'sicilian' });
    expect(applied).toEqual({
      level: null,
      style: null,
      family: 'sicilian',
      sort: 'popular',
    });
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run:
`npx jest tests/unit/browse-service.test.js --testPathIgnorePatterns='\.worktrees'`
Expected: FAIL —
`Cannot find module '../../packages/api/src/services/browse-service'`

- [ ] **Step 3: Write the implementation**

Create `packages/api/src/services/browse-service.js`:

```js
const fs = require('fs');
const path = require('path');
const pathResolver = require('../utils/path-resolver');
const { getGlobalCache } = require('./cache-service');

const ECO_FILES = [
  'ecoA.json',
  'ecoB.json',
  'ecoC.json',
  'ecoD.json',
  'ecoE.json',
];
const INDEX_CACHE_KEY = 'browse-index';
const INDEX_TTL_MS = 60 * 60 * 1000;
const UNCATEGORISED_LABEL = 'Other';

class BrowseService {
  constructor() {
    this.ecoDir = pathResolver.getECODataPath();
    this.cache = getGlobalCache();
    this.config = require('../../../../config/browse_facets.json');
  }

  getConfig() {
    return this.config;
  }

  // cache-service exposes clear(key), not delete(key). Verified against
  // packages/api/src/services/cache-service.js before writing this.
  clearCache() {
    this.cache.clear(INDEX_CACHE_KEY);
  }

  /**
   * One primary style per opening. Openings carry ~7 style tags each and the
   * common tags sit on 60%+ of the corpus, so multi-membership buckets would
   * each match about half of everything — a filter that filters nothing.
   * Assigning exactly one style makes the facet counts partition the corpus.
   */
  primaryStyle(styleTags) {
    const tags = new Set(styleTags || []);
    const override = this.config.gambitOverride;
    if (override.tags.some((t) => tags.has(t))) return override.value;

    let best = null;
    let bestScore = 0;
    for (const bucket of this.config.styles) {
      const score = bucket.tags.filter((t) => tags.has(t)).length;
      // Strict `>` means the first bucket in config order wins a tie.
      if (score > bestScore) {
        bestScore = score;
        best = bucket.value;
      }
    }
    return best;
  }

  loadFamilies() {
    const candidates = [
      pathResolver.getDataPath('families.json'),
      path.resolve(__dirname, '..', '..', '..', '..', 'data', 'families.json'),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return JSON.parse(fs.readFileSync(candidate, 'utf8'));
      }
    }
    return {};
  }

  loadPopularity() {
    const statsPath = pathResolver.getPopularityStatsPath();
    if (!fs.existsSync(statsPath)) return {};
    return JSON.parse(fs.readFileSync(statsPath, 'utf8')).positions || {};
  }

  /**
   * A compact projection of the corpus, built once per cold start. Full
   * analysis_json records average ~2 kB each; holding 12,377 of them would
   * duplicate the ECO service's footprint for no benefit here.
   */
  buildIndex() {
    return this.cache.getOrSet(
      INDEX_CACHE_KEY,
      () => {
        const start = Date.now();
        const families = this.loadFamilies();
        const popularity = this.loadPopularity();
        const index = [];

        for (const filename of ECO_FILES) {
          const filePath = path.join(this.ecoDir, filename);
          if (!fs.existsSync(filePath)) continue;
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

          for (const [fen, opening] of Object.entries(data)) {
            const analysis = opening.analysis_json || {};
            const styleTags = analysis.style_tags || [];
            const stats = popularity[fen];
            const familyId = opening.family_id || 'uncategorised';
            const familyMeta = families[familyId];

            index.push({
              fen,
              name: opening.name,
              eco: opening.eco,
              moves: opening.moves || '',
              family_id: familyId,
              family_name:
                (familyMeta && familyMeta.display_name) || UNCATEGORISED_LABEL,
              level: analysis.complexity || null,
              style: this.primaryStyle(styleTags),
              style_tags: styleTags,
              // Real stats or null. Never a zero standing in for "unknown".
              games_analyzed: stats ? stats.games_analyzed || 0 : 0,
              white_win_rate:
                stats && stats.white_win_rate != null
                  ? stats.white_win_rate
                  : null,
              draw_rate:
                stats && stats.draw_rate != null ? stats.draw_rate : null,
              black_win_rate:
                stats && stats.black_win_rate != null
                  ? stats.black_win_rate
                  : null,
              avg_rating:
                stats && stats.avg_rating != null ? stats.avg_rating : null,
            });
          }
        }

        console.warn(
          `[cold-start] browse index built in ${Date.now() - start}ms (${index.length})`
        );
        return index;
      },
      INDEX_TTL_MS
    );
  }

  matches(entry, filters) {
    if (filters.level && entry.level !== filters.level) return false;
    if (filters.style && entry.style !== filters.style) return false;
    if (filters.family && entry.family_id !== filters.family) return false;
    return true;
  }

  /**
   * Standard faceted-search counting: each dimension is counted with its OWN
   * filter dropped and the others applied, so a selected value never zeroes out
   * its siblings and the bar stays navigable.
   */
  countFacet(index, filters, dimension, values) {
    const others = { ...filters, [dimension]: null };
    const key = dimension === 'family' ? 'family_id' : dimension;
    const counts = new Map();

    for (const entry of index) {
      if (!this.matches(entry, others)) continue;
      const value = entry[key];
      if (value == null) continue;
      counts.set(value, (counts.get(value) || 0) + 1);
    }

    return values
      .filter((v) => counts.get(v.value) > 0)
      .map((v) => ({
        value: v.value,
        label: v.label,
        count: counts.get(v.value),
      }));
  }

  familyFacetValues(index) {
    const seen = new Map();
    for (const entry of index) {
      if (!seen.has(entry.family_id)) {
        seen.set(entry.family_id, {
          value: entry.family_id,
          label: entry.family_name,
        });
      }
    }
    return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
  }

  browse(params = {}) {
    const index = this.buildIndex();
    const { pageSize: sizeConfig, defaultSort } = this.config;

    const requestedSize = parseInt(params.pageSize, 10);
    const pageSize = Math.min(
      Number.isFinite(requestedSize) && requestedSize > 0
        ? requestedSize
        : sizeConfig.default,
      sizeConfig.max
    );
    const requestedPage = parseInt(params.page, 10);
    const page =
      Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

    const filters = {
      level: params.level || null,
      style: params.style || null,
      family: params.family || null,
    };
    const sort = params.sort || defaultSort;

    const filtered = index.filter((entry) => this.matches(entry, filters));

    if (sort === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      filtered.sort((a, b) => {
        const diff = (b.games_analyzed || 0) - (a.games_analyzed || 0);
        // Name tiebreak keeps paging stable — without it, equal game counts
        // could order differently between two requests and a page 2 fetch
        // would repeat or skip rows.
        return diff !== 0 ? diff : a.name.localeCompare(b.name);
      });
    }

    const total = filtered.length;
    const offset = Math.min((page - 1) * pageSize, total);
    const items = filtered.slice(offset, offset + pageSize);
    const remaining = total - offset - items.length;

    const styleValues = [this.config.gambitOverride, ...this.config.styles];

    return {
      items: items.map((entry) => this.toItem(entry)),
      total,
      page,
      pageSize,
      offset,
      remaining,
      facets: {
        level: this.countFacet(index, filters, 'level', this.config.levels),
        style: this.countFacet(index, filters, 'style', styleValues),
        family: this.countFacet(
          index,
          filters,
          'family',
          this.familyFacetValues(index)
        ),
      },
      applied: { ...filters, sort },
    };
  }

  /**
   * `analysis_json` is included, slimmed: OpeningCard reads
   * `opening.analysis_json?.complexity`, so a browse item drops straight into
   * the existing card with no adapter.
   */
  toItem(entry) {
    return {
      fen: entry.fen,
      name: entry.name,
      eco: entry.eco,
      moves: entry.moves,
      family_id: entry.family_id,
      family_name: entry.family_name,
      level: entry.level,
      style: entry.style,
      games_analyzed: entry.games_analyzed,
      white_win_rate: entry.white_win_rate,
      draw_rate: entry.draw_rate,
      black_win_rate: entry.black_win_rate,
      avg_rating: entry.avg_rating,
      analysis_json: { complexity: entry.level, style_tags: entry.style_tags },
    };
  }
}

module.exports = BrowseService;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run:
`npx jest tests/unit/browse-service.test.js --testPathIgnorePatterns='\.worktrees'`
Expected: PASS, all tests.

Two things verified against the real files before this plan was written, so do
not "fix" them: `cache-service` exposes `clear(key)` (there is no `delete`), and
`path-resolver` does expose `getDataPath`. The global cache is a singleton
shared by every service, which is why `clearCache()` exists and why the tests
call it.

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/services/browse-service.js tests/unit/browse-service.test.js
git commit -m "feat(browse): BrowseService with single-primary-style facets"
```

---

## Task 3: The real corpus reconciles

**Files:**

- Test: `tests/integration/browse-corpus.test.js`

This is the phase's checkpoint: the arithmetic is provably true against the
actual 12,377 openings, not just a nine-row fixture. No mocks.

**Interfaces:**

- Consumes: `BrowseService` (Task 2), the real files under `api/data/`.
- Produces: nothing.

- [ ] **Step 1: Write the test**

Create `tests/integration/browse-corpus.test.js`:

```js
/**
 * Runs the browse service against the real corpus in api/data/. Guards the
 * measured distribution recorded in the phase-2 plan — if enrichment reruns
 * and the numbers move, this fails loudly rather than the filter bar quietly
 * showing different counts than the plan assumed.
 */
const BrowseService = require('../../packages/api/src/services/browse-service');

const TOTAL = 12377;

describe('browse over the real corpus', () => {
  let service;
  let spies;

  beforeAll(() => {
    spies = [
      jest.spyOn(console, 'warn').mockImplementation(() => {}),
      jest.spyOn(console, 'log').mockImplementation(() => {}),
    ];
    service = new BrowseService();
  });

  afterAll(() => spies.forEach((s) => s.mockRestore()));

  test('indexes every opening', () => {
    expect(service.buildIndex()).toHaveLength(TOTAL);
  });

  test('unfiltered total is the whole corpus', () => {
    expect(service.browse({}).total).toBe(TOTAL);
  });

  test('level facet matches the measured distribution and sums to the total', () => {
    const { facets } = service.browse({});
    const byValue = Object.fromEntries(
      facets.level.map((f) => [f.value, f.count])
    );
    expect(byValue).toEqual({
      Beginner: 179,
      Intermediate: 4587,
      Advanced: 7611,
    });
    expect(facets.level.reduce((a, f) => a + f.count, 0)).toBe(TOTAL);
  });

  test('style facet partitions the corpus, leaving only the 3 unstyled', () => {
    const { facets } = service.browse({});
    const byValue = Object.fromEntries(
      facets.style.map((f) => [f.value, f.count])
    );
    expect(byValue).toEqual({
      positional: 3585,
      aggressive: 3168,
      gambit: 2182,
      solid: 1271,
      tactical: 1100,
      system: 1068,
    });
    expect(facets.style.reduce((a, f) => a + f.count, 0)).toBe(TOTAL - 3);
  });

  test('family facet sums to the total and labels uncategorised as Other', () => {
    const { facets } = service.browse({});
    expect(facets.family.reduce((a, f) => a + f.count, 0)).toBe(TOTAL);
    expect(facets.family.find((f) => f.value === 'sicilian')).toMatchObject({
      label: 'Sicilian Defense',
      count: 1710,
    });
    expect(
      facets.family.find((f) => f.value === 'uncategorised')
    ).toMatchObject({
      label: 'Other',
      count: 192,
    });
  });

  test('the reconciliation invariant holds across a real filtered set', () => {
    let page = 1;
    let seen = 0;
    let guard = 0;
    let result;
    do {
      result = service.browse({ family: 'sicilian', page, pageSize: 48 });
      expect(result.total).toBe(
        result.offset + result.items.length + result.remaining
      );
      seen += result.items.length;
      page += 1;
      guard += 1;
    } while (result.remaining > 0 && guard < 100);

    expect(seen).toBe(1710);
    expect(result.remaining).toBe(0);
  });

  test('a combined filter still reconciles', () => {
    const r = service.browse({
      level: 'Beginner',
      style: 'gambit',
      pageSize: 24,
    });
    expect(r.total).toBe(r.offset + r.items.length + r.remaining);
    expect(r.total).toBeGreaterThan(0);
  });

  test('no item carries a fabricated win rate', () => {
    const { items } = service.browse({ pageSize: 48 });
    for (const item of items) {
      const hasAll =
        item.white_win_rate !== null &&
        item.draw_rate !== null &&
        item.black_win_rate !== null;
      const hasNone =
        item.white_win_rate === null &&
        item.draw_rate === null &&
        item.black_win_rate === null;
      expect(hasAll || hasNone).toBe(true);
    }
  });

  test('a page of 48 stays well under 100 kB', () => {
    const bytes = Buffer.byteLength(
      JSON.stringify(service.browse({ pageSize: 48 })),
      'utf8'
    );
    expect(bytes).toBeLessThan(100_000);
  });
});
```

- [ ] **Step 2: Run it**

Run:
`npx jest tests/integration/browse-corpus.test.js --testPathIgnorePatterns='\.worktrees'`
Expected: PASS.

If a distribution assertion fails, **do not edit the expected number to match**.
Either the config drifted from Task 1 or the corpus changed. Find out which,
then update the plan's data table and this test together, in one commit, with
the reason in the message.

- [ ] **Step 3: Commit**

```bash
git add tests/integration/browse-corpus.test.js
git commit -m "test(browse): counts reconcile over the real 12,377-opening corpus"
```

---

## Task 4: The route

**Files:**

- Modify: `packages/api/src/routes/openings.routes.js`
- Test: `tests/unit/browse-endpoint.test.js`

**Interfaces:**

- Consumes: `BrowseService` (Task 2).
- Produces: `GET /api/openings/browse` with the response contract above.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/browse-endpoint.test.js`:

```js
const request = require('supertest');
const express = require('express');

const BROWSE_RESULT = {
  items: [{ fen: 'fen-1', name: 'Alpha', eco: 'A01' }],
  total: 3,
  page: 1,
  pageSize: 24,
  offset: 0,
  remaining: 2,
  facets: { level: [], style: [], family: [] },
  applied: { level: null, style: null, family: null, sort: 'popular' },
};

const browseMock = jest.fn(() => BROWSE_RESULT);

jest.mock('../../packages/api/src/services/browse-service', () =>
  jest.fn().mockImplementation(() => ({
    browse: browseMock,
    getConfig: () => ({
      pageSize: { default: 24, max: 48 },
      levels: [{ value: 'Beginner', label: 'Beginner' }],
      gambitOverride: { value: 'gambit', label: 'Gambit', tags: [] },
      styles: [{ value: 'aggressive', label: 'Aggressive', tags: [] }],
      sorts: [
        { value: 'popular', label: 'Most played' },
        { value: 'name', label: 'A–Z' },
      ],
      defaultSort: 'popular',
    }),
    familyIds: () => new Set(['sicilian', 'london']),
  }))
);

function buildApp() {
  const routes = require('../../packages/api/src/routes/openings.routes');
  const app = express();
  app.use(express.json());
  app.use('/api/openings', routes);
  return app;
}

describe('GET /api/openings/browse', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();
    app = buildApp();
  });

  test('returns the contract shape with success at the top level', async () => {
    const res = await request(app).get('/api/openings/browse');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      total: 3,
      remaining: 2,
      items: expect.any(Array),
      facets: expect.any(Object),
      applied: expect.any(Object),
    });
    // Not nested under `data` — Phase 3 reads res.items directly.
    expect(res.body.data).toBeUndefined();
  });

  test('passes filters through to the service', async () => {
    await request(app).get(
      '/api/openings/browse?level=Beginner&style=aggressive&family=sicilian&sort=name&page=2&pageSize=12'
    );
    expect(browseMock).toHaveBeenCalledWith({
      level: 'Beginner',
      style: 'aggressive',
      family: 'sicilian',
      sort: 'name',
      page: '2',
      pageSize: '12',
    });
  });

  test('an unknown level is a 400, not a silent empty result', async () => {
    const res = await request(app).get('/api/openings/browse?level=Expert');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/level/i);
    expect(browseMock).not.toHaveBeenCalled();
  });

  test('an unknown style is a 400', async () => {
    const res = await request(app).get('/api/openings/browse?style=banana');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/style/i);
  });

  test('an unknown family is a 400', async () => {
    const res = await request(app).get('/api/openings/browse?family=nonesuch');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/family/i);
  });

  test('an unknown sort is a 400', async () => {
    const res = await request(app).get('/api/openings/browse?sort=random');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/sort/i);
  });

  test('empty params are ignored rather than rejected', async () => {
    const res = await request(app).get(
      '/api/openings/browse?level=&style=&family='
    );
    expect(res.status).toBe(200);
  });

  test('a service failure is a 500 with no stack in the body', async () => {
    browseMock.mockImplementationOnce(() => {
      throw new Error('index blew up');
    });
    const res = await request(app).get('/api/openings/browse');
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.stack).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run:
`npx jest tests/unit/browse-endpoint.test.js --testPathIgnorePatterns='\.worktrees'`
Expected: FAIL — 404 on `/browse`.

- [ ] **Step 3: Add `familyIds()` to the service**

The route validates `family` against the corpus, so the service must expose the
valid set. Add to `browse-service.js`, after `familyFacetValues`:

```js
  familyIds() {
    return new Set(this.buildIndex().map((entry) => entry.family_id));
  }
```

- [ ] **Step 4: Add the route**

In `packages/api/src/routes/openings.routes.js`, add the require near the other
service requires at the top:

```js
const BrowseService = require('../services/browse-service');
```

and the instance beside the others:

```js
const browseService = new BrowseService();
```

Then add the route. Place it **immediately before** the
`GET /api/openings/search-index` route, so it sits with the other corpus-wide
list endpoints:

```js
/**
 * @route GET /api/openings/browse
 * @desc  Filtered, sorted, paginated openings PLUS the facet counts for the
 *        filter bar — computed over the same corpus in the same request, so
 *        the count on screen and the grid contents cannot disagree. Today's
 *        landing page takes its category counts from one fetch and its grid
 *        from another, which is why they never reconcile.
 * @param {string} level  - Beginner | Intermediate | Advanced
 * @param {string} style  - gambit | aggressive | tactical | positional | solid | system
 * @param {string} family - family_id from families.json (or `uncategorised`)
 * @param {string} sort   - popular (default) | name
 * @param {number} page     - 1-based, default 1
 * @param {number} pageSize - default 24, hard max 48
 */
router.get('/browse', (req, res) => {
  try {
    const config = browseService.getConfig();
    const { level, style, family, sort, page, pageSize } = req.query;

    // Unknown values are rejected rather than ignored: a silent empty result is
    // indistinguishable from a genuine empty filter and sends the client
    // hunting for a data bug.
    const reject = (field, value) =>
      res.status(400).json({
        success: false,
        error: `Unknown ${field}: ${value}`,
      });

    if (level && !config.levels.some((l) => l.value === level))
      return reject('level', level);

    const styleValues = [config.gambitOverride, ...config.styles].map(
      (s) => s.value
    );
    if (style && !styleValues.includes(style)) return reject('style', style);

    if (sort && !config.sorts.some((s) => s.value === sort))
      return reject('sort', sort);

    if (family && !browseService.familyIds().has(family))
      return reject('family', family);

    const result = browseService.browse({
      level: level || null,
      style: style || null,
      family: family || null,
      sort: sort || config.defaultSort,
      page,
      pageSize,
    });

    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Browse error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to browse openings',
    });
  }
});
```

- [ ] **Step 5: Run the tests**

Run:
`npx jest tests/unit/browse-endpoint.test.js --testPathIgnorePatterns='\.worktrees'`
Expected: PASS.

The "passes filters through" test expects `page: '2'` and `pageSize: '12'` as
**strings** — Express query params are strings and the service parses them. If
the route coerces them first, update the test to match the route; do not add
coercion in two places.

- [ ] **Step 6: Commit**

```bash
git add packages/api/src/routes/openings.routes.js packages/api/src/services/browse-service.js tests/unit/browse-endpoint.test.js
git commit -m "feat(browse): GET /api/openings/browse"
```

---

## Task 5: Caching, live verification and docs

**Files:**

- Modify: `vercel.json`
- Modify: `.github/memory-bank/activeContext.md`,
  `.github/memory-bank/progress.md`

- [ ] **Step 1: Add the cache header**

In `vercel.json`, in the `headers` array, immediately after the
`/api/openings/popular-by-eco` entry:

```json
    {
      "source": "/api/openings/browse",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "s-maxage=1800, stale-while-revalidate=3600"
        }
      ]
    },
```

Same TTL as `popular-by-eco`: the corpus changes only when the enrichment or
popularity pipelines rerun, so a 30-minute shared cache with an hour of
stale-while-revalidate costs nothing and keeps crawler traffic off the function.
No `rewrites` change is needed — `/api/openings/(.*)` already routes to
`api/openings.js`, which mounts the whole router.

- [ ] **Step 2: Verify against a running server**

```bash
npm run dev:api
```

Then, in another shell, check the invariant end to end:

```bash
node -e "fetch('http://localhost:3010/api/openings/browse?family=sicilian&pageSize=24').then(r=>r.json()).then(d=>console.log({total:d.total,shown:d.items.length,remaining:d.remaining,ok:d.total===d.offset+d.items.length+d.remaining,facets:Object.keys(d.facets)}))"
```

Expected:
`{ total: 1710, shown: 24, remaining: 1686, ok: true, facets: [ 'level', 'style', 'family' ] }`

And that a bad value is refused rather than silently empty:

```bash
node -e "fetch('http://localhost:3010/api/openings/browse?style=banana').then(r=>console.log(r.status))"
```

Expected: `400`

- [ ] **Step 3: Run the full suites**

```bash
npx jest --testPathIgnorePatterns='\.worktrees'
```

Expected: all backend suites pass, including the three new ones.

```bash
npm run test:frontend
```

Expected: unchanged from Phase 1 (372 tests) — this phase touches no frontend
file. If the number moved, something was edited that should not have been.

```bash
npm run build
```

Expected: clean.

- [ ] **Step 4: Update the memory bank**

Replace the "Current Task" section of `.github/memory-bank/activeContext.md`
(move the Phase 1 section down to "Previous Task", and the old previous task to
`archive.md` if the file would exceed 50 lines). Add one line to the top of
`progress.md`'s "What's Done" and strike Phase 2 from "What's Left". Keep
`progress.md` under 100 lines.

No design-system lockstep is required this phase: no token, component or visual
surface changes. Say so explicitly in the PR description so a reviewer does not
go looking.

- [ ] **Step 5: Format and commit**

```bash
npm run format
git add vercel.json .github/memory-bank/activeContext.md .github/memory-bank/progress.md
git commit -m "chore(browse): cache headers and memory bank for UX phase 2"
```

- [ ] **Step 6: Push and open the PR**

```bash
git push -u origin ux/phase-2-browse-api
```

PR base is `ux/phase-1-discover`. Title: `UX phase 2: browse API`. The body must
state: the reconciliation invariant and where it is tested, the single-primary-
style decision and its measured distribution, that the level facet is 61%
Advanced and why that is not fixed here, and that no frontend file changed.

---

## Checkpoint

From the spec: _"the endpoint's arithmetic is provably true under test."_

- `total === offset + items.length + remaining` — asserted on every page of a
  synthetic corpus (Task 2) and by walking all 1,710 Sicilian openings on the
  real corpus (Task 3).
- Facet counts and grid contents come from one request over one index, so the
  Phase 3 bar cannot show a count its own results contradict.
- No frontend file changed.

## Follow-ups (do not do them in this phase)

1. **The level facet is 61% Advanced, 1.4% Beginner.** The enrichment's
   complexity judgement is skewed enough that "Level" may not be a useful filter
   dimension. Measure usage after Phase 3 ships before deciding whether to
   re-enrich or drop the facet.
2. **`eco-service.js:693` fabricates popularity** with `Math.random()` in
   `getOpeningsByFamily`, served by `GET /api/openings/family/:familyCode`.
   Unrelated to browse, but it is the exact class of bug the project has already
   fixed once on `OpeningCard`.
3. **`popular-by-eco` and `popular` remain the landing page's data source.**
   Phase 3 should move the grid onto `/browse`; until it does, the old
   reconciliation bug is still on screen. The endpoint alone does not fix it.
