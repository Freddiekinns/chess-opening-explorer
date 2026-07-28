# UX Phase 5 — Analyse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Analyse page state what it actually does — one header instead
of two, a record card that stops claiming a lifetime it never measured, and a
sample report so a first-time visitor can see the payoff before typing a
username.

**Architecture:** The per-game reduction moves out of the React hook into
`packages/shared` as a pure `analyseGames()`, so the page and the new fixture
generator compute a report the same way and cannot drift. The fixture generator
is a plain Node script reading ECO data and the platform services directly — no
dev server, no HTTP. Everything else is a copy, markup and CSS pass on
`PersonalOpeningStats.tsx`.

**Tech Stack:** React 19 + TypeScript, CSS Modules, Vitest + Testing Library,
Node (CommonJS) for the generator, `packages/shared` (ESM, TypeScript).

## Global Constraints

- **Branch:** `ux/phase-5-analyse`, stacked on `ux/phase-4-detail-desktop`. PR
  targets `ux/phase-4-detail-desktop`. **Never merge a phase branch into
  `main`.**
- **Never introduce a raw hex value.** Map every mock colour to a token in
  `packages/web/src/styles/simplified.css`.
- **Never render fabricated data.** If a figure is missing, omit the element.
- Sentence case in copy. No `console.log` in production code.
- Conventional commits (`feat`/`fix`/`chore`/`docs`/`refactor`).
- Design-system bundle updated in the same PR as any visual surface change.
- `activeContext.md` < 50 lines, `progress.md` < 100 lines.
- Do **not** run a repo-wide `npm run format` — on Windows the CRLF working tree
  false-flags dozens of already-clean files. Format only the files this phase
  touches.
- Verification per phase: `npm run test:frontend`, `npm test`
  `--testPathIgnorePatterns='\.worktrees'`, `npm run build`, plus live checks at
  1360 and 390.

---

## Data facts (measured, not assumed)

Checked against the working tree before writing this plan, so no task is built
on a guess.

| Fact                                                                                                                | Evidence                                                                            |
| ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| The mock's "sage" `#9dbd7c` and "brick" `#c98579` are **already tokens**                                            | `simplified.css:145` `--color-perf-win-text`, `:147` `--color-perf-loss-text`       |
| The win-rate bar green `#85a663` is likewise `--color-perf-win`                                                     | `simplified.css:140`                                                                |
| `.statsRows` is **already** the mock's horizontal three-column layout, value above label                            | `PersonalOpeningStats.module.css:782-820` (`order: 1` value, `order: 2` label)      |
| `.statsLabelWin` / `.statsLabelLoss` are **no-ops** — both resolve to `--color-text-muted`                          | `PersonalOpeningStats.module.css:803-809`                                           |
| The error surface is already quiet and neutral; username is already retained; the button already re-reads "Analyse" | `.error` at `:499`; `step === 'error'` ⇒ `isBusy === false`                         |
| Progress and error render **outside** the centred `.landing` column                                                 | `PersonalOpeningStats.tsx:285` closes `.landing` before both blocks                 |
| `.landing` is `min-height: calc(65vh - 60px)` and centred when `showHero`                                           | `PersonalOpeningStats.module.css:10-15`                                             |
| `ECOService#getAllOpenings()` returns 12,377 openings **with `family_id` on all of them**, offline                  | probed: `with family_id: 12377 / 12377`                                             |
| `packages/shared/dist` is **not** committed — the generator must build it first                                     | `git ls-files packages/shared/dist` → empty                                         |
| `packages/shared/tests/` is run by **neither** Jest nor Vitest                                                      | root Jest `testPathIgnorePatterns: ["/packages/.*/tests/"]`; web Vitest is web-only |
| `resolveJsonModule` is on, so fixtures can be `import()`ed and code-split                                           | `packages/web/tsconfig.json`                                                        |
| Existing tests select the username input by placeholder and the platform by text                                    | `PersonalOpeningStats.test.tsx:119, 294, 313, 324`                                  |
| `/api/personal/games` returns `{ data: { gamesPgn: string[] } }`                                                    | `packages/api/src/routes/personal.routes.js:123`                                    |

---

## Decisions

**1. No new colour tokens.** The spec allowed either resolving "sage"/"brick"
against the result scale or adding named tokens. Neither is needed: the
`--color-perf-*` family already exists and the mock's hexes are exactly its
`-text` variants. Nothing to add, nothing to reconcile.

**2. The gear moves to the search overlay, not the dashboard hero.** The spec
says "dashboard header". The dashboard header's only control is "Analyse another
player →", which opens the overlay containing the search form. A gear in the
hero would set a value consumed by a button two clicks away; in the overlay it
sits beside the Analyse button that uses it. Either way it leaves the blank
state, which is what the change is for. Recorded as a deviation.

**3. The record card keeps its existing layout.** `.statsRows` already renders
three columns with the value above the label — the mock's exact structure. Only
the eyebrow, the title, the three labels and the value tints change. Restyling
would be churn.

**4. The error and progress blocks move inside `.landing`.** They currently
render after a centred 65vh column, so on the blank screen they appear a third
of a viewport below the input bar they describe. The mock puts both directly
under it. This is a real defect the styling pass would otherwise paper over.

**5. The reduction moves to `packages/shared`, not to a web-local module.** The
generator is plain Node and cannot import web TypeScript. Duplicating the
reduction would let committed fixtures silently drift from what the page
computes — the exact failure the "as of \<date\>" line exists to make visible.
`packages/shared/src/utils/personal-analysis.ts` is importable by both.

**6. Its tests live in the web suite.** `packages/shared/tests/` is run by
neither Jest nor Vitest (measured above), so a test placed there would be dead.
Web imports `../../../../shared/src` by relative path, so a Vitest test in
`packages/web/src/components/personal/__tests__/` exercises the real module and
actually runs in CI.

**7. Fixtures are lazily `import()`ed JSON, not fetched.** A dynamic import
gives a content-hashed chunk that idle visitors never download, works offline in
tests, and needs no route — so no `Cache-Control` entry and no crawler exposure.

**8. Loading a sample never writes the session cache.** `loadSample` sets the
dashboard directly and touches neither the per-analysis cache key nor
`LAST_ANALYSIS_SNAPSHOT_KEY`. A sample must not come back as "your" saved result
on the next visit.

**9. Sample size is 100 games, not 500.** Keeps each fixture small enough to
commit and read in review, and the banner states the number, so it stays honest.

**10. `sortAgg` moves with the reduction; `SortMode` does not.** Shared gets its
own `AggSortMode` union with identical members. `familyAggregation.ts` keeps
`SortMode` — moving it would drag family-rollup types into shared for no gain.

---

## File structure

**Create**

| Path                                                    | Responsibility                                                               |
| ------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `packages/shared/src/utils/personal-analysis.ts`        | Pure PGN→`DashboardData` reduction + its per-game helpers. No DOM, no React. |
| `packages/web/src/components/personal/sampleReports.ts` | Sample registry, lazy fixture loaders, date formatting.                      |
| `packages/web/src/data/sample-reports/magnus.json`      | Generated fixture (committed).                                               |
| `packages/web/src/data/sample-reports/hikaru.json`      | Generated fixture (committed).                                               |
| `tools/sample-reports/generate-sample-reports.js`       | Regeneration script.                                                         |
| `tools/sample-reports/README.md`                        | How and when to regenerate.                                                  |
| `.../personal/__tests__/personalAnalysis.test.ts`       | Reduction tests.                                                             |
| `.../personal/__tests__/sampleReports.test.tsx`         | Sample loading + banner tests.                                               |
| `design-system/project/preview/components-analyse.html` | Preview card for the blank state, transient states and record card.          |

**Modify**

