# Our product audit: what openingbook.xyz actually does (as of 2026-10-27)

Method: local code and doc audit of `/home/user/chess-opening-explorer` at
`main` = `2d8ebf7` (2026-10-27). Data counts were computed directly from
`api/data/*` with Node one-liners during this session; GitHub issues were read
through the REST API. The app was **not** run locally (skipped to stay within
the time budget), so UI behaviour is inferred from code, not observed. Source
links are repo-relative file paths (prefix
`/home/user/chess-opening-explorer/`). "Computed" means I counted it from the
data file myself.

## 1. What surfaces exist, and exactly what each does today

### Takeaway

Four routes: Discover/landing (`/`), opening detail (`/opening/:fen`, 12,377
pages, with practice built in), Analyse (`/analyse`) and Repertoire
(`/repertoire`). Paste-a-game is a modal on the landing page. The detail page is
the strong, rich surface. Practice is a fixed-line recall drill with no memory.
Analyse is free and account-less but has no history. Repertoire is a
localStorage bookmark list.

### Cited Findings

**Routing**

- Only three static routes plus `/opening/:fen`. Any other path renders the
  landing page: `'/'`, `'/analyse'`, `'/repertoire'`, then
  `<Route path="/opening/:fen">` and `path="*"` → `LandingPage`. Each page is
  lazy-loaded. — [packages/web/src/App.tsx](packages/web/src/App.tsx)

**Discover / landing**

- The default Discover grid is sorted "Most played". The only sort options are
  `popular` ("Most played") and `name` ("A–Z"), and the grid shows 12 cards on
  first paint. —
  [packages/web/src/hooks/useBrowse.ts](packages/web/src/hooks/useBrowse.ts)
  (lines 55–66)
- The facets are Difficulty, Style and Family, plus Sort. The facet was renamed
  from "Level" to "Difficulty", which fixes audit #4. —
  [packages/web/src/components/filters/FilterBar.tsx](packages/web/src/components/filters/FilterBar.tsx)
  (line 45)
- The Difficulty facet now reads the style-tags `level` axis, not the old LLM
  complexity field. —
  [packages/api/src/services/browse-service.js](packages/api/src/services/browse-service.js)
  (line 111)
- The landing page also has a starred "Repertoire" section, "Surprise Me" (a
  random high-quality opening), recent openings, and a mobile search overlay
  that works as a navigation hub. —
  [.github/memory-bank/user-journeys.md](.github/memory-bank/user-journeys.md)
