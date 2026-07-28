# UX Phase 3 — Faceted filter bar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the landing page's two unlabelled pill rows with a four-facet
filter bar (Level · Style · Family · Sort) driven by `/api/openings/browse`, so
the count on screen and the grid contents come from one request and cannot
disagree.

**Architecture:** A `useBrowse` hook owns all data and reads its filter state
from URL search params, so back-navigation restores the active facets for free.
Desktop renders a row of value-showing dropdown buttons; mobile renders one
"Filters" button opening a bottom sheet with the same facets. Both breakpoints
share the same option-list and family-picker components, so they cannot drift.
The grid cards stay `<Link>` elements — filtering must not cost crawlability.

**Tech Stack:** React 19, TypeScript, react-router-dom 6.20 (`useSearchParams`),
CSS Modules, `lucide-react` icons, Vitest + Testing Library (frontend), Jest +
supertest (backend).

## Global Constraints

Copied from
`docs/superpowers/specs/2026-07-27-ux-review-implementation-design.md`. Every
task inherits these.

- **Branch:** work on `ux/phase-3-filter-bar` (already created off
  `ux/phase-2-browse-api`). **Never merge a phase branch into `main` directly.**
  The PR base is `ux/phase-2-browse-api`.
- **Map every value to an existing token** in
  `packages/web/src/styles/simplified.css`. Never port a hex value from the
  mocks. Never introduce a raw hex.
- **CSS Modules when touching styles.** New components get `.module.css`.
- **Never render fabricated data.** If a stat is missing, omit the element.
- **State lives in URL search params**, not component state, and **cards stay
  real `<a>` links** — 12,000+ pages are indexed.
- **`aria-live` on the filter result count.**
- **"Load more (N remaining)" with an honest N.**
- **Family replaces ECO categories.** No raw ECO letters as filter jargon.
- **Sentence case** in all copy.
- **Design-system bundle updated in the same PR** as any component or visual
  surface change (`design-system/project/preview/`).
- **Buttons follow the Phase 0 spec:** primary = filled `--color-brand-orange`;
  secondary = transparent + neutral border; tertiary = neutral surface, no
  orange. Reuse the existing `.load-more-btn` and `.reset-filter-btn` classes —
  do not fork them into a module.
- **Mobile hit targets ≥44px.**
- **Verification, every task:** `npm run test:frontend`,
  `npm test --testPathIgnorePatterns='\.worktrees'`, `npm run build`.
- **Trust CI over local `npm run format:check`.** With `core.autocrlf=true` the
  working tree is CRLF and `.prettierrc` sets `endOfLine: lf`, so dozens of
  files false-fail locally. **Never run a repo-wide `npm run format`** — it
  rewrites ~130 files that are already clean on CI. Format only the files you
  touched: `npx prettier --write <paths>`.

---

## Data facts (measured, not assumed)

Run against the real corpus in `api/data/` on 2026-07-28. These numbers drive
design decisions below; do not re-derive them.

| Fact                                            | Value                                                 |
| ----------------------------------------------- | ----------------------------------------------------- |
| Openings in the corpus                          | 12,377                                                |
| Families in the browse index                    | 29 (28 from `families.json` + `uncategorised`)        |
| Families whose commonest first move covers ≥93% | 26 of 29                                              |
| Families with no dominant first move            | 2 — Irregular Openings (32.1%), uncategorised (48.4%) |
| Largest family                                  | Sicilian Defense, 1,710                               |
| Smallest family                                 | King's Indian Attack, 18                              |

First-move grouping of the Family list is therefore sound for 26 of 29 families.
The two grab-bag families genuinely have no first move: labelling Irregular
Openings "1. d4" on 32% modal support would be a fabricated fact. They go into a
trailing **"Other openings"** group instead. The threshold is 60%.

---

## Design decisions taken in this plan

Recorded so they are not re-litigated or silently reversed.

1. **The mobile sheet holds all four facets, not one facet per sheet.** The mock
   (`#discover-filters-mobile`) draws a sheet titled "Family" — a single-facet
   sheet, which means Filters → facet list → facet sheet, three taps to set a
   level. One sheet with stacked sections is two taps and keeps the mock's
   family search, first-move groups and primary footer button.
2. **The sheet applies live.** Each tap updates the URL and refetches, so the
   footer count is always true. The footer button reads "Show N openings" and
   closes the sheet — it reveals the result, it does not apply it.
3. **"Load more" depth is component state, not URL state.** The spec requires
   that _filters_ survive back-navigation, not scroll depth. Putting `page` in
   the URL would mean refetching pages 1..N on restore, N requests to rebuild a
   scroll position the browser will not restore anyway.
4. **Client page size is 12, not the API default of 24.** Each card renders a
   `MiniBoard`; 24 boards on first paint is a real render cost for a landing
   screen, and 12 fills a 3-column grid four rows deep. The API cap of 48 is
   untouched.
5. **The applied facet value is never dropped from its own facet list, even at
   count 0.** Today `countFacet` omits zero-count values. If a user picks
   `level=Beginner` and then `family=english` (no Beginner openings in English),
   the level facet loses "Beginner" — so the bar cannot render the label for the
   user's own selection, and the empty grid has no visible cause. Keeping it at
   0 fixes both. This narrows a Phase 2 rule; its test is updated, not deleted.
6. **Filtered views stay `canonical → /` and the facet controls stay
   `<button>`s.** No crawlable filter URLs are created, so no infinite crawl
   space. `LandingPage` already hardcodes `buildSiteUrl('/')`; leave it.
7. **The count uses `aria-live="polite"` and NOT `role="status"`.** `Toast`
   already renders `role="status"` inside this same section; a second one would
   make `getByRole('status')` ambiguous and break the existing star tests.
8. **The section heading stays "Popular openings"** and the file keeps the name
   `PopularOpeningsGrid.tsx`. The default view _is_ the popular list. Renaming
   is diff noise the user does not see.
9. **`.openings-grid`, `.load-more-btn`, `.empty-state`, `.reset-filter-btn` and
   `.filters-container` stay global and unmodified.** The CSS-Modules rule
   applies to styles you are _changing_; this phase changes the filters, not the
   grid or the shared buttons. Only genuinely dead filter CSS is deleted.

---

## File structure

**Backend**

- `packages/api/src/services/browse-service.js` — modify. Family facet entries
  gain `first_move`; `countFacet` keeps the applied value at count 0 and stops
  leaking config-only fields.
- `tests/unit/browse-service.test.js` — modify. Two new tests, one revised.

**Frontend — new**

- `packages/web/src/hooks/useBrowse.ts` — all browse data + URL param state. The
  single place that knows the endpoint exists.
- `packages/web/src/components/filters/FacetSelect.tsx` + `.module.css` — the
  value-showing trigger and its popover shell, plus `FacetOptionList` for simple
  facets. Desktop only.
- `packages/web/src/components/filters/FamilyPicker.tsx` + `.module.css` —
  searchable, first-move-grouped family list. Used by **both** breakpoints.
- `packages/web/src/components/filters/FilterBar.tsx` + `.module.css` — desktop
  bar: four `FacetSelect`s, Clear, count.
- `packages/web/src/components/filters/FilterSheet.tsx` + `.module.css` — mobile
  trigger button + bottom sheet.
- `packages/web/src/components/filters/resultCount.ts` — the one wording for the
  result count, so the bar and the sheet cannot phrase the same number two ways.
- `packages/web/src/test/fixtures/browseResponse.ts` — one shared fake response.

**Frontend — modified**

- `packages/web/src/components/landing/PopularOpeningsGrid.tsx` — rewritten to
  consume `useBrowse`; keeps its star/toast wiring unchanged.
- `packages/web/src/pages/LandingPage.tsx` — drops the `popular-by-eco` fetch
  and the `openings` prop.
- `packages/web/src/pages/__tests__/LandingPage.test.tsx` — its fetch mock gains
  a `browse` branch; eight of its tests assert on grid content.
- `packages/web/src/styles/simplified.css` — delete dead filter CSS.

**Frontend — deleted**

- `packages/web/src/components/filters/ComplexityFilters.tsx`
- `packages/web/src/components/filters/CategoryFilter.tsx`
- `packages/web/src/components/filters/CategoryFilter.module.css`
- `packages/web/src/components/filters/__tests__/CategoryFilter.test.tsx`

**Docs**

- `design-system/project/preview/components-filter-bar.html` — new preview card.
- `design-system/project/preview/components-filters-mobile.html` — deleted; it
  previews the two components this phase removes.
- `.github/memory-bank/activeContext.md`, `.github/memory-bank/progress.md`.

---

### Task 1: Family facets carry a first move

**Files:**

- Modify: `packages/api/src/services/browse-service.js`
- Test: `tests/unit/browse-service.test.js`

**Interfaces:**

- Consumes: nothing from later tasks.
- Produces: `GET /api/openings/browse` response field
  `facets.family[].first_move: string | null` (e.g. `"e4"`, `"Nf3"`, or `null`
  for a family with no dominant first move). Also guarantees that an applied
  facet value always appears in its own facet list, with `count: 0` if nothing
  matches under the other filters. Task 4 consumes `first_move`; Task 5 consumes
  the applied-value guarantee to render its trigger labels.

- [ ] **Step 1: Write the failing tests**

Add these three tests to `tests/unit/browse-service.test.js`. The first
**replaces** the existing test named
`'zero-count facet values are omitted, not sent as zeroes'` — find that test and
overwrite it in place; do not leave both.

```js
describe('BrowseService.browse — facet zero handling', () => {
  test('zero-count values are omitted from dimensions the user has not chosen', () => {
    const { facets } = service.browse({ family: 'london', pageSize: 48 });
    expect(facets.level.every((f) => f.count > 0)).toBe(true);
    expect(facets.style.every((f) => f.count > 0)).toBe(true);
  });

  test('the applied value survives at zero so the bar can still label it', () => {
    // No Beginner opening in the english family, but the user chose Beginner:
    // dropping it would leave the trigger unable to name its own selection.
    const { facets, total } = service.browse({
      level: 'Beginner',
      family: 'english',
      pageSize: 48,
    });
    expect(total).toBe(0);
    expect(facets.level.find((f) => f.value === 'Beginner')).toMatchObject({
      label: 'Beginner',
      count: 0,
    });
  });

  test('style facets do not leak the raw tag lists from config', () => {
    const { facets } = service.browse({ pageSize: 48 });
    expect(facets.style.every((f) => f.tags === undefined)).toBe(true);
  });
});

describe('BrowseService.browse — family first moves', () => {
  test('a family whose openings share a first move reports it', () => {
    const { facets } = service.browse({ pageSize: 48 });
    expect(facets.family.find((f) => f.value === 'sicilian').first_move).toBe(
      'e4'
    );
    expect(facets.family.find((f) => f.value === 'london').first_move).toBe(
      'd4'
    );
  });

  test('a family with no dominant first move reports null, not a guess', () => {
    // The three english fixture rows are 1. c4, 1. Nf3 and 1. g3 — a 33% modal
    // share is not a first move, and asserting one would be an invented fact.
    const { facets } = service.browse({ pageSize: 48 });
    expect(
      facets.family.find((f) => f.value === 'english').first_move
    ).toBeNull();
  });
});
```

No fixture change is needed: the existing nine openings already give sicilian
100% `1. e4`, london 100% `1. d4` and english a three-way split. Do not add a
tenth opening — several tests assert `total` is 9.

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx jest tests/unit/browse-service.test.js --testPathIgnorePatterns='\.worktrees'
```

Expected: FAIL. The first-move tests fail with
`Cannot read properties of undefined (reading 'first_move')` or
`expected undefined to be 'e4'`; the applied-value test fails with
`Cannot read properties of undefined (reading 'label')`.

- [ ] **Step 3: Add the first-move derivation**

In `packages/api/src/services/browse-service.js`, add this constant beside the
existing `UNCATEGORISED_LABEL` near the top of the file:

```js
// A family whose commonest first move covers less than this share of it does
// not have a first move. Measured 2026-07-28: 26 of 29 families are ≥93% pure;
// Irregular Openings (32%) and uncategorised (48%) are grab bags, and labelling
// them "1. d4" would state a fact the data does not support.
const FIRST_MOVE_PURITY = 0.6;
```

Then add this method to the `BrowseService` class, directly above
`familyFacetValues`:

```js
  /** family_id → commonest first move, or null when no move dominates. */
  familyFirstMoves(index) {
    const countsByFamily = new Map();
    for (const entry of index) {
      const match = /^1\.\s*(\S+)/.exec(entry.moves || '');
      if (!match) continue;
      if (!countsByFamily.has(entry.family_id)) countsByFamily.set(entry.family_id, new Map());
      const counts = countsByFamily.get(entry.family_id);
      counts.set(match[1], (counts.get(match[1]) || 0) + 1);
    }

    const firstMoves = new Map();
    for (const [familyId, counts] of countsByFamily) {
      let top = null;
      let topCount = 0;
      let total = 0;
      for (const [move, count] of counts) {
        total += count;
        if (count > topCount) {
          topCount = count;
          top = move;
        }
      }
      firstMoves.set(familyId, topCount / total >= FIRST_MOVE_PURITY ? top : null);
    }
    return firstMoves;
  }