| Path                                                                   | Change                                                                                               |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `packages/shared/src/utils/index.ts`                                   | Export the new module.                                                                               |
| `packages/web/src/components/personal/personalStatsLib.ts`             | Re-export the moved helpers and types; drop the moved bodies.                                        |
| `packages/web/src/components/personal/usePersonalGames.ts`             | Call `analyseGames`; add `loadSample` + `sample`.                                                    |
| `packages/web/src/components/personal/PersonalOpeningStats.tsx`        | Hero, radio group, label, gear, sample links, sample banner, record card, transient-state placement. |
| `packages/web/src/components/personal/PersonalStatsControls.tsx`       | New `PlatformRadioGroup`.                                                                            |
| `packages/web/src/components/personal/PersonalOpeningStats.module.css` | Radio-group, dim, sample-link, sample-banner and value-tint rules; drop `.idlePrompt*`.              |
| `package.json`                                                         | `sample:generate` script.                                                                            |
| `CLAUDE.md`                                                            | Document the new command and the fixture-staleness gotcha.                                           |
| `.github/memory-bank/activeContext.md`, `progress.md`                  | Phase 5 entry.                                                                                       |

---

## Task 1: The reduction becomes shared and pure

**Files:**

- Create: `packages/shared/src/utils/personal-analysis.ts`
- Modify: `packages/shared/src/utils/index.ts`
- Modify: `packages/web/src/components/personal/personalStatsLib.ts`
- Modify: `packages/web/src/components/personal/usePersonalGames.ts:185-314`
- Test:
  `packages/web/src/components/personal/__tests__/personalAnalysis.test.ts`

**Interfaces:**

- Consumes: `lookupOpeningFromPGN`, `OpeningForLookup` from `./pgn-utils.js`.
- Produces:
  - `analyseGames(gamesPgn: string[], username: string, openingsMap: Map<string, OpeningForLookup>, options?: AnalyseGamesOptions): Promise<DashboardData | null>`
    — resolves `null` when `shouldAbort()` returned true mid-run.
  - `AnalyseGamesOptions = { onProgress?: (processed: number, total: number) => void; shouldAbort?: () => boolean; yieldEvery?: number }`
  - `parsePgnHeaders`, `getUserSide`, `getUserResult`, `upsertAgg`, `sortAgg`,
    and the types `Side`, `Result`, `OpeningAgg`, `DashboardData`,
    `AggSortMode`.

- [ ] **Step 1: Write the failing test**

Create
`packages/web/src/components/personal/__tests__/personalAnalysis.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import {
  analyseGames,
  sortAgg,
} from '../../../../../shared/src/utils/personal-analysis';
import { buildOpeningsMap } from '../../../../../shared/src/utils/pgn-utils';

const openingsMap = buildOpeningsMap([
  {
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    name: "King's Pawn Game",
    eco: 'B00',
    moves: '1. e4',
    family_id: 'kings-pawn',
  },
  {
    fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2',
    name: 'Sicilian Defence',
    eco: 'B20',
    moves: '1. e4 c5',
    family_id: 'sicilian',
  },
]);

const game = (white: string, black: string, result: string, moves: string) =>
  `[Event "Rated blitz game"]\n[White "${white}"]\n[Black "${black}"]\n[Result "${result}"]\n\n${moves} ${result}`;

describe('analyseGames', () => {
  it('splits a run by the side the user played and tallies their result', async () => {
    const data = await analyseGames(
      [
        game('alice', 'bob', '1-0', '1. e4 e5'),
        game('bob', 'alice', '1-0', '1. e4 c5'),
      ],
      'alice',
      openingsMap
    );

    expect(data).not.toBeNull();
    expect(data!.whiteGames).toBe(1);
    expect(data!.whiteWin).toBe(1);
    expect(data!.blackGames).toBe(1);
    expect(data!.blackLoss).toBe(1);
    expect(data!.classifiedGames).toBe(2);
  });

  it('counts a game it cannot attribute to the user as unrecognised, not as a loss', async () => {
    const data = await analyseGames(
      [game('carol', 'dave', '1-0', '1. e4 e5')],
      'alice',
      openingsMap
    );

    expect(data!.unclassifiedGames).toBe(1);
    expect(data!.classifiedGames).toBe(0);
    expect(data!.whiteGames + data!.blackGames).toBe(0);
  });

  it('reports progress for every game, including the ones it cannot classify', async () => {
    const onProgress = vi.fn();
    await analyseGames(
      [
        game('alice', 'bob', '1-0', '1. e4 e5'),
        game('carol', 'dave', '0-1', '1. e4 e5'),
      ],
      'alice',
      openingsMap,
      { onProgress }
    );

    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenLastCalledWith(2, 2);
  });

  it('resolves null when the caller aborts, rather than returning a partial run', async () => {
    const data = await analyseGames(
      [game('alice', 'bob', '1-0', '1. e4 e5')],
      'alice',
      openingsMap,
      { shouldAbort: () => true }
    );

    expect(data).toBeNull();
  });

  it('returns the full opening list, untruncated, ordered by games played', async () => {
    const games = [
      ...Array.from({ length: 3 }, () =>
        game('alice', 'bob', '1-0', '1. e4 e5')
      ),
      game('alice', 'bob', '0-1', '1. d4 d5'),
    ];
    const data = await analyseGames(games, 'alice', openingsMap);

    expect(data!.asWhite[0].games).toBe(3);
    expect(data!.asWhite[0].name).toBe("King's Pawn Game");
  });
});

describe('sortAgg', () => {
  const agg = (name: string, games: number, win: number) => ({
    fen: name,
    name,
    eco: 'A00',
    moves: '',
    games,
    win,
    draw: 0,
    loss: games - win,
  });

  it('orders by win rate, not volume, when asked for the best', () => {
    expect(sortAgg([agg('a', 10, 5), agg('b', 4, 4)], 'best')[0].name).toBe(
      'b'
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:frontend -- personalAnalysis
```

Expected: FAIL —
`Failed to resolve import ".../shared/src/utils/personal-analysis"`.

- [ ] **Step 3: Write the shared module**

Create `packages/shared/src/utils/personal-analysis.ts`:

