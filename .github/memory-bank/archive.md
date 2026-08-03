# Memory Bank Archive

Historical session summaries preserved for reference. This file is **never
loaded into context automatically** — read on demand only.

---

## Analyse summary cards read as one row (2026-08-02, `claude/player-details-layout-qxa1mo`)

Phase 5 §3 reversed ("the record card keeps its existing layout"). Structure was
never the complaint: the card sat in an equal-height grid with its figures at
the top-left over ~40% dead space, and it was the only card in the row with no
bar, so the row had no bottom edge.

- **Composition.** Figures bottom-anchored (`margin-top: auto`) across three
  full-width columns, win left / draw centre / loss right — the bar's own
  geometry, and PerfBar's legend arrangement.
- **The dead space, measured.** 54px of a 228px card — but the opening cards
  carry 51px in the same band, so it was never unique to the record card. Its
  upper block was two lines against their four, so a third line closes it: the
  overall win rate, the only rate on the panel with a sample behind it.
- **The tints are load-bearing.** Equal-width columns cannot align with
  proportional segments, so colour is the only thing tying a count to its band.
  Draws move off primary cream — brightest number, least interesting fact.
- **Four disagreements between rules drawn in different places** (what "the
  fonts are all off" meant): bar height 6 vs 8px, headline 22 vs 20px, tracked
  "WINS" beside sentence-case "win rate", a sage border on the Wins tile alone.
- **"Your record" now counts every decided game.** W/D/L were tallied inside the
  classified branch, so a real result with an unrecognised opening vanished from
  the record while the header still counted it. `whiteGames`/`blackGames` stay
  matched-only — they label the lists, so they must equal the rows beneath.
- **Second pass — "should every card be the same height and layout?"** Measured
  first: they already are where alignment reads (equal heights via the grid,
  label at y=21, headline at y=44, bar at y=175/199). The middle disagrees
  _structurally_ — the opening card has five blocks to the record card's four,
  because only it has a moves line. So `.cardIdentity` reserves 70px (two 24px
  name lines, where the name clamps, + the 18px moves line + its 4px offset) and
  fixes the two _opening_ cards against each other: a wrapping name in one and
  not the other put their "N games" lines 24px apart on cards of identical
  shape. Invisible in both fixtures, because neither player has a qualifying
  weak opening, so only one opening card renders. Cost: the row is permanently
  24px taller when both names are short — predictable slack beats slack that
  appears per player. The record card is deliberately **not** forced into line;
  that would mean inventing a fourth line for it to fill.
- **A games count on the record card was declined.** The header states it twice
  ("100 games analysed · 100 matched") and the card's own counts sum to it; a
  fourth statement 40px below the third earns nothing. The context slot's job on
  an opening card is a sample size unavailable elsewhere (3 of 100); on the
  record card the sample is the page's scope, already established.
- **Left alone on the owner's call**: opening cards keep single-fill rate bars;
  mobile keeps three tiles (but carries the rate on its scope line — parity of
  information, not layout); `MIN_CARD_GAMES` stays 4, since at variation level a
  floor of 8 often qualifies nothing and `findBestOpening` then falls back to an
  unfiltered `list[0]`.

---

## The empty repertoire slot gets its box back (2026-08-02, `ux/phase-5-analyse`)

A handoff divergence with no recorded reason. The mock draws Discover's empty
state as a bordered one-line bar with a 16px outline star; the build shipped a
bare sentence. Change 03 justified _height_ (a ~180px dashed panel → ~40px)
while keeping the container — "one-line prompt" got read as "one line of text".
Empty and populated are the same slot: with no surface, the first save conjures
a section out of bare text rather than filling a container. The test had frozen
the drift ("not a panel" asserted more than anyone decided); it now says not a
_titled empty-state_ panel. `components-repertoire-row` draws both.

---

## Practice drops to accent-outline (`ux/phase-5-analyse`)

Filled orange → orange border + orange label, both breakpoints. **A spec
decision reversed on the owner's call.** §3 argued from implementation
completeness — "fully implemented, so it can carry primary weight" — which is a
different question from how much of the page's attention a feature has earned.
Practice is a good action that is not yet what the detail page is _for_.

- **Names the third button tier.** The bundle documented two (filled primary,
  grey `.btn--secondary`) while `buttonSpec.test.ts` called an orange outline
  "secondary" — never true of `.btn--secondary`. Now: primary · accent-outline ·
  secondary · tertiary, in `components-buttons`.
- **Proportion fixed with it** — the other half of the complaint. Desktop was
  11px inside 24px padding (a swatch with a word in it) while mobile said 13px
  for the same control. Both 13px now, padding brought in, mobile min-height
  44px because it is a thumb target.
- **Guard rewritten, not deleted.** Its durable purpose was never "keep Practice
  filled": the button is drawn twice and has drifted across breakpoints twice —
  on fill, then on type size. It now asserts the halves _agree_. Spec §3.4.

## Agent instruction docs audit + restructure (2026-07-25)

Audited all 31 agent-facing markdown docs against Claude 5 context-engineering
guidance — spend CLAUDE.md tokens on codebase gotchas, cut anything derivable
from the repo. Audit: `docs/reviews/2026-07-25-agent-docs-audit.md`.

- **Four dead mechanisms found.** `.claude/agents/*.md` had no YAML frontmatter
  so never registered; `design-system/project/SKILL.md` wasn't under
  `.claude/skills/`, so `/openingbook-design` did not exist;
  `design-system/README.md` referenced a directory name that doesn't exist;
  `.agent/workflows/` was read by nothing. Plus four npm scripts pointing at the
  non-existent `tools/production/`, and `markdown.instructions.md` was an
  unmodified Microsoft blog template.
- **Structure now.** Portable `AGENTS.md` (repo summary + gotchas) imported by a
  thin `CLAUDE.md`; scoped `packages/web`, `packages/api`, `tools/analysis`
  `AGENTS.md` files each with a one-line `CLAUDE.md` stub, so a future Codex
  switch needs no rework; four registered skills; `pipeline-reviewer` subagent
  revived with frontmatter. Deleted `.github/instructions/` (Copilot no longer
  used here) and `.agent/`.
- **Follow-up:** run `/doctor` locally — it can't run from a remote session, and
  it proposes CLAUDE.md trims in the same direction.

## Session detail: 2026-07-07 → 2026-07-20

Moved out of `progress.md` on 2026-07-25 to bring that file back under its
100-line cap. These are the full entries as originally written.

- **Video matcher: modifier-aware sibling-variation fix** (2026-07-20):
  boundary-safe + diacritic-normalized name matching (`findPhrase`), config
  `variation_modifiers` (accelerated/semi/anti/…) reject sibling-variation
  videos (Hyper/Accelerated/plain Dragon no longer cross-contaminate), variation
  bonus requires a full segment, "Acc." → "accelerated" expansion, bogus
  abbreviation aliases removed. Strict audit: sibling matches 301→0, top1
  full-segment specificity 40.8%→42.1%; top-200 coverage held 183/200;
  contamination 0. 15 new tests; rematched index.
- **Opening-detail & analyse UI tweaks** (2026-07-20, branch
  `claude/opening-details-ui-tweaks-9tddbh`): "Most popular next moves" caption
  under continuations (desktop + mobile, parallels "Most popular alternatives");
  mobile show-more threshold 5 → 3; and unified the mobile Analyse cards — the
  family header + expanded variations now match the individual opening card
  (name + "Games N" top-right + bar + worded legend) via a new shared `PerfBar`
  component, and variation rows show their move list. Then aligned the grouped
  list to the flat list's styling — variation names use the same
  `OpeningNameSplit` treatment/size, and both lists render the full move line
  (was first-two-pairs, which hid the move that names the opening; full line is
  shown as space allows). 326 frontend tests green; verified with Playwright
  screenshots (mobile + desktop).
- **Opening detail mobile overhaul** (2026-07-18, PR #53): implemented Claude
  Design 2a "one data surface" at ≤767px — compact header + save toast, single
  board control row with inline move strip and a FEN bottom sheet, clamped
  overview, one card merging sticky level pills + stats + breadcrumb +
  continuations + alternatives, collapsed master-games accordion, grouped plans
  cards, videos/studies accordion, and a full-screen search overlay (recents +
  repertoire + surprise me). Plus: desktop right column reordered Overview →
  stats → book, and a scroll fix (ScrollToTop on route change; move strip no
  longer scrolls the page). 323 frontend tests green (35 new).
- **Mobile landing filter UI fix** (2026-07-15, branch
  `claude/mobile-landing-filter-ui-mq5qjk`): the long ECO category labels
  clipped illegibly in the mobile scroll-pill row. Per Claude Design handoff
  (option 1e), the category filter now collapses into a `CategoryFilter`
  dropdown at ≤767px (full labels, no clipping; trigger shows the full selected
  name with an ellipsis safety net); level stays a swipeable pill row with a
  right-edge fade. Desktop wrapped pills unchanged. New component + test +
  design-system preview card. 288 frontend tests green.
- **Sidebar Unification + Explorer Proxy** (2026-07-12, branch
  `feat/evidence-engine-slice1`): `/api/explorer` proxy (Lichess gated the
  explorer behind auth 2026-03; server token + CDN caching), then the sidebar
  redesign per `docs/proposals/2026-07-11-sidebar-unification.md` + Fred's
  amendments — LevelLens (named levels, Elo in tooltips) governs WinRatePanel
  (evidence only, "Master games" ×3, analyse link; bridge card deleted) and the
  Opening book ("Next moves" merges book + explorer rows: white-win % + W/D/L
  bars, off-book tags, "Instead of 3.e3" alternatives). Fixed pre-existing
  move-number off-by-one (plies from FEN). 284 frontend tests.
- **Deviation Trainer Slice 1 — Evidence Engine** (2026-07-11, branch
  `feat/evidence-engine-slice1`): Lichess explorer client (band mapping, TTL/LRU
  cache), level-check strip (≥8 pp, ≥100 games), rating-band selector +
  site-wide "my level", notable master games, Analyse bridge card, `/api/event`
  beacon instrumentation (S4-lite). PRD:
  `docs/proposals/2026-07-11-deviation-trainer-prd.md`.
- **Study Matching V2** (2026-07-10/11, branch `feat/study-matching-v2`): cached
  fetch + offline `course:rematch`, multi-anchor scored matcher with family
  guard, schema v2 + study-level cards with badges, dual-schema audit script.
  Coverage 18.2%→35.7% all / 62.5%→91.5% top-200; contamination 5.8%→0; dupes
  1,329→0; title dupes→0. Also fixed path-resolver in git worktrees. Follow-up:
  pruned 190 dead studies, ran `course:discover` for 14 more (coverage
  →36.4%/92.0%). Report: `docs/reviews/2026-07-10-study-matching-v2.md`.
- **Video Index Refresh — §2 Ship Checklist** (2026-07-08, PR #47): backfilled
  descriptions/tags/views for all 1,708 videos, full rematch — coverage
  28.2%→72.8%, top-200 91.5%, cross-family 0%. Monthly Action live (one repo
  checkbox pending).
- **Video Experience V1–V3** (2026-07-07, branch
  `claude/video-experience-v1-v3`): family fallback for empty video/study
  galleries (`family-resource-service.js`; shelves labelled "Videos for the
  <family>"), match-reason badges ("Covers this variation" / "Family overview",
  shared `variation-words.js` with the audit script), in-place youtube-nocookie
  player + localStorage watched state, monthly refresh Action (guarded; needs DB
  commit + secret to activate). Rescued the orphaned VideoGallery test into
  vitest. 745+207+9 e2e green (PR #46).

---

## Opening Family Rollups — Full Design History (branch `feature/opening-family-rollups`)

Feature: group a player's analysed openings by family on the Analyse page, with
per-family W/D/L and expandable per-variation breakdown. Shipped state lives in
`activeContext.md` / `progress.md`; this records the iteration path.

- **Phase 1 (2026-05-08):** 28-family taxonomy + ~140 override rules →
  build-time `family_id` enrichment on every ECO record (98.45% coverage).
  `GET /api/families` (routed via `pathResolver` for Vercel) serves family
  list + `opening_count`; `family_id` exposed on `/api/openings/search-index`
  (full mode, +10.36% raw, inside the 20% bandwidth gate; `s-maxage` bumped
  3600→86400). Initial Variation/Family toggle + `groupByFamily()` helper;
  client-side aggregation, `family_display_name` joined client-side.
- **Leader-dot redesign (2026-05-09):** Replaced Phase-1 UI with editorial
  leader-dot rows (dotted leader, display-weight result-coloured WR%,
  Best/Needs-work sub-meta), an `InlineLinkSwitch` primitive driving page-global
  VIEW + per-column ORDER switchers, `UncategorisedFootnote`, and a `useCountUp`
  WR% animation. Adopted the `design-system/` bundle as canonical brand
  reference. **Rejected on review** — unclear win/loss read, mismatched fonts,
  confusing expand percentages.
- **Distribution-bar redesign (2026-06-06):** Rebuilt `FamilyRow` around the
  shared `DistributionBar` (the liked W/D/L graph), used in both family and
  all-openings views. Dropped the WR% count-up + sub-meta.
- **Controls evolution (2026-06-06):** Restored production pills over the
  `InlineLinkSwitch` text links → then replaced the segmented family/all toggle
  with a single `Group by family` chip (clashed visually) → then, after
  measuring that 3 sort pills + chip wrap even at ~452px desktop columns,
  replaced visible sort pills with a compact `SortMenu` dropdown on both
  breakpoints. Final row: `[⊞ Group by family] [⇅ Sort ▾]`,
  group-left/sort-right, per-column state, family default. Deleted
  `AnalyseToolbar`, `SectionToolbar`, `InlineLinkSwitch`, `SortBar` and their
  CSS/tests along the way.

---

## TASK016: Design Overhaul — Chunks 1–5 (2026-03-21)

### Chunk 5: Search in TopBar on detail pages — DONE

- Route-aware `TopBarSearch` in `TopBar.tsx` with debounced server-side search
- "Surprise me!" button, "Discover" force-highlighted on detail pages
- Mobile search overlay, grid `1fr auto 1fr` centering
- Deleted `GlobalHeader.tsx`, `FloatingBackButton.tsx`, `ContentHeader.tsx`,
  `TopBarContext.tsx`; removed ~9KB dead CSS

### Chunk 3: Remove old navigation — DONE

- Removed `<LandingHeader />` from `LandingPage.tsx` and `AnalyseGamesPage.tsx`
- Deleted `LandingHeader.tsx` entirely (no remaining references)
- Removed all `.landing-header*` styles + responsive media query from
  `simplified.css`
- Reduced hero section `padding-top` from `100px` to `var(--space-8)` (desktop)
  and `var(--space-6)` (tablet/mobile)
- `GlobalHeader.tsx` kept for now (search logic useful for ContentHeader in
  chunk 5)

### Chunk 2: Responsive sidebar — collapse + bottom tabs — DONE

- `BottomTabBar.tsx` + `BottomTabBar.module.css` — fixed bottom nav (56px), two
  items (Discover, Analyse), hidden above 640px, orange active text
- Updated `App.tsx` — added `<BottomTabBar />` to layout
- Updated `simplified.css` — added `padding-bottom: 56px` on mobile

### Chunk 1: Layout shell — sidebar + content area grid — DONE

- `Sidebar.tsx` + `Sidebar.module.css` — persistent left sidebar with "Opening
  Book" wordmark, two nav items using `NavLink`, orange left-border indicator
- Updated `App.tsx` — `<Sidebar />` + `<main className="app-content">` wrapper
- Updated `simplified.css` — `.app` changed to CSS grid (`200px 1fr`),
  responsive breakpoints (64px at 900px, hidden at 640px)
- **Decision:** Dropped "OB" monogram — plain wordmark is cleaner.

---

## TASK015: Opening Tree Navigation (2026-03-18)

**Problem:** Related openings displayed as flat list grouped by ECO code. Users
couldn't see the tree structure — "what branches from here?" or "what could I
have played instead?" were unanswerable.

**Solution:** Vertical indented tree (file-explorer style) with collapsible
breadcrumb header, showing ancestor chain, current node (highlighted), siblings,
and children. Replaces `RelatedOpeningsTeaser` entirely.

**Backend:** `tree-service.js` with pre-built index (~99ms build, cached 1hr).
Two maps: `moveIndex` and `childrenMap`. Routes: `GET /fen/:fen/tree` and
`GET /fen/:fen/tree/children`. 20 backend test assertions.

**Frontend:** `OpeningTree.tsx` + `OpeningTree.module.css`. Collapsed breadcrumb
bar with clickable pills. Expanded: vertical indented tree (max-height 400px).
Current node: orange left border. Keyboard navigation (ARIA treeview). Lazy-load
children on expand. JS-driven height animation with `prefers-reduced-motion`. 15
Vitest tests.

**Integration:** Replaced `RelatedOpeningsTeaser` in `OpeningDetailPage.tsx`.
Inline fetch pattern matching existing page data loaders.

**Cleanup:** Deleted 9 dead files (RelatedOpeningsTeaser, RelatedOpeningsModal,
RelatedOpeningsTab, VariationItem, OpeningFamily, useRelatedOpenings, 3 tests).

**Files Created:**

- `packages/api/src/services/tree-service.js`
- `packages/web/src/hooks/useOpeningTree.ts`
- `packages/web/src/components/detail/OpeningTree.tsx` + `.module.css`
- `tests/unit/tree-service.test.js`
- `packages/web/src/components/detail/__tests__/opening-tree.test.tsx`

---

## Documentation Upgrade: User Journeys (2026-03-19)

Created `.github/memory-bank/user-journeys.md` with detailed breakdowns of
Landing Page, Opening Detail Page, and Analyse Page. Updated README.md and
CLAUDE.md to reference it.

---

## Video Pipeline Overindexing Fix (2026-03-16)

**Problem:** Matcher too generous — videos appeared on wrong openings.

**Root Causes:**

1. `StaticFileGenerator` received string instead of options object (wrong output
   path)
2. `parseAliases()` created single-word fragments that matched too broadly
3. Content-only false positives from description mentions

**Fixes:** Options object fix, 2+ word alias minimum,
`titleMentionsDifferentOpening()` rejects cross-opening matches, `minMatchScore`
raised from 40→60, sub-variation penalty (-15).

**Also discovered:** Two `video-index.json` copies — pipeline writes to
`api/data/`, API reads from `packages/api/src/data/`.

---

## TASK012: Video Pipeline Overhaul (2026-03-15)

**Problem:** Two separate pipeline implementations with divergent logic, scorer
bugs, missing channels, no full rebuild or zero-cost re-scoring mode.

**Solution:** Unified single pipeline with three modes: incremental (RSS), full
(YouTube API catalogue rebuild), rematch (re-score only, zero API cost).

**Scorer Fixes:** Removed broad `'vs'` penalty, added targeted player-vs-player
regex. agadmator promoted to goodEducator. chess24 demoted to entertainment.
Added chessbrah, ben finegold to goodEducators.

**Config:** Added 5 channels (John Bartholomew, ChessExplained, PowerPlayChess,
Remote Chess Academy, TheChessWebsite). Parallelized RSS fetching.

**New Modes:** `channel-discovery.js` for full catalogue, mode-based dispatch in
`index.js`. npm scripts: `pipeline`, `pipeline:full`, `pipeline:rematch`.

**Cleanup:** Deleted `channel-first-video-pipeline.js`,
`channel-first-indexer.js`. Tests: 626 passing (10 scorer, 7 channel-discovery,
4 pipeline-modes).

---

## TASK011: Optimize Search Bandwidth & Vercel Limits (2026-03-14)

**Problem:** Vercel Fast Origin Transfer hit 20.39 GB (10 GB limit).
`/api/openings/all` (24.8 MB) fetched on every mount × crawler traffic = 96.8
GB.

**Fix:** CDN cache headers on all API routes. GlobalHeader: server-side search
(zero preload). OpeningDetailPage: `/search-index` (1.6 MB, 94% reduction).
147/147 frontend tests, all backend suites pass.

---

## TASK010: Local Repertoire via Browser Storage (2026-03-13)

**Feature:** Star openings from detail page, access in "My Repertoire" on
landing page. localStorage-backed with `useSyncExternalStore`, same-tab +
cross-tab sync. StarButton with CSS pulse animation. RepertoireSection with
compact cards. Safe localStorage write handling. 12 hook tests. 147/147 tests.

---

## Sort Controls for Personal Opening Stats (2026-03-12)

Sort by "Most played", "Best first", "Worst first" in Analyse page. Segmented
pill control between insights card and opening lists. UX copy improvements.

---

## TASK009: SEO — Get Opening Pages Indexed by Google (2026-02-28)

**Problem:** All 12,377+ pages served identical HTML. Google indexed only home
page.

**Solution:** Build-time SEO lookup generator → `seo-lookup.json` (1.7MB).
Vercel Edge Middleware injects unique `<title>`, `<meta>`, OG, Twitter Card
tags. React 19 native metadata + JSON-LD structured data in page components.
135/135 frontend tests pass.

---

## TASK007: Mobile Horizontal Overflow (2026-02-23)

**Root Cause:** CSS Grid `1fr` resolves to `minmax(auto, 1fr)`. When
`RelatedOpeningsTeaser` moved to direct grid child without `min-width: 0`,
intrinsic width expanded the track beyond viewport.

**Fix:** `minmax(0, 1fr)` at all breakpoints +
`.two-column-layout > * { min-width: 0; }`. Removed ineffective
`overflow-x: hidden`. Playwright regression test added.

---

## TASK004: Course Discovery Pipeline (2026-02-18)

Two-step pipeline: `discover-popular.js` (search Lichess, 500+ likes) →
`add-studies.js` (fetch PGN, match FENs to ECO). 630 curated studies, 6,142
entries across 2,255 FENs. Removed deprecated author-based pipeline. 491 tests
across 35 suites.

---

## Earlier Work (2026-01-30 – 2026-02-10)

- **Practice Mode:** Click-to-move + drag-and-drop, Lichess-style visual
  indicators (previous move highlight, legal move dots, capture rings).
- **Personal Opening Explorer:** Chess.com + Lichess integration, actionable
  insights dashboard, sort controls, session cache persistence.
- **PGN Opening Identification:** Modal on landing page, chess.js parsing,
  deepest match finding.
- **Related Openings UI:** Inline expandable teaser, JS height animation,
  unified card header pattern, ECO pill metadata.
- **State persistence:** Form inputs + dashboard results cached in
  sessionStorage.
- **AD-015:** Previous move highlighting (yellow-green) separate from selection
  (bright yellow).

---

## Progress detail trimmed 2026-07-07 (June 2026 entries)

- **Video Matching — Intra-Family Variation Guard** (2026-06-23): review found
  the earlier 28%→71% coverage gain was mostly family-level blanketing (one
  Sicilian video on 1,400+ pages; Dragon videos on Najdorf pages). Added a guard
  (`calculateMatchScore` + `specific_variation_keywords` in
  `config/video_matching.json`): family matches on sub-variation pages are kept
  only if the video names that page's variation; generics still cover pages;
  move-tail pages match on named tokens. Deleted dead `runNewMatching()`.
  Offline re-score of the 917 live videos: coverage 67%, top-200 81.5%,
  #1-specificity 36.9%→61.9%, cross-family 0%. Denylist can't catch the long
  tail — real fix is variation-level classification (taxonomy/LLM), the
  recommended next project.
- **Video Pipeline Fixes** (2026-06-13): implemented assessment Tiers 1+2 —
  move-prefix family compatibility (`opening-families.js`, cross-family
  7.9%→0%), variation-specificity scoring + view/recency tiebreakers (#1
  specificity 36.9%→57.6%), move-notation name matching (coverage 28.2%→71%),
  pre-filter word boundaries, weights in `config/video_matching.json`, channel
  tiers from `youtube_channels.json`, DB persists description/tags, FEN
  case-collision fix with legacy fallback, `scripts/audit-video-matches.js`
  harness. Verified by simulated rematch over the 917 live videos. Ship via
  backfill → rematch.
- **Video Pipeline Assessment** (2026-06-13): measured live `video-index.json`
  against ECO + popularity data
  (`docs/reviews/2026-06-13-video-pipeline-assessment.md`) — provenance strong
  (allowlist, 94% family accuracy), variation-level matching weak (37% specific
  #1, 6% cross-family, 85% top-4 score ties, 3-month staleness, word-boundary
  pre-filter bugs). Tiered fix plan + regression-metric harness proposed; no
  code changes.
- **Common Plans Mismatch — Investigation + Proposal** (2026-06-12): traced the
  design-review "wrong plans" finding to `getECOAnalysis` serving the
  alphabetically-first record per ECO bucket (95.9% of pages affected, not an
  LLM-quality issue). Added `scripts/audit-common-plans.js` (provenance +
  content lint) and `docs/proposals/2026-06-12-common-plans-provenance.md` (fix
  options + 3-tier evaluation framework).
- **Design Review Fixes — Fake Stats + Search Dropdown** (2026-06-11): full
  design critique of home/analyse/opening pages
  (`docs/reviews/2026-06-11-design-review.md`), then fixed the two critical
  findings — `OpeningCard` no longer fabricates W/D/L stats with `Math.random()`
  (renders no bar when data is missing), and the home-page search dropdown is no
  longer painted over/click-blocked by "My repertoire" (`sectionReveal`
  fill-mode `both` → `backwards`; retained transforms created permanent stacking
  contexts). Search suggestions now show full distinguishing move lines
  (tail-truncated) instead of identical 6-token prefixes. Remaining findings +
  recommendations documented in the review doc.
- **CI Green-Up** (2026-06-06, PRs #35/#36/#37): fixed four pre-existing CI bugs
  so `CI` + `Coverage` workflows pass on `main` — broken API lint script path,
  ESLint/Prettier rule conflict (~110 spurious + 17 real errors), coverage job
  missing `pull-requests: write`, and codecov badge failing tokenless on
  protected `main`. Added `families.routes.js` branch tests (88.46% → 90.23%
  global branches). The "format drift" was a Windows-CRLF mirage; `format:check`
  was already green on CI.
- **Opening Family Rollups** (2026-06-06, branch
  `feature/opening-family-rollups`): Analyse page groups a player's openings by
  family with an expandable W/D/L distribution-bar row — a shared
  `DistributionBar` powers both the family and all-openings views. Per-side
  `Group by family` toggle (default on) + compact `Sort` dropdown; uncategorised
  openings collapse to a footnote. Built on the Phase-1 28-family taxonomy,
  build-time `family_id` enrichment (98.45%), and `GET /api/families`. Pre-prod
  hardening: rollups aggregate over the full classified set (no top-10
  truncation; cache `v3`→`v4`), unified pure `wins/games` win rate, in-component
  scroll for long lists, featured cards gated to ≥4 games + "Needs work" by loss
  rate, `/api/families` retry + slug fallback, 34px mobile tap targets,
  unrecognised count surfaced. 195 frontend tests, build + format clean.
  (History in `archive.md`.)

## Slice 1 Evidence Engine — original sidebar (superseded 2026-07-13)

Branch `feat/evidence-engine-slice1`; PRD
`docs/proposals/2026-07-11-deviation-trainer-prd.md` §5. Original UI (before the
2026-07-13 right-column redesign): `LevelLens` (named levels Beginner→Masters,
Elo in tooltips) above `WinRatePanel` — a titled "Win rates / Who wins from
here" card carrying a zero-interaction **level-check strip** (`levelCheck.ts`:
≥8 pp gap, ≥100 games/sample, points % for side to move), the W/D/L bar, notable
master games (×3, avg-rating ranked, one per player), and a closing "Analyse
your own games" bridge link (`bridge_click`). `OpeningNavigator` below:
single-row book/explorer merge (`bookExplorerMerge.ts`, ≥20-game floor),
`off-book` rows, "Instead of 3.e3" alternatives via parent-FEN fetch.
Design-system preview was `components-level-check.html`.

**2026-07-13 redesign** (Claude Design "Opening Detail Right Column.dc.html",
match-mock-exactly): merged `LevelLens` into `WinRatePanel` as one Stats card
(pills → Total games / Average Elo stat pair → win bar → master games);
**dropped** the level-check strip (+ `levelCheck.ts`), the analyse bridge link,
and the card title. Added a games-weighted position `averageRating` to the
explorer normaliser (from `moves[].averageRating`). Restyled `OpeningNavigator`
rows to a two-line stacked layout (move+name / white% · bar · black% · count)
with the result bar now visible on mobile. Preview replaced by
`components-opening-detail-right-column.html`. Spec
`docs/superpowers/specs/2026-07-13-opening-detail-right-column-redesign-design.md`.

---

## Opening Detail Mobile Overhaul (2026-07-18, PR #53, branch `claude/mobile-ui-opening-details-ph33t8`)

Implemented Claude Design handoff **"Opening Details Mobile 2a — one data
surface"** at ≤767px. A `useIsMobile()` matchMedia hook (safe desktop default in
jsdom/SSR) branches `OpeningDetailPage` into a mobile tree (AD-012 in
context.md); desktop keeps its two-column layout.

**Mobile layout (top → bottom):** compact left-aligned header, swipeable tag
row, star + "Saved to repertoire" toast; board card with a control row
(`‹‹ ‹ ›`, Practice, `…` → **PositionSheet** bottom sheet with FEN/Copy/Analyse)
above a full-width move row — a horizontal carousel (auto-scrolled to the
current move) that expands to the whole line as a wrapped notation grid
(`renderMoveNodes` shared by both). **Editorial reading zone**: Overview +
Common plans share sentence-case section headings over un-carded left-rule
prose; Overview has a 4-line clamp + Read more. **MobileDataSurface**: W/D/L
gradient strip, sticky scrollable LevelLens pills (card uses `overflow: clip` so
sticky works), level stats with loading dim + snapshot fallback
(`useExplorerQuery` exposes loading/failed), collapsible breadcrumb,
Continuations + "Instead of X" stacked rows (shared rules extracted to
`lib/openingBook.ts`). **MobileMasterGames** collapsed accordion; CommonPlans
`mobileGroups` layout; **MobileResources** accordion + swipeable search pills.
**SearchOverlay** replaces TopBar's bare mobile search: empty state = Recent
(`lib/recentOpenings.ts`) + My repertoire (cap 5) + Surprise me; live results
with Searching…/no-results states. Legacy `MobileSearchOverlay` + global CSS
removed.

**Also in this PR:** desktop right column reordered Overview → stats → book;
scroll fix — `ScrollToTop` on route change + move strip scrolls its container
horizontally only.

**Files:** `components/detail/mobile/` (4 components), `SearchOverlay`,
`useMediaQuery`, `useExplorerQuery`, `openingBook.ts`, `recentOpenings.ts`,
LevelLens `scrollable`, CommonPlans `mobileGroups`, App `ScrollToTop`, page +
css. Design-system lockstep: preview cards `components-opening-detail-mobile`
(new) + right-column (reordered), 2a mock in `project/explorations/`. No token
changes. Docs: user-journeys, context.md AD-012. Verified: 323 frontend tests
(35 new); tsc/ESLint/Prettier clean; Playwright at 390/320/1280px.

## 2026-07-30 — One search row for all three surfaces (`ux/phase-5-analyse`)

Typing changed how an opening was **drawn**, not just which were listed — three
result-row implementations and two hub rows across two type scales.
`shared/SearchRow.tsx` now serves every surface and both states. Fell out of it:
the hero hub panel had _zero_ padding ("Recent" read as clipped); the top-bar
dropdown was pinned to its 240px field, which is why Surprise me dropped its
visible hint there; the results list showed under four of twenty. Leading icons
dropped entirely — they put the name at 39px before typing and 13px after, and
only repeated the section heading. Surprise me keeps an orange label (an action
among destinations, the rule `.cancelBtn`/`.back-link` already follow) but no
icon: Sparkles reads as AI, shuffle/dice as a mode or a gamble, a gift or
mystery box as a reward. Mobile's hero now hands off to the full-screen overlay
instead of running a second search model on one screen. Spec §3.3; parity guard
at `shared/__tests__/search-row-parity.test.tsx`.

## UX review phases 0–3 (2026-07-27..28)

Moved out of `progress.md` on 2026-08-02 to keep it under 100 lines.

- **0 — systemic.** Button tiers, self-labelling `ResultBar`, decorative orange
  removed, sentence case throughout, focus ring, 44px star target.
- **1 — Discover closes the loop.** `Toast` with Undo, star on every card,
  persistent top-bar search, `SearchHub`, `/repertoire`, mobile tabs.
- **2 — `GET /api/openings/browse`.** Items, `total`, `remaining` and facet
  counts from one request, so the count and the grid cannot disagree.
- **3 — the faceted filter bar.**

## Analyse summary card row (2026-08-02)

Full rationale lives in the maintainer notes at
`design-system/project/preview/components-analyse.html`, which record what the
three cards now agree on (bottom-anchored figures, one 8px bar height, one 20px
headline tier, one micro-label style) and what was deliberately left alone (the
two opening cards keep their single-fill rate bars; mobile keeps its three stat
tiles rather than adopting the desktop record card).

## Progress one-liners archived 2026-07-20 (June–early-July 2026)

- **Ko-fi tip jar** (2026-07-11): site-wide footer support link
  (`ko-fi.com/wfred`) via a `KOFI_URL` constant in `Footer.tsx`; `.support`
  shares the `.contribute` link styling. Reworded the adjacent feedback link
  "Help make Opening Book better" → "Send feedback". Added `.claude/launch.json`
  (web dev-server preview config).
- **Analyse Dashboard Redesign** (2026-07-07, PR #45): personal-performance
  tokens (sage/grey/brick — losses no longer glare cream), carded performance
  sections (desktop + mobile family cards), slim distribution bars, warm
  hovers/popovers, sort-menu a11y polish, dead mobile-row path removed.
- **Review Remediation — Perf + Feature Fixes** (2026-07-06): implemented review
  §1.1–1.3 + §2.2–2.4 — route splitting + static MiniBoard (main chunk 409→189
  kB), lazy Analyse index fetch, self-hosted fonts, sharded edge SEO lookup
  (16×~107 kB), `/api/openings/all` → 410, aggregate `/api/openings/page/:fen`
  (5 calls → 1), `api/data/` now the single canonical data home (copy gotcha
  gone), PersonalOpeningStats refactor, practice lines extend into popular
  continuations, cards are real links, audio fetch path removed, copy/chip nits.
  724+200 tests green.
- **Project Review — Perf + Features + Video Experience** (2026-07-02): full
  review vs the learning-resource goal, split across
  `docs/reviews/2026-07-02-project-review.md` (perf P1–P11, ops S1–S4,
  learner-journey feature ranking, master-games/journey addendum) and
  `docs/reviews/2026-07-02-video-experience-review.md` (verified the improved
  video index NEVER shipped — both copies stamped 2026-03-15, old 28.2%/7.9%
  baseline still live; ship checklist + discovery plan V1–V6 incl. family
  fallback, embedded player, chapter-level matching). Also found ALL popularity
  stats dated 2025-07-15 and E2E specs absent from CI; the "16 broken tests"
  note was stale (716+198 green).
- **Video Matching — Intra-Family Variation Guard** (2026-06-23): family matches
  on sub-variation pages kept only if the video names the variation
  (`specific_variation_keywords`); offline re-score: coverage 67%, top-200
  81.5%, #1-specificity 61.9%, cross-family 0%.
- **Video Pipeline Fixes + Assessment** (2026-06-13): assessment doc + Tiers 1+2
  — family compatibility, specificity scoring, tiebreakers, word-boundary
  pre-filter, config-driven weights/tiers, DB persists description/tags,
  `audit-video-matches.js` harness. Ship via backfill → rematch.
- **Common Plans Mismatch — Investigation + Proposal** (2026-06-12):
  `getECOAnalysis` serves the alphabetically-first record per ECO bucket (95.9%
  of pages); audit script + provenance proposal added, no code fix yet.
- **Design Review Fixes — Fake Stats + Search Dropdown** (2026-06-11): killed
  `Math.random()` W/D/L on OpeningCard; fixed dropdown stacking (fill-mode
  `both` → `backwards`); suggestions show distinguishing move tails.
- **CI Green-Up** (2026-06-06, PRs #35/#36/#37): four pre-existing CI bugs fixed
  (lint path, ESLint/Prettier conflict, coverage permissions, codecov badge);
  branches coverage 90.23%.
- **Opening Family Rollups** (2026-06-06): Analyse groups openings by family
  with expandable W/D/L rows (shared `DistributionBar`), per-side group/sort
  controls, 28-family taxonomy + `GET /api/families`.