```

- [ ] **Step 4: Attach the first move to the family facet values**

Replace the existing `familyFacetValues` method with:

```js
  familyFacetValues(index) {
    const firstMoves = this.familyFirstMoves(index);
    const seen = new Map();
    for (const entry of index) {
      if (!seen.has(entry.family_id)) {
        seen.set(entry.family_id, {
          value: entry.family_id,
          label: entry.family_name,
          first_move: firstMoves.get(entry.family_id) || null,
        });
      }
    }
    return [...seen.values()].sort((a, b) => a.label.localeCompare(b.label));
  }
```

- [ ] **Step 5: Keep the applied value and stop leaking config fields**

Replace the `return` block at the end of `countFacet` with:

```js
const applied = filters[dimension];
return (
  values
    // The applied value is kept even at zero. Dropping it would strip the
    // label the filter bar shows for the user's own selection, and a
    // visible "Beginner 0" explains an empty grid that a missing row does
    // not.
    .filter((v) => counts.get(v.value) > 0 || v.value === applied)
    // Fields are copied explicitly, never spread: the style buckets in
    // config/browse_facets.json carry a `tags` array that must not ship in
    // every response.
    .map((v) => ({
      value: v.value,
      label: v.label,
      count: counts.get(v.value) || 0,
      ...(v.first_move !== undefined ? { first_move: v.first_move } : {}),
    }))
);
```

- [ ] **Step 6: Run the tests to verify they pass**

```bash
npx jest tests/unit/browse-service.test.js tests/integration/browse-corpus.test.js tests/unit/browse-endpoint.test.js --testPathIgnorePatterns='\.worktrees'
```

Expected: PASS, all three suites. If `browse-corpus.test.js` fails on a facet
sum, the applied-value change has leaked into a dimension it should not touch —
re-read Step 5, `applied` must come from `filters[dimension]`, not from the
`others` object.

- [ ] **Step 7: Verify the real corpus agrees with the measured numbers**

```bash
node -e "const S=require('./packages/api/src/services/browse-service');const s=new S();const f=s.browse({pageSize:1}).facets.family;console.log(f.length,'families;',f.filter(x=>x.first_move).length,'with a first move');console.log(f.filter(x=>!x.first_move).map(x=>x.label).join(', '));"
```

Expected output: `29 families; 27 with a first move` followed by
`Irregular Openings, Other`.

- [ ] **Step 8: Commit**

```bash
git add packages/api/src/services/browse-service.js tests/unit/browse-service.test.js
git commit -m "feat(browse): family facets carry a first move; applied values survive at zero"
```

---

### Task 2: `useBrowse` — one hook owns the data and the URL state

**Files:**

- Create: `packages/web/src/hooks/useBrowse.ts`
- Create: `packages/web/src/test/fixtures/browseResponse.ts`
- Test: `packages/web/src/hooks/__tests__/useBrowse.test.tsx`

**Interfaces:**

- Consumes: `GET /api/openings/browse?level&style&family&sort&page&pageSize`
  from Task 1, whose success response is
  `{ success: true, items, total, page, pageSize, offset, remaining, facets, applied }`.
- Produces, for Tasks 5–7:

  ```ts
  export type FacetKey = 'level' | 'style' | 'family' | 'sort';
  export interface FacetValue {
    value: string;
    label: string;
    count: number;
    first_move?: string | null;
  }
  export interface BrowseFacets {
    level: FacetValue[];
    style: FacetValue[];
    family: FacetValue[];
  }
  export interface BrowseFilters {
    level: string | null;
    style: string | null;
    family: string | null;
    sort: string;
  }
  export interface BrowseItem {
    fen: string;
    name: string;
    eco: string;
    moves: string;
    family_id: string;
    family_name: string;
    level: string | null;
    style: string | null;
    games_analyzed: number;
    white_win_rate: number | null;
    draw_rate: number | null;
    black_win_rate: number | null;
    avg_rating: number | null;
    analysis_json?: { complexity?: string | null; style_tags?: string[] };
  }
  export function useBrowse(): {
    items: BrowseItem[];
    facets: BrowseFacets;
    total: number;
    remaining: number;
    loading: boolean;
    loadingMore: boolean;
    error: boolean;
    filters: BrowseFilters;
    activeCount: number;
    setFacet: (key: FacetKey, value: string | null) => void;
    clear: () => void;
    loadMore: () => void;
    retry: () => void;
  };
  export const SORT_OPTIONS: { value: string; label: string }[];
  ```

- [ ] **Step 1: Create the shared test fixture**

Create `packages/web/src/test/fixtures/browseResponse.ts`:

```ts
/** One fake /api/openings/browse payload, shared by every filter-bar test. */
export const browseItem = (name: string, fen: string) => ({
  fen,
  name,
  eco: 'B20',
  moves: '1. e4 c5',
  family_id: 'sicilian',
  family_name: 'Sicilian Defense',
  level: 'Advanced',
  style: 'aggressive',
  games_analyzed: 1200,
  white_win_rate: 0.5,
  draw_rate: 0.1,
  black_win_rate: 0.4,
  avg_rating: 1600,
  analysis_json: { complexity: 'Advanced', style_tags: ['Aggressive'] },
});

export const browseResponse = (overrides: Record<string, unknown> = {}) => ({
  success: true,
  items: [
    browseItem('Sicilian Defence', 'fen-1'),
    browseItem('Ruy Lopez', 'fen-2'),
  ],
  total: 30,
  page: 1,
  pageSize: 12,
  offset: 0,
  remaining: 28,
  facets: {
    level: [
      { value: 'Beginner', label: 'Beginner', count: 5 },
      { value: 'Intermediate', label: 'Intermediate', count: 10 },
      { value: 'Advanced', label: 'Advanced', count: 15 },
    ],
    style: [
      { value: 'gambit', label: 'Gambit', count: 12 },
      { value: 'aggressive', label: 'Aggressive', count: 18 },
    ],
    family: [
      {
        value: 'sicilian',
        label: 'Sicilian Defense',
        count: 20,
        first_move: 'e4',
      },
      { value: 'london', label: 'London System', count: 7, first_move: 'd4' },
      { value: 'uncategorised', label: 'Other', count: 3, first_move: null },
    ],
  },
  applied: { level: null, style: null, family: null, sort: 'popular' },
  ...overrides,
});
```

- [ ] **Step 2: Write the failing test**

Create `packages/web/src/hooks/__tests__/useBrowse.test.tsx`:

```tsx
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useBrowse } from '../useBrowse';
import { browseResponse, browseItem } from '../../test/fixtures/browseResponse';

const wrapper =
  (initialEntry = '/') =>
  ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter initialEntries={[initialEntry]}>{children}</MemoryRouter>
  );

const mockFetch = (payload: unknown) =>
  vi.fn().mockResolvedValue({ ok: true, json: async () => payload });

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch(browseResponse()));
});