```ts
/**
 * Pure PGN → dashboard reduction for the Analyse page.
 *
 * Lives in `shared` rather than in `packages/web` because the sample-report
 * generator (plain Node, `tools/sample-reports/`) computes the committed
 * fixtures with exactly this code. If it were duplicated, the fixtures could
 * drift from what the page shows and nothing would catch it.
 *
 * Its tests live in `packages/web/src/components/personal/__tests__/` — this
 * package's own `tests/` directory is run by neither Jest nor Vitest.
 */
import { lookupOpeningFromPGN, type OpeningForLookup } from './pgn-utils.js';

export type Side = 'white' | 'black';
export type Result = 'win' | 'draw' | 'loss';
export type AggSortMode = 'frequency' | 'best' | 'worst';

export interface OpeningAgg {
  fen: string;
  name: string;
  eco: string;
  moves: string;
  family_id?: string;
  games: number;
  win: number;
  draw: number;
  loss: number;
}

export interface DashboardData {
  totalGames: number;
  classifiedGames: number;
  unclassifiedGames: number;
  whiteGames: number;
  whiteWin: number;
  whiteDraw: number;
  whiteLoss: number;
  blackGames: number;
  blackWin: number;
  blackDraw: number;
  blackLoss: number;
  asWhite: OpeningAgg[];
  asBlack: OpeningAgg[];
}

export function parsePgnHeaders(pgn: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const lines = (pgn || '').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('[')) continue;
    const m = trimmed.match(/^\[([^\s]+)\s+"(.*)"\]$/);
    if (!m) continue;
    headers[m[1]] = m[2];
  }
  return headers;
}

export function getUserSide(
  headers: Record<string, string>,
  username: string
): Side | null {
  const u = username.toLowerCase();
  const white = (headers.White || '').toLowerCase();
  const black = (headers.Black || '').toLowerCase();
  if (white === u) return 'white';
  if (black === u) return 'black';
  return null;
}

export function getUserResult(
  headers: Record<string, string>,
  side: Side
): Result | null {
  const r = headers.Result;
  if (!r) return null;
  if (r === '1/2-1/2') return 'draw';
  if (r === '1-0') return side === 'white' ? 'win' : 'loss';
  if (r === '0-1') return side === 'black' ? 'win' : 'loss';
  return null;
}

export function sortAgg(
  list: OpeningAgg[],
  mode: AggSortMode = 'frequency'
): OpeningAgg[] {
  return [...list].sort((a, b) => {
    if (mode === 'best') return b.win / b.games - a.win / a.games;
    if (mode === 'worst') return a.win / a.games - b.win / b.games;
    if (b.games !== a.games) return b.games - a.games;
    if (b.win !== a.win) return b.win - a.win;
    return (a.name || '').localeCompare(b.name || '');
  });
}

export function upsertAgg(
  map: Map<string, OpeningAgg>,
  opening: {
    fen: string;
    name: string;
    eco: string;
    moves?: string;
    family_id?: string;
  },
  result: Result
): void {
  const existing = map.get(opening.fen) || {
    fen: opening.fen,
    name: opening.name,
    eco: opening.eco,
    moves: opening.moves || '',
    family_id: opening.family_id,
    games: 0,
    win: 0,
    draw: 0,
    loss: 0,
  };

  existing.games += 1;
  existing[result] += 1;
  map.set(opening.fen, existing);
}

export interface AnalyseGamesOptions {
  /** Called once per game, classified or not, with (processed, total). */
  onProgress?: (processed: number, total: number) => void;
  /** Checked before each game; a true return abandons the run. */
  shouldAbort?: () => boolean;
  /** Yield to the host every N games so a UI caller stays responsive. */
  yieldEvery?: number;
}

/**
 * Reduces a run of PGNs to the dashboard the page renders.
 * Resolves `null` if `shouldAbort` fired — a partial run is not a result.
 */
export async function analyseGames(
  gamesPgn: string[],
  username: string,
  openingsMap: Map<string, OpeningForLookup>,
  options: AnalyseGamesOptions = {}
): Promise<DashboardData | null> {
  const { onProgress, shouldAbort, yieldEvery = 10 } = options;

  const asWhite = new Map<string, OpeningAgg>();
  const asBlack = new Map<string, OpeningAgg>();
  let classified = 0;
  let unclassified = 0;
  let whiteGames = 0;
  let whiteWin = 0;
  let whiteDraw = 0;
  let whiteLoss = 0;
  let blackGames = 0;
  let blackWin = 0;
  let blackDraw = 0;
  let blackLoss = 0;

  for (let i = 0; i < gamesPgn.length; i++) {
    if (shouldAbort?.()) return null;

    const pgn = gamesPgn[i];
    const headers = parsePgnHeaders(pgn);
    const side = getUserSide(headers, username);
    const result = side ? getUserResult(headers, side) : null;
    const lookup =
      side && result ? lookupOpeningFromPGN(pgn, openingsMap) : null;

    if (!side || !result || !lookup?.success || !lookup.bestMatch) {
      unclassified += 1;
    } else {
      classified += 1;
      const opening = {
        ...lookup.bestMatch,
        moves: lookup.bestMatch.moves || '',
      };
      if (side === 'white') {
        upsertAgg(asWhite, opening, result);
        whiteGames += 1;
        if (result === 'win') whiteWin += 1;
        if (result === 'draw') whiteDraw += 1;
        if (result === 'loss') whiteLoss += 1;
      } else {
        upsertAgg(asBlack, opening, result);
        blackGames += 1;
        if (result === 'win') blackWin += 1;
        if (result === 'draw') blackDraw += 1;
        if (result === 'loss') blackLoss += 1;
      }
    }

    onProgress?.(i + 1, gamesPgn.length);

    if (yieldEvery > 0 && (i + 1) % yieldEvery === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  return {
    totalGames: gamesPgn.length,
    classifiedGames: classified,
    unclassifiedGames: unclassified,
    whiteGames,
    whiteWin,
    whiteDraw,
    whiteLoss,
    blackGames,
    blackWin,
    blackDraw,
    blackLoss,
    // Full lists, untruncated — family rollups aggregate over every opening.
    // The flat "all openings" view caps its own display.
    asWhite: sortAgg(Array.from(asWhite.values())),
    asBlack: sortAgg(Array.from(asBlack.values())),
  };
}
```

Add to `packages/shared/src/utils/index.ts`:

```ts
export * from './personal-analysis.js';
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm run test:frontend -- personalAnalysis
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Rewire `personalStatsLib.ts`**

Delete the bodies of `parsePgnHeaders`, `getUserSide`, `getUserResult`,
`sortAgg`, `upsertAgg` and the `OpeningAgg` / `DashboardData` / `Side` /
`Result` type declarations. Replace the top of the file's exports with
re-exports so no call site changes:

```ts
import type { OpeningAggInput, SortMode } from './familyAggregation';
import type { OpeningAgg } from '../../../../shared/src/utils/personal-analysis';

// The reduction and its per-game helpers live in `shared` so the sample-report
// generator computes fixtures with the same code the page runs. Re-exported
// here because this module is the personal-stats barrel every caller imports.
export {
  parsePgnHeaders,
  getUserSide,
  getUserResult,
  sortAgg,
  upsertAgg,
} from '../../../../shared/src/utils/personal-analysis';
export type {
  Side,
  Result,
  OpeningAgg,
  DashboardData,
} from '../../../../shared/src/utils/personal-analysis';
```

Leave everything else in the file (`SORT_LABELS`, `SIDE_OPTIONS`, `toAggInput`,
storage keys, `clampInt`, `normalizeUsername`, `getWinRate`, `getLossRate`,
`MIN_CARD_GAMES`, `findBestOpening`, `findWeakestOpening`,
`formatDistinguishingMoves`) exactly as it is.

- [ ] **Step 6: Rewire the hook**

In `packages/web/src/components/personal/usePersonalGames.ts`, replace the
in-line loop (the block from `const asWhite = new Map...` through the
`const data: DashboardData = {...}` literal) with a call to `analyseGames`. The
dynamic import gains one name; drop the now-unused imports.

```ts
      const [response, openingsData, { buildOpeningsMap, lookupOpeningFromPGN: _unused, analyseGames }] =
```

is wrong — `lookupOpeningFromPGN` is no longer used here. Use:

```ts
const [response, openingsData, { buildOpeningsMap, analyseGames }] =
  await Promise.all([
    fetch(url, { signal: controller.signal }),
    getOpeningsData(),
    import('../../../../shared/src'),
  ]);
```

and replace the loop with:

```ts
const openingsMap = buildOpeningsMap(openingsData);

const gamesPgn: string[] = json?.data?.gamesPgn || [];
setTotal(gamesPgn.length);
setProgress(gamesPgn.length > 0 ? 15 : 100);

setStep('analysing');
setStepText('Analysing your games...');

const data = await analyseGames(gamesPgn, u, openingsMap, {
  onProgress: (done, count) => {
    setProcessed(done);
    setStepText(`Analysing your games... (${done}/${count})`);
    setProgress(15 + Math.round((done / Math.max(1, count)) * 85));
  },
  shouldAbort: () => controller.signal.aborted,
});

// Aborted mid-run: handleCancel already reset the step, so leave it be.
if (!data) return;
```

Then update the imports at the top of the file — `parsePgnHeaders`,
`getUserSide`, `getUserResult`, `upsertAgg` and `OpeningAgg` are no longer
referenced; `sortAgg` still is (nowhere else in this file — remove it too). The
remaining import list is:

```ts
import {
  clampInt,
  normalizeUsername,
  readSavedFormState,
  FORM_STATE_KEY,
  LAST_ANALYSIS_SNAPSHOT_KEY,
  type DashboardData,
  type Platform,
  type SideTab,
} from './personalStatsLib';
```

- [ ] **Step 7: Run the full frontend suite and the type check**

```bash
npm run test:frontend
```

Expected: PASS, no regressions in `PersonalOpeningStats.test.tsx`.

```bash
npm run build
```

Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add packages/shared/src/utils packages/web/src/components/personal
git commit -m "refactor(analyse): the reduction is pure, shared and testable"
```

---

## Task 2: One header, and the form says what it reads

**Files:**

- Modify:
  `packages/web/src/components/personal/PersonalOpeningStats.tsx:127-284`
