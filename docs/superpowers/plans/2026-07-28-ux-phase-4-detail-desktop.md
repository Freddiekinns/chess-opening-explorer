# UX Phase 4 — Opening detail (desktop) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put everything the level filter governs inside one bordered
`ExplorerCard`, and everything it does not govern outside it — so the filter's
reach is visible rather than asserted.

**Architecture:** The desktop right rail becomes Overview → `ExplorerCard` →
`MasterGamesCard`. `ExplorerCard` is a shell: a raised header band carrying the
title "Opening explorer", a source line and the `LevelLens` pills, over a body
of `WinRatePanel` (stats) + `OpeningNavigator` (breadcrumb, next moves,
alternatives). `WinRatePanel` gives up its pills, its master-games block **and
its own explorer fetch** — it becomes presentational and consumes the page's
existing `ExplorerQuery`. Master games become a shared `MasterGamesCard` serving
both breakpoints, retiring `MobileMasterGames` and the duplicate masters fetch.
All level-dependent labelling moves into one shared module so desktop and mobile
cannot drift.

**Tech Stack:** React 19 + TypeScript, CSS Modules, `lucide-react`, Vitest +
Testing Library.

## Global Constraints

- **Re-parenting, not restyling.** July's `WinRatePanel` styling survives
  intact: the stat pair, the win bar and legend, the two-line stacked move rows,
  the Overview card. Only the block parentage changes. (Spec §3.1.)
- **Never render fabricated data.** If a figure is not in our payload, omit the
  element. No invented event names, no invented rating floors, no invented
  totals.
- **Empty blocks are omitted, not shown empty.** Most of the 12,377 openings are
  sparse. Do not add empty-state cards.
- **`overflow: clip`, never `overflow: hidden`,** on any card that could contain
  a `position: sticky` child. `hidden` makes the card a scroll container and the
  sticky child sticks to it instead of the viewport.
- **Tokens only.** Map every mock value to an existing custom property in
  `packages/web/src/styles/simplified.css`. Never port a hex value.
- **Copy:** sentence case, British spelling. "Opening book" → **"Opening
  explorer"** everywhere it names this surface.
- **Design-system lockstep:**
  `design-system/project/preview/components-opening-detail-right-column.html`
  documents the superseded July structure and must be updated in this PR.
- **Branch:** `ux/phase-4-detail-desktop`, stacked on `ux/phase-3-filter-bar`.
  PR targets `ux/phase-3-filter-bar`. **Never merge to `main`.**

---

## Data facts (measured, not assumed)

Read these before writing copy. Several mock strings are not renderable from our
payload.

| Fact                                                                                                                                                                                                   | Source                                                | Consequence                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `ExplorerTopGame` has `id`, `white{name,rating}`, `black{name,rating}`, `winner`, `year`. **No event name.**                                                                                           | `lib/lichessExplorer.ts:61`                           | The mock's "World Championship · 1985" cannot be rendered. Rows show players, result and year only.             |
| The masters request asks for `topGames=15`; `normalise()` slices to 15.                                                                                                                                | `explorer.routes.js:32`, `lichessExplorer.ts:18`      | We never hold more than 15 games for a position.                                                                |
| `rankNotableGames` dedupes by player name, so the usable list is typically 3–5.                                                                                                                        | `lichessExplorer.ts:290`                              | The mock's "All 47 master games" is unrenderable **and** would be a false claim about a list we only sample.    |
| The masters band applies **no rating filter** — it is the Lichess masters DB default.                                                                                                                  | `explorer.routes.js:54`                               | "2,400+ Elo" is not a fact we hold. Use the wording already in `bandTooltip`: over-the-board masters.           |
| `OpeningDetailPage` already runs `useExplorerQuery(fen, band)` for `OpeningNavigator`, and `WinRatePanel` independently fetches the same pair.                                                         | `OpeningDetailPage.tsx:138`, `WinRatePanel.tsx:124`   | Deduped by `fetchExplorer`'s cache, but two copies of the same state. Phase 4 keeps one.                        |
| Mobile band-fetch failures are reported to **nothing** today: `useExplorerQuery` swallows, `MobileMasterGames` catches silently, and `WinRatePanel` (which owns the beacon) does not render on mobile. | `useExplorerResult.ts:46`, `MobileMasterGames.tsx:66` | Moving the beacon into `useExplorerQuery` fixes a real analytics blind spot.                                    |
| Practice is already primary filled orange (`.practice-toggle-btn`, `simplified.css:2715`).                                                                                                             | Phase 0                                               | The phase-4 bullet "Practice to primary filled" is **already done**. Verify, change nothing.                    |
| `.left-column` is the sticky element; the explorer card lives in `.right-column`, a sibling subtree.                                                                                                   | `simplified.css:371`                                  | The explorer card's own overflow cannot break the board's stick — but use `clip` anyway per Global Constraints. |

---

## Recorded decisions

1. **Master-games source line is "Over-the-board masters", not "2,400+ Elo".**
   We apply no rating filter; the number would be invented. This wording already
   exists in `bandTooltip`.
2. **The reveal reads "Show N more games", not "All 47 master games".** We hold
   at most 15 top games and dedupe by player, so no total is available; naming
   the payload of the press is the honest form of change 13.
3. **`ExplorerCard` does not fetch.** It receives the page's `ExplorerQuery`.
   This retires `WinRatePanel`'s duplicate band fetch and lets the header source
   line reflect the fetch state, which is what addition 1 (snapshot-fallback
   labelling) requires.
4. **`MasterGamesCard` keeps its own IntersectionObserver-gated masters fetch.**
   The masters call is a distinct band and the in-view gate is what keeps
   crawler and above-the-fold traffic off the 25 req/min token budget.
   Consequence: **it will not render in the browser pane** (known issue — IO
   never fires while the pane has work in flight). Verify it by unit test.
5. **The mobile sticky header gains the title and source line.** The mock draws
   them; without them mobile cannot carry the snapshot-fallback labelling
   either. This is the "copy changes" half of phase 4's mobile scope.
6. **`MobileDataSurface` renames "Continuations" to "Next moves"** to match the
   desktop card and the mobile mock. One name for one list.
7. **The stat label, source line and popularity captions come from one module**
   (`lib/explorerStats.ts`), imported by both breakpoints. The spec's risk table
   requires the two cards to show the same labels; sharing the strings is the
   only way that stays true.
8. **`levelEcho('masters')` is `'masters'`, not `'master games'`** — otherwise
   the stat label reads "Games · master games".

---

## File structure

**Create**

| File                                                                     | Responsibility                                                                |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `packages/web/src/lib/explorerStats.ts`                                  | The single source of level-dependent labels and stat views.                   |
| `packages/web/src/lib/__tests__/explorerStats.test.ts`                   | Its tests.                                                                    |
| `packages/web/src/components/detail/MasterGamesCard.tsx` + `.module.css` | Shared master-games list, `card` (desktop) and `accordion` (mobile) variants. |
| `packages/web/src/components/detail/__tests__/MasterGamesCard.test.tsx`  | Its tests.                                                                    |
| `packages/web/src/components/detail/ExplorerCard.tsx` + `.module.css`    | The shell: header band + stats + book.                                        |
| `packages/web/src/components/detail/__tests__/ExplorerCard.test.tsx`     | Its tests.                                                                    |
| `design-system/project/preview/components-explorer-card.html`            | Preview card for the new surface.                                             |

**Modify**

| File                                                                                           | Change                                                                                          |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `packages/web/src/hooks/useExplorerResult.ts`                                                  | Report `explorer_error` on band-fetch failure.                                                  |
| `packages/web/src/components/detail/WinRatePanel.tsx` + `.module.css`                          | Presentational stats block: no pills, no masters, no fetch.                                     |
| `packages/web/src/components/detail/OpeningNavigator.tsx` + `.module.css`                      | Always renders embedded (no card chrome, no title); level-echoed captions; "Show N more moves". |
| `packages/web/src/components/detail/mobile/MobileDataSurface.tsx` + `.module.css`              | Adopt `explorerStats`; header title + source line; "Next moves"; "Show N more moves".           |
| `packages/web/src/pages/OpeningDetailPage.tsx`                                                 | Desktop rail re-wired; mobile master games moved below resources.                               |
| `packages/web/src/components/detail/index.ts`                                                  | Export the new components.                                                                      |
| `packages/web/src/components/detail/VideoGallery.tsx`, `StudiesGallery.tsx`, `CommonPlans.tsx` | Labelled reveals.                                                                               |
| `design-system/project/preview/components-opening-detail-right-column.html`                    | Record the superseded structure.                                                                |
| `.github/memory-bank/activeContext.md`, `progress.md`                                          | Phase 4 entry.                                                                                  |

**Delete**

`packages/web/src/components/detail/mobile/MobileMasterGames.tsx`, its
`.module.css`, and `mobile/__tests__/MobileMasterGames.test.tsx` — replaced by
`MasterGamesCard`.

`packages/web/src/components/detail/WinRateBar.tsx` and `WinRateBar.module.css`
— `WinRatePanel` was its only caller (verified:
`grep -rn "WinRateBar" packages/web/src` returns `WinRateBar.tsx`,
`WinRatePanel.tsx` and the barrel, nothing else). Task 4 orphans it, so Task 4
removes it rather than leaving dead code behind.

---

## Task 1: Shared level labelling and stat views

**Files:**

- Create: `packages/web/src/lib/explorerStats.ts`
- Create: `packages/web/src/lib/__tests__/explorerStats.test.ts`

**Interfaces:**

- Consumes: `BandId`, `ExplorerResult`, `getBand` from `lib/lichessExplorer`;
  `formatCount` from `lib/openingBook`.
- Produces: `MIN_LIVE_SAMPLE`, `StatsView`, `PopularityStats`, `levelEcho`,
  `explorerSourceLine`, `gamesStatLabel`, `movesCaption`, `alternativesCaption`,
  `liveStatsView`, `snapshotStatsView`.

- [ ] **Step 1: Write the failing test**