describe('useBrowse', () => {
  it('fetches page 1 with the client page size on mount', async () => {
    const { result } = renderHook(() => useBrowse(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.total).toBe(30);
    expect(result.current.items).toHaveLength(2);

    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(url).toContain('page=1');
    expect(url).toContain('pageSize=12');
  });

  it('reads its filters from the URL, so a restored URL restores the facets', async () => {
    const { result } = renderHook(() => useBrowse(), {
      wrapper: wrapper('/?level=Beginner&family=london'),
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.filters).toEqual({
      level: 'Beginner',
      style: null,
      family: 'london',
      sort: 'popular',
    });
    expect(result.current.activeCount).toBe(2);

    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(url).toContain('level=Beginner');
    expect(url).toContain('family=london');
  });

  it('setFacet writes the URL and refetches from page 1', async () => {
    const { result } = renderHook(() => useBrowse(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setFacet('style', 'gambit'));

    await waitFor(() => expect(result.current.filters.style).toBe('gambit'));
    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
    const url = calls[calls.length - 1][0] as string;
    expect(url).toContain('style=gambit');
    expect(url).toContain('page=1');
  });

  it('setFacet with null removes the param rather than sending an empty one', async () => {
    const { result } = renderHook(() => useBrowse(), {
      wrapper: wrapper('/?level=Beginner'),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setFacet('level', null));

    await waitFor(() => expect(result.current.filters.level).toBeNull());
    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[calls.length - 1][0] as string).not.toContain('level=');
  });

  it('loadMore appends the next page instead of replacing it', async () => {
    const { result } = renderHook(() => useBrowse(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    vi.stubGlobal(
      'fetch',
      mockFetch(
        browseResponse({
          items: [browseItem('French Defence', 'fen-3')],
          page: 2,
          offset: 12,
          remaining: 17,
        })
      )
    );
    act(() => result.current.loadMore());

    await waitFor(() => expect(result.current.items).toHaveLength(3));
    expect(result.current.items[2].name).toBe('French Defence');
    expect(result.current.remaining).toBe(17);
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(url).toContain('page=2');
  });

  it('clear removes every facet param at once', async () => {
    const { result } = renderHook(() => useBrowse(), {
      wrapper: wrapper('/?level=Beginner&style=gambit&family=london&sort=name'),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.clear());

    await waitFor(() => expect(result.current.activeCount).toBe(0));
    expect(result.current.filters).toEqual({
      level: null,
      style: null,
      family: null,
      sort: 'popular',
    });
  });

  it('surfaces an error instead of rendering an empty grid as if it were a result', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const { result } = renderHook(() => useBrowse(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.loading).toBe(false);
    expect(result.current.total).toBe(0);
  });

  it('treats a success payload with no items array as an error, not as zero results', async () => {
    // A proxy error page, a 410 body or a truncated payload can all be JSON
    // with success:true and no items. setItems(undefined) would white-screen
    // the landing page on the next .map.
    vi.stubGlobal('fetch', mockFetch({ success: true, data: [] }));
    const { result } = renderHook(() => useBrowse(), { wrapper: wrapper() });

    await waitFor(() => expect(result.current.error).toBe(true));
    expect(result.current.items).toEqual([]);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
npm run test:frontend -- src/hooks/__tests__/useBrowse.test.tsx
```

Expected: FAIL with `Failed to resolve import "../useBrowse"`.

- [ ] **Step 4: Write the hook**

Create `packages/web/src/hooks/useBrowse.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Everything the Discover grid knows about browsing. Filter state lives in the
 * URL — that is the only way back-navigation restores the active facets, and it
 * keeps the facet controls out of the business of remembering anything.
 *
 * "Load more" depth deliberately does NOT live in the URL: the spec asks that
 * filters survive back-navigation, not scroll depth, and restoring page N would
 * mean N requests to rebuild a scroll position the browser will not restore.
 */

export type FacetKey = 'level' | 'style' | 'family' | 'sort';

export interface FacetValue {
  value: string;
  label: string;
  count: number;
  first_move?: string | null;
}

export interface BrowseFacets {
  level: FacetValue[];
  style: FacetValue[];
  family: FacetValue[];
}

export interface BrowseFilters {
  level: string | null;
  style: string | null;
  family: string | null;
  sort: string;
}

export interface BrowseItem {
  fen: string;
  name: string;
  eco: string;
  moves: string;
  family_id: string;
  family_name: string;
  level: string | null;
  style: string | null;
  games_analyzed: number;
  white_win_rate: number | null;
  draw_rate: number | null;
  black_win_rate: number | null;
  avg_rating: number | null;
  analysis_json?: { complexity?: string | null; style_tags?: string[] };
}

export const SORT_OPTIONS = [
  { value: 'popular', label: 'Most played' },
  { value: 'name', label: 'A–Z' },
];

const DEFAULT_SORT = 'popular';
const FACET_KEYS: FacetKey[] = ['level', 'style', 'family', 'sort'];

/**
 * 12, not the API's default of 24: every card renders a MiniBoard, and 24
 * boards on first paint is a real render cost for a landing screen. Twelve
 * fills the three-column grid four rows deep.
 */
const PAGE_SIZE = 12;

const EMPTY_FACETS: BrowseFacets = { level: [], style: [], family: [] };

export function useBrowse() {
  const [searchParams, setSearchParams] = useSearchParams();
  const level = searchParams.get('level');
  const style = searchParams.get('style');
  const family = searchParams.get('family');
  const sort = searchParams.get('sort') || DEFAULT_SORT;

  const [items, setItems] = useState<BrowseItem[]>([]);
  const [facets, setFacets] = useState<BrowseFacets>(EMPTY_FACETS);
  const [total, setTotal] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  const pageRef = useRef(1);
  // Monotonic request id: a filter change while a load-more is in flight must
  // not have the stale response append rows from the previous filter.
  const requestRef = useRef(0);

  const fetchPage = useCallback(
    async (page: number, append: boolean) => {
      const requestId = ++requestRef.current;
      if (append) setLoadingMore(true);
      else setLoading(true);

      const params = new URLSearchParams();
      if (level) params.set('level', level);
      if (style) params.set('style', style);
      if (family) params.set('family', family);
      params.set('sort', sort);
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));

      try {
        const response = await fetch(`/api/openings/browse?${params}`);
        const data = await response.json();
        if (requestId !== requestRef.current) return;

        // `success` alone is not enough: a 410, a proxy error page or a
        // truncated payload can all be JSON without an items array, and
        // setItems(undefined) white-screens the landing page on .map.
        if (!data.success || !Array.isArray(data.items)) {
          setError(true);
          return;
        }

        setError(false);
        setItems((prev) => (append ? [...prev, ...data.items] : data.items));
        setFacets(data.facets);
        setTotal(data.total);
        setRemaining(data.remaining);
        pageRef.current = page;
      } catch {
        // An empty grid and a broken grid look identical; say which it is.
        if (requestId === requestRef.current) setError(true);
      } finally {
        if (requestId === requestRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [level, style, family, sort]
  );

  useEffect(() => {
    pageRef.current = 1;
    fetchPage(1, false);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    fetchPage(pageRef.current + 1, true);
  }, [fetchPage]);

  const retry = useCallback(() => {
    fetchPage(1, false);
  }, [fetchPage]);

  const setFacet = useCallback(
    (key: FacetKey, value: string | null) => {
      const next = new URLSearchParams(searchParams);
      if (value) next.set(key, value);
      else next.delete(key);
      // replace, not push: four facet taps must not cost four Back presses to
      // leave the page. Returning from a detail page still restores the last
      // URL, which is what the spec's checkpoint asks for.
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const clear = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    FACET_KEYS.forEach((key) => next.delete(key));
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  return {
    items,
    facets,
    total,
    remaining,
    loading,
    loadingMore,
    error,
    filters: { level, style, family, sort } as BrowseFilters,
    // Sort is excluded: it is always set, so counting it would mean the
    // "Filters" badge never read zero.
    activeCount: [level, style, family].filter(Boolean).length,
    setFacet,
    clear,
    loadMore,
    retry,
  };
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
npm run test:frontend -- src/hooks/__tests__/useBrowse.test.tsx
```

Expected: PASS, 7 tests.

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/hooks/useBrowse.ts packages/web/src/hooks/__tests__/useBrowse.test.tsx packages/web/src/test/fixtures/browseResponse.ts
git commit -m "feat(filters): useBrowse hook with URL-param facet state"
```

---

### Task 3: `FacetSelect` — the value-showing trigger and its popover

**Files:**

- Create: `packages/web/src/components/filters/FacetSelect.tsx`
- Create: `packages/web/src/components/filters/FacetSelect.module.css`
- Test: covered by Task 5's `FilterBar.test.tsx` (this component has no
  behaviour that is meaningful outside a bar, and a separate suite would test
  the same clicks twice)

**Interfaces:**

- Consumes: nothing.
- Produces, for Task 5:

  ```tsx
  export interface FacetOption {
    value: string;
    label: string;
    count?: number;
  }
  export const FacetSelect: React.FC<{
    label: string;
    display: string;
    active: boolean;
    menuLabel: string;
    align?: 'start' | 'end';
    className?: string;
    children: (close: () => void) => React.ReactNode;
  }>;
  export const FacetOptionList: React.FC<{
    options: FacetOption[];
    value: string | null;
    anyLabel: string | null;
    onSelect: (value: string | null) => void;
  }>;
  ```

- [ ] **Step 1: Write the component**

Create `packages/web/src/components/filters/FacetSelect.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import styles from './FacetSelect.module.css';

/**
 * A facet button that states its own value — "Level: All", "Style: Gambit" —
 * instead of the unlabelled pill row it replaces, where ten pills read as one
 * row of ten and nothing said what any of them filtered.
 *
 * The menu body is a render prop so Family can supply a searchable list while
 * Level, Style and Sort supply a plain option list, without this component
 * knowing about either.
 */

export interface FacetOption {
  value: string;
  label: string;
  count?: number;
}

interface FacetSelectProps {
  label: string;
  display: string;
  active: boolean;
  menuLabel: string;
  align?: 'start' | 'end';
  className?: string;
  children: (close: () => void) => React.ReactNode;
}

export const FacetSelect: React.FC<FacetSelectProps> = ({
  label,
  display,
  active,
  menuLabel,
  align = 'start',
  className = '',
  children,
}) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <div className={`${styles.root} ${className}`.trim()}>
      <button
        type="button"
        className={`${styles.trigger} ${active ? styles.triggerActive : ''}`.trim()}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={styles.label}>{label}</span>
        <span className={active ? styles.valueActive : styles.value}>
          {display}
        </span>
        <ChevronDown size={13} className={styles.chevron} aria-hidden="true" />
      </button>

      {open && (
        <>
          <div
            className={styles.backdrop}
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div
            className={`${styles.menu} ${align === 'end' ? styles.menuEnd : ''}`.trim()}
            role="dialog"
            aria-label={menuLabel}
          >
            {children(() => setOpen(false))}
          </div>
        </>
      )}
    </div>
  );
};

interface FacetOptionListProps {
  options: FacetOption[];
  value: string | null;
  /** Label for the reset row, or null for a facet that always has a value. */
  anyLabel: string | null;
  onSelect: (value: string | null) => void;
}

export const FacetOptionList: React.FC<FacetOptionListProps> = ({
  options,
  value,
  anyLabel,
  onSelect,
}) => (
  <ul className={styles.optionList} role="listbox">
    {anyLabel !== null && (
      <li role="presentation">
        <button
          type="button"
          role="option"
          aria-selected={value === null}
          className={`${styles.option} ${value === null ? styles.optionActive : ''}`.trim()}
          onClick={() => onSelect(null)}
        >
          <span>{anyLabel}</span>
          {value === null && (
            <Check size={15} className={styles.check} aria-hidden="true" />
          )}
        </button>
      </li>
    )}
    {options.map((option) => (
      <li key={option.value} role="presentation">
        <button
          type="button"
          role="option"
          aria-selected={value === option.value}
          className={`${styles.option} ${value === option.value ? styles.optionActive : ''}`.trim()}
          onClick={() => onSelect(option.value)}
        >
          <span>{option.label}</span>
          {option.count !== undefined && (
            <span className={styles.optionCount}>
              {option.count.toLocaleString()}
            </span>
          )}
          {value === option.value && (
            <Check size={15} className={styles.check} aria-hidden="true" />
          )}
        </button>
      </li>
    ))}
  </ul>
);
```

- [ ] **Step 2: Write the styles**

Create `packages/web/src/components/filters/FacetSelect.module.css`:

```css
.root {
  position: relative;
  display: inline-flex;
}

.trigger {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 44px;
  padding: var(--space-2) var(--space-3);
  background: var(--surface-raised);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  white-space: nowrap;
  transition:
    border-color 150ms ease,
    background 150ms ease;
}

.trigger:hover {
  border-color: var(--border-hover);
}

.trigger:focus-visible {
  outline: 2px solid var(--color-brand-orange);
  outline-offset: 2px;
}

/* Active = an orange border only. The pill row it replaces filled the whole
   chip orange, which made a filter state look like a call to action. */
.triggerActive {
  border-color: var(--accent-a50);
}

.label {
  color: var(--color-text-muted);
}

.value {
  color: var(--color-text-secondary);
}

.valueActive {
  color: var(--color-text-primary);
}

.chevron {
  flex: none;
  color: var(--color-text-secondary);
}

.backdrop {
  position: fixed;
  inset: 0;
  z-index: 19;
}

.menu {
  position: absolute;
  top: calc(100% + var(--space-1));
  left: 0;
  z-index: 20;
  min-width: 240px;
  max-width: 320px;
  max-height: 60vh;
  overflow-y: auto;
  background: var(--surface-overlay);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.menuEnd {
  left: auto;
  right: 0;
}

.optionList {
  list-style: none;
  margin: 0;
  padding: 0;
}

.option {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: 44px;
  padding: var(--space-3) var(--space-4);
  background: none;
  border: none;
  border-bottom: 1px solid var(--border-subtle);
  color: var(--color-text-secondary);
  font-family: inherit;
  font-size: var(--text-sm);
  text-align: left;
  cursor: pointer;
}

.option:last-child {
  border-bottom: none;
}

.option:hover {
  background: var(--color-overlay-light);
}

.option:focus-visible {
  outline: 2px solid var(--color-brand-orange);
  outline-offset: -2px;
}

.optionActive {
  background: var(--accent-a12);
  color: var(--color-text-primary);
  font-weight: var(--font-weight-semibold);
}

.optionCount {
  margin-left: auto;
  color: var(--color-text-muted);
  font-variant-numeric: tabular-nums;
}

.check {
  flex: none;
  color: var(--color-brand-orange);
}
```

- [ ] **Step 3: Verify it compiles**

```bash
npm run build
```

Expected: clean build, no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git add packages/web/src/components/filters/FacetSelect.tsx packages/web/src/components/filters/FacetSelect.module.css
git commit -m "feat(filters): FacetSelect trigger and option list"
```

---

### Task 4: `FamilyPicker` — searchable, grouped by first move

**Files:**

- Create: `packages/web/src/components/filters/FamilyPicker.tsx`
- Create: `packages/web/src/components/filters/FamilyPicker.module.css`
- Test: `packages/web/src/components/filters/__tests__/FamilyPicker.test.tsx`

**Interfaces:**

- Consumes: `FacetValue` from `useBrowse` (Task 2), including the `first_move`
  field added in Task 1.
- Produces, for Tasks 5 and 6:

  ```tsx
  export const FamilyPicker: React.FC<{
    families: FacetValue[];
    value: string | null;
    onSelect: (value: string | null) => void;
  }>;
  ```

- [ ] **Step 1: Write the failing test**

Create `packages/web/src/components/filters/__tests__/FamilyPicker.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FamilyPicker } from '../FamilyPicker';

const families = [
  {
    value: 'sicilian',
    label: 'Sicilian Defense',
    count: 1710,
    first_move: 'e4',
  },
  { value: 'french', label: 'French Defense', count: 531, first_move: 'e4' },
  { value: 'london', label: 'London System', count: 70, first_move: 'd4' },
  { value: 'uncategorised', label: 'Other', count: 192, first_move: null },
];

describe('FamilyPicker', () => {
  it('groups families under their first move', () => {
    render(
      <FamilyPicker families={families} value={null} onSelect={vi.fn()} />
    );

    expect(screen.getByText('1. e4')).toBeInTheDocument();
    expect(screen.getByText('1. d4')).toBeInTheDocument();
  });

  it('puts families with no dominant first move in a trailing catch-all', () => {
    render(
      <FamilyPicker families={families} value={null} onSelect={vi.fn()} />
    );

    const headings = screen
      .getAllByTestId('family-group-heading')
      .map((h) => h.textContent);
    // 1. e4 leads on 2,241 openings, then 1. d4 on 70 — and the catch-all is
    // last however big it gets, because it is not a first move.
    expect(headings).toEqual(['1. e4', '1. d4', 'Other openings']);
  });

  it('shows each family count', () => {
    render(
      <FamilyPicker families={families} value={null} onSelect={vi.fn()} />
    );

    expect(
      screen.getByRole('button', { name: /Sicilian Defense/ })
    ).toHaveTextContent('1,710');
  });

  it('filters the list as the user types', async () => {
    render(
      <FamilyPicker families={families} value={null} onSelect={vi.fn()} />
    );

    await userEvent.type(screen.getByLabelText('Search families'), 'lond');

    expect(
      screen.getByRole('button', { name: /London System/ })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Sicilian Defense/ })
    ).not.toBeInTheDocument();
  });

  it('says so when nothing matches rather than showing an empty list', async () => {
    render(
      <FamilyPicker families={families} value={null} onSelect={vi.fn()} />
    );

    await userEvent.type(screen.getByLabelText('Search families'), 'zzz');

    expect(screen.getByText(/No families match/)).toBeInTheDocument();
  });

  it('reports the chosen family and the reset', async () => {
    const onSelect = vi.fn();
    render(
      <FamilyPicker families={families} value="london" onSelect={onSelect} />
    );

    await userEvent.click(
      screen.getByRole('button', { name: /Sicilian Defense/ })
    );
    expect(onSelect).toHaveBeenCalledWith('sicilian');

    await userEvent.click(screen.getByRole('button', { name: 'Any family' }));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('marks the active family as pressed', () => {
    render(
      <FamilyPicker families={families} value="london" onSelect={vi.fn()} />
    );

    expect(
      screen.getByRole('button', { name: /London System/ })
    ).toHaveAttribute('aria-pressed', 'true');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm run test:frontend -- src/components/filters/__tests__/FamilyPicker.test.tsx
```

Expected: FAIL with `Failed to resolve import "../FamilyPicker"`.

- [ ] **Step 3: Write the component**

Create `packages/web/src/components/filters/FamilyPicker.tsx`:

```tsx
import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { FacetValue } from '../../hooks/useBrowse';
import styles from './FamilyPicker.module.css';

/**
 * Twenty-nine families is too many for a flat list, so they are grouped by
 * their first move — the one property a chess player can navigate by. The
 * server decides the grouping (see BrowseService.familyFirstMoves): families
 * with no dominant first move report null and land in a trailing catch-all
 * rather than being filed under a move that is not theirs.
 *
 * Rows are toggle buttons rather than listbox options: a listbox with a search
 * field inside it is not a listbox, and the option set is not stable.
 *
 * Shared verbatim by the desktop dropdown and the mobile sheet — the spec's
 * risk table calls out desktop/mobile filter drift, and one component cannot
 * drift from itself.
 */

interface FamilyGroup {
  key: string;
  heading: string;
  total: number;
  families: FacetValue[];
}

const groupByFirstMove = (families: FacetValue[]): FamilyGroup[] => {
  const groups = new Map<string, FamilyGroup>();

  for (const family of families) {
    const key = family.first_move || '';
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        heading: key ? `1. ${key}` : 'Other openings',
        total: 0,
        families: [],
      });
    }
    const group = groups.get(key)!;
    group.total += family.count;
    group.families.push(family);
  }

  return [...groups.values()].sort((a, b) => {
    if (a.key && !b.key) return -1;
    if (!a.key && b.key) return 1;
    return b.total - a.total;
  });
};

interface FamilyPickerProps {
  families: FacetValue[];
  value: string | null;
  onSelect: (value: string | null) => void;
}

export const FamilyPicker: React.FC<FamilyPickerProps> = ({
  families,
  value,
  onSelect,
}) => {
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matching = needle
      ? families.filter((family) => family.label.toLowerCase().includes(needle))
      : families;
    return groupByFirstMove(matching);
  }, [families, query]);

  return (
    <div className={styles.picker}>
      <div className={styles.searchWrap}>
        <Search size={15} className={styles.searchIcon} aria-hidden="true" />
        <input
          type="search"
          className={styles.search}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search families…"
          aria-label="Search families"
        />
      </div>

      <button
        type="button"
        className={`${styles.row} ${value === null ? styles.rowActive : ''}`.trim()}
        aria-pressed={value === null}
        onClick={() => onSelect(null)}
      >
        <span>Any family</span>
      </button>

      {groups.map((group) => (
        <div key={group.key} className={styles.group}>
          <p className={styles.groupHeading} data-testid="family-group-heading">
            {group.heading}
          </p>
          {group.families.map((family) => (
            <button
              key={family.value}
              type="button"
              className={`${styles.row} ${value === family.value ? styles.rowActive : ''}`.trim()}
              aria-pressed={value === family.value}
              onClick={() => onSelect(family.value)}
            >
              <span className={styles.rowLabel}>{family.label}</span>
              <span className={styles.rowCount}>
                {family.count.toLocaleString()}
              </span>
            </button>
          ))}
        </div>
      ))}

      {groups.length === 0 && (
        <p className={styles.noMatch}>No families match “{query}”.</p>
      )}
    </div>
  );
};
```

- [ ] **Step 4: Write the styles**

Create `packages/web/src/components/filters/FamilyPicker.module.css`:

```css
.picker {
  display: flex;
  flex-direction: column;
  padding: var(--space-3);
}

.searchWrap {
  position: relative;
  margin-bottom: var(--space-3);
}

.searchIcon {
  position: absolute;
  left: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-muted);
  pointer-events: none;
}

.search {
  width: 100%;
  box-sizing: border-box;
  padding: var(--space-2-5) var(--space-3) var(--space-2-5) 34px;
  background: var(--surface-base);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  /* 16px — anything smaller triggers iOS Safari's focus zoom. */
  font-size: var(--text-md);
  font-family: inherit;
  outline: none;
}

.search:focus {
  border-color: var(--accent-a30);
}

.group {
  display: flex;
  flex-direction: column;
}

.groupHeading {
  margin: var(--space-3) 0 var(--space-1);
  font-size: var(--text-3xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: 44px;
  padding: var(--space-2-5) var(--space-2);
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  font-family: inherit;
  font-size: var(--text-base);
  font-weight: var(--font-weight-medium);
  text-align: left;
  cursor: pointer;
}

.row:hover {
  background: var(--color-overlay-light);
}

.row:focus-visible {
  outline: 2px solid var(--color-brand-orange);
  outline-offset: -2px;
}

.rowActive {
  background: var(--accent-a12);
}

.rowLabel {
  flex: 1;
  min-width: 0;
}

.rowCount {
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
}

.noMatch {
  margin: var(--space-4) var(--space-2);
  color: var(--color-text-secondary);
  font-size: var(--text-base);
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
npm run test:frontend -- src/components/filters/__tests__/FamilyPicker.test.tsx
```

Expected: PASS, 7 tests.

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/components/filters/FamilyPicker.tsx packages/web/src/components/filters/FamilyPicker.module.css packages/web/src/components/filters/__tests__/FamilyPicker.test.tsx
git commit -m "feat(filters): FamilyPicker grouped by first move"
```

---

### Task 5: `FilterBar` — the desktop bar

**Files:**

- Create: `packages/web/src/components/filters/resultCount.ts`
- Create: `packages/web/src/components/filters/FilterBar.tsx`
- Create: `packages/web/src/components/filters/FilterBar.module.css`
- Test: `packages/web/src/components/filters/__tests__/FilterBar.test.tsx`

**Interfaces:**

- Consumes: `FacetSelect`, `FacetOptionList` (Task 3), `FamilyPicker` (Task 4),
  and the `BrowseFacets` / `BrowseFilters` / `FacetKey` / `SORT_OPTIONS` exports
  from `useBrowse` (Task 2).
- Produces, for Tasks 6 and 7:

  ```tsx
  // resultCount.ts
  export const resultCountLabel: (total: number) => string;
  // FilterBar.tsx
  export const FilterBar: React.FC<{
    facets: BrowseFacets;
    filters: BrowseFilters;
    total: number;
    activeCount: number;
    loading: boolean;
    onFacetChange: (key: FacetKey, value: string | null) => void;
    onClear: () => void;
  }>;
  ```

  `resultCountLabel` is its own module rather than a `FilterBar` export because
  the mobile sheet needs it too, and the sheet importing from the desktop bar
  would be a dependency in the wrong direction. One function means the bar and
  the sheet cannot word the same number differently.

- [ ] **Step 1: Write the failing test**

Create `packages/web/src/components/filters/__tests__/FilterBar.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterBar } from '../FilterBar';
import { resultCountLabel } from '../resultCount';
import { browseResponse } from '../../../test/fixtures/browseResponse';

const facets = browseResponse().facets;
const noFilters = { level: null, style: null, family: null, sort: 'popular' };

const setup = (props = {}) => {
  const onFacetChange = vi.fn();
  const onClear = vi.fn();
  render(
    <FilterBar
      facets={facets}
      filters={noFilters}
      total={30}
      activeCount={0}
      loading={false}
      onFacetChange={onFacetChange}
      onClear={onClear}
      {...props}
    />
  );
  return { onFacetChange, onClear };
};

describe('FilterBar', () => {
  it('every facet button states what it filters and what it is set to', () => {
    setup();

    expect(
      screen.getByRole('button', { name: 'Level All' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Style Any' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Family Any' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Sort Most played' })
    ).toBeInTheDocument();
  });

  it('shows the active value on the trigger, not a generic label', () => {
    setup({ filters: { ...noFilters, style: 'gambit' }, activeCount: 1 });

    expect(
      screen.getByRole('button', { name: 'Style Gambit' })
    ).toBeInTheDocument();
  });

  it('still labels a selection whose count has fallen to zero', () => {
    // The API keeps the applied value in its own facet list at count 0 exactly
    // so the trigger can name it; without that this would read "Level All"
    // while the grid was filtered to Beginner.
    const zeroed = {
      ...facets,
      level: [{ value: 'Beginner', label: 'Beginner', count: 0 }],
    };
    setup({
      facets: zeroed,
      filters: { ...noFilters, level: 'Beginner' },
      activeCount: 1,
      total: 0,
    });

    expect(
      screen.getByRole('button', { name: 'Level Beginner' })
    ).toBeInTheDocument();
  });

  it('opens a menu of options with their counts and reports the choice', async () => {
    const { onFacetChange } = setup();

    await userEvent.click(screen.getByRole('button', { name: 'Level All' }));
    const option = screen.getByRole('option', { name: /Intermediate/ });
    expect(option).toHaveTextContent('10');

    await userEvent.click(option);
    expect(onFacetChange).toHaveBeenCalledWith('level', 'Intermediate');
  });

  it('closes the menu after a choice', async () => {
    setup();

    await userEvent.click(screen.getByRole('button', { name: 'Level All' }));
    await userEvent.click(screen.getByRole('option', { name: /Intermediate/ }));

    expect(
      screen.queryByRole('option', { name: /Intermediate/ })
    ).not.toBeInTheDocument();
  });

  it('lets a user reset one facet from its own menu', async () => {
    const { onFacetChange } = setup({
      filters: { ...noFilters, level: 'Beginner' },
      activeCount: 1,
    });

    await userEvent.click(
      screen.getByRole('button', { name: 'Level Beginner' })
    );
    await userEvent.click(screen.getByRole('option', { name: 'All levels' }));

    expect(onFacetChange).toHaveBeenCalledWith('level', null);
  });

  it('closes the menu on Escape', async () => {
    setup();

    await userEvent.click(screen.getByRole('button', { name: 'Level All' }));
    await userEvent.keyboard('{Escape}');

    expect(
      screen.queryByRole('option', { name: /Intermediate/ })
    ).not.toBeInTheDocument();
  });

  it('announces the result count to screen readers', () => {
    setup();

    const count = screen.getByText('30 openings');
    expect(count).toHaveAttribute('aria-live', 'polite');
    // NOT role="status" — Toast owns that role in this section, and a second
    // one would make getByRole('status') ambiguous.
    expect(count).not.toHaveAttribute('role');
  });

  it('offers Clear only when something is filtered', () => {
    setup({ activeCount: 0 });

    expect(
      screen.queryByRole('button', { name: 'Clear filters' })
    ).not.toBeInTheDocument();
  });

  it('clears every facet at once', async () => {
    const { onClear } = setup({
      filters: { ...noFilters, level: 'Beginner' },
      activeCount: 1,
    });

    await userEvent.click(
      screen.getByRole('button', { name: 'Clear filters' })
    );
    expect(onClear).toHaveBeenCalled();
  });

  it('sort is not clearable — it always has a value', async () => {
    setup();

    await userEvent.click(
      screen.getByRole('button', { name: 'Sort Most played' })
    );

    expect(screen.getByRole('option', { name: 'A–Z' })).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: /^Any/ })
    ).not.toBeInTheDocument();
  });
});

describe('resultCountLabel', () => {
  it('counts honestly, including the singular and the empty case', () => {
    expect(resultCountLabel(0)).toBe('No openings');
    expect(resultCountLabel(1)).toBe('1 opening');
    expect(resultCountLabel(12377)).toBe('12,377 openings');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm run test:frontend -- src/components/filters/__tests__/FilterBar.test.tsx
```

Expected: FAIL with `Failed to resolve import "../FilterBar"`.

- [ ] **Step 3: Write the shared count formatter**

Create `packages/web/src/components/filters/resultCount.ts`:

```ts
/**
 * One wording for the result count, shared by the desktop bar and the mobile
 * sheet so the same number can never be phrased two ways. "No openings" rather
 * than "0 openings", and the singular is a real case — several families and
 * level/style combinations return exactly one.
 */
export const resultCountLabel = (total: number): string => {
  if (total === 0) return 'No openings';
  if (total === 1) return '1 opening';
  return `${total.toLocaleString()} openings`;
};
```

- [ ] **Step 4: Write the component**

Create `packages/web/src/components/filters/FilterBar.tsx`:

```tsx
import React from 'react';
import { FacetSelect, FacetOptionList } from './FacetSelect';
import { FamilyPicker } from './FamilyPicker';
import { resultCountLabel } from './resultCount';
import { SORT_OPTIONS } from '../../hooks/useBrowse';
import type {
  BrowseFacets,
  BrowseFilters,
  FacetKey,
  FacetValue,
} from '../../hooks/useBrowse';
import styles from './FilterBar.module.css';

/**
 * Desktop filter bar. Four buttons that each say what they filter and what
 * they are set to, replacing two unlabelled pill rows that read as one row of
 * ten with raw ECO letters as jargon.
 *
 * The count is the filtered total from the same request that produced the
 * grid — the whole point of the browse endpoint. It cannot disagree with what
 * is on screen the way the old two-fetch arrangement could.
 */

/**
 * The label for the current value. The API guarantees an applied value stays
 * in its own facet list even at count 0, so this only falls back to the
 * placeholder when nothing is applied.
 */
export const facetDisplay = (
  options: FacetValue[],
  value: string | null,
  placeholder: string
): string => {
  if (!value) return placeholder;
  return options.find((option) => option.value === value)?.label ?? value;
};

interface FilterBarProps {
  facets: BrowseFacets;
  filters: BrowseFilters;
  total: number;
  activeCount: number;
  loading: boolean;
  onFacetChange: (key: FacetKey, value: string | null) => void;
  onClear: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  facets,
  filters,
  total,
  activeCount,
  loading,
  onFacetChange,
  onClear,
}) => {
  const sortLabel =
    SORT_OPTIONS.find((option) => option.value === filters.sort)?.label ??
    SORT_OPTIONS[0].label;

  return (
    <>
      <div className={styles.bar}>
        <FacetSelect
          label="Level"
          display={facetDisplay(facets.level, filters.level, 'All')}
          active={Boolean(filters.level)}
          menuLabel="Filter by level"
        >
          {(close) => (
            <FacetOptionList
              options={facets.level}
              value={filters.level}
              anyLabel="All levels"
              onSelect={(value) => {
                onFacetChange('level', value);
                close();
              }}
            />
          )}
        </FacetSelect>

        <FacetSelect
          label="Style"
          display={facetDisplay(facets.style, filters.style, 'Any')}
          active={Boolean(filters.style)}
          menuLabel="Filter by style"
        >
          {(close) => (
            <FacetOptionList
              options={facets.style}
              value={filters.style}
              anyLabel="Any style"
              onSelect={(value) => {
                onFacetChange('style', value);
                close();
              }}
            />
          )}
        </FacetSelect>

        <FacetSelect
          label="Family"
          display={facetDisplay(facets.family, filters.family, 'Any')}
          active={Boolean(filters.family)}
          menuLabel="Filter by family"
        >
          {(close) => (
            <FamilyPicker
              families={facets.family}
              value={filters.family}
              onSelect={(value) => {
                onFacetChange('family', value);
                close();
              }}
            />
          )}
        </FacetSelect>

        <FacetSelect
          label="Sort"
          display={sortLabel}
          active={false}
          menuLabel="Sort openings"
          align="end"
          className={styles.sortSlot}
        >
          {(close) => (
            <FacetOptionList
              options={SORT_OPTIONS}
              value={filters.sort}
              anyLabel={null}
              onSelect={(value) => {
                onFacetChange('sort', value);
                close();
              }}
            />
          )}
        </FacetSelect>
      </div>

      <div className={styles.meta}>
        {activeCount > 0 && (
          <button type="button" className={styles.clear} onClick={onClear}>
            Clear filters
          </button>
        )}
        <span className={styles.count} aria-live="polite">
          {loading ? 'Counting…' : resultCountLabel(total)}
        </span>
      </div>
    </>
  );
};
```

- [ ] **Step 5: Write the styles**

Create `packages/web/src/components/filters/FilterBar.module.css`:

```css
.bar {
  display: flex;
  align-items: center;
  gap: var(--space-2-5);
  flex-wrap: wrap;
}

/* Sort is a display control, not a filter — pushing it to the far edge keeps
   the three filters reading as one group. */
.sortSlot {
  margin-left: auto;
}

.meta {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.clear {
  background: none;
  border: none;
  padding: var(--space-1) 0;
  color: var(--color-text-secondary);
  font-family: inherit;
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  text-decoration: underline;
  text-underline-offset: 3px;
  text-decoration-color: var(--border-hover);
  cursor: pointer;
}

.clear:hover {
  color: var(--color-text-primary);
}

.clear:focus-visible {
  outline: 2px solid var(--color-brand-orange);
  outline-offset: 2px;
}

.count {
  margin-left: auto;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  font-variant-numeric: tabular-nums;
}
```

- [ ] **Step 6: Run the test to verify it passes**

```bash
npm run test:frontend -- src/components/filters/__tests__/FilterBar.test.tsx
```

Expected: PASS, 12 tests.

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/components/filters/FilterBar.tsx packages/web/src/components/filters/FilterBar.module.css packages/web/src/components/filters/resultCount.ts packages/web/src/components/filters/__tests__/FilterBar.test.tsx
git commit -m "feat(filters): desktop faceted filter bar"
```

---

### Task 6: `FilterSheet` — the mobile sheet

**Files:**

- Create: `packages/web/src/components/filters/FilterSheet.tsx`
- Create: `packages/web/src/components/filters/FilterSheet.module.css`
- Test: `packages/web/src/components/filters/__tests__/FilterSheet.test.tsx`

**Interfaces:**

- Consumes: `FamilyPicker` (Task 4), `resultCountLabel` (Task 5), and the
  `BrowseFacets` / `BrowseFilters` / `FacetKey` / `SORT_OPTIONS` exports from
  `useBrowse` (Task 2).
- Produces, for Task 7:

  ```tsx
  export const FilterSheet: React.FC<{
    facets: BrowseFacets;
    filters: BrowseFilters;
    total: number;
    activeCount: number;
    loading: boolean;
    onFacetChange: (key: FacetKey, value: string | null) => void;
    onClear: () => void;
  }>;
  ```

- [ ] **Step 1: Write the failing test**

Create `packages/web/src/components/filters/__tests__/FilterSheet.test.tsx`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterSheet } from '../FilterSheet';
import { browseResponse } from '../../../test/fixtures/browseResponse';

const facets = browseResponse().facets;
const noFilters = { level: null, style: null, family: null, sort: 'popular' };

const setup = (props = {}) => {
  const onFacetChange = vi.fn();
  const onClear = vi.fn();
  render(
    <FilterSheet
      facets={facets}
      filters={noFilters}
      total={30}
      activeCount={0}
      loading={false}
      onFacetChange={onFacetChange}
      onClear={onClear}
      {...props}
    />
  );
  return { onFacetChange, onClear };
};

afterEach(() => {
  document.body.style.overflow = '';
});

describe('FilterSheet', () => {
  it('collapses to one control with the result count beside it', () => {
    setup();

    expect(screen.getByRole('button', { name: /Filters/ })).toBeInTheDocument();
    expect(screen.getByText('30 openings')).toHaveAttribute(
      'aria-live',
      'polite'
    );
  });

  it('badges how many facets are active', () => {
    setup({
      filters: { ...noFilters, level: 'Beginner', family: 'london' },
      activeCount: 2,
    });

    expect(
      screen.getByRole('button', { name: 'Filters 2 active' })
    ).toBeInTheDocument();
  });

  it('does not badge a zero', () => {
    setup({ activeCount: 0 });

    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument();
  });

  it('opens one sheet holding every facet, not one sheet per facet', async () => {
    setup();

    await userEvent.click(screen.getByRole('button', { name: 'Filters' }));

    const sheet = screen.getByRole('dialog', { name: 'Filters' });
    expect(sheet).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Level' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Style' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Sort' })).toBeInTheDocument();
    expect(screen.getByLabelText('Search families')).toBeInTheDocument();
  });

  it('applies a choice immediately, so the footer count is always true', async () => {
    const { onFacetChange } = setup();

    await userEvent.click(screen.getByRole('button', { name: 'Filters' }));
    await userEvent.click(screen.getByRole('button', { name: /^Advanced/ }));

    expect(onFacetChange).toHaveBeenCalledWith('level', 'Advanced');
    // Still open: the sheet is for setting several facets in one visit.
    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument();
  });

  it('the footer button reveals the result and says how many', async () => {
    setup({ total: 3 });

    await userEvent.click(screen.getByRole('button', { name: 'Filters' }));
    const done = screen.getByRole('button', { name: 'Show 3 openings' });
    await userEvent.click(done);

    expect(
      screen.queryByRole('dialog', { name: 'Filters' })
    ).not.toBeInTheDocument();
  });

  it('says so when the combination matches nothing', async () => {
    setup({ total: 0, activeCount: 2 });

    await userEvent.click(
      screen.getByRole('button', { name: 'Filters 2 active' })
    );

    expect(
      screen.getByRole('button', { name: 'No openings match' })
    ).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    setup();

    await userEvent.click(screen.getByRole('button', { name: 'Filters' }));
    await userEvent.keyboard('{Escape}');

    expect(
      screen.queryByRole('dialog', { name: 'Filters' })
    ).not.toBeInTheDocument();
  });

  it('locks the page behind the sheet and releases it on close', async () => {
    setup();

    await userEvent.click(screen.getByRole('button', { name: 'Filters' }));
    expect(document.body.style.overflow).toBe('hidden');

    await userEvent.keyboard('{Escape}');
    expect(document.body.style.overflow).toBe('');
  });

  it('clears every facet from inside the sheet', async () => {
    const { onClear } = setup({
      filters: { ...noFilters, level: 'Beginner' },
      activeCount: 1,
    });

    await userEvent.click(
      screen.getByRole('button', { name: 'Filters 1 active' })
    );
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));

    expect(onClear).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm run test:frontend -- src/components/filters/__tests__/FilterSheet.test.tsx
```

Expected: FAIL with `Failed to resolve import "../FilterSheet"`.

- [ ] **Step 3: Write the component**

Create `packages/web/src/components/filters/FilterSheet.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { FamilyPicker } from './FamilyPicker';
import { resultCountLabel } from './resultCount';
import { SORT_OPTIONS } from '../../hooks/useBrowse';
import type {
  BrowseFacets,
  BrowseFilters,
  FacetKey,
  FacetValue,
} from '../../hooks/useBrowse';
import styles from './FilterSheet.module.css';

/**
 * Mobile filters: one control with an active count, opening a bottom sheet
 * that holds all four facets as stacked sections.
 *
 * The mock draws a sheet per facet. That would be three taps to set a level
 * (Filters → facet list → facet sheet); stacking the sections is two, and
 * keeps the mock's family search, first-move groups and primary footer button.
 *
 * Choices apply live rather than on a submit, so the footer count is never a
 * stale promise. The footer button reveals the result — it does not apply it.
 */

/**
 * A union of element types, not a union of arrays: `FacetValue[] | Plain[]`
 * would make `options.map` unresolvable, because TypeScript cannot pick one
 * signature for the callback.
 */
type PillOption = FacetValue | { value: string; label: string };

interface PillRowProps {
  legend: string;
  options: PillOption[];
  value: string | null;
  anyLabel: string | null;
  onSelect: (value: string | null) => void;
}

const PillRow: React.FC<PillRowProps> = ({
  legend,
  options,
  value,
  anyLabel,
  onSelect,
}) => (
  <div className={styles.section} role="group" aria-label={legend}>
    <p className={styles.sectionLabel}>{legend}</p>
    <div className={styles.pills}>
      {anyLabel !== null && (
        <button
          type="button"
          className={`${styles.pill} ${value === null ? styles.pillActive : ''}`.trim()}
          aria-pressed={value === null}
          onClick={() => onSelect(null)}
        >
          {anyLabel}
        </button>
      )}
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`${styles.pill} ${value === option.value ? styles.pillActive : ''}`.trim()}
          aria-pressed={value === option.value}
          onClick={() => onSelect(option.value)}
        >
          {option.label}
          {'count' in option && (
            <span className={styles.pillCount}>
              {option.count.toLocaleString()}
            </span>
          )}
        </button>
      ))}
    </div>
  </div>
);

interface FilterSheetProps {
  facets: BrowseFacets;
  filters: BrowseFilters;
  total: number;
  activeCount: number;
  loading: boolean;
  onFacetChange: (key: FacetKey, value: string | null) => void;
  onClear: () => void;
}

export const FilterSheet: React.FC<FilterSheetProps> = ({
  facets,
  filters,
  total,
  activeCount,
  loading,
  onFacetChange,
  onClear,
}) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);

    // A bottom sheet over a page that still scrolls behind it feels broken.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <div className={styles.root}>
      <div className={styles.triggerRow}>
        <button
          type="button"
          className={`${styles.trigger} ${activeCount > 0 ? styles.triggerActive : ''}`.trim()}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <SlidersHorizontal size={15} aria-hidden="true" />
          <span>Filters</span>
          {activeCount > 0 && (
            <span className={styles.badge}>
              {activeCount}
              <span className={styles.srOnly}> active</span>
            </span>
          )}
        </button>
        <span className={styles.count} aria-live="polite">
          {loading ? 'Counting…' : resultCountLabel(total)}
        </span>
      </div>

      {open && (
        <div className={styles.overlay}>
          <div
            className={styles.backdrop}
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div
            className={styles.sheet}
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
          >
            <div className={styles.grabber} aria-hidden="true" />

            <div className={styles.header}>
              <h2 className={styles.title}>Filters</h2>
              {activeCount > 0 && (
                <button
                  type="button"
                  className={styles.clear}
                  onClick={onClear}
                >
                  Clear
                </button>
              )}
            </div>

            <div className={styles.body}>
              <PillRow
                legend="Level"
                options={facets.level}
                value={filters.level}
                anyLabel="All levels"
                onSelect={(value) => onFacetChange('level', value)}
              />
              <PillRow
                legend="Style"
                options={facets.style}
                value={filters.style}
                anyLabel="Any style"
                onSelect={(value) => onFacetChange('style', value)}
              />
              <PillRow
                legend="Sort"
                options={SORT_OPTIONS}
                value={filters.sort}
                anyLabel={null}
                onSelect={(value) => onFacetChange('sort', value)}
              />

              <div className={styles.section}>
                <p className={styles.sectionLabel}>Family</p>
                <FamilyPicker
                  families={facets.family}
                  value={filters.family}
                  onSelect={(value) => onFacetChange('family', value)}
                />
              </div>
            </div>

            <button
              type="button"
              className={styles.done}
              onClick={() => setOpen(false)}
            >
              {total === 0
                ? 'No openings match'
                : `Show ${resultCountLabel(total)}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
```

- [ ] **Step 4: Write the styles**

Create `packages/web/src/components/filters/FilterSheet.module.css`:

```css
.root {
  display: block;
}

.triggerRow {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.trigger {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 44px;
  padding: var(--space-2) var(--space-4);
  background: var(--surface-raised);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
}

.trigger:focus-visible {
  outline: 2px solid var(--color-brand-orange);
  outline-offset: 2px;
}

.triggerActive {
  border-color: var(--accent-a50);
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  padding: 2px var(--space-1-5);
  background: var(--color-brand-orange);
  border-radius: var(--radius-full);
  color: var(--color-text-inverse);
  font-size: var(--text-3xs);
  font-weight: var(--font-weight-bold);
}

.srOnly {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.count {
  margin-left: auto;
  color: var(--color-text-muted);
  font-size: var(--text-sm);
  font-variant-numeric: tabular-nums;
}

.overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: flex-end;
}

.backdrop {
  position: absolute;
  inset: 0;
  background: var(--color-overlay-dark);
}

.sheet {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: 88vh;
  padding: var(--space-3) var(--space-5) var(--space-6);
  background: var(--surface-raised);
  border-top: 1px solid var(--color-border);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
  box-shadow: 0 -12px 40px var(--color-shadow-elevated);
}

.grabber {
  flex: none;
  width: 36px;
  height: 4px;
  margin: 0 auto var(--space-4);
  background: var(--surface-overlay);
  border-radius: var(--radius-full);
}

.header {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}

.title {
  margin: 0;
  font: var(--heading-subsection);
  color: var(--color-text-primary);
}

.clear {
  background: none;
  border: none;
  padding: var(--space-2) 0;
  color: var(--color-text-secondary);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.section {
  margin-bottom: var(--space-5);
}

.sectionLabel {
  margin: 0 0 var(--space-2);
  font-size: var(--text-3xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text-muted);
}

.pills {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1-5);
  min-height: 44px;
  padding: var(--space-2) var(--space-4);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  color: var(--color-text-secondary);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: var(--font-weight-medium);
  white-space: nowrap;
  cursor: pointer;
}

.pill:focus-visible {
  outline: 2px solid var(--color-brand-orange);
  outline-offset: 2px;
}

.pillActive {
  background: var(--accent-a12);
  border-color: var(--accent-a50);
  color: var(--color-text-primary);
}

.pillCount {
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  font-variant-numeric: tabular-nums;
}

/* Primary per the Phase 0 button spec: filled orange, --radius-md. */
.done {
  flex: none;
  width: 100%;
  min-height: 48px;
  margin-top: var(--space-4);
  background: var(--color-brand-orange);
  border: none;
  border-radius: var(--radius-md);
  color: var(--color-text-inverse);
  font-family: inherit;
  font-size: var(--text-md);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
}

.done:focus-visible {
  outline: 2px solid var(--color-brand-orange);
  outline-offset: 2px;
}
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
npm run test:frontend -- src/components/filters/__tests__/FilterSheet.test.tsx
```

Expected: PASS, 11 tests.

Note on the "Show N openings" assertion: `resultCountLabel(3)` returns
`'3 openings'`, so the button reads `Show 3 openings`. If the test fails on a
double word ("Show 3 openings openings"), the template in Step 3 has been typed
with `openings` appended — it must be `` `Show ${resultCountLabel(total)}` ``
and nothing else.

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/components/filters/FilterSheet.tsx packages/web/src/components/filters/FilterSheet.module.css packages/web/src/components/filters/__tests__/FilterSheet.test.tsx
git commit -m "feat(filters): mobile filter sheet"
```

---

### Task 7: Wire the grid to the browse endpoint and remove the old filters

**Files:**

- Modify: `packages/web/src/components/landing/PopularOpeningsGrid.tsx`
  (rewrite)
- Modify: `packages/web/src/pages/LandingPage.tsx`
- Modify: `packages/web/src/styles/simplified.css`
- Test:
  `packages/web/src/components/landing/__tests__/PopularOpeningsGrid.test.tsx`
  (rewrite)
- Test: `packages/web/src/pages/__tests__/LandingPage.test.tsx` (one mock branch
  — eight of its tests assert on grid content that now arrives from a different
  endpoint)
- Delete: `packages/web/src/components/filters/ComplexityFilters.tsx`
- Delete: `packages/web/src/components/filters/CategoryFilter.tsx`
- Delete: `packages/web/src/components/filters/CategoryFilter.module.css`
- Delete:
  `packages/web/src/components/filters/__tests__/CategoryFilter.test.tsx`

**Interfaces:**

- Consumes: `useBrowse` (Task 2), `FilterBar` (Task 5), `FilterSheet` (Task 6),
  and the existing `useIsMobile` from `packages/web/src/hooks/useMediaQuery.ts`.
- Produces: `PopularOpeningsGrid` now takes **only** `{ className?: string }`.
  The `openings` prop is gone.

- [ ] **Step 1: Write the failing test**

Replace the entire contents of
`packages/web/src/components/landing/__tests__/PopularOpeningsGrid.test.tsx`:

```tsx
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PopularOpeningsGrid } from '../PopularOpeningsGrid';
import {
  browseResponse,
  browseItem,
} from '../../../test/fixtures/browseResponse';

const renderGrid = (initialEntry = '/') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <PopularOpeningsGrid />
    </MemoryRouter>
  );

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => browseResponse() })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PopularOpeningsGrid', () => {
  it('renders the openings the browse endpoint returned', async () => {
    renderGrid();

    expect(await screen.findByText('Sicilian Defence')).toBeInTheDocument();
    expect(screen.getByText('Ruy Lopez')).toBeInTheDocument();
  });

  it('the count on screen is the filtered total from the same request', async () => {
    renderGrid();

    await screen.findByText('Sicilian Defence');
    // 30 total, 2 shown — the count states the whole result set, not the page.
    expect(screen.getByText('30 openings')).toBeInTheDocument();
  });

  it('Load more states the true remainder', async () => {
    renderGrid();

    await screen.findByText('Sicilian Defence');
    expect(
      screen.getByRole('button', { name: 'Load more (28 remaining)' })
    ).toBeInTheDocument();
  });

  it('Load more appends rather than replacing', async () => {
    renderGrid();
    await screen.findByText('Sicilian Defence');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () =>
          browseResponse({
            items: [browseItem('French Defence', 'fen-3')],
            page: 2,
            offset: 12,
            remaining: 17,
          }),
      })
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Load more (28 remaining)' })
    );

    expect(await screen.findByText('French Defence')).toBeInTheDocument();
    expect(screen.getByText('Sicilian Defence')).toBeInTheDocument();
  });

  it('hides Load more when nothing remains', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => browseResponse({ total: 2, remaining: 0 }),
      })
    );
    renderGrid();

    await screen.findByText('Sicilian Defence');
    expect(
      screen.queryByRole('button', { name: /Load more/ })
    ).not.toBeInTheDocument();
  });

  it('cards stay real links so 12,000 pages keep their internal links', async () => {
    renderGrid();

    const link = await screen.findByRole('link', { name: /Sicilian Defence/ });
    expect(link).toHaveAttribute('href', '/opening/fen-1');
  });

  it('applies a filter from the URL without the user touching a control', async () => {
    renderGrid('/?level=Beginner');

    await screen.findByText('Sicilian Defence');
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as string;
    expect(url).toContain('level=Beginner');
    expect(
      screen.getByRole('button', { name: 'Level Beginner' })
    ).toBeInTheDocument();
  });

  it('says the filters matched nothing, and offers a way out', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => browseResponse({ items: [], total: 0, remaining: 0 }),
      })
    );
    renderGrid('/?level=Beginner');

    expect(
      await screen.findByText('No openings match these filters.')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Clear filters' })
    ).toBeInTheDocument();
  });

  it('says the load failed rather than showing an empty grid as a result', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    renderGrid();

    expect(
      await screen.findByText(/Could not load openings/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Try again' })
    ).toBeInTheDocument();
  });

  it('still lets a user save from a card, with undo', async () => {
    renderGrid();

    const star = await screen.findAllByRole('button', {
      name: 'Save to repertoire',
    });
    await userEvent.click(star[0]);

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Remove from repertoire' })
      ).toBeInTheDocument()
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Added to your repertoire'
    );

    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(
      screen.getAllByRole('button', { name: 'Save to repertoire' })
    ).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npm run test:frontend -- src/components/landing/__tests__/PopularOpeningsGrid.test.tsx
```

Expected: FAIL — the grid still requires an `openings` prop and fetches
`popular-by-eco`.

- [ ] **Step 3: Rewrite the grid**

Replace the entire contents of
`packages/web/src/components/landing/PopularOpeningsGrid.tsx`:

```tsx
import React from 'react';
import { OpeningCard } from '../shared/OpeningCard';
import { FilterBar } from '../filters/FilterBar';
import { FilterSheet } from '../filters/FilterSheet';
import { Toast } from '../shared/Toast';
import { useBrowse } from '../../hooks/useBrowse';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useRepertoireToast } from '../../hooks/useRepertoireToast';

interface PopularOpeningsGridProps {
  className?: string;
}

/**
 * The Discover grid. Items, the result count and the facet counts all come
 * from one /api/openings/browse request, so the number on screen and the cards
 * under it cannot disagree — they used to come from two different fetches
 * (a popular list for the counts, popular-by-eco for the grid).
 *
 * The heading stays "Popular openings": the default sort is most played, so
 * the unfiltered view is exactly that.
 */
export const PopularOpeningsGrid: React.FC<PopularOpeningsGridProps> = ({
  className = '',
}) => {
  const {
    items,
    facets,
    total,
    remaining,
    loading,
    loadingMore,
    error,
    filters,
    activeCount,
    setFacet,
    clear,
    loadMore,
    retry,
  } = useBrowse();

  const isMobile = useIsMobile();
  const { isSaved, toggleWithToast, toast } = useRepertoireToast();

  const controlProps = {
    facets,
    filters,
    total,
    activeCount,
    loading,
    onFacetChange: setFacet,
    onClear: clear,
  };

  return (
    <section className={`popular-openings-section ${className}`}>
      <div className="section-header">
        <h2>Popular openings</h2>
        <p className="section-subtitle">
          The most popular openings for every style of play, from classic
          variations to hypermodern
        </p>
      </div>

      <div className="filters-container">
        {isMobile ? (
          <FilterSheet {...controlProps} />
        ) : (
          <FilterBar {...controlProps} />
        )}
      </div>

      {error ? (
        <div className="empty-state">
          <p>Could not load openings just now.</p>
          <button onClick={retry} className="reset-filter-btn">
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="openings-grid">
            {items.map((opening) => (
              <OpeningCard
                key={opening.fen}
                opening={opening as never}
                showEco={true}
                showBoard={true}
                showStar={true}
                isStarred={isSaved(opening.fen)}
                onStarClick={() =>
                  toggleWithToast({
                    fen: opening.fen,
                    name: opening.name,
                    eco: opening.eco,
                    moves: opening.moves,
                    complexity: opening.level ?? undefined,
                  })
                }
                className="opening-grid-item"
              />
            ))}
          </div>

          {remaining > 0 && (
            <div className="load-more-section">
              <button
                onClick={loadMore}
                className="load-more-btn"
                disabled={loadingMore}
              >
                {loadingMore
                  ? 'Loading…'
                  : `Load more (${remaining.toLocaleString()} remaining)`}
              </button>
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="empty-state">
              <p>No openings match these filters.</p>
              <button onClick={clear} className="reset-filter-btn">
                Clear filters
              </button>
            </div>
          )}
        </>
      )}

      {toast && <Toast message={toast.message} onUndo={toast.onUndo} />}
    </section>
  );
};
```

`opening as never` is deliberate: `OpeningCard` declares its own local `Opening`
interface with a required `src` field that browse items do not carry and the
card never reads. Widening `OpeningCard`'s props is Phase 4's business, not this
phase's.

- [ ] **Step 4: Run the grid test to verify it passes**

```bash
npm run test:frontend -- src/components/landing/__tests__/PopularOpeningsGrid.test.tsx
```

Expected: PASS, 11 tests.

- [ ] **Step 5: Drop the second fetch from the landing page**

In `packages/web/src/pages/LandingPage.tsx`:

1. Delete the `popularOpenings` and `dataLoaded` state declarations:

```tsx
const [dataLoaded, setDataLoaded] = useState(false);
const [popularOpenings, setPopularOpenings] = useState<Opening[]>([]);
```

2. Replace the whole `loadData` effect (the `useEffect` beginning
   `const loadData = async () => {`, through `loadData();`, and its `}, []);`)
   with a search-index-only load. The `popular-by-eco` fetch existed to feed the
   grid; the grid now fetches for itself.

```tsx
// Only the search index now — the grid fetches its own data from
// /api/openings/browse, which is what makes its count and its contents agree.
useEffect(() => {
  setLoading(true);
  fetch('/api/openings/search-index?limit=1000')
    .then((response) => response.json())
    .then((searchData) => {
      if (searchData.success) setOpeningsData(searchData.data);
    })
    .catch((error) => {
      console.warn('Search index loading failed:', error);
    })
    .finally(() => setLoading(false));
}, []);
```

3. Replace the grid block:

```tsx
{
  /* Popular Openings Grid */
}
<div className="popular-openings-container">
  {dataLoaded && popularOpenings.length > 0 ? (
    <PopularOpeningsGrid openings={popularOpenings} className="main-grid" />
  ) : (
    <div className="popular-openings-placeholder">
      {/* Reserved space for Popular Openings to prevent layout shift */}
    </div>
  )}
</div>;
```

with:

```tsx
{
  /* Popular Openings Grid */
}
<div className="popular-openings-container">
  <PopularOpeningsGrid className="main-grid" />
</div>;
```

- [ ] **Step 6: Point the landing-page test's fetch mock at the new endpoint**

`packages/web/src/pages/__tests__/LandingPage.test.tsx` has eight tests that
wait for grid content ("King's Pawn Game", "C20", "1.e4 e5"). That content used
to arrive from `popular-by-eco`; it now arrives from `/api/openings/browse` in a
different shape, so without this the suite fails as a group.

In its `beforeEach`, add a `browse` branch **above** the existing
`popular-by-eco` branch (leave that one in place — it is now unused by the page
but harmless, and removing it is churn):

```tsx
if (url.includes('/api/openings/browse')) {
  return Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        success: true,
        items: mockOpeningsList,
        total: mockOpeningsList.length,
        page: 1,
        pageSize: 12,
        offset: 0,
        remaining: 0,
        facets: { level: [], style: [], family: [] },
        applied: { level: null, style: null, family: null, sort: 'popular' },
      }),
  });
}
```

Do **not** change the four `mockImplementationOnce` tests ("empty openings
data", "null openings data", "malformed opening data", "fetch errors"). Their
once-mock now intercepts the grid's browse call instead of the page's
popular-by-eco call — React runs a child's effect before its parent's, so the
grid fetches first. Each returns a payload with no `items` array, the hook's
guard turns that into the error state, and every one of those tests asserts only
that the `h1` still renders or that opening data is absent. They pass unchanged,
and they are now exercising the guard.

- [ ] **Step 7: Delete the components the bar replaces**

```bash
git rm packages/web/src/components/filters/ComplexityFilters.tsx packages/web/src/components/filters/CategoryFilter.tsx packages/web/src/components/filters/CategoryFilter.module.css packages/web/src/components/filters/__tests__/CategoryFilter.test.tsx
```

- [ ] **Step 8: Delete the CSS those components owned**

In `packages/web/src/styles/simplified.css`, delete these rules and nothing
else. Every one of them is now referenced by no file — verified in Step 8.

1. `.category-filters { ... }` (the block starting near line 2228)
2. `.filter-scroll { ... }` and its explanatory comment
3. The entire `@media (max-width: 767px) { ... }` block that follows, containing
   `.category-filters`, `.category-filters::-webkit-scrollbar`,
   `.category-filters .category-btn`, `.category-filters--eco` and
   `.filter-scroll::after`
4. `.category-btn { ... }`, `.category-btn:hover { ... }`,
   `.category-btn.active { ... }`
5. `.popular-openings-placeholder { ... }`

Keep `.filters-container`, `.empty-state`, `.reset-filter-btn`,
`.load-more-section`, `.load-more-btn`, `.openings-grid` and
`.popular-openings-container` — all are still rendered.

- [ ] **Step 9: Prove no dead reference and no live orphan remains**

```bash
grep -rn "ComplexityFilters\|CategoryFilter\|category-btn\|category-filters\|filter-scroll\|popular-openings-placeholder" packages/web/src || echo "CLEAN"
```

Expected: `CLEAN`. Any hit is either an import that must go or a class that must
not have been deleted.

- [ ] **Step 10: Run the full frontend suite**

```bash
npm run test:frontend
```

Expected: PASS. The Phase 2 baseline is 372 tests; this phase removes the 5
`CategoryFilter` tests and the 2 old grid tests and adds roughly 50, so the
total should land near 415 — treat that as a sanity range, not an assertion.
**The rule that matters: if any suite outside `src/components/filters`,
`src/components/landing`, `src/hooks` or `src/pages` fails, stop.** Nothing else
should be affected, and a failure elsewhere means a global CSS class was deleted
that another component still uses.

- [ ] **Step 11: Verify the build and format only what you touched**

```bash
npm run build
```

Expected: clean build.

```bash
npx prettier --write packages/web/src/components/filters packages/web/src/components/landing packages/web/src/hooks/useBrowse.ts packages/web/src/pages/LandingPage.tsx packages/web/src/test/fixtures/browseResponse.ts packages/web/src/styles/simplified.css
```

Do **not** run `npm run format`.

- [ ] **Step 12: Verify against the running API**

```bash
npm run dev
```

Then, in a second terminal:

```bash
curl -s "http://localhost:3010/api/openings/browse?family=sicilian&pageSize=12" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const r=JSON.parse(s);console.log('total',r.total,'shown',r.items.length,'remaining',r.remaining,'reconciles',r.total===r.offset+r.items.length+r.remaining);console.log('family first moves',r.facets.family.slice(0,3).map(f=>f.label+'='+f.first_move).join(', '));})"
```

Expected: `total 1710 shown 12 remaining 1698 reconciles true`.

Then open `http://localhost:3000` and check, at 1360px wide:

1. Four facet buttons read `Level All`, `Style Any`, `Family Any`,
   `Sort Most played`; the count reads `12,377 openings`.
2. Choosing `Style → Gambit` updates the URL to `/?style=gambit`, the count to
   `2,182 openings`, and the Level counts change while every level stays listed.
3. `Load more` says `(2,170 remaining)` and appends 12 more without clearing the
   first 12.
4. Navigating into an opening and pressing Back restores `Style Gambit`.
5. A grid card's context menu offers "Open link in new tab".

Then at 390px wide: one `Filters` control with the count beside it; the sheet
opens with Level, Style, Sort pill rows and a searchable Family list; the page
behind does not scroll; the footer button reads `Show N openings` and closes.

- [ ] **Step 13: Commit**

```bash
git add -A packages/web/src
git commit -m "feat(discover): faceted filter bar replaces the ECO pill rows"
```

---

### Task 8: Design-system lockstep and memory bank

**Files:**

- Create: `design-system/project/preview/components-filter-bar.html`
- Delete: `design-system/project/preview/components-filters-mobile.html`
- Modify: `.github/memory-bank/activeContext.md`
- Modify: `.github/memory-bank/progress.md`

**Interfaces:**

- Consumes: the finished components from Tasks 3–6.
- Produces: nothing consumed by code.

- [ ] **Step 1: Add the preview card**

Create `design-system/project/preview/components-filter-bar.html`:

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <link rel="stylesheet" href="../colors_and_type.css" />
    <style>
      body {
        padding: 24px;
        background: var(--surface-base);
        font-family: var(--font-family-primary), sans-serif;
      }
      .row {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        flex-wrap: wrap;
        margin-bottom: 22px;
      }
      .cap {
        display: block;
        font-family: var(--font-family-mono);
        font-size: 10px;
        color: var(--color-text-muted);
        letter-spacing: 0.06em;
        text-transform: uppercase;
        margin-bottom: 10px;
      }
      /* Facet trigger — states what it filters and what it is set to. */
      .facet {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-height: 44px;
        padding: 8px 13px;
        background: var(--surface-raised);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        font-size: 13px;
        font-weight: 500;
      }
      /* Active is a border, not a fill: a filter state must not read as a CTA. */
      .facet--active {
        border-color: rgba(232, 93, 4, 0.5);
      }
      .facet .k {
        color: var(--color-text-muted);
      }
      .facet .v {
        color: var(--color-text-secondary);
      }
      .facet--active .v {
        color: var(--color-text-primary);
      }
      .menu {
        width: 260px;
        background: var(--surface-overlay);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: var(--radius-lg);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
        overflow: hidden;
      }
      .item {
        display: flex;
        align-items: center;
        gap: 12px;
        min-height: 44px;
        padding: 12px 16px;
        font-size: 13px;
        color: var(--color-text-secondary);
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      }
      .item:last-child {
        border-bottom: none;
      }
      .item--active {
        background: rgba(232, 93, 4, 0.12);
        color: var(--color-text-primary);
        font-weight: 600;
      }
      .item .n {
        margin-left: auto;
        color: var(--color-text-muted);
        font-variant-numeric: tabular-nums;
      }
      .grouphead {
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--color-text-muted);
        margin: 12px 0 4px;
      }
      .famrow {
        display: flex;
        align-items: center;
        min-height: 44px;
        padding: 10px 8px;
        font-size: 14px;
        font-weight: 500;
        color: var(--color-text-primary);
        border-radius: var(--radius-sm);
      }
      .famrow .n {
        margin-left: auto;
        font-size: 12px;
        color: var(--color-text-muted);
      }
      .trigger {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-height: 44px;
        padding: 8px 16px;
        background: var(--surface-raised);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
        color: var(--color-text-primary);
        font-size: 13px;
        font-weight: 500;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 18px;
        padding: 2px 6px;
        background: var(--color-brand-orange);
        border-radius: var(--radius-full);
        color: var(--color-text-inverse);
        font-size: 10px;
        font-weight: 700;
      }
      .count {
        color: var(--color-text-muted);
        font-size: 13px;
        font-variant-numeric: tabular-nums;
      }
      .done {
        width: 260px;
        min-height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--color-brand-orange);
        border-radius: var(--radius-md);
        color: var(--color-text-inverse);
        font-size: 16px;
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <!-- Discover's faceted filter bar. Replaces the two unlabelled pill rows
         (level + ECO category) that read as one row of ten. Every control
         states what it filters and what it is currently set to; counts come
         from the same /api/openings/browse request that fills the grid, so the
         number on screen cannot disagree with the cards under it. -->

    <div class="row">
      <div>
        <span class="cap">facet triggers — desktop, default and active</span>
        <div style="display: flex; gap: 10px; flex-wrap: wrap">
          <span class="facet"
            ><span class="k">Level</span><span class="v">All</span></span
          >
          <span class="facet facet--active"
            ><span class="k">Style</span><span class="v">Gambit</span></span
          >
          <span class="facet"
            ><span class="k">Family</span><span class="v">Any</span></span
          >
          <span class="facet"
            ><span class="k">Sort</span><span class="v">Most played</span></span
          >
        </div>
      </div>
    </div>

    <div class="row">
      <div>
        <span class="cap"
          >option menu — counts exclude the facet's own filter</span
        >
        <div class="menu">
          <div class="item item--active"><span>All levels</span></div>
          <div class="item">
            <span>Beginner</span><span class="n">179</span>
          </div>
          <div class="item">
            <span>Intermediate</span><span class="n">4,587</span>
          </div>
          <div class="item">
            <span>Advanced</span><span class="n">7,611</span>
          </div>
        </div>
      </div>

      <div>
        <span class="cap">family picker — grouped by first move</span>
        <div class="menu" style="padding: 12px">
          <div class="grouphead">1. e4</div>
          <div class="famrow">
            <span>Sicilian Defense</span><span class="n">1,710</span>
          </div>
          <div class="famrow">
            <span>Ruy Lopez</span><span class="n">805</span>
          </div>
          <div class="grouphead">1. d4</div>
          <div class="famrow">
            <span>Queen's Gambit</span><span class="n">1,041</span>
          </div>
          <!-- Families with no dominant first move are not filed under one:
               Irregular Openings is 32% 1.d4, which is not a fact. -->
          <div class="grouphead">Other openings</div>
          <div class="famrow">
            <span>Irregular Openings</span><span class="n">940</span>
          </div>
        </div>
      </div>
    </div>

    <div class="row">
      <div>
        <span class="cap"
          >mobile — one control, badge counts active facets</span
        >
        <div
          style="display: flex; align-items: center; gap: 12px; width: 320px"
        >
          <span class="trigger">Filters<span class="badge">2</span></span>
          <span class="count" style="margin-left: auto">2,182 openings</span>
        </div>
      </div>

      <div>
        <span class="cap"
          >mobile sheet footer — primary, reveals the result</span
        >
        <div class="done">Show 2,182 openings</div>
      </div>
    </div>
  </body>
</html>
```

- [ ] **Step 2: Remove the preview card for the deleted components**

```bash
git rm design-system/project/preview/components-filters-mobile.html
```

- [ ] **Step 3: Check whether the bundle indexes its preview cards**

```bash
grep -rn "components-filters-mobile" design-system/ || echo "NO INDEX REFERENCE"
```

If the grep returns hits (for example in `design-system/README.md`), replace
each `components-filters-mobile.html` reference with
`components-filter-bar.html` and update the surrounding description to "faceted
filter bar (Level · Style · Family · Sort)". If it prints `NO INDEX REFERENCE`,
do nothing.

- [ ] **Step 4: Update `activeContext.md`**

Replace the whole file with the following. It must stay under 50 lines — the
previous "Current Task" becomes "Previous Task", and Phase 1's detail moves out.

```markdown
# Active Context

**Date:** 2026-07-28

## Current Task: UX review phase 3 — faceted filter bar (`ux/phase-3-filter-bar`)

Fourth of six phases implementing the 2026-07 UX review. Stacked on
`ux/phase-2-browse-api` (PRs #58, #59 and #60 still open into `feat/ux-review`).

Two unlabelled pill rows — level plus raw ECO letters, reading as one row of ten
— become four facet buttons that each state what they filter and what they are
set to: **Level · Style · Family · Sort**. The grid, the result count and the
facet counts now come from **one** `/api/openings/browse` request, so the number
on screen and the cards under it cannot disagree. That mismatch was the bug the
review found and phase 2 built the endpoint to fix.

- **Filter state lives in URL search params.** The only way back-navigation
  restores the active facets, and the grid cards stay real `<Link>`s so 12,000+
  indexed pages keep their internal links. The facet controls are `<button>`s,
  so no crawlable filter URLs are created; canonical stays `/`.
- **"Load more" depth is deliberately NOT in the URL.** The spec asks that
  filters survive back-navigation, not scroll depth.
- **Family replaces ECO categories**, grouped by first move. The server derives
  the move (`BrowseService.familyFirstMoves`); a family whose commonest first
  move covers under 60% of it reports `null` and lands in "Other openings" —
  Irregular Openings is 32% 1.d4, which is not a fact worth asserting.
- **The applied facet value now survives at count 0** in its own facet list.
  Without it the bar cannot label the user's own selection and an empty grid has
  no visible cause.
- **One mobile sheet holds all four facets**, not one sheet per facet as the
  mock draws — that would be three taps to set a level. Choices apply live so
  the footer count is never a stale promise.
- **Client page size is 12**, not the API default of 24: every card renders a
  MiniBoard.
- `ComplexityFilters`, `CategoryFilter` and their CSS are deleted.

**Known:** the level facet is 61% Advanced, 1.4% Beginner. Now that the facet is
on screen, measure its usage before deciding whether to re-enrich or drop the
dimension.

**Spec:** `docs/superpowers/specs/2026-07-27-ux-review-implementation-design.md`
**Plans:** `docs/superpowers/plans/2026-07-2{7,8}-ux-phase-{0,1,2,3}-*.md`

## Previous Task: UX review phase 2 — browse API (PR #60)

`GET /api/openings/browse` returning items, `total`, `remaining` and facet
counts from one index in one request. One primary style per opening; facets
exclude their own dimension; unknown values 400; page size capped at 48. No UI
change. **Detail in `archive.md`.**
```

- [ ] **Step 5: Update `progress.md`**

Add this entry at the top of the "What's Done (newest first)" list, immediately
above the phase 2 entry:

```markdown
- **UX review phase 3 — faceted filter bar** (2026-07-28,
  `ux/phase-3-filter-bar`, stacked on phase 2): two unlabelled pill rows become
  Level · Style · Family · Sort, each stating its own value; grid, count and
  facet counts come from one `/api/openings/browse` request, so the count
  mismatch on the landing page is gone. Filter state in URL params (back
  restores the facets); cards stay crawlable `<Link>`s; families grouped by
  first move, with the 2 grab-bag families in "Other openings" rather than filed
  under a move that is not theirs. One mobile sheet, all four facets, applied
  live. `ComplexityFilters` and `CategoryFilter` deleted.
```

Then edit the "What's Left" entry for the UX phases — it currently reads "**UX
review phases 3–5**: filter bar (3), desktop detail shell (4), Analyse (5)" and
ends with a sentence about the landing grid still using `popular-by-eco`.
Replace that whole bullet with:

```markdown
- **UX review phases 4–5**: desktop detail shell (4), Analyse (5) — both land on
  `feat/ux-review`, which merges to `main` as a single PR. Plans written when
  reached.
```

Check the file is still under 100 lines:

```bash
node -e "console.log(require('fs').readFileSync('.github/memory-bank/progress.md','utf8').split('\n').length)"
```

Expected: a number below 100. If it is over, move the oldest "What's Done" entry
into `.github/memory-bank/archive.md`.

- [ ] **Step 6: Run the full suite one last time**

```bash
npm run test:frontend && npm test -- --testPathIgnorePatterns='\.worktrees' && npm run build
```

Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add design-system .github/memory-bank
git commit -m "chore(filters): design-system preview card and memory bank for UX phase 3"
```

- [ ] **Step 8: Open the PR**

```bash
git push -u origin ux/phase-3-filter-bar
```

```bash
gh pr create --base ux/phase-2-browse-api --head ux/phase-3-filter-bar --title "UX phase 3: faceted filter bar" --body "$(cat <<'EOF'
Fourth of six phases implementing the 2026-07 UX review. Base is
`ux/phase-2-browse-api`, not `main` — phases stack and `feat/ux-review` merges
to `main` once, at the end.

Two unlabelled pill rows (level + raw ECO letters, reading as one row of ten)
become four facet buttons that each state what they filter and what they are
set to: Level · Style · Family · Sort. The grid, the result count and the facet
counts now come from one `/api/openings/browse` request, so the number on screen
and the cards under it cannot disagree — the mismatch the review found, and the
reason phase 2 built the endpoint.

- Filter state in URL search params; cards stay real `<Link>`s; facet controls
  are `<button>`s, so no crawlable filter URLs and canonical stays `/`.
- Families grouped by first move, derived server-side. A family whose commonest
  first move covers under 60% of it reports `null` and lands in "Other
  openings" — Irregular Openings is 32% 1.d4, which is not a fact.
- The applied facet value now survives at count 0 in its own facet list, so the
  bar can always label the user's own selection and an empty grid has a visible
  cause.
- One mobile sheet holds all four facets rather than one sheet per facet as the
  mock draws; choices apply live so the footer count is never stale.
- `ComplexityFilters`, `CategoryFilter` and their CSS are deleted.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review

**1. Spec coverage.** Every Phase 3 bullet in §5 of the spec maps to a task:
desktop four facet buttons + count + Clear → Task 5; mobile Filters control with
active count and a sheet → Task 6; Family replaces ECO categories, search field,
grouped by first move → Tasks 1 and 4; URL search-param state and cards as `<a>`
links → Tasks 2 and 7; `aria-live` on the count → Tasks 5 and 6; honest "Load
more (N remaining)" → Task 7. The §6 verification list (both test suites, build,
design-system lockstep, memory-bank limits, format caveat) is in Global
Constraints and Task 8. The §8 risk "Phase 3 filter refactor silently drops
crawlable card links" is covered by an explicit test in Task 7 Step 1 and a
manual check in Step 11.

**2. Spec items deliberately not done here.** The §6 line "Playwright
screenshots at 1360 and 390" is replaced by the scripted manual pass in Task 7
Step 11 — this repo has no Playwright dependency or harness, and adding one is a
larger change than this phase should carry. Flag it in the PR if the reviewer
wants screenshots. The §6 line "Merge `main` into the integration branch at the
start of each phase" is a no-op here: `main` has not moved since Phase 0
branched, and the phase branches are stacked rather than each cut from
`feat/ux-review`.

**3. Type consistency.** `FacetValue`, `BrowseFacets`, `BrowseFilters`,
`FacetKey`, `BrowseItem` and `SORT_OPTIONS` are defined once in Task 2 and
imported by name in Tasks 4, 5 and 6. `resultCountLabel` lives in its own module
(Task 5 Step 3) and is imported by both the bar and the sheet, so the footer and
the count cannot word the same number differently. `first_move` is spelled
snake_case throughout, matching the API's other fields. `PillRow`'s `options` is
a union of element types, not of arrays, so `.map` resolves. The grid's props in
Task 7 (`{ className }`) match the call site in Task 7 Step 5.

**4. Defects found reviewing this plan against the code, and fixed above.**
Recorded because each would have cost an implementer a debugging cycle.

- The null-first-move test originally asserted on `uncategorised`, which has
  exactly **one** opening in the fixture and therefore a 100% modal first move.
  The plan told the implementer to edit the fixture to create a 50/50 split,
  which is impossible with one row. `english` already has three openings with
  three different first moves (`1. c4`, `1. Nf3`, `1. g3`) — a 33% modal share.
  No fixture change is needed at all; that step is gone.
- `LandingPage.test.tsx` was missed entirely on the first pass. Eight of its
  tests wait for grid content that now arrives from a different endpoint in a
  different shape, so the suite would have failed as a group with no explanation
  in the plan. Task 7 Step 6 covers it.
- The hook checked `data.success` but not that `items` is an array. Four
  `mockImplementationOnce` tests in `LandingPage.test.tsx` return
  `{ success: true, data: [] }` — no `items` — and React runs the grid's effect
  before the page's, so those mocks now intercept the _browse_ call.
  `setItems(undefined)` would white-screen the landing page on the next `.map`.
  The guard is real hardening, not test-fitting: a proxy error page or truncated
  payload does the same thing in production.
- `setSearchParams` defaults to **push**, so four facet taps would have cost
  four Back presses to leave the page. Changed to `replace`, which still
  satisfies the spec's checkpoint (returning from a detail page restores the
  facets).
- `PillRow` typed its options as a union of two array types, which makes
  `options.map` unresolvable in TypeScript — a clean `npm run build` would have
  failed at the last step of Task 6.

**5. Found during implementation, after the plan was written.** Both are fixed
in the delivered code; recorded here so the plan matches what shipped.

- **The mobile sheet had to be portalled to `<body>`.** `position: fixed`
  resolves against the nearest ancestor carrying a transform, and
  `.popular-openings-section` animates `sectionReveal`, whose keyframes carry
  `translateY(12px)`. Rendered in place, the sheet was positioned relative to
  that section: measured at `top: 1819px` in a 844px-tall viewport, with its
  footer button ~1,000px below the fold. This is a third variant of the
  transform gotcha CLAUDE.md documents (the first was `animation-fill-mode` on a
  stacking context, the second `overflow: hidden` and sticky children) — caught
  only by measuring geometry in a real browser, since jsdom has no layout.
  `createPortal` makes the sheet immune to any ancestor's transform, now or
  later. Regression-tested by asserting the dialog is not inside the component's
  own container.
- **The empty state must not say "Clear filters".** The plan gave the empty
  state and the filter bar the same button label, and they render at the same
  time — a genuine ambiguity for a screen-reader user, not just a failing
  `getByRole`. The empty state now reads "Show all openings", which states the
  outcome rather than the mechanism.

**6. Behaviour change worth knowing about.** The old grid filtered out openings
with one move (`countMoves(moves) <= 1`) client-side. The browse endpoint does
not, so root openings such as "King's Pawn Game" (1.e4) now appear in the grid.
That filter was a workaround for a grid fed by a different endpoint; the root
openings are real pages in the product and beginner-relevant. Excluding them
server-side would also change `total` and break the phase 2 reconciliation
tests. Two cards can also show the same name at different positions (e.g. two
"Sicilian Defense: Smith-Morra Gambit" rows with different FENs, ECOs and moves)
— a pre-existing characteristic of the ECO naming data, not a duplicate row and
not this phase's to fix.
