# Popular at your level: implementation plan (#204 + #205)

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Spec:** issues #204 and #205, plus the #205 design handoff, copied to
`docs/superpowers/specs/2026-10-29-level-ranking-handoff.md`. Where the handoff
and this plan differ (search index `?band=` instead of per-row arrays; Masters
not offered on Discover or search), this plan wins, for the reasons under
Decisions.

## What users get

A player sets their rating band once and the whole site answers "what do players
like me actually play?", instead of "what does everyone play?".

1. **Pick your level anywhere.** A "Your level" control on Discover (filter row
   and mobile filter sheet) and in every search dropdown ("Ranked for 1400–1800
   · Change"). It is the same `openingbook:my-level` preference the detail
   page's Level Lens already sets, so all surfaces agree and the last change on
   any page wins, live, across tabs.
2. **Discover ranks by your band.** "Most played" orders by games at that band.
   The heading becomes "Popular at 1400–1800" and cards read "212k games at
   1400–1800" with that band's win/draw/loss bars.
3. **Search ranks by your band.** Relevance stays dominant; band popularity
   replaces all-ratings popularity as the tiebreak within a relevance band.
4. **Recent, dated, consistent numbers.** Counts cover a recent window of
   Lichess blitz, rapid and classical games (e.g. "Lichess games, Apr–Sep
   2026"), shown with that date. Discover, search and the detail page read the
   same window, so 1.e4 c5 no longer shows 693M in one place and 542M in
   another.
5. **No level set → nothing changes**, except the numbers are newer and dated.

Out of scope here, follow-up issues: setting the level from Analyse (#205 step
2), the optional rating input, and serving the detail page's move stats from our
own data instead of the explorer (Phase 4 below, optional).

## What it means for the stack

| Layer                             | Today                                                                                                                                                 | After                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Data pipeline (`tools/analysis/`) | Last real run was a deleted API script (2025-07-15). `GameProcessor` matches full FENs including move counters, ignores time control, keeps no bands. | Streams one Lichess monthly file at a time, buckets games by band and speed, writes a small **monthly summary**. A combiner sums a window of months into the served files. Raw games are never kept.                                                                                                                                                          |
| Stored data                       | `api/data/popularity_stats.json`, 4.9 MB, one all-time figure per position.                                                                           | `api/data/popularity_stats.json` keeps its shape (all-band figures, so existing readers work) plus metadata `window: {since, until}`. New `api/data/popularity-bands.json`: per position, per band `{g, w, d, b}` or `null`. Monthly summaries in `tools/analysis/data/monthly/`, committed (small; lets any machine rebuild a window without redownloading). |
| API                               | Browse and search rank by all-ratings `games_analyzed`. Explorer proxy asks Lichess for all history.                                                  | `/browse?band=` and `/search-index?band=` and `/semantic-search?band=` rank and report by that band. `/page/:fen` returns `stats.window`. The explorer proxy adds `since`/`until` from the snapshot metadata, so live detail-page numbers cover the same months.                                                                                              |
| Web                               | `myLevel` read once on the detail page; Discover and search ignore it.                                                                                | `useMyLevel()` hook shared by LevelLens, FilterBar, FilterSheet and SearchBar. `useBrowse` and `useOpeningSearch` pass `band`.                                                                                                                                                                                                                                |
| Lichess token                     | Detail page only.                                                                                                                                     | Unchanged; the pipeline never uses it. Validation in Phase 0 uses ~80 calls with the owner's personal token.                                                                                                                                                                                                                                                  |
| Masters                           | Detail page via explorer, all years.                                                                                                                  | Unchanged. Not offered on Discover or search (no batch data).                                                                                                                                                                                                                                                                                                 |
| SEO                               | Crawlers see all-ratings snapshot stats.                                                                                                              | Unchanged. The band lives in localStorage, never the URL (`?level=` is Difficulty).                                                                                                                                                                                                                                                                           |

## Decisions (made, flag if you disagree)

- **Window size comes from Phase 0's measurements**, not upfront. Expect 3–12
  months. One file in, one summary out; adding a month never redownloads old
  ones.
- **Speeds `blitz,rapid,classical`** everywhere, matching the explorer proxy's
  `SPEEDS`.
- **Bands bucket by the average of the two players' ratings**, the same bucket
  edges as `BAND_RATINGS` in `explorer.routes.js`. Phase 0 confirms this matches
  the explorer before anything else is built on it.
- **Positions match on the first four FEN fields** (board, side, castling, en
  passant), so transpositions count as the explorer counts them.
- **Search index takes `?band=`** and returns that band's count as
  `games_analyzed`, rather than a per-band array per row. Five cached variants;
  the first-keystroke payload stays the size it is today.
- **Masters saved on the detail page:** Discover and search rank as All and the
  trigger reads "All levels"; the saved preference is not overwritten.

## Decisions needed before Phase 3

- **Chess.com line** (#205's open question). Recommended option (a): menu footer
  reads "Lichess ratings. On chess.com? Your Lichess rating is usually higher.
  Saved on this device. Opening pages use it too."

## Global constraints

- Missing data is `null`, never `0`; guard with `!= null` (AGENTS.md).
- Copy says "Lichess games" / "rated Lichess players", never "masters", for band
  data.
- British English, sentence case, en dash in ranges: `Under 1400`, `1400–1800`,
  `1800–2200`, `2200+`.
- Never call Lichess from the client; never use the production token for the
  pipeline.
- Read `search-ranking` before Task 9, `seo-crawl-graph` before touching
  anything a crawler sees.
- Run `test:all`, `build`, `build:vercel` through the `verifier` agent.
  `pipeline-reviewer` before every pipeline run.

## Review focus

1. **A band with too few games** (2200+ on a deep line): renders "no stats",
   never `0%` bars. Test in Task 5 and Task 8.
2. **A game that transposes into a book position:** counted. Test in Task 1.
3. **Bullet or correspondence games:** not counted. Test in Task 1.
4. **Level changed in another tab while Discover is open:** grid refetches. Test
   in Task 6.
5. **Clear filters with a level set:** level survives. Test in Task 7.

---

## Phase 0: test run (no production code; gates the rest)

### Task 0: One-month spike and explorer cross-check

**Files:** scratch only. Outcome recorded in `tools/analysis/README.md` in
Task 3.

- [ ] Write the Task 1–2 processor first (it is the spike), then run it on the
      latest complete month, streaming from
      `https://database.lichess.org/standard/lichess_db_standard_rated_YYYY-MM.pgn.zst`.
- [ ] Record: wall-clock time, games processed per second, and per band the
      number of the 12,377 positions with ≥ 20 games and ≥ 100 games.
- [ ] Cross-check 20 positions × 4 bands against
      `explorer.lichess.org/lichess?since=M&until=M&speeds=blitz,rapid,classical&ratings=…`
      with the owner's personal token. Expected: within 2% per cell. A larger
      gap means the bucket or speed rule is wrong; stop and fix before Phase 1
      continues.
- [ ] Pick the window: the smallest number of months where 2200+ has ≥ 20 games
      for 80% of positions. Bring the numbers to the owner.

## Phase 1: pipeline (#204, data half). One PR.

### Task 1: Band-aware game processing

**Files:**

- Modify: `tools/analysis/lib/game_processor.py:141-196`
- Test: `tools/analysis/tests/test_game_processor.py` (new; add `pytest` to
  `requirements.txt`)

**Interfaces:**

- Produces: `position_key(fen: str) -> str` (first four FEN fields);
  `band_of(avg_rating: float) -> str | None` returning
  `'u1400' | '1400' | '1800' | '2200'`; `speed_of(headers) -> str | None` from
  the `Event` header (`Rated Blitz game` → `'blitz'`); callback
  `stats_update_callback(key: str, band: str, result: str, next_san: str | None)`.

- [ ] Write failing tests: `test_transposition_counts` (two move orders reaching
      the same position both call back with the same key),
      `test_bullet_skipped`, `test_correspondence_skipped`, `test_band_edges`
      (1399.5 → `u1400`, 1400 → `1400`, 2200 → `2200`),
      `test_next_move_recorded` (callback carries the SAN played from the
      matched position; `None` when the game ends there),
      `test_final_position_checked` (a target reached on the last ply still
      counts).
- [ ] Run `python -I -m pytest tools/analysis/tests -v`. Expected: FAIL.
- [ ] Implement in `game_processor.py`. Keep `target_fens` but convert it to
      keys once in `__init__`.
- [ ] Run the tests. Expected: PASS. Commit
      `feat(analysis): bucket games by band and speed, match positions by key`.

### Task 2: Monthly summary writer

**Files:**

- Create: `tools/analysis/lib/monthly_summary.py`
- Modify: `tools/analysis/run_pipeline.py` (new `--month YYYY-MM` mode that
  streams, summarises, deletes)
- Test: `tools/analysis/tests/test_monthly_summary.py`

**Interfaces:**

- Produces: `tools/analysis/data/monthly/YYYY-MM.json` shaped
  `{"month": "YYYY-MM", "speeds": [...], "positions": {key: {band: {"g": int, "w": int, "d": int, "b": int, "moves": {san: {"g","w","d","b"}}}}}}`.
  Moves trimmed to the top 12 by games, matching the proxy's `MAX_MOVES`. Bands
  with zero games are omitted.
- `MonthlySummary.add(key, band, result, next_san)`,
  `MonthlySummary.write(path)`.

- [ ] Failing tests: `test_results_tallied` (`1-0`/`½`/`0-1` land in w/d/b),
      `test_moves_trimmed_to_12`, `test_empty_band_omitted`.
- [ ] Implement, then run. Expected: PASS.
- [ ] Commit `feat(analysis): write per-month band summaries`.

### Task 3: Window combiner and served files

**Files:**

- Create: `tools/analysis/combine_window.py`
- Modify: `tools/analysis/README.md` (new runbook; replace "The shipped data did
  not come from this pipeline"; record Phase 0 numbers)
- Test: `tools/analysis/tests/test_combine_window.py`

**Interfaces:**

- CLI:
  `python -I tools/analysis/combine_window.py --since YYYY-MM --until YYYY-MM`.
- Writes `api/data/popularity_stats.json` (existing per-position fields,
  computed from the summed `all` band; `metadata.window = {"since","until"}`,
  `metadata.analysis_method = "game files"`, `metadata.speeds`) and
  `api/data/popularity-bands.json`:
  `{"window": {...}, "positions": {fen: {"u1400": {"g","w","d","b"} | null, "1400": ..., "1800": ..., "2200": ...}}}`,
  keyed by the dataset's full FENs.
- A band under `MIN_MOVE_SAMPLE` (20) games is `null`. Win rates are fractions,
  matching today's fields.

- [ ] Failing tests: `test_sums_months`, `test_missing_month_fails` (a gap in
      the window aborts, never silently shrinks it), `test_thin_band_is_null`,
      `test_all_band_is_sum_of_bands`, `test_keys_map_back_to_dataset_fens`.
- [ ] Implement, run tests. Expected: PASS.
- [ ] `pipeline-reviewer` agent on the branch.
- [ ] Run the real window (Phase 0's choice). Check `popularity-bands.json`
      size; if over 5 MB, shorten keys before going further.
- [ ] Commit the code, the monthly summaries and both data files separately:
      `feat(analysis): combine monthly summaries into a dated window`, then
      `chore(data): refresh popularity stats to <since>–<until>`.

## Phase 2: serve and date it (#204, site half). One PR.

### Task 4: Explorer proxy uses the same window

**Files:**

- Modify: `packages/api/src/routes/explorer.routes.js:53-63`
- Test: `tests/unit/explorer-proxy.test.js` (existing; add cases)

**Interfaces:** Consumes `metadata.window` from Task 3 via
`popularity-stats-service.js`'s loader. Produces upstream URLs with
`&since=<since>&until=<until>` for Lichess bands; masters URLs unchanged.

- [ ] Failing tests: `adds since and until for lichess bands`,
      `masters url has no window`, `no window in metadata → no since/until` (old
      snapshot keeps working).
- [ ] Implement, run the single test file, commit
      `feat(api): pin explorer requests to the snapshot window`.

### Task 5: Band stats in browse and the page endpoint

**Files:**

- Create: `packages/api/src/services/band-stats-service.js` (loads
  `popularity-bands.json` once)
- Modify: `packages/api/src/services/browse-service.js:82-125,225-270`,
  `packages/api/src/routes/openings.routes.js:169-235,276-336`
- Test: `tests/unit/band-stats-service.test.js` (new),
  `tests/unit/browse-service.test.js`, `tests/unit/browse-endpoint.test.js`,
  `tests/unit/openings-page-endpoint.test.js`

**Interfaces:**

- `bandStats.forFen(fen: string, band: string) -> {g,w,d,b} | null`;
  `bandStats.window() -> {since, until} | null`.
- `GET /api/openings/browse?band=<u1400|1400|1800|2200>`: `sort=popular` orders
  by that band's `g`; each item's `games_analyzed`/win rates are that band's, or
  `null` when the band is `null`. Unknown or absent `band` → today's behaviour.
  `applied.band` echoes it.
- `GET /api/openings/page/:fen` adds `data.stats.window`.

- [ ] Failing tests: `band reorders popular sort`,
      `null band item has null rates and sorts last`, `unknown band is ignored`,
      `name sort ignores band but reports band counts`, `page includes window`.
- [ ] Implement; the browse index stores the four bands per entry so `browse()`
      never reloads. Run the files, commit
      `feat(api): rank and report browse by band`.

### Task 6: Snapshot date on screen

**Files:**

- Modify: `packages/web/src/components/detail/WinRatePanel.tsx`,
  `packages/web/src/components/detail/mobile/MobileDataSurface.tsx`,
  `packages/web/src/components/landing/PopularOpeningsGrid.tsx`
- Create: `packages/web/src/lib/statsWindow.ts` exporting
  `formatWindow(w: {since: string; until: string}): string` → `"Apr–Sep 2026"`
  (`"Nov 2025–Apr 2026"` across years)
- Test: `packages/web/src/lib/__tests__/statsWindow.test.ts`, the three
  components' existing tests

- [ ] Failing tests: `formatWindow` same-year and cross-year; each surface
      renders `Lichess games, <window>` when a window exists and nothing extra
      when it doesn't.
- [ ] Implement. Browse responses carry `window` (add to the Task 5 payload) so
      Discover needs no extra request.
- [ ] `verifier`: `test:all`, `build`, `build:vercel`. Commit
      `feat(web): date popularity stats on detail and Discover`. Open the Phase
      1+2 PR, closes #204.

## Phase 3: Your level (#205). One PR, after #204 merges.

### Task 7: `useMyLevel` and Level Lens

**Files:**

- Create: `packages/web/src/hooks/useMyLevel.ts`
- Modify: `packages/web/src/lib/myLevel.ts` (dispatch `my-level-change` on
  set/clear), `packages/web/src/lib/lichessExplorer.ts` (add
  `rangeLabel(id: BandId): string` → `All levels`, `Under 1400`, `1400–1800`,
  `1800–2200`, `2200+`, `Masters`; add `RANKABLE_BANDS` = all but masters),
  `packages/web/src/components/detail/LevelLens.tsx`,
  `packages/web/src/pages/OpeningDetailPage.tsx:141`
- Test: `packages/web/src/hooks/__tests__/useMyLevel.test.ts`,
  `LevelLens.test.tsx`

**Interfaces:**
`useMyLevel(): [BandId | null, (band: BandId, surface: 'landing' | 'search' | 'detail') => void]`.
The setter writes, broadcasts and calls
`trackEvent('band_select', { band, surface })`. LevelLens stops calling
`setMyLevel`/`trackEvent` itself.

- [ ] Failing tests: `updates on my-level-change`,
      `updates on storage event from another tab`,
      `setter tracks band and surface`, LevelLens test now expects
      `{ band: '1400', surface: 'detail' }`.
- [ ] Implement, run the files, commit
      `feat(web): share my level across components`.

### Task 8: Level control on Discover

**Files:**

- Modify: `packages/web/src/components/filters/FilterBar.tsx`,
  `FilterSheet.tsx`, `FilterBar.module.css`,
  `packages/web/src/components/landing/PopularOpeningsGrid.tsx`,
  `packages/web/src/hooks/useBrowse.ts:87-148`,
  `packages/web/src/components/shared/OpeningCard.tsx` (games label)
- Test: the same files' `__tests__`

**Spec:** `docs/superpowers/specs/2026-10-29-level-ranking-handoff.md` (design
2a) for layout, tokens and copy. Menu rows are `RANKABLE_BANDS`; the trigger
shows `rangeLabel`.

- [ ] Failing tests: `level is first in the bar with a divider`,
      `selecting a band refetches with band and keeps other facets and sort`,
      `clear filters keeps level`, `activeCount excludes level`,
      `heading reads Popular at 1400–1800`,
      `card label reads 212k games at 1400–1800`,
      `saved masters shows All levels and fetches without band`,
      `null band stats render no-stats state`.
- [ ] Implement. `useBrowse` reads `useMyLevel` and adds `band` to params and
      `fetchPage` deps; it never writes `band` to the URL.
- [ ] `npm run test:e2e` (page markup changed). Commit
      `feat(web): rank Discover by your level`.

### Task 9: Search ranked by your level

**Read `search-ranking` first.** Both halves change together and its parity test
must keep passing.

**Files:**

- Modify: `packages/api/src/routes/openings.routes.js:338-410` (`?band=` swaps
  `games_analyzed` for the band's `g`; cache per band), the semantic-search
  route and `search/NameIndex.js` (popularity term reads the band's count),
  `packages/web/src/hooks/useOpeningSearch.ts`,
  `packages/web/src/components/shared/SearchBar.tsx`, the mobile search overlay
  and TopBar search
- Test: `packages/web/src/lib/__tests__/local-server-parity.test.ts`,
  `packages/web/src/components/shared/__tests__/search-surface-parity.test.tsx`,
  `useOpeningSearch` and `SearchBar` tests

- [ ] Failing tests: `band changes the order inside a relevance band only`
      (server and client), `parity holds with a band`,
      `scope line reads Ranked for 1400–1800 / Ranked for all players`,
      `Change opens the band menu without closing the dropdown`.
- [ ] Implement. The held index slice is refetched when the band changes.
- [ ] `verifier` full suite plus `build:vercel`. Commit
      `feat(search): rank by your level`. Open the PR, closes #205 steps 1
      and 3.

## Phase 4 (optional, separate issue): detail page off the explorer

The monthly summaries already hold the top 12 next moves per band (Task 2), so
the Opening book's live stats and off-book rows can be served from our data for
the four Lichess bands. Masters stays on the explorer. Needs per-FEN shards for
the move lists (tens of MB in total), served through `/api/openings/page/:fen`.
Decide after Phase 3 ships.