Create `packages/web/src/lib/__tests__/explorerStats.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import {
  alternativesCaption,
  explorerSourceLine,
  gamesStatLabel,
  levelEcho,
  liveStatsView,
  movesCaption,
  snapshotStatsView,
} from '../explorerStats';
import type { ExplorerResult } from '../lichessExplorer';

function result(overrides: Partial<ExplorerResult> = {}): ExplorerResult {
  return {
    totalGames: 1000,
    white: 420,
    draws: 60,
    black: 520,
    moves: [],
    topGames: [],
    averageRating: 1604,
    ...overrides,
  };
}

describe('levelEcho', () => {
  test('uses the rating range, not the learner label', () => {
    expect(levelEcho('1400')).toBe('1400–1800');
    expect(levelEcho('all')).toBe('all ratings');
    expect(levelEcho('u1400')).toBe('under 1400');
  });

  test('masters echoes as "masters", so labels do not read "Games · master games"', () => {
    expect(levelEcho('masters')).toBe('masters');
  });
});

describe('explorerSourceLine', () => {
  test('names Lichess and the level when the data is live', () => {
    expect(explorerSourceLine('1400', true)).toBe('Lichess · 1400–1800');
  });

  test('never claims live data when serving the snapshot', () => {
    expect(explorerSourceLine('1400', false, '2025-07-15')).toBe(
      'Saved snapshot · updated 2025-07-15'
    );
    expect(explorerSourceLine(null, false)).toBe(
      'Saved snapshot · all rated games'
    );
  });
});

describe('labels', () => {
  test('the games figure is scoped to the level when live', () => {
    expect(gamesStatLabel('1800', true)).toBe('Games · 1800–2200');
    expect(gamesStatLabel('1800', false)).toBe('Total games');
    expect(gamesStatLabel(null, false)).toBe('Total games');
  });

  test('captions echo the level so the scope survives the header scrolling away', () => {
    expect(movesCaption('1400', true)).toBe('Most popular at 1400–1800');
    expect(movesCaption('1400', false)).toBe('Most popular next moves');
    expect(alternativesCaption('all', true)).toBe(
      'Most popular alternatives at all ratings'
    );
    expect(alternativesCaption(null, false)).toBe('Most popular alternatives');
  });
});

describe('stat views', () => {
  test('builds a live view with rounded percentages and a formatted Elo', () => {
    expect(liveStatsView(result())).toEqual({
      games: '1k',
      elo: '1,604',
      whitePct: 42,
      drawPct: 6,
      blackPct: 52,
    });
  });

  test('refuses to publish numbers from a thin sample', () => {
    expect(
      liveStatsView(result({ totalGames: 40, white: 20, draws: 5, black: 15 }))
    ).toBeNull();
  });

  test('omits Elo rather than inventing one', () => {
    expect(liveStatsView(result({ averageRating: null }))?.elo).toBeNull();
  });

  test('builds a snapshot view, and nothing at all without games', () => {
    expect(
      snapshotStatsView({
        games_analyzed: 54321,
        white_win_rate: 0.5,
        draw_rate: 0.05,
        black_win_rate: 0.45,
        avg_rating: 2016,
      })
    ).toEqual({
      games: '54.3k',
      elo: '2,016',
      whitePct: 50,
      drawPct: 5,
      blackPct: 45,
    });
    expect(snapshotStatsView(null)).toBeNull();
    expect(snapshotStatsView({ games_analyzed: 0 })).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/lib/__tests__/explorerStats.test.ts --root packages/web
```

Expected: FAIL — `Failed to resolve import "../explorerStats"`.

- [ ] **Step 3: Write the implementation**

Create `packages/web/src/lib/explorerStats.ts`:

```ts
import { getBand, type BandId, type ExplorerResult } from './lichessExplorer';
import { formatCount } from './openingBook';

/**
 * One source for every level-dependent label and stat figure on the opening
 * detail page (UX review phase 4). The desktop ExplorerCard and the mobile
 * data surface are separate shells by design, so the only way their numbers
 * and wording cannot drift is to import them from the same place.
 *
 * The honesty rules live here too: a live view below MIN_LIVE_SAMPLE is null
 * rather than a small-sample percentage, a missing Elo is null rather than a
 * zero, and the source line never says "Lichess · <level>" while the card is
 * actually serving the bundled snapshot.
 */

/** Below this a band's percentages are noise, so we show a note instead. */
export const MIN_LIVE_SAMPLE = 100;

export interface StatsView {
  games: string;
  /** Null when the explorer reports no ratings — never a fabricated 0. */
  elo: string | null;
  whitePct: number;
  drawPct: number;
  blackPct: number;
}

export interface PopularityStats {
  games_analyzed?: number;
  white_win_rate?: number;
  black_win_rate?: number;
  draw_rate?: number;
  avg_rating?: number;
  analysis_date?: string;
}

/**
 * How a band is named inside a sentence. The rating range, not the learner
 * label: "Games · 1400–1800" states the scope, "Games · Intermediate" only
 * repeats the pill the reader just pressed.
 */
export function levelEcho(band: BandId): string {
  if (band === 'masters') return 'masters';
  return getBand(band).range ?? 'all ratings';
}

/** Header source line. `live` false means the card is serving the snapshot. */
export function explorerSourceLine(
  band: BandId | null,
  live: boolean,
  analysisDate?: string
): string {
  if (band && live) return `Lichess · ${levelEcho(band)}`;
  return `Saved snapshot · ${analysisDate ? `updated ${analysisDate}` : 'all rated games'}`;
}

/** Label above the games figure. */
export function gamesStatLabel(band: BandId | null, live: boolean): string {
  return band && live ? `Games · ${levelEcho(band)}` : 'Total games';
}

/** Caption under "Next moves". */
export function movesCaption(band: BandId | null, live: boolean): string {
  return band && live
    ? `Most popular at ${levelEcho(band)}`
    : 'Most popular next moves';
}

/** Caption under "Instead of <move>". */
export function alternativesCaption(
  band: BandId | null,
  live: boolean
): string {
  return band && live
    ? `Most popular alternatives at ${levelEcho(band)}`
    : 'Most popular alternatives';
}

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

export function liveStatsView(result: ExplorerResult): StatsView | null {
  if (result.totalGames < MIN_LIVE_SAMPLE) return null;
  return {
    games: formatCount(result.totalGames),
    elo: result.averageRating
      ? Math.round(result.averageRating).toLocaleString()
      : null,
    whitePct: pct(result.white, result.totalGames),
    drawPct: pct(result.draws, result.totalGames),
    blackPct: pct(result.black, result.totalGames),
  };
}

export function snapshotStatsView(
  stats: PopularityStats | null
): StatsView | null {
  if (!stats?.games_analyzed) return null;
  return {
    games: formatCount(stats.games_analyzed),
    elo: stats.avg_rating
      ? Math.round(stats.avg_rating).toLocaleString()
      : null,
    whitePct: Math.round((stats.white_win_rate || 0) * 100),
    drawPct: Math.round((stats.draw_rate || 0) * 100),
    blackPct: Math.round((stats.black_win_rate || 0) * 100),
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/lib/__tests__/explorerStats.test.ts --root packages/web
```

Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/lib/explorerStats.ts packages/web/src/lib/__tests__/explorerStats.test.ts
git commit -m "feat(detail): one source for level-scoped labels and stat views"
```

---

## Task 2: The explorer error beacon moves to the hook

**Files:**

- Modify: `packages/web/src/hooks/useExplorerResult.ts`
- Create: `packages/web/src/hooks/__tests__/useExplorerResult.test.tsx`

**Interfaces:**

- Consumes: `trackEvent` from `lib/analytics`, `ExplorerError` from
  `lib/lichessExplorer`.
- Produces: unchanged `useExplorerQuery(fen, band): ExplorerQuery` — the beacon
  is a side effect, not a new return field.

Today `WinRatePanel` owns this beacon, and `WinRatePanel` does not render on
mobile — so mobile band failures are reported nowhere. Task 4 removes that fetch
entirely, so the beacon has to move before it disappears.

- [ ] **Step 1: Write the failing test**

Create `packages/web/src/hooks/__tests__/useExplorerResult.test.tsx`:

```tsx
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

vi.mock('../../lib/analytics', () => ({ trackEvent: vi.fn() }));

const { fetchExplorerMock } = vi.hoisted(() => ({
  fetchExplorerMock: vi.fn(),
}));
vi.mock('../../lib/lichessExplorer', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../lib/lichessExplorer')>();
  return { ...actual, fetchExplorer: fetchExplorerMock };
});

import { trackEvent } from '../../lib/analytics';
import { ExplorerError } from '../../lib/lichessExplorer';
import { useExplorerQuery } from '../useExplorerResult';

const FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1';

beforeEach(() => {
  fetchExplorerMock.mockReset();
  vi.mocked(trackEvent).mockClear();
});