- Modify: `packages/web/src/components/personal/PersonalStatsControls.tsx`
- Modify: `packages/web/src/components/personal/PersonalOpeningStats.module.css`
- Test:
  `packages/web/src/components/personal/__tests__/PersonalOpeningStats.test.tsx`

**Interfaces:**

- Produces: `PlatformRadioGroup({ value, onChange, disabled })` from
  `PersonalStatsControls.tsx`;
  `renderSearchForm({ showGear }: { showGear: boolean })` inside
  `PersonalOpeningStats`.

- [ ] **Step 1: Write the failing tests**

Append to
`packages/web/src/components/personal/__tests__/PersonalOpeningStats.test.tsx`:

```ts
describe('blank state', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('carries the payoff in one header, with no second prompt beneath it', () => {
    renderComponent();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Analyse your games' })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'See which openings you actually play, and how they score — from your recent rated games.'
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Ready to analyse your openings?')
    ).not.toBeInTheDocument();
  });

  it('states its scope and that it keeps nothing', () => {
    renderComponent();

    expect(
      screen.getByText(
        'Reads your public rated games — rapid, blitz & classical. Bullet excluded. Nothing is stored.'
      )
    ).toBeInTheDocument();
  });

  it('offers the platform choice as a radio group, not two unlabelled buttons', async () => {
    const user = userEvent.setup();
    renderComponent();

    const group = screen.getByRole('radiogroup', { name: 'Platform' });
    const chesscom = within(group).getByRole('radio', { name: 'Chess.com' });
    const lichess = within(group).getByRole('radio', { name: 'Lichess' });

    expect(chesscom).toBeChecked();
    await user.click(lichess);
    expect(lichess).toBeChecked();
    expect(chesscom).not.toBeChecked();
  });

  it('gives the username field a real label, not just a placeholder', () => {
    renderComponent();

    expect(screen.getByLabelText('Username')).toBe(
      screen.getByPlaceholderText('Enter username...')
    );
  });

  it('does not put the games-count control on the blank screen', () => {
    renderComponent();

    expect(
      screen.queryByRole('button', { name: 'Settings' })
    ).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm run test:frontend -- PersonalOpeningStats
```

Expected: FAIL — no `radiogroup` role, no accessible name "Username", the "Ready
to analyse your openings?" heading is present, the Settings button is present.

- [ ] **Step 3: Add `PlatformRadioGroup`**

Append to `packages/web/src/components/personal/PersonalStatsControls.tsx`:

```tsx
/** Platform choice is one-of-two and mutually exclusive — a radio group, not
    two buttons. Native inputs are visually hidden behind their labels so the
    pill styling survives while keyboard and screen-reader semantics are real. */
export const PlatformRadioGroup: React.FC<{
  value: 'chess.com' | 'lichess';
  onChange: (value: 'chess.com' | 'lichess') => void;
  disabled?: boolean;
}> = ({ value, onChange, disabled }) => (
  <div
    className={styles.platformToggle}
    role="radiogroup"
    aria-label="Platform"
  >
    {(['chess.com', 'lichess'] as const).map((option) => {
      const label = option === 'lichess' ? 'Lichess' : 'Chess.com';
      const active = value === option;
      return (
        <label
          key={option}
          className={`${styles.platformBtn} ${active ? styles.platformBtnActive : ''}`}
        >
          <input
            type="radio"
            className={styles.platformInput}
            name="analyse-platform"
            value={option}
            checked={active}
            disabled={disabled}
            onChange={() => onChange(option)}
          />
          {label}
        </label>
      );
    })}
  </div>
);
```

- [ ] **Step 4: Rewrite the blank state**

In `PersonalOpeningStats.tsx`:

Import `PlatformRadioGroup` alongside the other controls and drop `GearIcon`
from the import only if it becomes unused (it does not — the gear survives in
the overlay).

Replace the platform-toggle block inside `renderSearchForm` with:

```tsx
<PlatformRadioGroup value={platform} onChange={setPlatform} disabled={isBusy} />
```

Give the input a real label and change the signature so the gear is opt-in:

```tsx
  const renderSearchForm = ({ showGear }: { showGear: boolean }) => (
```

```tsx
<div className={styles.inputFields}>
  <label className={styles.userIcon} htmlFor="analyse-username">
    <UserIcon />
    <span className={styles.srOnly}>Username</span>
  </label>

  <input
    id="analyse-username"
    className={styles.usernameInput}
    value={username}
    onChange={(e) => setUsername(e.target.value)}
    onKeyDown={handleEnterToAnalyse}
    placeholder="Enter username..."
    inputMode="text"
    autoComplete="off"
    disabled={isBusy}
  />
</div>
```

Wrap the whole gear block
(`<div ref={settingsRef} className={styles.settingsAnchor}> … </div>`) in
`{showGear && ( … )}`.

Update the two call sites: the landing renders
`renderSearchForm({ showGear: false })`, the search overlay renders
`renderSearchForm({ showGear: true })`.

Change the hero subtitle and the scope note:

```tsx
<p className={styles.heroSubtitle}>
  See which openings you actually play, and how they score — from your recent
  rated games.
</p>
```

```tsx
<p className={styles.inputNote}>
  Reads your public rated games — rapid, blitz &amp; classical. Bullet excluded.
  Nothing is stored.
</p>
```

Delete the entire `{showHero && step === 'idle' && ( … )}` idle-prompt block,
including its inline `<svg>`.

- [ ] **Step 5: Update the CSS**

In `PersonalOpeningStats.module.css`, delete `.idlePrompt`, `.idlePromptIcon`,
`.idlePromptTitle`, `.idlePromptText` and the `.idlePrompt` rule inside the
`@media (max-width: 640px)` block. Add:

```css
/* Visually hidden but announced — the username field's real label. */
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

/* The radio itself is hidden; its <label> carries the pill styling. Kept
   focusable so the ring lands on the visible pill via :focus-within. */
.platformInput {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
  margin: 0;
  pointer-events: none;
}

.platformBtn:focus-within {
  outline: 2px solid var(--color-brand-orange);
  outline-offset: 2px;
}
```

`.platformBtn` is currently styled for a `<button>`; add `cursor: pointer;` and
`display: inline-flex; align-items: center;` to it if not already present so the
`<label>` matches the old button box.

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm run test:frontend -- PersonalOpeningStats
```

Expected: PASS, including the pre-existing tests at lines 119, 294, 313 and 324
(the placeholder and the "Chess.com" text both survive).

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/components/personal
git commit -m "feat(analyse): one header, a labelled form, and a stated scope"
```

---

## Task 3: The transient states sit where they belong

**Files:**

- Modify:
  `packages/web/src/components/personal/PersonalOpeningStats.tsx:247-363`
- Modify: `packages/web/src/components/personal/PersonalOpeningStats.module.css`
- Test:
  `packages/web/src/components/personal/__tests__/PersonalOpeningStats.test.tsx`

**Interfaces:**

- Consumes: `renderSearchForm({ showGear })` from Task 2.
- Produces: nothing new; a `.fieldsDim` class and a relocated progress/error
  block.

- [ ] **Step 1: Write the failing test**

```ts
describe('transient states', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('keeps the progress and error blocks inside the centred column, under the input', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({
        success: false,
        message: 'We could not load your games.',
      }),
    } as Response);

    renderComponent();
    await user.type(screen.getByLabelText('Username'), 'someone');
    await user.click(screen.getByRole('button', { name: 'Analyse' }));

    const alert = await screen.findByRole('alert');
    const note = screen.getByText(/Reads your public rated games/);
    // Same column as the note it follows — not stranded below a 65vh block.
    expect(note.parentElement).toBe(alert.parentElement);
  });

  it('returns the button to Analyse after a failure and keeps what was typed', async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({
        success: false,
        message: 'We could not load your games.',
      }),
    } as Response);

    renderComponent();
    await user.type(screen.getByLabelText('Username'), 'chessstudnt99');
    await user.click(screen.getByRole('button', { name: 'Analyse' }));

    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: 'Analyse' })).toBeEnabled();
    expect(screen.getByLabelText('Username')).toHaveValue('chessstudnt99');
  });
});
```

