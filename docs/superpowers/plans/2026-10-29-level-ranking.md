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

6. **A faster detail page.** Its win rates, average rating and Opening book move
   rows (off-book rows included) arrive in the page response itself, for all
   four bands at once, instead of a second request to Lichess after the page
   paints. Switching level is instant. Masters still comes from the explorer.

Out of scope here, follow-up issues: setting the level from Analyse (#205
step 2) and the optional rating input.

**PR order:** Phases 1+2 (data and Discover dating), then Phase 4 (detail page;
closes #204, since #204 needs both surfaces on the same numbers), then Phase 3
(#205).

## What it means for the stack

| Layer                             | Today                                                                                                                                                 | After                                                                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Data pipeline (`tools/analysis/`) | Last real run was a deleted API script (2025-07-15). `GameProcessor` matches full FENs including move counters, ignores time control, keeps no bands. | Streams one Lichess monthly file at a time, buckets games by band and speed, writes a small **monthly summary**. A combiner sums a window of months into the served files. Raw games are never kept.                                                                                                                                                                                                                    |
| Stored data                       | `api/data/popularity_stats.json`, 4.9 MB, one all-time figure per position.                                                                           | `api/data/popularity_stats.json` keeps its shape (all-band figures, so existing readers work) plus metadata `window: {since, until}`. New `api/data/popularity-bands.json`: per position, per band `{g, w, d, b}` or `null`, no moves (browse and search). New `api/data/position-stats/NN.json`, 256 shards with moves (detail page only). Monthly summaries in `tools/analysis/data/monthly/`, gzipped and committed. |
| API                               | Browse and search rank by all-ratings `games_analyzed`. The detail page's live stats are a second client request through the explorer proxy.          | `/browse?band=` and `/search-index?band=` and `/semantic-search?band=` rank and report by that band. `/page/:fen` returns `stats.window` and `stats.bands` (four bands with moves) from one shard. The explorer proxy serves Masters only.                                                                                                                                                                              |
| Web                               | `myLevel` read once on the detail page; Discover and search ignore it. Book rows fill in after an explorer fetch per band.                            | `useMyLevel()` hook shared by LevelLens, FilterBar, FilterSheet and SearchBar. `useBrowse` and `useOpeningSearch` pass `band`. The detail page reads band stats from the page response; only Masters fetches.                                                                                                                                                                                                           |
| Lichess token                     | Every detail-page view on a cache miss, any band.                                                                                                     | Masters only. The pipeline never uses it.                                                                                                                                                                                                                                                                                                                                                                               |
| Masters                           | Detail page via explorer, all years.                                                                                                                  | Unchanged. Not offered on Discover or search (no batch data).                                                                                                                                                                                                                                                                                                                                                           |
| SEO                               | Crawlers see all-ratings snapshot stats.                                                                                                              | Unchanged. The band lives in localStorage, never the URL (`?level=` is Difficulty).                                                                                                                                                                                                                                                                                                                                     |

## Decisions (made, flag if you disagree)

- **Window: the 3 most recent published months** (owner confirmed 2026-10-30),
  from Phase 0's coverage numbers below; each new month drops the oldest. One
  file in, one summary out; adding a month never redownloads old ones.
- **The detail page moves off the explorer for Lichess bands.** Phase 0 found
  the explorer has no monthly data after spring 2026 (1.e4 reads 0 from 2026-06;
  2026-03 has 34.9M), so pinning it to our window would blank the detail page.
  Serving our own data is the only way all three surfaces show the same numbers.
- **Performance budget for the detail page:** `/page/:fen` no slower than today
  (measured before and after in Task 10), one shard of at most ~250 KB read per
  request and cached per warm instance, no full-dataset load on cold start, no
  extra client request for Lichess bands.
- **Speeds `blitz,rapid,classical`** everywhere, matching the explorer proxy's
  `SPEEDS`. Confirmed relevant: all-time 1.e4 at these speeds is 3.09B, while
  the old snapshot says 3.78B, so it included bullet. That is the 693M vs 542M
  mismatch.
- **Bands bucket by the average of the two players' ratings**, the same bucket
  edges as `BAND_RATINGS` in `explorer.routes.js`. Phase 0's cross-check against
  2026-03 confirms it, once bot and abandoned games are left out as the explorer
  does.
- **Positions match on the first four FEN fields** (board, side, castling, en
  passant), so transpositions count as the explorer counts them. 12,377 book
  FENs are 12,106 positions.
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

**Files:** `tools/analysis/crosscheck_explorer.py` (kept: every refresh should
be cross-checked). Outcome recorded in `tools/analysis/README.md` in Task 3.

- [x] Write the Task 1–2 processor first (it is the spike) and run it on
      2026-09: 89,616,462 games (matches Lichess's `counts.txt`) in 2 h 28 m at
      ~10,000 games/s on 11 workers, from a downloaded file (streaming over HTTP
      dropped after 83 MB). 14 MB summary.
- [x] Coverage, positions (of 12,106) with ≥ 20 games, one month measured and
      longer windows projected:

      | Window | Under 1400 | 1400–1800 | 1800–2200 | 2200+ |
      | ------ | ---------- | --------- | --------- | ----- |
      | 1      | 50%        | 67%       | 82%       | 80%   |
      | 3      | 60%        | 76%       | 90%       | 89%   |
      | 6      | 64%        | 81%       | 93%       | 92%   |
      | 12     | 71%        | 86%       | 95%       | 94%   |

      Under 1400 is low because beginners leave theory early, not for lack of
      games; more months barely move it. Choose the window on diminishing
      returns: 3 months.

- [x] `--probe`: the explorer has no monthly data after spring 2026, so the
      cross-check runs against 2026-03.
- [x] Summarise 2026-03 and run the cross-check (owner, personal token). First
      run: under 2200 within 0.5%, but 2200+ 4% over at 1.e4 and 82% over on a
      Marshall position. Cause: bot games (3% of 2200+ at 1.e4, replaying book
      lines) and abandoned games, which the explorer leaves out. With both
      excluded (`0bb3741f2`): every cell where the explorer has 1,000+ games is
      within 0.63%, most exact. Band edges and speed rule confirmed.
- [x] Reprocess 2026-09 with the fix (the earlier summary counts bots).

## Phase 1: pipeline (#204, data half). One PR.

### Task 1: Band-aware game processing

**Files:**

Done (`0b7d741ea`, `7dc39811e`).

- `BandGameProcessor(GameProcessor)` in `tools/analysis/lib/game_processor.py`,
  a subclass so `run_pipeline.py` is unchanged. `position_key`, `band_of`,
  `speed_of(time_control)` (Lichess's base + 40 × increment rule, from the
  `TimeControl` header), callback `(key, band, result, next_san, avg_rating)`.
  Matches on python-chess's transposition key; building an EPD per ply was 75%
  of the run time.
- Tests: `tools/analysis/tests/test_game_processor.py`. Add `pytest` to
  `requirements.txt` in Task 3.

### Task 2: Monthly summary writer

Done (`0b7d741ea`, `7dc39811e`).

- `tools/analysis/lib/monthly_summary.py` and
  `tools/analysis/summarise_month.py`
  (`--month YYYY-MM --file path.pgn.zst [--limit N]`), not a `run_pipeline.py`
  mode. Writes `tools/analysis/data/monthly/YYYY-MM.json`:
  `{"month", "speeds", "games_read", "positions": {key: {band: {"g","w","d","b","r","moves": {san: {"g","w","d","b"}}}}}}`.
  `r` is the total of each game's average rating (band average = `r / g`). Moves
  trimmed to the top 12. Bands with no games omitted.
- Remaining for Task 3: write summaries gzipped (`.json.gz`, ~3 MB instead of 14
  MB), since they are committed every month.

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
- Also writes `api/data/position-stats/NN.json` (`NN` = djb2(full FEN) % 256,
  zero-padded, the hash `middleware.ts` uses):
  `{fen: {"window", "bands": {band: {"g","w","d","b","avg_rating","moves": [{"san","g","w","d","b"}]} | null}}}`,
  moves sorted by games. This is what Task 10 serves.
- A band under `MIN_MOVE_SAMPLE` (20) games is `null`. In
  `popularity_stats.json` a position under 20 keeps its real count with `null`
  rates and `avg_rating` (owner, 2026-10-31): 601 of 12,377 in 2026-07..09, deep
  lines whose all-time median is 287 games. A 6-month window would leave ~387,
  12 months ~252; not worth older numbers everywhere. Win rates are fractions.

- [x] Failing tests: `test_sums_months`, `test_missing_month_fails` (a gap in
      the window aborts, never silently shrinks it), `test_thin_band_is_null`,
      `test_all_band_is_sum_of_bands`, `test_keys_map_back_to_dataset_fens`,
      `test_shard_hash_matches_middleware` (golden values from
      `tests/unit/seo-lookup-shards.test.js`),
      `test_oversized_shard_writes_nothing` (250 KB; 96 shards measured 398 KB
      at the largest, so 256).
- [x] Implement, run tests. Expected: PASS.
- [x] `pipeline-reviewer` agent on the branch.
- [x] Run the real window (Phase 0's choice). Check `popularity-bands.json`
      size; if over 5 MB, shorten keys before going further.
- [x] Commit the code, the monthly summaries and both data files separately:
      `feat(analysis): combine monthly summaries into a dated window`, then
      `chore(data): refresh popularity stats to <since>–<until>`.

### Task 3b: Monthly refresh on a schedule

Owner request (2026-10-30): the refresh runs itself when the PC is on, in the
right part of the month, so the data never goes stale for want of someone
remembering.

**Files:**

- Create: `tools/analysis/refresh.py` (the whole job, idempotent),
  `tools/analysis/schedule/register-task.ps1` (registers the Windows task;
  `-Unregister` removes it)
- Modify: `tools/analysis/README.md` (runbook: what it does, where it logs, how
  to stop it)
- Test: `tools/analysis/tests/test_refresh.py`

**Behaviour:**

- Trigger: at logon and daily at 09:00, both with "run as soon as possible after
  a missed start". Every run first checks whether there is work; most runs exit
  in a second.
- There is work when last month's summary is missing **and** Lichess lists its
  file in `sha256sums.txt` (published anywhere from the 3rd to the 10th).
- Steps: download with resume to `%LOCALAPPDATA%\openingbook\lichess\` (outside
  the repo), verify SHA-256, summarise at below-normal priority so the PC stays
  usable, gzip the summary, delete the raw file, run the combiner for the window
  ending that month, write a log to `%LOCALAPPDATA%\openingbook\refresh.log`.
- It stops there: commits the data to a local branch `data/popularity-YYYY-MM`
  and shows a Windows notification. **It never pushes, opens a PR or deploys.**
  The owner reviews the diff and opens the PR.
- Interrupted by shutdown or sleep: the download resumes; summarising restarts
  (2½ hours), never half-written (written to a temp file, renamed when done).
- Python: a venv at `%LOCALAPPDATA%\openingbook\venv` built from
  `requirements.txt` by `register-task.ps1`.

- [x] Failing tests: `no work when summary exists`,
      `no work when month not yet published`,
      `checksum mismatch aborts and     deletes the file`,
      `summary written atomically`, `never calls git push` (the git step is a
      list of commands asserted against).
- [x] Implement, run tests, `pipeline-reviewer`. Review changed the design: the
      task runs `refresh.py` from its worktree (reset to `origin/main`), not the
      owner's checkout; the branch is made only at commit time, so a failed run
      doesn't look done; a whole `.part` (416) and a cut-short stream both
      resume; no `--no-verify` (the worktree has no `.husky/_`, so no hooks).
- [ ] Register the task (owner approves the exact task definition first). Dry
      run with `refresh.py --check` to show what it would do.
- [ ] Commit `feat(analysis): refresh popularity stats monthly on a schedule`.

### Task 3c: Retire the original pipeline (own PR, after the first scheduled refresh)

Owner request (2026-10-31). Nothing runs it and its counting rules are wrong.

- [ ] Give `BandGameProcessor` its own `__init__` and `_safe_int` (drop the
      `GameProcessor` base) and empty `lib/__init__.py`, which imports every old
      module whenever a new one loads. Tests still pass.
- [ ] Delete `run_pipeline.py`, `run_pipeline.bat`, `run_pipeline.sh`,
      `analyze_lichess_popularity.py`, `config.py`, `config.example.json`,
      `lib/data_fetcher.py`, `lib/state_manager.py`, `lib/stats_calculator.py`,
      `lib/output_handler.py` and the legacy `GameProcessor`; the README's
      "Original pipeline" half. Check `check_enrichment_status.py` and the two
      `.js` scripts for callers first; they may belong elsewhere.

## Phase 2: serve and date it (#204, site half). One PR.

Task 4 (pin the explorer proxy to our window) was dropped: the explorer has no
recent monthly data. Task 10 replaces it.

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

- [x] Failing tests: `band reorders popular sort`,
      `null band item has null rates and sorts last`, `unknown band is ignored`,
      `name sort ignores band but reports band counts`, `page includes window`.
- [x] Implement; the browse index stores the four bands per entry so `browse()`
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

- [x] Failing tests: `formatWindow` same-year and cross-year; each surface
      renders `Lichess games, <window>` when a window exists and nothing extra
      when it doesn't.
- [x] Implement. Browse responses carry `window` (add to the Task 5 payload) so
      Discover needs no extra request. On the detail page the date is in
      `explorerSourceLine`, which both shells (ExplorerCard and
      MobileDataSurface) draw, not WinRatePanel; it shows when the card serves
      the snapshot. Live explorer lines are unchanged until Task 10.
- [x] `verifier`: `test:all`, `build`, `build:vercel`. Commit
      `feat(web): date popularity stats on detail and Discover`. Open the Phase
      1+2 PR (refs #204; Phase 4 closes it).

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

## Phase 4: detail page from our data. One PR, after Phases 1+2; closes #204.

### Task 10: Band stats in the page response

**Files:**

- Create: `packages/api/src/services/position-stats-service.js` (reads one shard
  on demand, caches it at module scope)
- Modify: `packages/api/src/routes/openings.routes.js:169-235` (`/page/:fen`),
  `packages/web/src/hooks/useExplorerResult.ts` (Lichess bands resolve from the
  page data; only `masters` fetches),
  `packages/web/src/pages/OpeningDetailPage.tsx:142-147` (parent position's
  stats: add `stats.parent_bands` to the page response, from the same lookup, so
  the book needs no second request)
- Test: `tests/unit/position-stats-service.test.js` (new),
  `tests/unit/openings-page-endpoint.test.js`, `useExplorerResult` and
  `bookExplorerMerge` tests

**Interfaces:**

- `positionStats.forFen(fen: string) -> {window, bands} | null`.
- `/page/:fen` adds `data.stats.bands` and `data.stats.parent_bands`, each
  `{u1400|1400|1800|2200|all: {games, whitePct, drawPct, blackPct, averageRating, moves: ExplorerMove[]} | null}`,
  already in `ExplorerResult` shape so `bookExplorerMerge` and `explorerStats`
  are unchanged.

- [ ] Failing tests: `page response carries all bands with moves`,
      `missing band is null`, `shard read once per instance`,
      `unknown fen reads no shard`,
      `useExplorerResult makes no request for     lichess bands`,
      `masters still fetches`, `off-book rows come from page data`.
- [ ] Measure `/page/:fen` before the change on 20 FENs (local, warm and cold),
      record in the PR.
- [ ] Implement. Remove the bot 403 path only for bands that no longer reach
      Lichess; Masters keeps it.
- [ ] Measure again. Expected: no slower warm, cold start within 10% of before.
      If it isn't, stop and fix before opening the PR.
- [ ] Confirm the function bundle includes `api/data/position-stats/` and stays
      under Vercel's limit (`build:vercel` via `verifier`).
- [ ] `npm run test:e2e`. Commit
      `feat(detail): serve band stats from our own     data`. Open the PR,
      closes #204.