describe('useExplorerQuery', () => {
  test('reports the status when a band fetch fails', async () => {
    fetchExplorerMock.mockRejectedValue(new ExplorerError('boom', 429));
    const { result } = renderHook(() => useExplorerQuery(FEN, '1400'));

    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(trackEvent).toHaveBeenCalledWith('explorer_error', { status: 429 });
  });

  test('reports without a status when the failure carries none', async () => {
    fetchExplorerMock.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useExplorerQuery(FEN, 'all'));

    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(trackEvent).toHaveBeenCalledWith('explorer_error');
  });

  test('stays silent on success', async () => {
    fetchExplorerMock.mockResolvedValue({
      totalGames: 10,
      white: 5,
      draws: 2,
      black: 3,
      moves: [],
      topGames: [],
      averageRating: null,
    });
    const { result } = renderHook(() => useExplorerQuery(FEN, 'all'));

    await waitFor(() => expect(result.current.result).not.toBeNull());
    expect(trackEvent).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/hooks/__tests__/useExplorerResult.test.tsx --root packages/web
```

Expected: FAIL — `expected "trackEvent" to be called with arguments`.

- [ ] **Step 3: Write the implementation**

In `packages/web/src/hooks/useExplorerResult.ts`, replace the import block and
the `catch`:

```ts
import { useEffect, useState } from 'react';
import {
  ExplorerError,
  fetchExplorer,
  type BandId,
  type ExplorerResult,
} from '../lib/lichessExplorer';
import { trackEvent } from '../lib/analytics';
```

Add above `useExplorerQuery`:

```ts
/**
 * Band-fetch failures are reported here, not by a consumer: this hook is the
 * one place every breakpoint's band fetch goes through. While the beacon sat
 * in WinRatePanel — a desktop-only component — every mobile explorer failure
 * was invisible.
 */
function reportExplorerError(err: unknown): void {
  if (err instanceof ExplorerError && err.status !== undefined) {
    trackEvent('explorer_error', { status: err.status });
  } else {
    trackEvent('explorer_error');
  }
}
```

Replace the `catch` body:

```ts
      } catch (err) {
        // Progressive enhancement only — callers degrade to snapshot data.
        reportExplorerError(err);
        if (alive) setQuery({ result: null, loading: false, failed: true });
      }
```

Update the doc comment on `useExplorerQuery`: replace the parenthetical
`(WinRatePanel owns the explorer_error beacon ... for it)` with:

```
 * failed fetch is reported to analytics here, once, for every breakpoint.
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/hooks/__tests__/useExplorerResult.test.tsx --root packages/web
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/hooks/useExplorerResult.ts packages/web/src/hooks/__tests__/useExplorerResult.test.tsx
git commit -m "fix(detail): report explorer failures from the hook, not a desktop-only panel"
```

---

## Task 3: Shared `MasterGamesCard`

**Files:**

- Create: `packages/web/src/components/detail/MasterGamesCard.tsx`
- Create: `packages/web/src/components/detail/MasterGamesCard.module.css`
- Create:
  `packages/web/src/components/detail/__tests__/MasterGamesCard.test.tsx`

**Interfaces:**

- Consumes: `fetchExplorer`, `rankNotableGames`, `ExplorerTopGame` from
  `lib/lichessExplorer`.
- Produces:
  `MasterGamesCard({ fen, variant }: { fen: string; variant?: 'card' | 'accordion' })`,
  default export and named.

`variant="card"` is the desktop rail: three rows visible, a "Show N more games"
reveal. `variant="accordion"` is the mobile stack: collapsed behind a header,
the whole list on expand. One component so the two breakpoints cannot disagree
about what a master game is.

- [ ] **Step 1: Write the failing test**

Create `packages/web/src/components/detail/__tests__/MasterGamesCard.test.tsx`:

```tsx
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import MasterGamesCard from '../MasterGamesCard';
import type {
  ExplorerResult,
  ExplorerTopGame,
} from '../../../lib/lichessExplorer';

vi.mock('../../../lib/analytics', () => ({ trackEvent: vi.fn() }));

const { fetchExplorerMock } = vi.hoisted(() => ({
  fetchExplorerMock: vi.fn(),
}));
vi.mock('../../../lib/lichessExplorer', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../lib/lichessExplorer')>();
  return { ...actual, fetchExplorer: fetchExplorerMock };
});

const FEN = 'rnbqkb1r/ppp1pppp/8/3N4/8/8/PPPP1PPP/R1BQKBNR b KQkq - 0 4';

function game(
  id: string,
  white: string,
  black: string,
  rating: number
): ExplorerTopGame {
  return {
    id,
    white: { name: white, rating },
    black: { name: black, rating: rating - 20 },
    winner: 'white',
    year: 1987,
  };
}

function masters(topGames: ExplorerTopGame[]): ExplorerResult {
  return {
    totalGames: 1912,
    white: 840,
    draws: 516,
    black: 556,
    moves: [],
    topGames,
    averageRating: 2446,
  };
}

const FIVE = [
  game('g1', 'A1', 'B1', 2800),
  game('g2', 'A2', 'B2', 2790),
  game('g3', 'A3', 'B3', 2780),
  game('g4', 'A4', 'B4', 2770),
  game('g5', 'A5', 'B5', 2760),
];

beforeEach(() => {
  fetchExplorerMock.mockReset();
});

describe('MasterGamesCard', () => {
  test('always asks the masters DB, whatever level the page is on', async () => {
    fetchExplorerMock.mockResolvedValue(
      masters([game('g1', 'Tal', 'Botvinnik', 2700)])
    );
    render(<MasterGamesCard fen={FEN} />);
    await waitFor(() =>
      expect(fetchExplorerMock).toHaveBeenCalledWith(FEN, 'masters')
    );
    expect(fetchExplorerMock).toHaveBeenCalledTimes(1);
  });

  test('states its source without inventing a rating floor', async () => {
    fetchExplorerMock.mockResolvedValue(
      masters([game('g1', 'Tal', 'Botvinnik', 2700)])
    );
    render(<MasterGamesCard fen={FEN} />);
    expect(
      await screen.findByText('Over-the-board masters')
    ).toBeInTheDocument();
  });

  test('links each game to Lichess with its result and year', async () => {
    fetchExplorerMock.mockResolvedValue(
      masters([game('g1', 'Tal', 'Botvinnik', 2700)])
    );
    render(<MasterGamesCard fen={FEN} />);

    const link = await screen.findByRole('link', { name: /Tal – Botvinnik/ });
    expect(link).toHaveAttribute('href', 'https://lichess.org/g1');
    expect(link).toHaveTextContent('1–0 · 1987');
  });

  test('collapses to three and names the payload of the reveal', async () => {
    const user = userEvent.setup();
    fetchExplorerMock.mockResolvedValue(masters(FIVE));
    render(<MasterGamesCard fen={FEN} />);

    await screen.findByRole('link', { name: /A1/ });
    expect(screen.queryByRole('link', { name: /A4/ })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Show 2 more games' }));
    expect(screen.getByRole('link', { name: /A4/ })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Show fewer' })
    ).toBeInTheDocument();
  });

  test('omits the reveal when everything already fits', async () => {
    fetchExplorerMock.mockResolvedValue(masters(FIVE.slice(0, 3)));
    render(<MasterGamesCard fen={FEN} />);
    await screen.findByRole('link', { name: /A3/ });
    expect(screen.queryByRole('button', { name: /Show/ })).toBeNull();
  });

  test('renders nothing at all when the position has no master games', async () => {
    fetchExplorerMock.mockResolvedValue(masters([]));
    const { container } = render(<MasterGamesCard fen={FEN} />);
    await waitFor(() => expect(fetchExplorerMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  test('renders nothing when the masters fetch fails', async () => {
    fetchExplorerMock.mockRejectedValue(new Error('boom'));
    const { container } = render(<MasterGamesCard fen={FEN} />);
    await waitFor(() => expect(fetchExplorerMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  test('the accordion variant is collapsed, counted, and expands to the full list', async () => {
    const user = userEvent.setup();
    fetchExplorerMock.mockResolvedValue(masters(FIVE));
    render(<MasterGamesCard fen={FEN} variant="accordion" />);

    const header = await screen.findByRole('button', { name: /Master games/ });
    expect(header).toHaveTextContent('(5)');
    expect(header).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: /A1/ })).toBeNull();

    await user.click(header);
    expect(screen.getByRole('link', { name: /A1/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /A5/ })).toBeInTheDocument();
  });

  test('drops the previous position’s games when the fen changes', async () => {
    fetchExplorerMock.mockResolvedValue(
      masters([game('g1', 'Tal', 'Botvinnik', 2700)])
    );
    const { rerender } = render(<MasterGamesCard fen={FEN} />);
    await screen.findByRole('link', { name: /Tal/ });

    fetchExplorerMock.mockResolvedValue(
      masters([game('g9', 'Kramnik', 'Leko', 2750)])
    );
    rerender(<MasterGamesCard fen="8/8/8/8/8/8/8/K6k w - - 0 1" />);

    expect(
      await screen.findByRole('link', { name: /Kramnik/ })
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Tal/ })).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/components/detail/__tests__/MasterGamesCard.test.tsx --root packages/web
```

Expected: FAIL — `Failed to resolve import "../MasterGamesCard"`.

- [ ] **Step 3: Write the implementation**

Create `packages/web/src/components/detail/MasterGamesCard.tsx`:

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  fetchExplorer,
  rankNotableGames,
  type ExplorerTopGame,
} from '../../lib/lichessExplorer';
import styles from './MasterGamesCard.module.css';

/**
 * Master games (UX review phase 4, change 12). The one list on the page the
 * level filter does NOT apply to, so it lives outside the ExplorerCard's
 * border — a card in the desktop rail, a collapsed accordion at the foot of
 * the mobile stack. One component for both, because a shared border rule is
 * only true if both breakpoints render the same thing.
 *
 * Source line says "Over-the-board masters", not a rating floor: the proxy
 * applies no rating filter to the masters band, so any number would be
 * invented. The reveal names its payload rather than claiming a total —
 * the explorer returns at most 15 top games and rankNotableGames dedupes by
 * player, so we never hold "all" the master games for a position.
 *
 * The fetch is gated on the card being in view: masters is a separate band
 * from the page's, and the proxy token is capped at 25 requests/minute. That
 * gate also means this card will not appear in an automated browser pane —
 * verify it here, not there.
 */

const COLLAPSED_LIMIT = 3;
const RANKED_CAP = 8;

interface MasterGamesCardProps {
  fen: string;
  /** 'card' = desktop rail; 'accordion' = mobile stack, collapsed by default. */
  variant?: 'card' | 'accordion';
}

function resultText(winner: 'white' | 'black' | null): string {
  if (winner === 'white') return '1–0';
  if (winner === 'black') return '0–1';
  return '½–½';
}

const GameList: React.FC<{ games: ExplorerTopGame[] }> = ({ games }) => (
  <ul className={styles.list}>
    {games.map((game) => (
      <li key={game.id}>
        <a
          href={`https://lichess.org/${game.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.game}
        >
          <span className={styles.players}>
            {game.white.name} – {game.black.name}
          </span>
          <span className={styles.result}>
            {resultText(game.winner)}
            {game.year ? ` · ${game.year}` : ''}
          </span>
        </a>
      </li>
    ))}
  </ul>
);

export const MasterGamesCard: React.FC<MasterGamesCardProps> = ({
  fen,
  variant = 'card',
}) => {
  const [games, setGames] = useState<ExplorerTopGame[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [inView, setInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries, obs) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          obs.disconnect();
        }
      },
      { rootMargin: '100px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // A new position must never show the previous position's games.
  useEffect(() => {
    setGames([]);
    setExpanded(false);
  }, [fen]);

  useEffect(() => {
    if (!inView || !fen) return;
    let alive = true;
    (async () => {
      try {
        const masters = await fetchExplorer(fen, 'masters');
        if (alive) setGames(rankNotableGames(masters.topGames, RANKED_CAP));
      } catch {
        // Sparse positions and failed fetches look the same here: no card.
        // The band failure is already beaconed by useExplorerQuery.
      }
    })();
    return () => {
      alive = false;
    };
  }, [inView, fen]);

  // The probe div keeps the observer alive on a position with no games, so
  // scrolling to a later opening still triggers the fetch.
  if (games.length === 0) return <div ref={containerRef} aria-hidden="true" />;

  if (variant === 'accordion') {
    return (
      <div ref={containerRef} className={styles.card}>
        <button
          type="button"
          className={styles.accordionHeader}
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          <span className={styles.headerText}>
            <span className={styles.title}>
              Master games{' '}
              <span className={styles.count}>({games.length})</span>
            </span>
            <span className={styles.source}>Over-the-board masters</span>
          </span>
          <ChevronDown
            size={16}
            className={`${styles.chevron} ${expanded ? styles.chevronOpen : ''}`}
          />
        </button>
        {expanded && <GameList games={games} />}
      </div>
    );
  }

  const visible = expanded ? games : games.slice(0, COLLAPSED_LIMIT);
  const hidden = games.length - COLLAPSED_LIMIT;

  return (
    <div ref={containerRef} className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.title}>Master games</h2>
        <span className={styles.sourceEyebrow}>Over-the-board masters</span>
      </div>
      <GameList games={visible} />
      {hidden > 0 && (
        <button
          type="button"
          className={styles.showMoreBtn}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Show fewer' : `Show ${hidden} more games`}
        </button>
      )}
    </div>
  );
};

export default MasterGamesCard;
```

Create `packages/web/src/components/detail/MasterGamesCard.module.css`:

```css
/* Master games — outside the explorer card's border, because the level
   filter does not reach it. */
.card {
  background: var(--surface-raised);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  /* clip, not hidden: hidden would make this a scroll container and capture
     any sticky descendant. */
  overflow: clip;
}

.header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4) var(--space-2);
}

.accordionHeader {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  font-family: inherit;
  min-height: 44px;
}

.headerText {
  display: flex;
  flex-direction: column;
  gap: var(--space-0-5);
  min-width: 0;
}

.title {
  font-family: var(--font-family-headline);
  font-size: var(--text-md);
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-primary);
  line-height: 1;
  margin: 0;
}

.count {
  font-family: var(--font-family-primary);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-muted);
}