Add `afterEach(() => vi.restoreAllMocks());` to this describe block.

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:frontend -- PersonalOpeningStats
```

Expected: FAIL on the first test — the alert's parent is the component root, the
note's parent is `.landing`.

- [ ] **Step 3: Move the blocks and dim the fields**

In `PersonalOpeningStats.tsx`, extract the progress and error markup into two
local render helpers so the landing column and the overlay can each place them:

```tsx
const renderProgress = () =>
  step === 'fetching' || step === 'analysing' ? (
    <div className={styles.progress} aria-live="polite">
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className={styles.progressMeta}>
        <span>{stepText}</span>
        {total > 0 && (
          <span>
            {processed}/{total}
          </span>
        )}
      </div>
    </div>
  ) : null;
```

Move `{renderProgress()}` and the error block **inside** the
`{!dashboard && (…)}` landing container, directly after
`{renderSearchForm({ showGear: false })}`, and delete the two standalone blocks
that followed it. The overlay keeps its own progress markup — replace it with
`{renderProgress()}` too, dropping `styles.overlayProgress`'s duplicate.

Dim the fields while busy: on the `.inputBar`'s platform group and input fields,

```tsx
        <div className={`${styles.inputFields} ${isBusy ? styles.fieldsDim : ''}`}>
```

and pass the same to `PlatformRadioGroup` via a wrapper span, or simpler — add
the class to the bar and exempt the actions:

```css
/* Analysing: the fields recede, the Cancel button does not. */
.fieldsDim {
  opacity: 0.55;
  transition: opacity 150ms ease;
}
```

Apply `fieldsDim` to `.inputFields` and, in `PlatformRadioGroup`, add
`${disabled ? styles.fieldsDim : ''}` to the `.platformToggle` class list.

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:frontend -- PersonalOpeningStats
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/personal
git commit -m "fix(analyse): progress and errors belong under the input, not below the fold"
```

---

## Task 4: The record card stops claiming a career

**Files:**

- Modify:
  `packages/web/src/components/personal/PersonalOpeningStats.tsx:600-623, 709-715, 778-784`
- Modify:
  `packages/web/src/components/personal/PersonalOpeningStats.module.css:803-820`
- Test:
  `packages/web/src/components/personal/__tests__/PersonalOpeningStats.test.tsx`

**Interfaces:**

- Produces: nothing new. `.statsValueWin` / `.statsValueLoss` CSS classes.

- [ ] **Step 1: Write the failing test**

```ts
describe('dashboard honesty', () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem(
      FORM_STATE_KEY,
      JSON.stringify({
        username: 'tester',
        platform: 'chess.com',
        limit: 500,
        activeTab: 'white',
      })
    );
    sessionStorage.setItem(
      buildCacheKey('tester', 'chess.com', 500),
      JSON.stringify({ dashboard: mockDashboardData, cachedAt: Date.now() })
    );
  });

  it('scopes the record to this run rather than a lifetime', async () => {
    renderComponent();

    expect(await screen.findByText('This analysis')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Your record' })
    ).toBeInTheDocument();
    expect(screen.queryByText('Career totals')).not.toBeInTheDocument();
    expect(screen.queryByText('Overall performance')).not.toBeInTheDocument();
    expect(screen.queryByText('Total wins')).not.toBeInTheDocument();
  });

  it('names the games column in full, matching mobile', async () => {
    renderComponent();

    await screen.findByRole('heading', { name: 'Your record' });
    expect(screen.queryByText('GP')).not.toBeInTheDocument();
    expect(screen.getAllByText('Games').length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:frontend -- PersonalOpeningStats
```

Expected: FAIL — "This analysis" is not found; "Career totals" is.

- [ ] **Step 3: Change the card and the column header**

Replace the summary card's head and rows in `PersonalOpeningStats.tsx`:

```tsx
<div className={styles.card}>
  <div className={`${styles.cardLabel} ${styles.cardLabelAccent}`}>
    This analysis
  </div>
  <h3 className={styles.cardTitle}>Your record</h3>
  <div className={styles.statsRows}>
    <div className={styles.statsRow}>
      <span className={styles.statsLabel}>Wins</span>
      <span className={`${styles.statsValue} ${styles.statsValueWin}`}>
        {totalWins.toLocaleString()}
      </span>
    </div>
    <div className={styles.statsRow}>
      <span className={styles.statsLabel}>Draws</span>
      <span className={styles.statsValue}>{totalDraws.toLocaleString()}</span>
    </div>
    <div className={styles.statsRow}>
      <span className={styles.statsLabel}>Losses</span>
      <span className={`${styles.statsValue} ${styles.statsValueLoss}`}>
        {totalLosses.toLocaleString()}
      </span>
    </div>
  </div>
</div>
```

In **both** column-header blocks (White and Black), rename the abbreviation:

```tsx
<span className={styles.colHeaderGp}>Games</span>
```

- [ ] **Step 4: Retint the values**

In `PersonalOpeningStats.module.css`, replace the two no-op label rules with
value tints:

```css
/* Wins sage, losses brick, draws neutral — the same encoding the perf bars
   use, so the card and the distributions below it agree. */
.statsValueWin {
  color: var(--color-perf-win-text);
}

.statsValueLoss {
  color: var(--color-perf-loss-text);
}
```

Delete `.statsLabelWin` and `.statsLabelLoss` (both were `--color-text-muted`,
i.e. identical to `.statsLabel`) and remove their now-dangling usages — Step 3
already dropped them from the markup.

Check `.colHeaderGp`'s `min-width` around line 1160; "Games" is wider than "GP".
Raise it to fit without wrapping (`min-width: var(--space-12)` or the nearest
token that works at 1360).

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm run test:frontend -- PersonalOpeningStats
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/components/personal
git commit -m "fix(analyse): the record card describes this run, not a career"
```

---

## Task 5: Committed sample fixtures and the script that rebuilds them

**Files:**

- Create: `tools/sample-reports/generate-sample-reports.js`
- Create: `tools/sample-reports/README.md`
- Create: `packages/web/src/data/sample-reports/magnus.json` (generated)
- Create: `packages/web/src/data/sample-reports/hikaru.json` (generated)
- Modify: `package.json`

**Interfaces:**

- Consumes: `analyseGames`, `buildOpeningsMap` from `packages/shared/dist`.
- Produces: fixture files shaped
  `{ id, label, platform, username, gamesRequested, generatedAt, dashboard }`,
  where `generatedAt` is `YYYY-MM-DD` and `dashboard` is a `DashboardData`.

- [ ] **Step 1: Write the generator**

Create `tools/sample-reports/generate-sample-reports.js`:

```js
#!/usr/bin/env node
/**
 * Regenerates the sample reports offered on the Analyse blank state.
 *
 * These are real public games, so they go stale: the page prints the
 * `generatedAt` date beside the report for exactly that reason. Re-run this
 * when the date starts to look embarrassing.
 *
 * Reads ECO data and the platform services directly — no dev server needed.
 * `packages/shared` must be built first (its `dist/` is not committed); the
 * npm script does that for you.
 *
 *   npm run sample:generate
 */
const fs = require('fs');
const path = require('path');

const ECOService = require('../../packages/api/src/services/eco-service');
const {
  getLichessGamesPgnRatedCached,
} = require('../../packages/api/src/services/personal-games-service');
const {
  getChessComGamesPgnCached,
} = require('../../packages/api/src/services/chesscom-games-service');

const SAMPLES = [
  {
    id: 'magnus',
    label: 'Magnus',
    platform: 'lichess',
    username: 'DrNykterstein',
    limit: 100,
  },
  {
    id: 'hikaru',
    label: 'Hikaru',
    platform: 'chess.com',
    username: 'Hikaru',
    limit: 100,
  },
];

const OUT_DIR = path.join(
  __dirname,
  '..',
  '..',
  'packages',
  'web',
  'src',
  'data',
  'sample-reports'
);