- There is no "Start here" or curated shelf in the code yet. It is open issue
  #199. —
  [GitHub issue #199](https://github.com/Freddiekinns/chess-opening-explorer/issues/199);
  [docs/backlog.md](docs/backlog.md)

**Search**

- Search ranks all 12,377 openings on the server. The client paints first from a
  1,000-opening slice using the same bands. —
  [.github/memory-bank/context.md](.github/memory-bank/context.md) (AD-016)
- Search answers in 2–5 ms, and its responses are 4.4 KB. —
  [docs/reviews/2026-09-24-feature-review.md](docs/reviews/2026-09-24-feature-review.md)
  §2
- "Semantic" search is rule-based: `NameIndex.js`, `QueryIntentParser.js`,
  `QueryUtils.js`, `SearchConstants.js`. No embedding or LLM call was found in
  the search services (grep for embedding/vertex/openai returned nothing). —
  [packages/api/src/services/search/](packages/api/src/services/search/)
- Descriptive queries are handled: style-led queries ("solid response to e4",
  "for white") were fixed in #173. The gambit search also matches openings
  _named_ as gambits, so "gambit" now returns 1,921 openings, up from 982. —
  [.github/memory-bank/progress.md](.github/memory-bank/progress.md);
  [.github/memory-bank/archive.md](.github/memory-bank/archive.md) (lines 70–75)
- Search is not a real ARIA combobox: there is no `role="combobox"` anywhere in
  `packages/web/src` (computed by grep), and the docs call this the "biggest
  a11y gap". —
  [.github/memory-bank/progress.md](.github/memory-bank/progress.md) "What's
  Left"

**Paste a game (PGN)**

- A lazily loaded modal on the landing page. It fetches the full index only when
  opened, then identifies the deepest matching opening and navigates to its
  page. It identifies the opening only; there is no post-mortem. —
  [packages/web/src/pages/LandingPage.tsx](packages/web/src/pages/LandingPage.tsx)
  (lines 12–15, 59–78)

**Opening detail page**

- Each page shows: the board and mainline navigation; an LLM description and
  common plans; style tags; a win-rate overview; a "Level lens" over live
  Lichess explorer data with continuations and alternatives ("Instead of…");
  notable/master games; and galleries of matched videos and Lichess studies.
  Links go out to Lichess Analysis/Play and to Chessable. Below 767px, mobile
  gets a distinct "one data surface" layout. —
  [.github/memory-bank/user-journeys.md](.github/memory-bank/user-journeys.md)
  §2; [packages/web/src/components/detail/](packages/web/src/components/detail/)
- The level-lens bands map to Lichess ratings as follows: `all` (0–2500
  buckets), `u1400` (0, 1000, 1200), `1400` (1400–1600), `1800` (1800–2000),
  `2200` (2200–2500) and `masters`. The proxy fetches rapid, blitz and classical
  games, plus up to 15 top games for the masters band. Cache headers are
  `s-maxage` 24h for Lichess bands and 7d for masters. Known bots get a 403
  before the upstream call. —
  [packages/api/src/routes/explorer.routes.js](packages/api/src/routes/explorer.routes.js)
  (lines 32–62, 76–80, 117)
- Continuations with no ECO name still render as inert `<div>` rows tagged
  "off-book", not links. Audit E2/E3 is therefore still open. —
  [packages/web/src/components/detail/OpeningNavigator.tsx](packages/web/src/components/detail/OpeningNavigator.tsx)
  (lines 101, 140–150);
  [packages/web/src/components/detail/mobile/MobileDataSurface.tsx](packages/web/src/components/detail/mobile/MobileDataSurface.tsx)
  (line 90)
- Explorer move steps no longer reset scroll: `ScrollToTop` skips the reset when
  `isExplorerStep(state)`. Audit E1 is fixed. —
  [packages/web/src/App.tsx](packages/web/src/App.tsx) (lines 22–29)
- 37% of named boards (4,583 pages) cannot be reached by clicking. The position
  graph that would fix this is not built. —
  [docs/reviews/2026-09-24-feature-review.md](docs/reviews/2026-09-24-feature-review.md)
  §3 (board-search PRD row); [docs/backlog.md](docs/backlog.md) Platform

**Practice mode**

- Practice lives on the detail page. You pick a colour and replay the page's
  named line. Lines shorter than 8 plies are extended by up to 6 plies,
  following the most-played named child each time (ranked by the 2025-07-15
  popularity snapshot). Wrong moves are rejected, a hint appears after 2 misses,
  and there is audio and tap-to-move. —
  [docs/reviews/2026-09-24-feature-review.md](docs/reviews/2026-09-24-feature-review.md)
  §2;
  [packages/web/src/pages/OpeningDetailPage.tsx](packages/web/src/pages/OpeningDetailPage.tsx)
  (lines 161–165, 368–478)
- Practice keeps no memory. Computed: the only `localStorage` keys in the web
  app are `chess-repertoire`, `chess-recent-openings`,
  `openingbook:explorer-cache`, `openingbook:anon-id`,
  `openingbook:watched-videos` and `openingbook:my-level`, and none is for
  practice. There is no `?practice=` parameter. —
  [packages/web/src/hooks/useRepertoire.ts](packages/web/src/hooks/useRepertoire.ts),
  [packages/web/src/lib/](packages/web/src/lib/); open issues
  [#195](https://github.com/Freddiekinns/chess-opening-explorer/issues/195) and
  [#196](https://github.com/Freddiekinns/chess-opening-explorer/issues/196)

**Analyse (personal games)**

- Analyse imports a Chess.com or Lichess username with no account. It fetches up
  to 500 games (clamped 1–500, default 500), rated rapid, blitz and classical
  only. Results are cached in sessionStorage under `personal-openings:v4:…`. —
  [packages/web/src/components/personal/usePersonalGames.ts](packages/web/src/components/personal/usePersonalGames.ts)
  (lines 36, 62, 187–189);
  [packages/api/src/services/personal-games-service.js](packages/api/src/services/personal-games-service.js)
  (lines 46, 65)
- Output: White and Black side by side (a switch on mobile); family rollups with
  per-side "Group by family" and Sort controls; distribution bars; and
  "Top-performing" and "Needs work" cards. A sample report is the blank state. —
  [.github/memory-bank/user-journeys.md](.github/memory-bank/user-journeys.md)
  §3
- Card statistics were fixed in #170. `MIN_CARD_GAMES = 3`, with no `list[0]`
  fallback (the card is omitted instead). On a tied win rate the larger sample
  wins. "Needs work" ranks by games lost, with loss rate breaking ties. The
  owner chose a floor of 3, not 10 or 20, because "players spread games too
  thin". —
  [packages/web/src/components/personal/personalStatsLib.ts](packages/web/src/components/personal/personalStatsLib.ts)
  (lines 110–135); [docs/backlog.md](docs/backlog.md) rev 4.2
- Analyse has no history between runs and no time-control or date split. Blitz,
  rapid and classical are merged. —
  [docs/reviews/2026-09-24-feature-review.md](docs/reviews/2026-09-24-feature-review.md)
  §2; [docs/backlog.md](docs/backlog.md) "Run-over-run progress" (unbuilt)
- Analyse links to detail pages with `?ref=personal&platform=…&username=…`, but
  nothing on the detail page reads these. Computed: `useSearchParams` is used
  only in `useBrowse.ts` (Discover facets). —
  [packages/web/src/components/personal/OpeningRow.tsx](packages/web/src/components/personal/OpeningRow.tsx)
  (line 39);
  [packages/web/src/components/personal/PersonalOpeningStats.tsx](packages/web/src/components/personal/PersonalOpeningStats.tsx)
  (line 378)

**Repertoire**

- A 102-line page over `useRepertoire` (localStorage `chess-repertoire`).
  Computed: a grep for white/black/export/PGN in `RepertoirePage.tsx` returned
  nothing, which points to no colour split and no export. —
  [packages/web/src/pages/RepertoirePage.tsx](packages/web/src/pages/RepertoirePage.tsx)
- The feature review called it "a bookmark list occupying a third of the mobile
  nav": no White/Black split, no coverage view, no export, one device only. —
  [docs/reviews/2026-09-24-feature-review.md](docs/reviews/2026-09-24-feature-review.md)
  §2

**Feedback**

- The footer links to a Google Form ("Help make Opening Book better"). —
  [.github/memory-bank/user-journeys.md](.github/memory-bank/user-journeys.md)

### Inferences

- The product is a **reference layer with a thin improvement layer**. The
  2026-08-11 audit's verdict, "reference layer is excellent and the improvement
  layer is not built yet", still holds in code on 2026-10-27. None of the loop
  features (#195–#199) has landed.
- Paste-a-game and Analyse are the only "your games" inputs, and neither feeds
  practice or the detail page.

### Gaps

- Not observed in a browser. Visual quality, load time and mobile behaviour are
  taken from docs, not checked.
- I did not verify the "Surprise Me" selection rule or the notable-games
  rendering beyond the docs and the `MasterGamesCard.tsx` file name.

## 2. Data assets and their quality

### Takeaway

The corpus is broad and fully enriched: 12,377 positions, all with LLM
descriptions and plans. A hand-built, researched style taxonomy covers 1,411
variations. 40,707 Jev-filtered video placements reach 68% of pages. 17,079
study-chapter links come from 444 Lichess studies. A live explorer proxy is
banded by rating. The weak points are a popularity snapshot 15 months old, LLM
prose of uneven reliability, video curation concentrated on two channels, and
study coverage on only 36% of pages.

### Cited Findings

**ECO corpus**

- Computed: 12,377 positions across `ecoA–E.json`. 499 carry `isEcoRoot`.
- Computed, sources of positions: scid 7,989, eco_tsv 3,545, wiki_b 560,
  chessGraph 154, eco_js 53, ct 51, plus a few small ones.
- Computed: 10,984 distinct names. 677 names are shared by more than one
  position, covering 2,070 positions. For example, "Sicilian Defense: Najdorf
  Variation" names 5 positions. This is the search near-duplicate problem, still
  open. — [api/data/eco/](api/data/eco/);
  [.github/memory-bank/progress.md](.github/memory-bank/progress.md) ("four
  identical 'najdorf' rows")
- 31 families in `families.json` (computed). Context docs say "28-family
  taxonomy", and the `irregular` split (2026-10-02) added 3 new families. —
  [api/data/families.json](api/data/families.json);
  [.github/memory-bank/progress.md](.github/memory-bank/progress.md)
- About 15.5k boards in total: 12,106 named plus 3,405 connector positions. —
  [docs/reviews/2026-09-24-feature-review.md](docs/reviews/2026-09-24-feature-review.md)
  §4.5

**LLM enrichment**

- Computed: 12,377 of 12,377 have `analysis_json` with a description and a
  non-empty `common_plans` (100%). It was generated with Vertex AI. —
  [api/data/eco/](api/data/eco/);
  [.github/memory-bank/context.md](.github/memory-bank/context.md)
- Known defects in the LLM layer:
  - The old style fields are wrong in measured ways: 61% "Advanced", "defensive"
    on 99% of openings. They have been superseded by `style-tags.json`. —
    [AGENTS.md](AGENTS.md) Gotchas
  - 105 researched style briefs marked 43 description claims wrong in 32 briefs
    (for example, the Dragon page described the Accelerated Dragon). Those 43
    were fixed on 2026-10-10 (#171). The rest of the corpus is unaudited. —
    [docs/backlog.md](docs/backlog.md) Enablers
  - Common plans used to be served from an "alphabetically-first record per ECO
    bucket" (95.9% of pages affected). The detail page and `CommonPlans` now
    read only the opening's own `common_plans` and never fall back to ECO-bucket
    data. — [.github/memory-bank/archive.md](.github/memory-bank/archive.md)
    (lines 984, 1159);
    [packages/web/src/pages/OpeningDetailPage.tsx](packages/web/src/pages/OpeningDetailPage.tsx)
    (lines 886–890);
    [packages/web/src/components/detail/CommonPlans.tsx](packages/web/src/components/detail/CommonPlans.tsx).
    **This conflicts** with `progress.md`, which still says "the common-plans
    ECO-bucket defect shipped no code change".
  - Plans do not say which side they favour. The French Advance shows White's
    "Space advantage" to Black players. This was parked on 2026-10-13. —
    [docs/backlog.md](docs/backlog.md) Parked
- AD-005 is a "Conservative AI policy": URLs written by AI are discarded (a 95%+
  hallucination rate), and AI output is validated. —
  [.github/memory-bank/context.md](.github/memory-bank/context.md)

**Style tags (the most distinctive asset)**

- `api/data/style-tags.json` (1.5 MB) has 6 axes: character, gambit, soundness,
  structure, approach and level. It also has 24 plan ids, 1,411 variations and
  12,239 position mappings (all computed). Archive text says "1,411 variations,
  11,863 positions, every variation outside the 14 hubs". The gap of about 376
  positions is unexplained (it may be hub or inherited mappings). —
  [api/data/style-tags.json](api/data/style-tags.json);
  [.github/memory-bank/archive.md](.github/memory-bank/archive.md) (line 65)
- Computed distribution over the 1,411 variations:
  - Character: balanced 594 / sharp 592 / solid 225
  - Gambit: none 978 / white 271 / black 162
  - Soundness: sound 970 / dubious 441
  - Structure: flexible 613 / open 457 / semi-open 281 / closed 60
  - Approach: offbeat 704 / standard 643 / system 64
  - **Level: intermediate 1,305 / advanced 84 / beginner 22**

  — [api/data/style-tags.json](api/data/style-tags.json)

- The 24 plan ids include IQP, hanging pawns, Carlsbad, Maróczy bind, hedgehog,
  Stonewall, minority attack, opposite-side castling, pressure on f7 and
  hypermodern centre. — [api/data/style-tags.json](api/data/style-tags.json)
- Taxonomy rules:
  - One value per axis. The old tags let 154 of the top 300 be both aggressive
    and solid.
  - Middle values are stored but never shown.
  - Words, never numbers.
  - A blind judge audit of 14 disputes agreed with classifier A in 13.

  — [docs/style-taxonomy.md](docs/style-taxonomy.md)

- Pipeline: research briefs, then Sonnet classifier agents, then the Jev
  classifier, then an Opus judge, then export. One wave cost about 20–40% of a
  5-hour usage window. Briefs from waves 11–12 carry "thin evidence notes on the
  rarest gambits". —
  [.github/memory-bank/archive.md](.github/memory-bank/archive.md) (lines 63–69,
  96–100)
- Display rules: a page hides Offbeat when shown beside Dubious (440 of 441
  overlap) and hides Lead in development on a gambit (338 of 402). —
  [.github/memory-bank/archive.md](.github/memory-bank/archive.md) (line 77)

**Popularity stats**

- `popularity_stats.json` metadata: `analysis_timestamp` 2025-07-15, source
  Lichess Opening Explorer API, "API-based (not PGN processing)". That is about
  15.5 months old on 2026-10-27, and the refresh is **Parked**. —
  [api/data/popularity_stats.json](api/data/popularity_stats.json);
  [docs/backlog.md](docs/backlog.md) Parked
- Computed: 12,377 entries. 16 have null rates and 0 games. The median is 87,708
  games. 165 positions have under 100 games and 671 have under 1,000. —
  [api/data/popularity_stats.json](api/data/popularity_stats.json)
- The detail card and Discover disagree: 693M vs 542M games for 1.e4 c5. Neither
  number is dated on screen. —
  [docs/reviews/2026-09-24-feature-review.md](docs/reviews/2026-09-24-feature-review.md)
  §3; audit #5 in
  [docs/reviews/2026-08-11-product-ux-audit.md](docs/reviews/2026-08-11-product-ux-audit.md)
- The stats cover all rated Lichess players, not masters. —
  [AGENTS.md](AGENTS.md)

**Video index**

- `video-index.json` (24.4 MB) was generated 2026-09-01. Computed:
  - 12,377 position entries, 8,424 of them with their own videos (68.1%).
  - 40,707 position–video placements, but only 1,452 unique videos from 18
    channels.

  Pages with no videos of their own fall back to the family shelf. —
  [api/data/video-index.json](api/data/video-index.json); [AGENTS.md](AGENTS.md)
  ("A family is a video shelf")

- Channel concentration (computed, placements):
  - Daniel Naroditsky 13,010 and Hanging Pawns 11,253 (60% together)
  - Saint Louis Chess Club 6,067
  - John Bartholomew 2,178
  - ChessNetwork 2,109
  - Remote Chess Academy 1,442
  - Eric Rosen 1,398
  - GothamChess 199

  — [api/data/video-index.json](api/data/video-index.json); channel config
  [config/youtube_channels.json](config/youtube_channels.json)

- The Jev filter (model jev-1.13.0) removed 31,605 of 72,283 pairs. Jev's
  rejections were 99% right, but its acceptances were half wrong, so it is used
  only to reject. 18 Jev-and-judge-agreed videos were pinned. The metadata shows
  29 pins filling 17 pages. Top-200 own-page coverage is 181. The experiment
  cost $1.60. —
  [.github/memory-bank/progress.md](.github/memory-bank/progress.md);
  [docs/backlog.md](docs/backlog.md) Enablers;
  [api/data/video-index.json](api/data/video-index.json) metadata
- Earlier quality metrics: coverage 28.2% → 72.8%, top-200 91.5%, cross-family
  0%, #1-specificity 61.9%. The feature review reports specificity 54.2% and
  contamination 0%. —
  [.github/memory-bank/archive.md](.github/memory-bank/archive.md) (lines 700,
  1153);
  [docs/reviews/2026-09-24-feature-review.md](docs/reviews/2026-09-24-feature-review.md)
- Unused asset: Jev's run 2 put all 10,239 corpus videos in a family. Where Jev
  disagreed with the matcher, the blind judge sided with Jev 67% of the time and
  the matcher 13%. Nothing reads these answers yet. —
  [docs/backlog.md](docs/backlog.md) Enablers
- The monthly refresh Action is not enabled. —
  [.github/memory-bank/progress.md](.github/memory-bank/progress.md) "What's
  Left"

**Lichess studies**

- Computed: 444 studies, 17,079 chapter links across 4,500 positions (36.4% of
  12,377). Each link carries a study and chapter URL, author, likes, a "curated"
  flag and a match score. There is no PGN or comment text. —
  [api/data/courses.json](api/data/courses.json);
  [docs/reviews/2026-09-24-feature-review.md](docs/reviews/2026-09-24-feature-review.md)
  (J1 row)
- Studies were discovered at 500+ likes and matched by FEN. Study matching V2
  raised coverage from 18.2% to 35.7% overall and from 62.5% to 91.5% in the top
  200, with contamination going from 5.8% to 0. —
  [.github/memory-bank/context.md](.github/memory-bank/context.md);
  [.github/memory-bank/archive.md](.github/memory-bank/archive.md) (line 694)
- Doc inconsistency: `user-journeys.md` still says "6,100+ chapters";
  `context.md` says 17,079.

**Live explorer proxy and notable games**

- The proxy uses one Lichess token at 25 requests/min. Only cache misses reach
  Lichess. An uncached detail view costs about 3 queries. 429s are tracked
  through `explorer_error`. — [docs/backlog.md](docs/backlog.md) Enablers;
  [packages/api/src/routes/explorer.routes.js](packages/api/src/routes/explorer.routes.js)
- Notable games are the masters band's `topGames` (15). They link out to Lichess
  and are not replayed in-app. —
  [packages/api/src/routes/explorer.routes.js](packages/api/src/routes/explorer.routes.js)
  (line 32);
  [docs/reviews/2026-09-24-feature-review.md](docs/reviews/2026-09-24-feature-review.md)
  §4.10

**Infrastructure constraints**

- The site runs on Vercel Hobby. Every cold start parses about 78 MB of JSON,
  and Active CPU per invocation rose about 3× after mid-August. Functions ran
  about 50% cold starts at current traffic. —
  [.github/memory-bank/progress.md](.github/memory-bank/progress.md);
  [.github/memory-bank/archive.md](.github/memory-bank/archive.md) (line 93)

### Inferences

- The style taxonomy's `level` axis is 92.5% "intermediate" (1,305 of 1,411
  variations). The Difficulty facet now on Discover therefore hardly separates
  openings: only 22 variations are "beginner".
- Video breadth is better than it first looks (68% own-page, plus family
  fallback), but variety is narrow. Two channels supply 60% of placements, which
  leans on Naroditsky's speedruns and Hanging Pawns' series.
- Per page, the ECO corpus plus style tags plus video and study matching is a
  rare combination. Every individual data source, though, is either third-party
  (Lichess stats, YouTube, Lichess studies) or LLM-generated.

### Gaps

- No measured accuracy figure exists for the LLM descriptions beyond the 105
  audited briefs (43 wrong claims in 32 briefs). Accuracy across the remaining
  ~1,300 variations' prose is unknown.
- I could not reconcile 12,239 style-tag position mappings with the archive's
  11,863.

## 3. What shipped since 2026-09-24, and which audit and review findings are fixed or still open

### Takeaway

Since 2026-09-24 the shipped work has been:

- credibility fixes (Analyse cards, billions formatting, Difficulty rename,
  scroll keep, 43 description fixes);
- the style taxonomy, which replaced the LLM tags;
- the Jev video filter;
- PostHog analytics;
- E2E and coverage gates;
- dead-route deletion;
- Dependabot work.

**No loop feature has shipped** (personal strip, practice memory, divergence
callout, bridge, Start here, deviation trainer). Unnamed continuations are still
dead ends, Discover still defaults to Most played, and the popularity data is
still stale.

### Cited Findings

- Git log 2026-09-24 → 2026-10-27, product-facing commits:
  - #148 logo redraw
  - #156 query shape on `search_select`
  - #157 Jev video filter and pins
  - #159 `irregular` family split (519 positions)
  - #160 style taxonomy replacing the LLM tags
  - #170 honest Analyse cards, copy fixes, explorer keeps its scroll
  - #171 description claims corrected
  - #172 E2E back to green, in CI
  - #173 style-led descriptive search
  - #174 and #179 style-tags tail, plus analytics gap events, soft-404
    pre-render, gambit search and tag display rules
  - #183 mobile board inset
  - #181/#185 dead API routes deleted
  - #182/#189 route tests
  - #175/#180 coverage gates

  The rest is dependency bumps and docs. — `git log --since=2026-09-24` in
  [the repo](.)

Status of the 2026-08-11 audit and 2026-09-24 review findings, checked in code
today:

| Finding                                                      | Status 2026-10-27                                                                                        | Evidence                                                                                                                                 |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Analyse headlines a 3-game 100% line via `list[0]` fallback  | **Fixed** (fallback removed; floor 3, not the 10/20 recommended; weakest ranked by games lost)           | [personalStatsLib.ts](packages/web/src/components/personal/personalStatsLib.ts) lines 113–135                                            |
| `?ref=personal` written, never read                          | **Open** (#195)                                                                                          | [OpeningRow.tsx](packages/web/src/components/personal/OpeningRow.tsx):39; no reader                                                      |
| Every explorer move resets scroll (E1)                       | **Fixed**                                                                                                | [App.tsx](packages/web/src/App.tsx) `isExplorerStep`                                                                                     |
| Unnamed continuations inert, "off-book" (E2/E3)              | **Open** ("off-book" name kept by owner decision)                                                        | [OpeningNavigator.tsx](packages/web/src/components/detail/OpeningNavigator.tsx):101, 140–150; [docs/backlog.md](docs/backlog.md) rev 4.2 |
| "Level" means two things (audit #4)                          | **Fixed** (Discover facet renamed "Difficulty")                                                          | [FilterBar.tsx](packages/web/src/components/filters/FilterBar.tsx):45                                                                    |
| 3.78B renders as "3778.2M" (#6)                              | **Fixed** (`B` formatting)                                                                               | [OpeningCard.tsx](packages/web/src/components/shared/OpeningCard.tsx):93; [lib/openingBook.ts](packages/web/src/lib/openingBook.ts):8    |
| Discover leads with King's/Queen's Pawn Game (#3)            | **Open**: default sort still `popular`, no curated shelf (#199)                                          | [useBrowse.ts](packages/web/src/hooks/useBrowse.ts):55–60                                                                                |
| Popularity snapshot stale / two undated counts (#5)          | **Open, parked** (snapshot 2025-07-15)                                                                   | [popularity_stats.json](api/data/popularity_stats.json); [docs/backlog.md](docs/backlog.md)                                              |
| Search near-duplicate rows (#7)                              | **Open** (677 shared names / 2,070 positions)                                                            | computed; [progress.md](.github/memory-bank/progress.md)                                                                                 |
| Detail page never says what's good (#8)                      | **Open** (no engine evaluation, traps or "dubious" per move; only the style-tag "Dubious" per variation) | [docs/backlog.md](docs/backlog.md) Platform                                                                                              |
| Repertoire is a bookmark list (#9)                           | **Open** (decision 3 pending)                                                                            | [RepertoirePage.tsx](packages/web/src/pages/RepertoirePage.tsx)                                                                          |
| No practice memory / improvement loop (#1)                   | **Open** (#196)                                                                                          | no practice localStorage key                                                                                                             |
| Analyse has no time-control/date split, no run-over-run (P2) | **Open**                                                                                                 | [usePersonalGames.ts](packages/web/src/components/personal/usePersonalGames.ts)                                                          |
| E2E: 8 of 9 specs failing, not in CI                         | **Fixed** (9/9 green, in CI, #172)                                                                       | [progress.md](.github/memory-bank/progress.md)                                                                                           |
| Measurement unreadable (1h logs)                             | **Fixed** (PostHog EU and Vercel Web Analytics)                                                          | [analytics.ts](packages/web/src/lib/analytics.ts)                                                                                        |
| S1 Helmet configured, never runs                             | **Appears fixed**: `app.use(helmet())` in both server entries (not verified at runtime)                  | [packages/api/src/server.js](packages/api/src/server.js):19; [api/index.js](api/index.js):11                                             |
| Slice 2 deviation trainer                                    | **Not started**                                                                                          | [docs/backlog.md](docs/backlog.md) "Then"                                                                                                |
| Toast host, search combobox a11y, mobile facet chips         | **Open**                                                                                                 | [progress.md](.github/memory-bank/progress.md) "What's Left"                                                                             |

### Inferences

- The September "credibility first" phase is mostly done. The September "loop"
  phase (#195–#199) has not started, five weeks after it was set as "Next — 1–2
  weeks".
- Engineering effort since September went mainly to data quality (style tags,
  Jev, descriptions) and to test and CI hygiene.

### Gaps

- I did not verify the audit's security items S2 (open CORS and public cache on
  `/api/personal/games`) and S3 in code: grep found no `Allow-Origin` or
  `Cache-Control` in `personal.routes.js`, which may mean they were removed or
  are set elsewhere.

## 4. Traffic, indexing, analytics and SEO, as recorded in the docs

### Takeaway

Traffic is tiny:

- about 100 visitors and 220 page views a month on Vercel;
- about 69 real people in PostHog, 66 of whom came once;
- Search Console about 500 impressions and about 14 clicks a week.

A Google quality purge on 30/31 July 2026 cut impressions sharply, and they have
not recovered to July levels, despite 7.3k pages now indexed.

### Cited Findings

- Analytics baseline (2026-10-11), Vercel, 30 days: 102 visitors, 220 views, 69%
  bounce. — [.github/memory-bank/archive.md](.github/memory-bank/archive.md)
  (lines 81–93)
- Same baseline, PostHog: about 69 real people, 85 sessions, 62 of them
  single-page; 66 of the 69 came once. — same source
- Google lands visitors on obscure named lines (O'Neill, Papa-Ticulat, Linder,
  Wikstrom). Of 31 Google-to-detail sessions: 7 went further, 7 used the level
  tabs, 4 practised and 2 searched. In-site search: 7 sessions, 13 picks, 11 of
  them the top result. `video_click`: no real user. — same source
- Search Console, weekly: about 1,000 impressions and 10–17 clicks in July; a
  crash in the week of 3 August; flat to 21 September; about 500 impressions and
  about 14 clicks since (CTR about 2.7%, position about 7.6). 7.31k pages
  indexed. — same source
- The de-indexing: impressions fell from 111 to 4 between 30 and 31 July. It was
  diagnosed as a quality purge driven by low CTR (all 12,377 pages had one
  template sentence over an empty `#root`). The fix was to pre-render the H1,
  description and win rates in edge middleware from `seo-lookup` shards. A
  canonicalise-by-name attempt would have de-indexed 1,677 pages (6.65B games)
  and was caught in review. —
  [.github/memory-bank/archive.md](.github/memory-bank/archive.md) (lines
  373–400)
- Indexing timeline:
  - 90 days to 2026-08-26: 5,750 pages indexed, 4,810 impressions, average
    position 12, "indexed and not served".
  - 2026-09-22: 7,174 indexed; "Discovered – not indexed" down from 3,615 to
    2,038; sitemaps 5–7 never read.

  — [.github/memory-bank/archive.md](.github/memory-bank/archive.md) (lines
  1228–1233, 310);
  [.github/memory-bank/progress.md](.github/memory-bank/progress.md)

- 86 soft 404s ("Opening not found" painted on any failed fetch) were fixed by
  `lib/prerender.ts` in #179. Validation had failed on 2026-10-05. —
  [.github/memory-bank/archive.md](.github/memory-bank/archive.md) (lines
  55–59, 94)
- Next SEO lever on record: slug URLs with 301s. `/opening/a/b/…` (unencoded
  FEN) serves a self-canonical duplicate. —
  [.github/memory-bank/progress.md](.github/memory-bank/progress.md)
- PostHog setup: EU cloud, free tier, cookieless (localStorage anonymous id),
  production host only, autocapture and session replay off. —
  [packages/web/src/lib/analytics.ts](packages/web/src/lib/analytics.ts)
- PostHog events, computed with call-site counts: `$pageview` (2), `analyse_run`
  (3), `band_select` (4), `explorer_error` (2), `opening_nav` (4), `pgn_lookup`
  (1), `practice_start` (1), `repertoire_toggle` (1), `search_no_results` (1),
  `search_select` (4), `search_start` (1), `video_click` (3),
  `video_gallery_view` (1). —
  [packages/web/src/lib/analytics.ts](packages/web/src/lib/analytics.ts) and
  call sites in `packages/web/src`
- The analytics revisit is due late November 2026 with six weeks of the new
  events. Search ranking and the video pipeline are paused until then. —
  [.github/memory-bank/activeContext.md](.github/memory-bank/activeContext.md)

### Inferences

- With about 69 people a month, any feature's usage data will be anecdotal for
  months. Choices will have to rest on market evidence, not on our own funnel.
- Google sends visitors to long-tail pages, which supports the page-per-position
  breadth as the acquisition asset. But AI Overviews threaten exactly this
  informational content (an argument the competitive review makes, which I did
  not verify here).

### Gaps

- No referrer breakdown, country split or device split is recorded in the files
  I read. #188 (monthly report) is meant to automate this.

## 5. Open GitHub issues: themes

### Takeaway

The open issues are the five "close the loop cheaply" items (#195–#199) plus a
monthly traffic report (#188). The other open items are Dependabot PRs and the
TS 7 bump blocked upstream (#107).

### Cited Findings

- #195 Personal strip and "Drill this line" on the detail page: read
  `?ref=personal` and add `?practice=white|black`. —
  [issue #195](https://github.com/Freddiekinns/chess-opening-explorer/issues/195)
- #196 Practice memory: save attempts in localStorage, add a "Lines to review"
  shelf and "Last time you missed move 7". No due dates and no streaks. —
  [issue #196](https://github.com/Freddiekinns/chess-opening-explorer/issues/196)
- #197 Divergence callout: a move's band share vs masters' share, using data
  already fetched. —
  [issue #197](https://github.com/Freddiekinns/chess-opening-explorer/issues/197)
- #198 Analyse bridge line near Practice. Decision B proposes folding it into
  #195. —
  [issue #198](https://github.com/Freddiekinns/chess-opening-explorer/issues/198);
  [docs/backlog.md](docs/backlog.md)
- #199 "Start here" shelf of 20–30 openings chosen by the owner, split by
  colour, with style tags. —
  [issue #199](https://github.com/Freddiekinns/chess-opening-explorer/issues/199)
- #188 Monthly traffic and SEO report (Search Console, Vercel, PostHog), because
  the manual check was done 4 times. —
  [issue #188](https://github.com/Freddiekinns/chess-opening-explorer/issues/188)
- Also open: Dependabot PRs #201, #202 and #203, and #107 (TypeScript 7, blocked
  on typescript-eslint). — GitHub REST `issues?state=open`
- Backlog rev 6, "Soon":
  - Sparring v0: opponent replies sampled by band share, capped per session,
    pending decision A.
  - Opponent scout.
  - "Your style, from your games".

  "Then": the deviation trainer v1 with paste-a-game post-mortem, repertoire
  from your games, and run-over-run progress. "Platform": the position graph and
  position facts (offline Stockfish). — [docs/backlog.md](docs/backlog.md)

### Inferences

- Every open product issue is a stateless, client-side S-sized item. The
  strategy is deliberately "no accounts, no backend state".

### Gaps

- None material.

## 6. Stated target user and positioning; genuine strengths, weaknesses and unique assets

### Takeaway

The stated target is beginner-to-intermediate players (under 1800), with
advanced players as a reference audience.

The genuinely unique assets are:

- a free, crawlable page for every one of 12,377 named positions;
- a researched, one-value-per-axis style taxonomy over 1,411 variations;
- per-position curation of YouTube videos and Lichess studies;
- no-account Analyse.

The genuine weakness is that everything that would make a player _better_, and
bring them back, is thin or absent. The competitive review's claims mostly check
out in code. Its one overstatement is "every variation tagged": the level axis
is almost uniform.

### Cited Findings

- "Target Users: Beginner to intermediate players (under 1800) who need
  guidance; advanced players for quick reference." —
  [.github/memory-bank/context.md](.github/memory-bank/context.md)
- Stated moat: "the only durable moat is connecting a user's own games to
  learning content". The rev 6 qualification says paid apps (ChessAtlas,
  Chessbook) now flag where your games left your prep, so what stays ours is
  "free, no account, no repertoire to build first, and a full page for every
  finding". — [docs/backlog.md](docs/backlog.md)
- The competitive review's USP sentence: "the only free, no-sign-up place where
  any named opening has a page that explains it, shows how players at your level
  actually play it, collects the best videos and studies for it, and lets you
  practise it, and which can read your own games and send you to the right
  page". It adds that "every clause is reference until the last two, and the
  last two are the thin ones". —
  [docs/reviews/2026-10-27-competitive-review.md](docs/reviews/2026-10-27-competitive-review.md)
  §2
- The same review's market grid scores Opening Book "—" on engine evaluation,
  traps, spaced repetition, realistic practice, "where did my games leave my
  prep", and progress tracking; "◐" on repertoire building, opponent scouting
  and explanation; and "✅" on learning what an opening is and on stats at your
  level. Its competitor facts are self-reported, from search snippets, by its
  own caveat. —
  [docs/reviews/2026-10-27-competitive-review.md](docs/reviews/2026-10-27-competitive-review.md)
  §3
- Auditor's verdict (2026-08-11): "The reference layer is excellent and the
  improvement layer is not built yet". Engineering health: 1,497 tests green at
  the time, no fabricated data. —
  [docs/reviews/2026-08-11-product-ux-audit.md](docs/reviews/2026-08-11-product-ux-audit.md)
- Explicit non-goals: accounts, leaderboards, full-game review, paid courses,
  ungrounded LLM chat, native apps. —
  [docs/reviews/2026-10-27-competitive-review.md](docs/reviews/2026-10-27-competitive-review.md)
  §3
- Only about 14 distinct trap-named ECO lines exist. 85 of 1,568 matched video
  titles say "trap". —
  [docs/reviews/2026-09-24-feature-review.md](docs/reviews/2026-09-24-feature-review.md)
  §3 (J2)

### Inferences

**Genuine strengths (verified)**

1. Breadth and crawlability: 12,377 server-pre-rendered pages, about 7.3k
   indexed.
2. The style taxonomy, as a researched data asset with a public glossary.
3. Video and study curation per position, with measured contamination of 0%.
4. A level lens over live Lichess data, banded by rating, presented with a
   learner framing ("Instead of…").
5. No-account Analyse, up to 500 games, with honest statistics since #170.
6. Fast, intent-aware descriptive search.
7. Engineering discipline: no fabricated stats, null-safe, tests, E2E in CI.

**Genuine weaknesses (verified)**

1. Practice is a single fixed line with no memory, score or realistic opponent.
2. No evaluation of whether a move is sound, and no traps.
3. The loop is open: Analyse context is dropped, and nothing persists except
   bookmarks.
4. Discover still opens on generic first-move positions.
5. Popularity data is about 15 months old and undated on screen.
6. 37% of pages cannot be reached by clicking; unnamed continuations are dead
   ends.
7. Narrow video variety (2 channels are 60% of placements).
8. Studies cover only 36% of pages and are link-only.
9. Style "level" barely discriminates (92.5% intermediate).
10. Tiny traffic, and a search channel recovering only slowly.

**Unique assets vs Lichess, Chess.com, Chessable and YouTube**

- The fixed style taxonomy at variation scale.
- The YouTube-to-position and study-to-position indexes. Lichess only searches
  studies by title. YouTube has no FEN-level index.
- The combination of all of these on one free URL per position.

The live stats are at parity with Lichess at best, since Lichess is the source.
Paste-a-game is at parity with chess.com and Lichess game review.

**Underused assets**

- `style-tags.json` drives only tags, Discover facets and search. Nothing in
  Analyse joins personal games to style, though the "your style" idea is in the
  backlog.
- Jev video families, which nothing reads yet.
- Notable games, which only link out.

### Gaps

- No user research, survey or qualitative feedback (for example, from the Google
  Form) was found in the repo, so "what users value" is unmeasured.
- I did not run the app, so UX quality claims rest on the docs and the
  2026-08-11 audit.