/* Desktop: an uppercase eyebrow opposite the title (.label-meta treatment). */
.sourceEyebrow {
  font-size: var(--text-3xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--color-text-muted);
  white-space: nowrap;
}

/* Mobile: a plain second line under the title. */
.source {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.chevron {
  flex: none;
  color: var(--color-text-muted);
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.chevronOpen {
  transform: rotate(180deg);
}

.list {
  list-style: none;
  margin: 0;
  padding: 0 var(--space-4) var(--space-3);
  display: flex;
  flex-direction: column;
}

.game {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  font-size: var(--text-xs);
  padding: var(--space-2) 0;
  border-top: 1px solid var(--border-subtle);
  text-decoration: none;
  color: inherit;
  min-height: 44px;
}

.players {
  color: var(--color-text-primary);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 150ms ease;
}

.game:hover .players {
  color: var(--color-brand-orange);
}

.game:focus-visible {
  outline: 2px solid var(--color-brand-orange);
  outline-offset: -2px;
}

.result {
  flex: none;
  font-family: var(--font-family-mono);
  color: var(--color-text-muted);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.showMoreBtn {
  display: block;
  width: calc(100% - var(--space-4) * 2);
  margin: 0 var(--space-4) var(--space-4);
  padding: var(--space-2) 0;
  background: var(--border-subtle);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
  transition:
    color 150ms ease,
    border-color 150ms ease;
}

.showMoreBtn:hover {
  border-color: var(--border-hover);
  color: var(--color-text-secondary);
}

@media (prefers-reduced-motion: reduce) {
  .chevron {
    transition: none;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
npx vitest run src/components/detail/__tests__/MasterGamesCard.test.tsx --root packages/web
```

Expected: PASS, 9 tests.

Note: the "renders nothing" tests assert `toBeEmptyDOMElement()` on the
container, and the component returns an empty probe `<div>`. An empty `<div>`
makes the container non-empty. **If those two tests fail, that is the intended
signal** — change the assertions to check that no `Master games` heading and no
links render:

```tsx
expect(screen.queryByText('Master games')).toBeNull();
expect(screen.queryByRole('link')).toBeNull();
```

Do not delete the probe div to satisfy the assertion — without it a card below
the fold never fetches.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/detail/MasterGamesCard.tsx packages/web/src/components/detail/MasterGamesCard.module.css packages/web/src/components/detail/__tests__/MasterGamesCard.test.tsx
git commit -m "feat(detail): shared MasterGamesCard for both breakpoints"
```

---

## Task 4: `WinRatePanel` becomes a presentational stats block

**Files:**

- Modify: `packages/web/src/components/detail/WinRatePanel.tsx`
- Modify: `packages/web/src/components/detail/WinRatePanel.module.css`
- Modify: `packages/web/src/components/detail/__tests__/WinRatePanel.test.tsx`

**Interfaces:**

- Consumes: `StatsView`, `PopularityStats`, `gamesStatLabel`, `liveStatsView`,
  `snapshotStatsView` from `lib/explorerStats`; `ExplorerQuery` from
  `hooks/useExplorerResult`.
- Produces:
  `WinRatePanel({ popularityStats, band, explorer }: { popularityStats: PopularityStats | null; band: BandId | null; explorer: ExplorerQuery })`.
  **The `fen` and `onBandChange` props are gone.**

It loses the pills (Task 6 puts them in the card header), the master-games block
(Task 3 owns it), and both of its fetch effects (the page already has the data).
What it keeps is exactly July's stat pair, bar and legend.

- [ ] **Step 1: Rewrite the test file**

Replace `packages/web/src/components/detail/__tests__/WinRatePanel.test.tsx`
entirely:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WinRatePanel } from '../WinRatePanel';
import type { ExplorerQuery } from '../../../hooks/useExplorerResult';
import type { BandId, ExplorerResult } from '../../../lib/lichessExplorer';

vi.mock('../../../lib/analytics', () => ({ trackEvent: vi.fn() }));

const SNAPSHOT = {
  games_analyzed: 54321,
  white_win_rate: 0.5,
  black_win_rate: 0.45,
  draw_rate: 0.05,
  avg_rating: 2016,
  analysis_date: '2025-07-15',
};

function explorerResult(
  overrides: Partial<ExplorerResult> = {}
): ExplorerResult {
  return {
    totalGames: 1000,
    white: 420,
    draws: 60,
    black: 520,
    moves: [],
    topGames: [],
    averageRating: 1604,
    ...overrides,
  };
}

function query(overrides: Partial<ExplorerQuery> = {}): ExplorerQuery {
  return { result: null, loading: false, failed: false, ...overrides };
}

function renderPanel(
  band: BandId | null = '1400',
  explorer: ExplorerQuery = query({ result: explorerResult() }),
  popularityStats: typeof SNAPSHOT | null = SNAPSHOT
) {
  return render(
    <WinRatePanel
      popularityStats={popularityStats}
      band={band}
      explorer={explorer}
    />
  );
}

describe('WinRatePanel', () => {
  it('scopes the games figure to the active level', () => {
    renderPanel();
    expect(screen.getByText('Games · 1400–1800')).toBeInTheDocument();
    expect(screen.getByText('1k')).toBeInTheDocument();
    expect(screen.getByText('Average Elo')).toBeInTheDocument();
    expect(screen.getByText('1,604')).toBeInTheDocument();
  });

  it('renders the result split with its legend', () => {
    renderPanel();
    expect(screen.getByText('White wins 42%')).toBeInTheDocument();
    expect(screen.getByText('Draws 6%')).toBeInTheDocument();
    expect(screen.getByText('Black wins 52%')).toBeInTheDocument();
  });

  it('holds a loading state rather than flashing the snapshot first', () => {
    renderPanel('all', query({ loading: true }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Loading Lichess data…'
    );
    expect(screen.queryByText('54.3k')).not.toBeInTheDocument();
  });

  it('falls back to the snapshot with a note when the band fetch fails', () => {
    renderPanel('2200', query({ failed: true }));
    expect(screen.getByText(/isn't available right now/)).toBeInTheDocument();
    expect(screen.getByText('Total games')).toBeInTheDocument();
    expect(screen.getByText('54.3k')).toBeInTheDocument();
  });

  it('says so instead of publishing numbers from a thin sample', () => {
    renderPanel('u1400', query({ result: explorerResult({ totalGames: 40 }) }));
    expect(
      screen.getByText(/Not enough games at this level/)
    ).toBeInTheDocument();
  });

  it('shows the snapshot when no level is set', () => {
    renderPanel(null, query());
    expect(screen.getByText('Total games')).toBeInTheDocument();
    expect(screen.getByText('54.3k')).toBeInTheDocument();
  });

  it('no longer owns the level pills — the card header does', () => {
    renderPanel();
    expect(screen.queryByRole('button', { name: 'Intermediate' })).toBeNull();
  });

  it('no longer owns master games — MasterGamesCard does', () => {
    renderPanel();
    expect(screen.queryByText('Master games')).toBeNull();
  });

  it('renders nothing with neither live data nor a snapshot', () => {
    const { container } = renderPanel(null, query(), null);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/components/detail/__tests__/WinRatePanel.test.tsx --root packages/web
```

Expected: FAIL — type errors on the removed props, and `Games · 1400–1800` not
found.

- [ ] **Step 3: Write the implementation**

Replace `packages/web/src/components/detail/WinRatePanel.tsx` entirely:

```tsx
import React from 'react';
import styles from './WinRatePanel.module.css';
import type { ExplorerQuery } from '../../hooks/useExplorerResult';
import type { BandId } from '../../lib/lichessExplorer';
import {
  gamesStatLabel,
  liveStatsView,
  snapshotStatsView,
  type PopularityStats,
} from '../../lib/explorerStats';

/**
 * The stats block inside the ExplorerCard (UX review phase 4): the stat pair,
 * the W/D/L bar and its legend, and nothing else. July's styling survives
 * unchanged — what moved is the parentage. The level pills belong to the
 * card header (they govern the whole card, not just these numbers), master
 * games moved outside the card entirely (the level filter does not reach
 * them), and the explorer fetch belongs to the page, which was already
 * making the same request for the opening book.
 *
 * While a band is selected the block holds a loading state until the fetch
 * resolves — the snapshot must never flash first and then get swapped out.
 * Only a failed fetch degrades to the snapshot, with a note.
 */

interface WinRatePanelProps {
  /** Bundled snapshot (all rated Lichess games) — the fallback. */
  popularityStats: PopularityStats | null;
  /** Active level from the card header; null = snapshot. */
  band: BandId | null;
  /** The page's explorer query for this position at this band. */
  explorer: ExplorerQuery;
}

export const WinRatePanel: React.FC<WinRatePanelProps> = ({
  popularityStats,
  band,
  explorer,
}) => {
  const live = Boolean(band) && !explorer.failed;
  const snapshotView = snapshotStatsView(popularityStats);
  const liveView = explorer.result ? liveStatsView(explorer.result) : null;
  const view = live ? liveView : snapshotView;

  // Pending, not `explorer.loading`: between first render and the hook's
  // effect the query is {result: null, loading: false}, and keying off
  // `loading` alone would blank the block for a frame before the placeholder
  // appears. No result yet and no failure means we are still waiting.
  const pending = live && explorer.result === null;
  const thinSample = live && explorer.result !== null && liveView === null;

  if (!view && !pending && !thinSample) return null;

  return (
    <div className={styles.panel}>
      {band && explorer.failed && (
        <div className={styles.liveUnavailable} role="status">
          Live Lichess data isn't available right now — showing a saved snapshot
          instead.
        </div>
      )}

      {view ? (
        <>
          <div className={styles.statsHeader}>
            <div className={styles.statGroup}>
              <span className={styles.statLabel}>
                {gamesStatLabel(band, live)}
              </span>
              <span className={styles.statValue}>{view.games}</span>
            </div>
            {view.elo && (
              <div className={`${styles.statGroup} ${styles.statGroupRight}`}>
                <span className={styles.statLabel}>Average Elo</span>
                <span className={`${styles.statValue} ${styles.statValueElo}`}>
                  {view.elo}
                </span>
              </div>
            )}
          </div>

          <div className={styles.bar} aria-hidden="true">
            <span
              className={styles.barWhite}
              style={{ width: `${view.whitePct}%` }}
            />
            <span
              className={styles.barDraw}
              style={{ width: `${view.drawPct}%` }}
            />
            <span
              className={styles.barBlack}
              style={{ width: `${view.blackPct}%` }}
            />
          </div>

          <div className={styles.legend}>
            <span className={styles.legendItem}>
              <span
                className={`${styles.swatch} ${styles.swatchWhite}`}
                aria-hidden="true"
              />
              White wins {view.whitePct}%
            </span>
            <span className={styles.legendItem}>
              <span
                className={`${styles.swatch} ${styles.swatchDraw}`}
                aria-hidden="true"
              />
              Draws {view.drawPct}%
            </span>
            <span className={styles.legendItem}>
              <span
                className={`${styles.swatch} ${styles.swatchBlack}`}
                aria-hidden="true"
              />
              Black wins {view.blackPct}%
            </span>
          </div>
        </>
      ) : thinSample ? (
        <div className={styles.livePlaceholder}>
          Not enough games at this level to show reliable numbers.
        </div>
      ) : (
        <div className={styles.livePlaceholder} role="status">
          Loading Lichess data…
        </div>
      )}
    </div>
  );
};

export default WinRatePanel;
```

Replace `packages/web/src/components/detail/WinRatePanel.module.css` entirely:

```css
/* Stats block inside the ExplorerCard. No card chrome of its own — the card
   owns the border, the shadow and the radius. */
.panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.liveUnavailable {
  font-size: var(--text-2xs);
  color: var(--color-text-muted);
}

.livePlaceholder {
  background-color: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-text-muted);
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  /* Approximates the stats block so resolving live data doesn't shift the
     opening book below it. */
  min-height: 104px;
}

/* ── Stat pair (July's right-column spec, unchanged) ── */
.statsHeader {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
}

.statGroup {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.statGroupRight {
  align-items: flex-end;
}

.statLabel {
  font-size: var(--text-2xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-muted);
}

.statValue {
  font-family: var(--font-family-headline);
  font-size: var(--text-2xl);
  font-weight: var(--font-weight-extrabold);
  letter-spacing: -0.02em;
  color: var(--color-text-primary);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.statValueElo {
  color: var(--color-brand-orange);
}

/* ── Result bar ── */
.bar {
  display: flex;
  height: 8px;
  gap: 2px;
  margin-top: var(--space-1);
}

.barWhite,
.barDraw,
.barBlack {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width 400ms ease-out;
}

.barWhite {
  background-color: var(--color-result-white);
}

.barDraw {
  background-color: var(--color-result-draw);
}

.barBlack {
  background-color: var(--color-result-black);
}

.legend {
  display: flex;
  justify-content: space-between;
  gap: var(--space-2);
  font-size: var(--text-2xs);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-muted);
}

.legendItem {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}

.swatch {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}

.swatchWhite {
  background-color: var(--color-result-white);
}

.swatchDraw {
  background-color: var(--color-result-draw);
}

.swatchBlack {
  background-color: var(--color-result-black);
}

@media (prefers-reduced-motion: reduce) {
  .barWhite,
  .barDraw,
  .barBlack {
    transition: none;
  }
}
```

Now retire `WinRateBar`, whose only caller was the panel above:

```bash
grep -rn "WinRateBar" packages/web/src --include=*.tsx --include=*.ts
```

Expected: only `WinRateBar.tsx`, `WinRatePanel.tsx` (the import you just
deleted) and `components/detail/index.ts`. If anything else appears, **stop**
and leave `WinRateBar` in place. Otherwise:

```bash
git rm packages/web/src/components/detail/WinRateBar.tsx packages/web/src/components/detail/WinRateBar.module.css
```

and delete this line from `packages/web/src/components/detail/index.ts`:

```ts
export { WinRateBar } from './WinRateBar';
```

- [ ] **Step 4: Run the tests**

```bash
npx vitest run src/components/detail/__tests__/WinRatePanel.test.tsx --root packages/web
```

Expected: PASS, 9 tests. The page will not compile yet — Task 7 rewires it.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/detail/WinRatePanel.tsx packages/web/src/components/detail/WinRatePanel.module.css packages/web/src/components/detail/__tests__/WinRatePanel.test.tsx
git commit -m "refactor(detail): WinRatePanel is a presentational stats block"
```

---

## Task 5: `OpeningNavigator` — drop the card chrome, echo the level, label the reveals

**Files:**

- Modify: `packages/web/src/components/detail/OpeningNavigator.tsx`
- Modify: `packages/web/src/components/detail/OpeningNavigator.module.css`
- Modify:
  `packages/web/src/components/detail/__tests__/opening-navigator.test.tsx`

**Interfaces:**

- Consumes: `movesCaption`, `alternativesCaption` from `lib/explorerStats`.
- Produces: `OpeningNavigator` gains two optional props —
  `band?: BandId | null`, `live?: boolean`. Existing props unchanged.

**No `embedded` prop.** After Task 7, `ExplorerCard` is the component's only
caller and the card owns the border, the shadow and the heading. A boolean whose
false branch nothing reaches is dead configuration; the card chrome and the
"Opening book" title come out instead. This is also what retires the last
"Opening book" string in rendered output.

- [ ] **Step 1: Update the test helper and add the failing tests**

`renderNavigator` is **positional** —
`renderNavigator(treeData, explorer, parentExplorer)` — so give it a fourth
argument rather than inventing an options-object call the helper doesn't
support:

```tsx
function renderNavigator(
  treeData: TreeContext,
  explorer: ExplorerResult | null = null,
  parentExplorer: ExplorerResult | null = null,
  extra: Partial<React.ComponentProps<typeof OpeningNavigator>> = {}
) {
  return render(
    <MemoryRouter>
      <OpeningNavigator
        treeData={treeData}
        loading={false}
        explorer={explorer}
        parentExplorer={parentExplorer}
        {...extra}
      />
    </MemoryRouter>
  );
}
```

Append inside the existing top-level `describe`:

```tsx
test('echoes the active level in both captions when live data drives the lists', () => {
  const treeData: TreeContext = {
    current: makeNode({
      fen: 'fen-current',
      name: 'French Defense',
      move: '1...e6',
    }),
    ancestors: [
      makeAncestor({ fen: 'fen-e4', name: "King's Pawn Game", move: '1. e4' }),
    ],
    children: [
      makeNode({ fen: 'fen-child', name: 'Advance Variation', move: '3. e5' }),
    ],
    siblings: [
      makeNode({ fen: 'fen-sib', name: 'Caro-Kann Defense', move: '1...c6' }),
    ],
  };

  renderNavigator(treeData, null, null, { band: '1400', live: true });
  expect(screen.getByText('Most popular at 1400–1800')).toBeInTheDocument();
  expect(
    screen.getByText('Most popular alternatives at 1400–1800')
  ).toBeInTheDocument();
});

test('claims no level when the rows come from the snapshot', () => {
  const treeData: TreeContext = {
    current: makeNode({
      fen: 'fen-current',
      name: 'French Defense',
      move: '1...e6',
    }),
    ancestors: [
      makeAncestor({ fen: 'fen-e4', name: "King's Pawn Game", move: '1. e4' }),
    ],
    children: [
      makeNode({ fen: 'fen-child', name: 'Advance Variation', move: '3. e5' }),
    ],
    siblings: [
      makeNode({ fen: 'fen-sib', name: 'Caro-Kann Defense', move: '1...c6' }),
    ],
  };

  renderNavigator(treeData, null, null, { band: '1400', live: false });
  expect(screen.getByText('Most popular next moves')).toBeInTheDocument();
  expect(screen.getByText('Most popular alternatives')).toBeInTheDocument();
});

test('carries no card chrome or title of its own — the explorer card owns both', () => {
  const treeData: TreeContext = {
    current: makeNode({
      fen: 'fen-current',
      name: 'French Defense',
      move: '1...e6',
    }),
    ancestors: [],
    children: [
      makeNode({ fen: 'fen-child', name: 'Advance Variation', move: '3. e5' }),
    ],
    siblings: [],
  };

  renderNavigator(treeData);
  expect(screen.queryByText('Opening book')).toBeNull();
});
```

Then change the existing reveal assertion at line 163 from `'Show 2 more'` to
`'Show 2 more moves'`.

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run src/components/detail/__tests__/opening-navigator.test.tsx --root packages/web
```

Expected: FAIL — `Most popular at 1400–1800` not found; `Show 2 more moves` not
found.

- [ ] **Step 3: Write the implementation**

In `OpeningNavigator.tsx`:

Add to the imports:

```tsx
import { alternativesCaption, movesCaption } from '../../lib/explorerStats';
import type { BandId } from '../../lib/lichessExplorer';
```

Add to `OpeningNavigatorProps`:

```tsx
  /** Active level, for the captions. */
  band?: BandId | null;
  /** True when live explorer data drives the rows — gates the level echo. */
  live?: boolean;
```

Change the destructure:

```tsx
export const OpeningNavigator: React.FC<OpeningNavigatorProps> = ({
  treeData,
  loading,
  explorer = null,
  parentExplorer = null,
  band = null,
  live = false,
}) => {
```

Update the component's doc comment to record the new parentage:

```tsx
/**
 * The move lists inside the ExplorerCard: breadcrumb, next moves and the
 * alternatives to the move that reached this position. It renders as a plain
 * section — the card owns the border, the shadow and the "Opening explorer"
 * heading, because the level pills in that header govern these rows.
 */
```

In the loading branch, replace `<div className={styles.navigator}>` with
`<div className={styles.book}>` and **delete** the title line:

```tsx
<div className={styles.navigatorTitle}>Opening book</div>
```

In the main return, replace the opening `<div className={styles.navigator}>` and
the title line under it with just:

```tsx
    <div className={styles.book}>
```

Replace the Next-moves caption:

```tsx
<div className={styles.sectionSublabel}>{movesCaption(band, live)}</div>
```

Replace the alternatives caption:

```tsx
<div className={styles.sectionSublabel}>{alternativesCaption(band, live)}</div>
```

Replace both reveal labels (there are two identical lines):

```tsx
{
  continuationsExpanded ? 'Show less' : `Show ${hiddenCount} more moves`;
}
```

```tsx
{
  alternativesExpanded ? 'Show less' : `Show ${hiddenCount} more moves`;
}
```

In `OpeningNavigator.module.css`, replace the `.navigator` rule with:

```css
/* No border, no shadow, no radius, no padding — ExplorerCard supplies all
   four. This block is only a flow container for the sections. */
.book {
  display: flex;
  flex-direction: column;
  gap: 0;
}
```

Delete `.navigatorTitle` (nothing renders it now), and delete the three
`.navigator` rules inside the `@media (max-width: 1024px)`, `768px` and `640px`
blocks — they only set padding and radius the card now owns. Leave every other
rule in the file untouched: the rows, bars, breadcrumb and skeleton are
unchanged.

- [ ] **Step 4: Run the tests**

```bash
npx vitest run src/components/detail/__tests__/opening-navigator.test.tsx --root packages/web
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/detail/OpeningNavigator.tsx packages/web/src/components/detail/OpeningNavigator.module.css packages/web/src/components/detail/__tests__/opening-navigator.test.tsx
git commit -m "feat(detail): navigator embeds in a card, echoes the level, names its reveals"
```

---

## Task 6: The `ExplorerCard` shell

**Files:**

- Create: `packages/web/src/components/detail/ExplorerCard.tsx`
- Create: `packages/web/src/components/detail/ExplorerCard.module.css`
- Create: `packages/web/src/components/detail/__tests__/ExplorerCard.test.tsx`
- Modify: `packages/web/src/components/detail/index.ts`

**Interfaces:**

- Consumes: `WinRatePanel`, `OpeningNavigator`, `LevelLens`,
  `explorerSourceLine`, `ExplorerQuery`, `TreeContext`, `ExplorerResult`.
- Produces:

```tsx
ExplorerCard({
  fen, band, onBandChange, popularityStats, explorer, parentExplorer, treeData, treeLoading,
}: {
  fen: string;
  band: BandId | null;
  onBandChange: (band: BandId | null) => void;
  popularityStats: PopularityStats | null;
  explorer: ExplorerQuery;
  parentExplorer: ExplorerResult | null;
  treeData: TreeContext | null;
  treeLoading: boolean;
})
```

- [ ] **Step 1: Write the failing test**

Create `packages/web/src/components/detail/__tests__/ExplorerCard.test.tsx`:

```tsx
import { describe, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import ExplorerCard from '../ExplorerCard';
import type { ExplorerQuery } from '../../../hooks/useExplorerResult';
import type {
  TreeContext,
  TreeNode,
  AncestorNode,
} from '../../../hooks/useOpeningTree';
import type { ExplorerResult } from '../../../lib/lichessExplorer';

vi.mock('../../../lib/analytics', () => ({ trackEvent: vi.fn() }));

const FEN = 'rnbqkb1r/ppp1pppp/8/3N4/8/8/PPPP1PPP/R1BQKBNR b KQkq - 0 4';

const SNAPSHOT = {
  games_analyzed: 54321,
  white_win_rate: 0.5,
  black_win_rate: 0.45,
  draw_rate: 0.05,
  avg_rating: 2016,
  analysis_date: '2025-07-15',
};

function makeNode(overrides: Partial<TreeNode> = {}): TreeNode {
  return {
    fen: 'fen-test',
    name: 'Test Opening',
    eco: 'B02',
    move: '4. Nxd5',
    moves: '1. e4 Nf6 2. Nc3 d5 3. exd5 Nxd5 4. Nxd5',
    descendantCount: 10,
    gamesPlayed: 1000,
    hasChildren: false,
    ...overrides,
  };
}

function makeTree(): TreeContext {
  return {
    current: makeNode({
      fen: FEN,
      name: 'Alekhine: Scandinavian, Exchange, 4.Nxd5',
    }),
    ancestors: [
      {
        ...makeNode({ fen: 'fen-a1', name: "King's Pawn Game", move: '1. e4' }),
        siblings: [],
      },
    ] as AncestorNode[],
    children: [
      makeNode({
        fen: 'fen-child',
        name: 'Exchange, 4...Qxd5',
        move: '4...Qxd5',
        gamesPlayed: 900,
      }),
    ],
    siblings: [
      makeNode({
        fen: 'fen-sib',
        name: 'Exchange, 4.Bc4',
        move: '4. Bc4',
        gamesPlayed: 400,
      }),
    ],
  };
}

function explorerResult(
  overrides: Partial<ExplorerResult> = {}
): ExplorerResult {
  return {
    totalGames: 1000,
    white: 420,
    draws: 60,
    black: 520,
    moves: [],
    topGames: [],
    averageRating: 1604,
    ...overrides,
  };
}

function query(overrides: Partial<ExplorerQuery> = {}): ExplorerQuery {
  return { result: null, loading: false, failed: false, ...overrides };
}

function renderCard(
  props: Partial<React.ComponentProps<typeof ExplorerCard>> = {}
) {
  const defaults: React.ComponentProps<typeof ExplorerCard> = {
    fen: FEN,
    band: '1400',
    onBandChange: vi.fn(),
    popularityStats: SNAPSHOT,
    explorer: query({ result: explorerResult() }),
    parentExplorer: null,
    treeData: makeTree(),
    treeLoading: false,
  };
  const merged = { ...defaults, ...props };
  return {
    onBandChange: merged.onBandChange,
    ...render(
      <MemoryRouter>
        <ExplorerCard {...merged} />
      </MemoryRouter>
    ),
  };
}

describe('ExplorerCard', () => {
  test('is titled Opening explorer, matching Lichess', () => {
    renderCard();
    expect(
      screen.getByRole('heading', { name: 'Opening explorer' })
    ).toBeInTheDocument();
    expect(screen.queryByText('Opening book')).toBeNull();
  });

  test('the level pills and everything they govern share one border', () => {
    const { container } = renderCard();
    const card = container.firstChild as HTMLElement;

    // The filter itself
    expect(
      within(card).getByRole('button', { name: 'Intermediate' })
    ).toBeInTheDocument();
    // The stats it filters
    expect(within(card).getByText('Games · 1400–1800')).toBeInTheDocument();
    // The move lists it filters
    expect(within(card).getByText('Next moves')).toBeInTheDocument();
    expect(within(card).getByText('Instead of 4.Nxd5')).toBeInTheDocument();
  });

  test('master games are NOT inside the card — the filter does not reach them', () => {
    renderCard();
    expect(screen.queryByText('Master games')).toBeNull();
  });

  test('the header names Lichess and the level when the data is live', () => {
    renderCard();
    expect(screen.getByText('Lichess · 1400–1800')).toBeInTheDocument();
  });

  test('the header never claims live data while serving the snapshot', () => {
    renderCard({ explorer: query({ failed: true }) });
    expect(
      screen.getByText('Saved snapshot · updated 2025-07-15')
    ).toBeInTheDocument();
    expect(screen.queryByText('Lichess · 1400–1800')).toBeNull();
  });

  test('pressing a pill reports the new level to the page', async () => {
    const user = userEvent.setup();
    const { onBandChange } = renderCard();
    await user.click(screen.getByRole('button', { name: 'Masters' }));
    expect(onBandChange).toHaveBeenCalledWith('masters');
  });

  test('renders nothing when the position has neither stats nor a book', () => {
    const { container } = renderCard({
      band: null,
      popularityStats: null,
      explorer: query(),
      treeData: null,
    });
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
npx vitest run src/components/detail/__tests__/ExplorerCard.test.tsx --root packages/web
```

Expected: FAIL — `Failed to resolve import "../ExplorerCard"`.

- [ ] **Step 3: Write the implementation**

Create `packages/web/src/components/detail/ExplorerCard.tsx`:

```tsx
import React from 'react';
import LevelLens from './LevelLens';
import WinRatePanel from './WinRatePanel';
import OpeningNavigator from './OpeningNavigator';
import styles from './ExplorerCard.module.css';
import type { ExplorerQuery } from '../../hooks/useExplorerResult';
import type { TreeContext } from '../../hooks/useOpeningTree';
import type { BandId, ExplorerResult } from '../../lib/lichessExplorer';
import {
  explorerSourceLine,
  type PopularityStats,
} from '../../lib/explorerStats';

/**
 * The opening explorer card (UX review phase 4, changes 11 and 12).
 *
 * One border around the level filter and everything it governs: the raised
 * header band carries the title, the source line and the LevelLens; the body
 * carries the stats and the move lists. Nothing outside this border responds
 * to the pills — which is the whole point. Before this, the pills sat inside
 * the stats card, did not reach the master games in that same card, and
 * silently drove a separate card outside it. There was no way to learn what
 * the filter governed by using it.
 *
 * The card does not fetch. The page already queries the explorer for this
 * position and band; passing that query in keeps one copy of the state and
 * lets the header state honestly whether the numbers below are live.
 */

interface ExplorerCardProps {
  fen: string;
  band: BandId | null;
  onBandChange: (band: BandId | null) => void;
  popularityStats: PopularityStats | null;
  explorer: ExplorerQuery;
  parentExplorer: ExplorerResult | null;
  treeData: TreeContext | null;
  treeLoading: boolean;
}

export const ExplorerCard: React.FC<ExplorerCardProps> = ({
  fen,
  band,
  onBandChange,
  popularityStats,
  explorer,
  parentExplorer,
  treeData,
  treeLoading,
}) => {
  const live = Boolean(band) && !explorer.failed;
  const hasStats = Boolean(popularityStats?.games_analyzed) || Boolean(band);
  const hasBook = treeLoading || Boolean(treeData?.current);

  // Sparse position: omit the block, never render an empty card.
  if (!fen || (!hasStats && !hasBook)) return null;

  return (
    <section className={styles.card} aria-labelledby="explorer-card-title">
      <div className={styles.headerBand}>
        <div className={styles.headerTop}>
          <h2 id="explorer-card-title" className={styles.title}>
            Opening explorer
          </h2>
          <span className={styles.source}>
            {explorerSourceLine(band, live, popularityStats?.analysis_date)}
          </span>
        </div>
        <LevelLens band={band} onChange={onBandChange} />
      </div>

      <div className={styles.body}>
        <WinRatePanel
          popularityStats={popularityStats}
          band={band}
          explorer={explorer}
        />
      </div>

      {hasBook && (
        <div className={`${styles.body} ${styles.bookBlock}`}>
          <OpeningNavigator
            treeData={treeData}
            loading={treeLoading}
            explorer={explorer.result}
            parentExplorer={parentExplorer}
            band={band}
            live={live && explorer.result !== null}
          />
        </div>
      )}
    </section>
  );
};

export default ExplorerCard;
```

Create `packages/web/src/components/detail/ExplorerCard.module.css`:

```css
/* The filter's territory drawn as a border. Everything inside responds to the
   level pills in the header band; nothing outside does. */
.card {
  background-color: var(--surface-raised);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  /* clip, not hidden — hidden makes this a scroll container and would capture
     any sticky descendant. */
  overflow: clip;
}

/* Raised band: the filter sits at the edge of the surface it controls. */
.headerBand {
  background-color: var(--surface-elevated);
  border-bottom: 1px solid var(--border-default);
  padding: var(--space-3) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-2-5);
}

.headerTop {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.title {
  font-family: var(--font-family-headline);
  font-size: var(--text-md);
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-primary);
  line-height: 1;
  margin: 0;
}

.source {
  font-size: var(--text-xs);
  color: var(--color-text-muted);
}

.body {
  padding: var(--space-4);
}

.bookBlock {
  border-top: 1px solid var(--border-subtle);
}
```

> Token check, already done: `--space-0-5`, `--space-2-5`, `--text-3xs`,
> `--text-md` and `--text-2xl` all exist in `simplified.css`. **`--space-3-5`
> does not** — do not introduce it.

In `packages/web/src/components/detail/index.ts` add:

```ts
export { ExplorerCard } from './ExplorerCard';
export { MasterGamesCard } from './MasterGamesCard';
```

- [ ] **Step 4: Run the test**

```bash
npx vitest run src/components/detail/__tests__/ExplorerCard.test.tsx --root packages/web
```

Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/detail/ExplorerCard.tsx packages/web/src/components/detail/ExplorerCard.module.css packages/web/src/components/detail/__tests__/ExplorerCard.test.tsx packages/web/src/components/detail/index.ts
git commit -m "feat(detail): ExplorerCard puts the level filter and its territory in one border"
```

---

## Task 7: Wire the desktop rail

**Files:**

- Modify: `packages/web/src/pages/OpeningDetailPage.tsx:1426-1448` (the
  right-column branch) and the import block

**Interfaces:**

- Consumes: `ExplorerCard`, `MasterGamesCard` from `components/detail`.
- Produces: no new exports.

- [ ] **Step 1: Change the imports**

Replace the `components/detail` import block:

```tsx
import {
  CommonPlans,
  VideoGallery,
  StudiesGallery,
  ExplorerCard,
  MasterGamesCard,
} from '../components/detail';
```

(`OpeningNavigator` and `WinRatePanel` are no longer used directly by the page.)

- [ ] **Step 2: Replace the right column**

Replace the whole `else` branch of the `isMobile` ternary — the
`<div className={`right-column ${styles.rightColumn}`}>` block — with:

```tsx
/* Right column — Overview, then one bordered explorer card holding
             the level filter and everything it governs, then master games
             outside that border because the filter does not reach them. */
<div className={`right-column ${styles.rightColumn}`}>
  {opening?.eco && (
    <div className={styles.overviewCard}>
      <div className={styles.overviewLabel}>Overview</div>
      <p className={styles.overviewText}>{overviewText}</p>
    </div>
  )}

  <ExplorerCard
    fen={opening.fen}
    band={band}
    onBandChange={setBand}
    popularityStats={popularityStats}
    explorer={explorerQuery}
    parentExplorer={parentExplorer}
    treeData={treeData}
    treeLoading={treeLoading}
  />

  <MasterGamesCard fen={opening.fen} />
</div>
```

- [ ] **Step 3: Remove the now-unused `explorer` binding if TypeScript flags
      it**

`const explorer = explorerQuery.result;` (line ~139) is still used by the mobile
branch? Check: mobile passes `explorer={explorerQuery}`, not `explorer`. Run the
build; if `explorer` is unused, delete that line. Do **not** delete
`explorerQuery` or `parentExplorer`.

- [ ] **Step 4: Verify**

```bash
npm run build
```

Expected: clean. Then:

```bash
npx vitest run src/pages --root packages/web
```

Expected: PASS. (Checked: no page test asserts the string "Opening book", so the
rename should not ripple here. If one does fail on it, update the assertion to
"Opening explorer" — never revert the rename.)

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/pages/OpeningDetailPage.tsx
git commit -m "feat(detail): desktop rail is Overview, explorer card, master games"
```

---

## Task 8: Mobile — shared labels, one name for the list, master games last

**Files:**

- Modify: `packages/web/src/components/detail/mobile/MobileDataSurface.tsx`
- Modify:
  `packages/web/src/components/detail/mobile/MobileDataSurface.module.css`
- Modify:
  `packages/web/src/components/detail/mobile/__tests__/MobileDataSurface.test.tsx`
- Modify: `packages/web/src/pages/OpeningDetailPage.tsx` (mobile stack order +
  import)
- Delete: `packages/web/src/components/detail/mobile/MobileMasterGames.tsx`,
  `MobileMasterGames.module.css`, `__tests__/MobileMasterGames.test.tsx`

**Interfaces:**

- Consumes: everything Task 1 produced, plus `MasterGamesCard` with
  `variant="accordion"`.
- Produces: no new exports. `MobileDataSurface`'s props are unchanged.

- [ ] **Step 1: Update the tests**

In `MobileDataSurface.test.tsx`:

Replace the first test's body with:

```tsx
test('renders live level stats scoped and sourced to the active level', () => {
  renderSurface();
  expect(
    screen.getByRole('heading', { name: 'Opening explorer' })
  ).toBeInTheDocument();
  expect(screen.getByText('Lichess · 1400–1800')).toBeInTheDocument();
  expect(screen.getByText('Games · 1400–1800')).toBeInTheDocument();
  expect(screen.getByText('1k')).toBeInTheDocument();
  expect(screen.getByText('Average Elo')).toBeInTheDocument();
  expect(screen.getByText('1,604')).toBeInTheDocument();
  expect(screen.getByText('White 42%')).toBeInTheDocument();
  expect(screen.getByText('Draws 6%')).toBeInTheDocument();
  expect(screen.getByText('Black 52%')).toBeInTheDocument();
});
```

In the fallback test, replace the last assertion:

```tsx
expect(
  screen.getByText('Saved snapshot · updated 2025-07-15')
).toBeInTheDocument();
```

In the continuations test, replace the two heading assertions:

```tsx
expect(screen.getByText('Next moves')).toBeInTheDocument();
expect(screen.getByText('Most popular at 1400–1800')).toBeInTheDocument();
expect(screen.getByText('Instead of 4.Nxd5')).toBeInTheDocument();
expect(
  screen.getByText('Most popular alternatives at 1400–1800')
).toBeInTheDocument();
```

Add a new test:

```tsx
test('names the payload of the move reveal', () => {
  const tree = makeTree();
  tree.children = [
    makeNode({ fen: 'c1', name: 'A', move: '4...a', gamesPlayed: 900 }),
    makeNode({ fen: 'c2', name: 'B', move: '4...b', gamesPlayed: 800 }),
    makeNode({ fen: 'c3', name: 'C', move: '4...c', gamesPlayed: 700 }),
    makeNode({ fen: 'c4', name: 'D', move: '4...d', gamesPlayed: 600 }),
    makeNode({ fen: 'c5', name: 'E', move: '4...e', gamesPlayed: 500 }),
  ];
  renderSurface({ treeData: tree });
  expect(
    screen.getByRole('button', { name: 'Show 2 more moves' })
  ).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run src/components/detail/mobile/__tests__/MobileDataSurface.test.tsx --root packages/web
```

Expected: FAIL — `Opening explorer` heading not found.

- [ ] **Step 3: Rework `MobileDataSurface.tsx`**

Delete the local `MIN_LIVE_SAMPLE`, `PopularityStats`, `StatsView`, `bandMeta`,
`liveStatsView` and `snapshotStatsView` definitions and import them instead:

```tsx
import {
  alternativesCaption,
  explorerSourceLine,
  gamesStatLabel,
  liveStatsView,
  movesCaption,
  snapshotStatsView,
  type PopularityStats,
} from '../../../lib/explorerStats';
```

Keep `getBand` out of the import from `lichessExplorer` if it becomes unused —
the type-only imports `BandId` and `ExplorerResult` stay.

Replace the derived-state block:

```tsx
const live = Boolean(band) && !explorer.failed;
const snapshotView = snapshotStatsView(popularityStats);
const liveView = heldResult ? liveStatsView(heldResult) : null;
const statsView = live ? liveView : snapshotView;
const loadingDim = explorer.loading;
const tooFewGames =
  live && !explorer.loading && heldResult !== null && liveView === null;
```

(`heldBand` is no longer needed — `liveStatsView` takes only the result. Delete
it and the `heldBand` expression above it.)

Replace the sticky header block:

```tsx
<div className={styles.stickyHeader}>
  <div className={styles.headerTop}>
    <h2 className={styles.headerTitle}>Opening explorer</h2>
    <span className={styles.headerSource}>
      {explorerSourceLine(band, live, popularityStats?.analysis_date)}
    </span>
  </div>
  <LevelLens band={band} onChange={onBandChange} scrollable />
</div>
```

Replace the stat label:

```tsx
<span className={styles.statLabel}>{gamesStatLabel(band, live)}</span>
```

Delete the `<div className={styles.statsMeta}>{statsView.meta}</div>` line — the
header source line replaces it. Keep the `statsNote` failure message.

Replace the two book headings and captions:

```tsx
{
  childRows.length > 0 && (
    <>
      <div className={styles.bookHeading}>Next moves</div>
      <div className={styles.bookSubheading}>{movesCaption(band, live)}</div>
      <MoveRowList rows={childRows} ply={pliesPlayed} countLabel={countLabel} />
    </>
  );
}

{
  siblingRows.length > 0 && (
    <>
      <div className={`${styles.bookHeading} ${styles.bookHeadingAlt}`}>
        {alternativesLabel}
      </div>
      <div className={styles.bookSubheading}>
        {alternativesCaption(band, live)}
      </div>
      <MoveRowList
        rows={siblingRows}
        ply={currentMoveIdx}
        countLabel={countLabel}
      />
    </>
  );
}
```

In `MoveRowList`, replace the reveal label:

```tsx
{
  expanded
    ? 'Show less'
    : `Show ${rows.length - ROWS_COLLAPSED_LIMIT} more moves`;
}
```

In `MobileDataSurface.module.css`, delete the `.statsMeta` rule and add:

```css
.headerTop {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-bottom: var(--space-2-5);
}

.headerTitle {
  font-family: var(--font-family-headline);
  font-size: var(--text-base);
  font-weight: var(--font-weight-extrabold);
  color: var(--color-text-primary);
  line-height: 1;
  margin: 0;
}

.headerSource {
  font-size: var(--text-2xs);
  color: var(--color-text-muted);
}
```

- [ ] **Step 4: Move master games to the foot of the mobile stack**

In `OpeningDetailPage.tsx`, delete the `MobileMasterGames` import and the
`<MobileMasterGames fen={opening.fen} />` line from its current position
(directly under `<MobileDataSurface .../>`), then add after
`<MobileResources ... />`:

```tsx
<MasterGamesCard fen={opening.fen} variant="accordion" />
```

Master games are browse content and must not outrank the learning resources;
this also makes the two breakpoints agree on block order.

- [ ] **Step 5: Delete the superseded component**

```bash
git rm packages/web/src/components/detail/mobile/MobileMasterGames.tsx packages/web/src/components/detail/mobile/MobileMasterGames.module.css packages/web/src/components/detail/mobile/__tests__/MobileMasterGames.test.tsx
```

- [ ] **Step 6: Verify**

```bash
npm run build
npx vitest run src/components/detail src/pages --root packages/web
```

Expected: clean build; all detail and page suites pass.

- [ ] **Step 7: Commit**

```bash
git add -A packages/web/src
git commit -m "feat(detail): mobile shares the explorer labels; master games move last"
```

---

## Task 9: The remaining reveals name their payload

**Files:**

- Modify: `packages/web/src/components/detail/VideoGallery.tsx:232`
- Modify: `packages/web/src/components/detail/StudiesGallery.tsx:99`
- Modify: `packages/web/src/components/detail/CommonPlans.tsx:99`
- Modify:
  `packages/web/src/components/detail/__tests__/common-plans.test.tsx:54`

**Interfaces:** none — copy only.

Change 13: five identical grey "Show more" buttons on one page told the reader
nothing about the cost or reward of pressing any of them.

- [ ] **Step 1: Update the tests**

In `common-plans.test.tsx`, change `{ name: 'Show 1 more' }` to
`{ name: 'Show 1 more plan' }`.

Check `VideoGallery.test.tsx` and any studies test for a `Show \d+ more` query:

```bash
grep -rn "Show .* more" packages/web/src/components/detail/__tests__ packages/web/src/components/detail/mobile/__tests__
```

Update every hit to the new wording.

- [ ] **Step 2: Run the tests to verify they fail**

```bash
npx vitest run src/components/detail --root packages/web
```

Expected: FAIL on the renamed buttons.

- [ ] **Step 3: Make the changes**

`VideoGallery.tsx`:

```tsx
          Show {remainingCount} more {remainingCount === 1 ? 'video' : 'videos'} ▾
```

`StudiesGallery.tsx`:

```tsx
          Show {remainingCount} more {remainingCount === 1 ? 'study' : 'studies'} ▾
```

`CommonPlans.tsx`:

```tsx
{
  expanded
    ? 'Show less'
    : `Show ${plans.length - MOBILE_GROUP_COLLAPSED} more ${
        plans.length - MOBILE_GROUP_COLLAPSED === 1 ? 'plan' : 'plans'
      }`;
}
```

- [ ] **Step 4: Run the tests**

```bash
npx vitest run src/components/detail --root packages/web
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/detail
git commit -m "feat(detail): every reveal names what it holds"
```

---

## Task 10: Design-system bundle and memory bank

**Files:**

- Create: `design-system/project/preview/components-explorer-card.html`
- Modify:
  `design-system/project/preview/components-opening-detail-right-column.html`
- Modify: `.github/memory-bank/activeContext.md`,
  `.github/memory-bank/progress.md`

- [ ] **Step 1: Add the preview card**

Create `design-system/project/preview/components-explorer-card.html` following
the structure of `components-filter-bar.html`:
`<link rel="stylesheet" href="../colors_and_type.css" />`, a `.cap` caption per
specimen, tokens only. Specimens to include:

1. The header band — title "Opening explorer", source line "Lichess ·
   1400–1800", the five level pills with one active.
2. The same header showing the snapshot fallback source line: "Saved snapshot ·
   updated 2025-07-15".
3. The stats block — "Games · 1400–1800" / "Average Elo", the W/D/L bar and
   legend.
4. The master-games card — title, "OVER-THE-BOARD MASTERS" eyebrow, three rows,
   "Show 2 more games".

Include an HTML comment recording the two deviations from the mock and why:

```html
<!-- Deviations from the 2026-07-27 mock, both for the same reason — we do not
     hold the data:
     · Source line is "Over-the-board masters", not "2,400+ Elo". The proxy
       applies no rating filter to the masters band.
     · The reveal reads "Show N more games", not "All 47 master games". The
       explorer returns at most 15 top games and we dedupe by player, so we
       never hold all of them and cannot state a total.
     Master games also carry no event name in the payload, so rows are
     players · result · year only. -->
```

- [ ] **Step 2: Record the supersession**

At the top of `components-opening-detail-right-column.html`'s `<body>`, add:

```html
<!-- SUPERSEDED IN PART (UX review phase 4, 2026-07-28). The July structure
     shown here merged LevelLens INTO the stats card and kept master games
     inside it. Phase 4 re-parents both: the pills and everything they govern
     now live in ExplorerCard (see components-explorer-card.html), and master
     games sit outside that border. The styling below is still current — only
     the block parentage changed. -->
```

- [ ] **Step 3: Update the memory bank**

`activeContext.md`: replace the "Current Task" section with a phase 4 entry,
move the phase 3 section to "Previous Task", and move the old previous-task
detail to `archive.md`. **Hard limit: 50 lines.**

`progress.md`: add one entry at the top of "What's Done", and delete the "UX
review phases 4–5" line from "What's Left" if phase 5 is the only remainder —
reword it to phase 5 only. **Hard limit: 100 lines.**

Verify both:

```bash
node -e "for (const f of ['activeContext','progress']) console.log(f, require('fs').readFileSync('.github/memory-bank/'+f+'.md','utf8').split('\n').length)"
```

- [ ] **Step 4: Full verification**

```bash
npm run test:frontend
```

```bash
npm test -- --testPathIgnorePatterns='\.worktrees'
```

```bash
npm run build
```

All three must be clean. Do **not** run a repo-wide `npm run format` — with
`core.autocrlf=true` the local tree is CRLF and `.prettierrc` sets
`endOfLine: lf`, so dozens of already-clean files false-fail locally. Format
only the files this phase touched:

```bash
npx prettier --write "packages/web/src/components/detail/**/*.{ts,tsx,css}" "packages/web/src/lib/explorerStats.ts" "packages/web/src/hooks/useExplorerResult.ts" "packages/web/src/pages/OpeningDetailPage.tsx" "docs/superpowers/plans/2026-07-28-ux-phase-4-detail-desktop.md"
```

- [ ] **Step 5: Commit**

```bash
git add design-system .github/memory-bank docs/superpowers/plans
git commit -m "chore(detail): design-system preview card and memory bank for UX phase 4"
```

---

## Manual verification (browser, both breakpoints)

Run `preview_start` on `web`, open an opening with rich data (the Najdorf:
search "Najdorf").

**Desktop 1360:**

1. The rail reads Overview → Opening explorer → Master games, in that order.
2. Changing a level pill changes the stats **and** the Next-moves rows — both
   inside the card border. Nothing outside it moves.
3. The header source line tracks the pill: "Lichess · 1400–1800" → "Lichess ·
   2200+".
4. The Next-moves caption echoes the same level.
5. **Sticky check (spec checkpoint):** scroll to the bottom of the rail. The
   board stays pinned until the rail ends and the full-width sections begin,
   then releases. If it does not, look for `overflow: hidden` on a card, not for
   a sticky bug.
6. Master games is a separate card and does **not** react to the pills.

**Mobile 390:**

7. Block order: Overview → Opening explorer → Common plans → Learning resources
   → Master games (collapsed, last).
8. The sticky header shows the title and source line, and stays put while the
   card scrolls.
9. The stat label reads "Games · <range>".

**Known limitation:** `MasterGamesCard` is gated on `IntersectionObserver`,
which does not fire in the automated browser pane while DOM/JS/network work is
in flight. If the card is absent there, confirm via `document.querySelector`
after scrolling, or trust the unit tests — do not "fix" the gate to make the
pane happy. The gate protects a 25 req/min token budget.

---

## Self-review

Run after writing, before executing.

**1. Spec coverage (§5, Phase 4).** Every bullet mapped:

| Spec bullet                                                                                                           | Task                                                                         |
| --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| New `ExplorerCard` shell, header band with title/source/pills, body of stats + breadcrumb + next moves + alternatives | 6                                                                            |
| `WinRatePanel` gives up its pills and its master-games block                                                          | 4                                                                            |
| Master games become their own rail card with a source line and a reveal                                               | 3, 7                                                                         |
| Labelled reveals                                                                                                      | 3, 5, 8, 9                                                                   |
| Practice to primary filled                                                                                            | **Already shipped in phase 0** — verified at `simplified.css:2715`. No task. |
| Level echoes in sub-labels, both breakpoints                                                                          | 1, 5, 8                                                                      |
| Snapshot-fallback labelling (addition 1)                                                                              | 1, 6, 8                                                                      |
| Rename "opening book" → "Opening explorer"                                                                            | 6, 8                                                                         |
| Mobile: master games below Learning resources, `MobileMasterGames` replaced by the shared card                        | 8                                                                            |
| Shared `MasterGamesCard` retires the duplicate masters fetch                                                          | 3, 4, 8                                                                      |
| Sticky-board checkpoint, `overflow: clip`                                                                             | Global Constraints, manual verification step 5                               |
| Degradation: empty blocks omitted                                                                                     | 3 (null card), 6 (null card)                                                 |

**2. Placeholder scan.** No "TBD", no "add error handling", no "similar to Task
N". Every code step carries the code. Two steps deliberately end in a decision
rather than a literal (`--space-3-5` existence; the `toBeEmptyDOMElement`
assertion vs the probe div) — both state the exact check to run and the exact
fallback.

**3. Type consistency.**

- `StatsView` has no `meta` field; the source line comes from
  `explorerSourceLine`. Both consumers (Task 4, Task 8) are written against that
  shape.
- `liveStatsView(result)` takes **one** argument in every call site — the old
  mobile helper took `(result, band)`. Task 8 explicitly deletes `heldBand`,
  which existed only to feed the second argument.
- `WinRatePanel` props are `{ popularityStats, band, explorer }` in Task 4 and
  in the Task 6 call site. `fen` and `onBandChange` are gone from both.
- `OpeningNavigator` gains `embedded`/`band`/`live`; Task 6 passes
  `explorer={explorer.result}` (an `ExplorerResult | null`), matching the
  existing prop type — **not** the `ExplorerQuery`.
- `MasterGamesCard` prop is `variant`, spelled the same in Tasks 3, 7 and 8.
- `PopularityStats` is defined once (Task 1) and imported by Tasks 4, 6 and 8;
  the page's local `PopularityStats` interface stays where it is and is
  structurally identical.

**4. Defects found in review and fixed inline.** Recorded so they are not
reintroduced:

- **`renderNavigator` is positional, not an options object.** Task 5's tests
  originally called `renderNavigator({ band, live })`, which the existing helper
  (`treeData, explorer, parentExplorer`) cannot accept. Fixed: the helper gains
  a fourth `extra` argument and the new tests pass
  `(treeData, null, null, { band, live })`.
- **`--space-3-5` does not exist.** `ExplorerCard.module.css` used it for the
  body padding. Fixed to `var(--space-4)`; every other token in this plan was
  verified present in `simplified.css`.
- **`WinRateBar` would have been left dead.** Task 4 removes its only caller.
  Fixed: Task 4 retires the component, its CSS and its barrel export, behind a
  grep guard.
- **The `embedded` prop was dead configuration.** After Task 7 nothing renders
  `OpeningNavigator` outside the card, so the `false` branch — card chrome plus
  the "Opening book" title — was unreachable. Fixed: the prop is gone and the
  chrome comes out, which also retires the last rendered "Opening book" string.
- **`WinRatePanel` would blank for one frame.** Keying the placeholder off
  `explorer.loading` misses the render between mount and the hook's effect, when
  the query is `{result: null, loading: false}`. Fixed with a `pending`
  derivation that keys off a null result instead.

**5. Ordering.** Task 4 leaves the page uncompilable until Task 7. That is
deliberate — Task 4's test suite passes on its own, and splitting the component
change from the page rewiring keeps each diff reviewable. An implementer running
`npm run build` between Tasks 4 and 7 will see errors in `OpeningDetailPage.tsx`
only; that is expected, not a blocker.