async function main() {
  const { buildOpeningsMap, analyseGames } =
    await import('../../packages/shared/dist/index.js');

  const openings = new ECOService().getAllOpenings().map((o) => ({
    fen: o.fen,
    name: o.name,
    eco: o.eco,
    moves: o.moves || '',
    family_id: o.family_id,
  }));
  const openingsMap = buildOpeningsMap(openings);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const generatedAt = new Date().toISOString().slice(0, 10);

  for (const sample of SAMPLES) {
    const fetchGames =
      sample.platform === 'lichess'
        ? getLichessGamesPgnRatedCached
        : getChessComGamesPgnCached;

    process.stdout.write(`Fetching ${sample.username} (${sample.platform})… `);
    const result = await fetchGames({
      username: sample.username,
      limit: sample.limit,
    });
    const gamesPgn = result.gamesPgn || [];
    process.stdout.write(`${gamesPgn.length} games\n`);

    if (gamesPgn.length === 0) {
      throw new Error(
        `No games returned for ${sample.username} — refusing to write an empty sample`
      );
    }

    const dashboard = await analyseGames(
      gamesPgn,
      sample.username,
      openingsMap,
      {
        yieldEvery: 0,
      }
    );

    const payload = {
      id: sample.id,
      label: sample.label,
      platform: sample.platform,
      username: sample.username,
      gamesRequested: sample.limit,
      generatedAt,
      dashboard,
    };

    const file = path.join(OUT_DIR, `${sample.id}.json`);
    fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`);
    process.stdout.write(
      `  wrote ${path.relative(process.cwd(), file)} — ${dashboard.classifiedGames} matched, ` +
        `${dashboard.unclassifiedGames} unrecognised\n`
    );
  }
}

main().catch((error) => {
  process.exitCode = 1;
  process.stderr.write(`${error.stack || error.message}\n`);
});
```

- [ ] **Step 2: Add the npm script**

In the root `package.json`, after `"course:rematch"`:

```json
    "sample:generate": "npm run build --workspace=packages/shared && node tools/sample-reports/generate-sample-reports.js",
```

- [ ] **Step 3: Run it**

```bash
npm run sample:generate
```

Expected: two lines of "wrote …", each reporting a non-zero matched count.

If Lichess returns too few non-bullet games for `DrNykterstein`, do **not**
lower the bar silently — switch that sample to a Lichess account that plays
rated rapid/blitz/classical, keep the label honest, and note the substitution in
`tools/sample-reports/README.md`.

- [ ] **Step 4: Check what landed**

```bash
node -e "const s=require('./packages/web/src/data/sample-reports/magnus.json'); console.log(s.generatedAt, s.dashboard.totalGames, s.dashboard.classifiedGames, s.dashboard.asWhite.length, s.dashboard.asBlack.length)"
```

Expected: a date, 100 (or fewer if the account has fewer eligible games), a
classified count close to it, and two non-empty opening lists.

```bash
ls -l packages/web/src/data/sample-reports/
```

Expected: both files well under 200 KB. If either is larger, drop `limit` to 50
and regenerate — a fixture too big to read in review is a fixture nobody checks.

- [ ] **Step 5: Write the README**

Create `tools/sample-reports/README.md`:

````markdown
# Sample reports

The Analyse blank state offers two pre-baked reports so a first-time visitor can
see the payoff before typing a username. They are committed fixtures, not a live
call — a third-party request on a landing screen means rate-limit exposure, a
slow first paint and a support burden.

## Regenerating

```bash
npm run sample:generate
```

Fetches each player's most recent rated rapid/blitz/classical games, classifies
them with the same `analyseGames` the page runs, and rewrites
`packages/web/src/data/sample-reports/*.json`.

Commit the regenerated fixtures. The page prints `generatedAt` beside the
report, so a stale fixture is visible rather than silent.

## Adding a player

Add an entry to `SAMPLES` in `generate-sample-reports.js`, then register it in
`packages/web/src/components/personal/sampleReports.ts` — the loader map is
explicit so the bundler can code-split each fixture.

## Why the fixtures are not tiny

They carry the full untruncated opening lists, because the family rollups on the
dashboard aggregate over every opening, not the top ten. Keep `limit` at 100
unless a file grows past a couple of hundred kilobytes.
````

- [ ] **Step 6: Commit**

```bash
git add tools/sample-reports packages/web/src/data/sample-reports package.json
git commit -m "feat(analyse): sample-report fixtures and the script that rebuilds them"
```

---

## Task 6: Loading a sample without pretending it is yours

**Files:**

- Create: `packages/web/src/components/personal/sampleReports.ts`
- Modify: `packages/web/src/components/personal/usePersonalGames.ts`
- Test: `packages/web/src/components/personal/__tests__/sampleReports.test.tsx`

**Interfaces:**

- Consumes: the fixture shape from Task 5.
- Produces:
  - `type SampleId = 'magnus' | 'hikaru'`
  - `SAMPLE_REPORTS: ReadonlyArray<{ id: SampleId; label: string }>`
  - `loadSampleReport(id: SampleId): Promise<SampleReport>`
  - `formatSampleDate(iso: string): string` → e.g. `28 July 2026`
  - `SampleReport = { id, label, platform: Platform, username: string, gamesRequested: number, generatedAt: string, dashboard: DashboardData }`
  - On the hook: `sample: SampleReport | null` and
    `loadSample(id: SampleId): Promise<void>`.

- [ ] **Step 1: Write the failing test**

Create `packages/web/src/components/personal/__tests__/sampleReports.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PersonalOpeningStats } from '../PersonalOpeningStats';
import {
  formatSampleDate,
  loadSampleReport,
  SAMPLE_REPORTS,
} from '../sampleReports';
import type { OpeningForLookup } from '../../../../../shared/src';

const getOpeningsData = async (): Promise<OpeningForLookup[]> => [];

const renderComponent = () =>
  render(
    <MemoryRouter>
      <PersonalOpeningStats getOpeningsData={getOpeningsData} />
    </MemoryRouter>
  );

describe('sample reports', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('offers every registered sample by name', () => {
    renderComponent();

    expect(screen.getByText(/See a sample report/)).toBeInTheDocument();
    for (const sample of SAMPLE_REPORTS) {
      expect(
        screen.getByRole('button', { name: sample.label })
      ).toBeInTheDocument();
    }
  });

  it('loads a real committed fixture, not a placeholder', async () => {
    const report = await loadSampleReport('magnus');

    expect(report.username).toBeTruthy();
    expect(report.dashboard.totalGames).toBeGreaterThan(0);
    expect(report.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('renders the dashboard and says whose games these are and when', async () => {
    const user = userEvent.setup();
    const report = await loadSampleReport('magnus');
    renderComponent();

    await user.click(screen.getByRole('button', { name: 'Magnus' }));

    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: report.username })
      ).toBeInTheDocument()
    );
    expect(
      screen.getByText(
        new RegExp(`Sample report.*${formatSampleDate(report.generatedAt)}`)
      )
    ).toBeInTheDocument();
  });

  it('never writes a sample into the session cache as if it were your analysis', async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByRole('button', { name: 'Magnus' }));
    await waitFor(() =>
      expect(screen.getByText(/Sample report/)).toBeInTheDocument()
    );

    const keys = Object.keys(sessionStorage);
    expect(
      keys.filter((k) => k.startsWith('personal-openings:v4:'))
    ).toHaveLength(0);
    expect(
      sessionStorage.getItem('personal-openings:last-analysis-snapshot')
    ).toBeNull();
  });

  it('formats the date for a reader, not a machine', () => {
    expect(formatSampleDate('2026-07-28')).toBe('28 July 2026');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:frontend -- sampleReports
```

Expected: FAIL — cannot resolve `../sampleReports`.

- [ ] **Step 3: Write the loader module**

Create `packages/web/src/components/personal/sampleReports.ts`:

```ts
import type { DashboardData, Platform } from './personalStatsLib';

export type SampleId = 'magnus' | 'hikaru';

export interface SampleReport {
  id: SampleId;
  label: string;
  platform: Platform;
  username: string;
  gamesRequested: number;
  /** ISO date (YYYY-MM-DD) the fixture was generated. */
  generatedAt: string;
  dashboard: DashboardData;
}

export const SAMPLE_REPORTS: ReadonlyArray<{ id: SampleId; label: string }> = [
  { id: 'magnus', label: 'Magnus' },
  { id: 'hikaru', label: 'Hikaru' },
];

// Explicit map, not a template literal — the bundler can only code-split an
// import it can see, and each fixture should be its own chunk that idle
// visitors never download.
const loaders: Record<SampleId, () => Promise<unknown>> = {
  magnus: () => import('../../data/sample-reports/magnus.json'),
  hikaru: () => import('../../data/sample-reports/hikaru.json'),
};

export async function loadSampleReport(id: SampleId): Promise<SampleReport> {
  const module = (await loaders[id]()) as { default: SampleReport };
  return module.default;
}

/** "2026-07-28" → "28 July 2026". Parsed as parts, not `new Date(iso)`, so the
    displayed day cannot shift by one in a negative-offset timezone. */
export function formatSampleDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return iso;
  const monthName = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString(
    'en-GB',
    {
      month: 'long',
      timeZone: 'UTC',
    }
  );
  return `${day} ${monthName} ${year}`;
}
```

- [ ] **Step 4: Add `loadSample` to the hook**

In `usePersonalGames.ts`, import the sample types and add state plus the loader.
It sets the dashboard directly and touches **neither** cache key.

```ts
import {
  loadSampleReport,
  type SampleId,
  type SampleReport,
} from './sampleReports';
```

```ts
const [sample, setSample] = useState<SampleReport | null>(null);
```

```ts
/** Loads a committed sample report. Deliberately does not call saveToCache:
      a sample must not come back on the next visit as "your" saved result. */
const loadSample = async (id: SampleId) => {
  abortRef.current?.abort();
  setError(null);
  setStep('fetching');
  setStepText('Loading the sample report...');
  setProgress(30);

  try {
    const report = await loadSampleReport(id);
    setSample(report);
    setDashboard(report.dashboard);
    setDisplayedUsername(report.username);
    setDisplayedPlatform(report.platform);
    setStep('done');
    setStepText('Sample report');
    setProgress(100);
    setProcessed(report.dashboard.totalGames);
    setTotal(report.dashboard.totalGames);
  } catch {
    setError("We couldn't load the sample report. Please try again.");
    setStep('error');
    setStepText('');
    setProgress(0);
  }
};
```

Clear `sample` whenever a real analysis starts or a cached one is restored — add
`setSample(null)` at the top of `handleAnalyse` (both the cache-hit branch and
the fetch branch) and in the mount-restore effect's `if (cached)` block.

Return `sample` and `loadSample` from the hook.

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm run test:frontend -- sampleReports
```

Expected: the two non-UI tests pass (`loadSampleReport`, `formatSampleDate`);
the three UI tests still fail — Task 7 renders the links and the banner.

- [ ] **Step 6: Commit**

```bash
git add packages/web/src/components/personal
git commit -m "feat(analyse): sample reports load without posing as your analysis"
```

---

## Task 7: The sample is offered, and labelled once open

**Files:**

- Modify: `packages/web/src/components/personal/PersonalOpeningStats.tsx`
- Modify: `packages/web/src/components/personal/PersonalOpeningStats.module.css`
- Test: `packages/web/src/components/personal/__tests__/sampleReports.test.tsx`
  (from Task 6)

**Interfaces:**

- Consumes: `SAMPLE_REPORTS`, `formatSampleDate` from `sampleReports.ts`;
  `sample`, `loadSample` from `usePersonalGames`.

- [ ] **Step 1: Confirm the three UI tests still fail**

```bash
npm run test:frontend -- sampleReports
```

Expected: FAIL — no button named "Magnus", no "Sample report" text.

- [ ] **Step 2: Offer the samples under the scope note**

In `PersonalOpeningStats.tsx`, destructure `sample` and `loadSample` from the
hook, import the registry, and render the offer inside the landing column after
the progress and error blocks:

```tsx
{
  showHero && (
    <p className={styles.sampleOffer}>
      See a sample report —{' '}
      {SAMPLE_REPORTS.map((entry, i) => (
        <React.Fragment key={entry.id}>
          {i > 0 && <span className={styles.sampleSep}> · </span>}
          <button
            type="button"
            className={styles.sampleLink}
            onClick={() => void loadSample(entry.id)}
            disabled={isBusy}
          >
            {entry.label}
          </button>
        </React.Fragment>
      ))}
    </p>
  );
}
```

- [ ] **Step 3: Label the sample once it is open**

Directly after the mobile hero's meta line and after the desktop
`dashboardHero`, render one shared banner. Place it once, immediately before the
`{/* ===== MOBILE DASHBOARD ===== */}` fragment's opening tag is not possible —
instead render it inside each dashboard, using the same helper:

```tsx
const sampleBanner = sample ? (
  <p className={styles.sampleBanner}>
    Sample report · {sample.username}&rsquo;s {sample.dashboard.totalGames} most
    recent rated games, as of {formatSampleDate(sample.generatedAt)}.
  </p>
) : null;
```

Render `{sampleBanner}` immediately after `</div>` closing `.mobileHero`, and
immediately after `</div>` closing `.dashboardHero`.

- [ ] **Step 4: Style the offer and the banner**

```css
/* Sample offer — quiet, below the scope note. Buttons, not links: they load
   data in place rather than navigating. */
.sampleOffer {
  font-size: var(--text-base);
  color: var(--color-text-muted);
  margin: var(--space-8) 0 0;
  text-align: center;
}

.sampleSep {
  color: var(--border-default);
}

.sampleLink {
  background: none;
  border: none;
  padding: var(--space-1);
  font-family: inherit;
  font-size: inherit;
  color: var(--color-text-secondary);
  text-decoration: underline;
  text-decoration-color: var(--border-hover, rgba(255, 255, 255, 0.18));
  text-underline-offset: 3px;
  cursor: pointer;
}

.sampleLink:hover:not(:disabled) {
  color: var(--color-brand-orange);
}

.sampleLink:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.sampleLink:focus-visible {
  outline: 2px solid var(--color-brand-orange);
  outline-offset: 2px;
}

/* Says whose games these are and how old they are — a snapshot of real games
   goes stale, so the date is part of the claim, not decoration. */
.sampleBanner {
  margin: var(--space-3) 0 0;
  padding: var(--space-2) var(--space-3);
  border-left: 3px solid var(--color-brand-orange);
  background: var(--accent-a12);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: 1.4;
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm run test:frontend -- sampleReports
npm run test:frontend
```

Expected: PASS, whole suite green.

- [ ] **Step 6: Verify live**

Start the preview, then at 1360 and 390:

- blank state shows one header, the scope note, the sample offer, and **no**
  gear and **no** second prompt;
- clicking "Magnus" renders the dashboard with the banner naming the player, the
  game count and the date;
- "Analyse another player" opens the overlay, and the gear is in it;
- the platform pills are reachable and togglable with the keyboard alone.

- [ ] **Step 7: Commit**

```bash
git add packages/web/src/components/personal
git commit -m "feat(analyse): a sample report you can open, dated so it can't lie"
```

---

## Task 8: The bundle and the docs move with the code

**Files:**

- Create: `design-system/project/preview/components-analyse.html`
- Modify: `CLAUDE.md`

**Interfaces:** none — documentation only.

- [ ] **Step 1: Write the preview card**

Create `design-system/project/preview/components-analyse.html`, following the
structure of `components-explorer-card.html`: link `../colors_and_type.css`, use
only `var(--…)` colours, and render four specimens — blank state (header +
form + scope note + sample offer), analysing (dimmed fields + Cancel +
progress), error (quiet inline message), and the record card ("This analysis /
Your record" with sage and brick values).

Open the file with an HTML comment recording what changed and why, plus the one
deviation:

```html
<!-- Analyse (UX review phase 5). One header instead of two; the record card
     scoped to this run; a sample report so the payoff is visible before you
     type a username.

     Deviation from the 2026-07-27 mock: the games-count gear moves to the
     search overlay rather than the dashboard header. The header's only control
     opens that overlay, so a gear beside it would set a value consumed two
     clicks away; in the overlay it sits next to the Analyse button that reads
     it. Either way it leaves the blank state, which is the point of the change.

     Colours are the existing --color-perf-* family: the mock's "sage" #9dbd7c
     and "brick" #c98579 are exactly --color-perf-win-text and
     --color-perf-loss-text. No new tokens were needed. -->
```

- [ ] **Step 2: Document the command**

In `CLAUDE.md`, add to the Data Pipeline Workflows section:

````markdown
**Sample reports (Analyse blank state):**

```bash
npm run sample:generate      # Rebuild the committed sample-report fixtures
```
````

and add a Gotchas entry:

```markdown
- **Sample reports are committed fixtures of real public games**: they go stale.
  `packages/web/src/data/sample-reports/*.json` are regenerated with
  `npm run sample:generate` (which builds `packages/shared` first — its `dist/`
  is not committed). The Analyse page prints each fixture's `generatedAt` date
  beside the report so staleness is visible rather than silent. The generator
  and the page share one `analyseGames` in
  `packages/shared/src/utils/personal-analysis.ts` — never reimplement the
  reduction in the script, or the fixtures will drift from what the page shows.
  Note that `packages/shared/tests/` is run by **neither** Jest nor Vitest, so
  tests for shared modules belong in the web Vitest suite.
```

- [ ] **Step 3: Verify the preview renders**

Open `design-system/project/preview/components-analyse.html` in the browser pane
and confirm all four specimens render with no missing-variable fallbacks (no
black-on-black text).

- [ ] **Step 4: Commit**

```bash
git add design-system/project/preview/components-analyse.html CLAUDE.md
git commit -m "docs(analyse): preview card and the sample-report command"
```

---

## Task 9: Full verification and the memory bank

**Files:**

- Modify: `.github/memory-bank/activeContext.md`
- Modify: `.github/memory-bank/progress.md`

- [ ] **Step 1: Run everything**

```bash
npm run test:frontend
```

Expected: PASS. Record the suite and test counts.

```bash
npm test -- --testPathIgnorePatterns='\.worktrees'
```

Expected: PASS, 833 tests across 63 suites (this phase touches no backend code).

```bash
npm run build
```

Expected: clean.

- [ ] **Step 2: Format only what this phase touched**

```bash
npx prettier --write packages/web/src/components/personal packages/shared/src/utils/personal-analysis.ts tools/sample-reports docs/superpowers/plans/2026-07-28-ux-phase-5-analyse.md
```

Then confirm nothing unrelated moved:

```bash
git diff --ignore-cr-at-eol --stat
```

Any file listed that this phase did not touch is CRLF noise — restore it with
`git checkout --`.

- [ ] **Step 3: Update the memory bank**

Replace the "Current Task" section of `activeContext.md` with a phase 5 entry
and demote phase 4 to "Previous Task" (one paragraph, pointing at `archive.md`).
Keep the file **under 50 lines**.

Add one entry at the top of `progress.md`'s "What's Done", and remove the "UX
review phase 5" line from "What's Left". Keep the file **under 100 lines** —
fold older entries into the existing rollup bullet if it runs over.

```bash
wc -l .github/memory-bank/activeContext.md .github/memory-bank/progress.md
```

Expected: ≤ 50 and ≤ 100.

- [ ] **Step 4: Commit and push**

```bash
git add .github/memory-bank
git commit -m "chore(analyse): memory bank for UX phase 5"
```

```bash
git push -u origin ux/phase-5-analyse
```

- [ ] **Step 5: Open the PR**

```bash
gh pr create --base ux/phase-4-detail-desktop --title "UX phase 5 — Analyse says what it does" --body-file -
```

The body must state: what changed, the gear deviation and its reason, the
sample-report staleness contract, and the verification numbers actually observed
— not the numbers this plan predicts.

---

## Manual verification

At 1360 and at 390, on the preview:

1. **Blank state.** One `h1`, one subtitle, no second prompt. Scope note reads
   "Reads your public rated games — rapid, blitz & classical. Bullet excluded.
   Nothing is stored." Sample offer beneath it. No gear.
2. **Keyboard.** Tab reaches the platform radios; arrow keys move between them;
   the focus ring lands on the visible pill. Tab reaches the username field,
   which announces "Username".
3. **Analysing.** Fields dim, the button reads Cancel with a spinner, the
   progress bar and its "step / n of m" line sit directly under the input bar —
   not a third of a viewport below it.
4. **Error.** Enter a username that does not exist. The message is a quiet
   inline block under the input, the typed username survives, the button reads
   Analyse again.
5. **Sample.** Click Magnus. The dashboard renders with the banner naming the
   player, game count and date. Reload the page: the sample is **gone** — it was
   never cached as your analysis.
6. **Record card.** Reads "This analysis / Your record" with Wins sage, Draws
   neutral, Losses brick. No "Career totals", no "Total wins".
7. **Column header.** Reads "Games", not "GP", on both sides, without wrapping.

---

## Self-review

Run against the spec's Phase 5 section after the plan was drafted.

**Spec coverage.** All eight bullets map to a task: one header → Task 2; scope
and privacy line → Task 2; gear relocated → Task 2 (deviating, recorded); sample
report + regeneration script + "as of" line → Tasks 5–7; accessibility (radio
group, real label) → Task 2; dashboard honesty ("Your record", sage / neutral /
brick) → Task 4; "GP" → "Games" → Task 4; transient states → Task 3.
Verification and lockstep requirements from §6 → Tasks 8–9.

**Five defects found and fixed inline while reviewing:**

1. **The sample fixtures had no honest way to be built.** The first draft had
   the generator reimplement the reduction in plain JS. That is precisely the
   drift the "as of" line is meant to expose, and it would have been invisible.
   Fixed by extracting `analyseGames` into `packages/shared` (Task 1) — which is
   now the first task, because Tasks 5–7 depend on it.
2. **Tests for the shared module would never have run.** The obvious home,
   `packages/shared/tests/`, is excluded by root Jest's `testPathIgnorePatterns`
   and is outside the web Vitest project. Measured, not assumed. Task 1 puts
   them in the web suite and the code comment says why.
3. **"Sage" and "brick" were treated as new tokens.** They already exist as
   `--color-perf-win-text` / `--color-perf-loss-text`, and the mock's hexes
   match them exactly. The plan no longer adds tokens or touches
   `colors_and_type.css`; Task 4 only applies them.
4. **`formatSampleDate` would have shifted the date by a day.**
   `new Date('2026-07-28')` parses as UTC midnight and renders as the 27th
   anywhere west of Greenwich. Fixed to parse the parts and format in UTC.
5. **A sample would have leaked into the session cache.** The first draft routed
   `loadSample` through the same state setters as a real analysis, including
   `saveToCache`. On the next visit the mount-restore effect would have
   presented Magnus's games as the visitor's own. Task 6 excludes both cache
   keys and Task 6's test asserts it.

**Placeholder scan.** No "TBD", no "handle errors appropriately", no "similar to
Task N". Every code step carries the code. The one genuinely open value — how
many rated non-bullet games `DrNykterstein` has — is handled with an explicit
branch in Task 5, Step 3 rather than left to judgement.

**Type consistency.** `DashboardData`, `OpeningAgg`, `Platform` and `SampleId`
are used with the same names in Tasks 1, 5, 6 and 7. `analyseGames`'s signature
in Task 1's Interfaces block matches its call sites in Task 1 Step 6 and Task 5.
`renderSearchForm` changes from zero-arg to `{ showGear }` in Task 2 and both
call sites are named there; Task 3 uses the new form.

**Known gap, deliberately not closed.** `packages/shared`'s own `tests/`
directory remains dead — wiring it into CI is out of scope for a UX phase and
would change the test topology mid-programme. Logged as a follow-up in
`progress.md` at Task 9.
