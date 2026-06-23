# Progress: Chess Opening Explorer

## What's Done (newest first)

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
- **TASK008 Rewrite — Feature Roadmap** (2026-05-04): UX roadmap of 12
  features + monetisation section + prioritised top three.
- **Opening Detail Layout — Sticky Board + FEN Polish** (2026-04-19): Sticky
  left column; FEN in DM Sans 13px.
- **Primary Domain Migration** (2026-03-29): SEO outputs → `openingbook.xyz`;
  shared site config, canonical/OG/JSON-LD, robots/sitemap, vercel.app→.xyz.
- **Mobile Footer + Landing Card Polish** (2026-03-29): Fixed footer/tab-bar
  overlap and square mobile card thumbnails.
- **TASK016 Phase B — Design Token Migration** (2026-03-28): "Warm Editorial
  Dark" applied; ~80 hardcoded colours → tokens; Analyse bars use result
  colours.
- **Footer Standardisation** (2026-03-28): MIT LICENSE added; footer
  consolidated; FeedbackSection removed.
- **Backend Test Cleanup** (2026-03-22): Removed console noise; fixed Jest
  worker teardown. 43/43 suites.
- **TASK016 — Test Suite Repair** (2026-03-22): Fixed 3 practice-mode specs;
  aria-pressed on colour toggles.
- **TASK016 — Design Overhaul** (2026-03-21): Top bar, bottom tabs, detail
  restructure, home + Analyse mobile redesign. Chunk 9 (polish) remaining.
- **TASK015 — Opening Tree Navigation** (2026-03-18): Vertical indented tree;
  backend tree-service + 2 routes; ARIA keyboard nav.
- **User Journeys Doc** (2026-03-19): `user-journeys.md` as source of truth.
- **Video Overindexing Fix** (2026-03-16): 2-word alias min, cross-opening title
  check, minMatchScore 40→60.
- **TASK012 — Video Pipeline Overhaul** (2026-03-15): Unified 3-mode pipeline;
  1,700+ videos.
- **TASK011 — Search Bandwidth & Vercel Limits** (2026-03-14): Removed 24.8 MB
  `/all` preload; server-side search + CDN cache headers.
- **TASK010 — Local Repertoire** (2026-03-13): localStorage "My Repertoire";
  useSyncExternalStore cross-tab sync.
- **Sort Controls** (2026-03-12): Segmented pill bar for personal stats.
- **TASK009 — SEO** (2026-02-28): Edge Middleware + React 19 metadata + JSON-LD
  for 12,377 pages.
- **TASK007 — Mobile Overflow Fix** (2026-02-23): CSS Grid `minmax(0,1fr)`;
  Playwright regression test.
- **Coverage Reporting** (2026-02-23): Vitest coverage for frontend.
- **State Persistence** (2026-02-23): sessionStorage for Analyse form + results.
- Earlier work (Course Discovery, Practice Mode, Personal Explorer, PGN ID,
  related-openings UI) — see `archive.md`.

## What's Left

- **TASK016 chunk 9**: Global polish pass (broken tests, dead CSS, focus rings)
- **Bottom nav investigation**: Bottom nav may be missing on Analyse page —
  verify
- **TASK006 — Coverage**: Backend 90%+, frontend 70%+ targets
- **Advanced Filtering**: Filter by win rate, draw rate, etc.
- **Tooltip Abstraction**: Central ARIA tooltip component

## Known Issues

- **React 19 / Testing Library**: Compatibility area to watch during upgrades
- **16 broken tests**: Deferred during TASK016 design overhaul (to be fixed)
