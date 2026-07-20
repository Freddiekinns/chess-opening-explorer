# Progress: Chess Opening Explorer

## What's Done (newest first)

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
- **Ko-fi tip jar** (2026-07-11): site-wide footer support link
  (`ko-fi.com/wfred`) via a `KOFI_URL` constant in `Footer.tsx`; `.support`
  shares the `.contribute` link styling. Reworded the adjacent feedback link
  "Help make Opening Book better" → "Send feedback" so the two no longer read as
  competing. Added `.claude/launch.json` (web dev-server preview config).
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
  81.5%, #1-specificity 61.9%, cross-family 0%. (Details in `archive.md`.)
- **Video Pipeline Fixes + Assessment** (2026-06-13): assessment doc + Tiers 1+2
  — family compatibility, specificity scoring, tiebreakers, word-boundary
  pre-filter, config-driven weights/tiers, DB persists description/tags,
  `audit-video-matches.js` harness. Ship via backfill → rematch. (Details in
  `archive.md`.)
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
  controls, 28-family taxonomy + `GET /api/families`. (History in `archive.md`.)
- Older work through 2026-05 (TASK008 feature roadmap; sticky-board detail
  layout; primary-domain migration to `openingbook.xyz`; mobile footer/card
  polish; TASK016 design overhaul + token migration; TASK015 opening-tree nav;
  user-journeys doc; video overindexing fix; TASK012 video pipeline; TASK011
  search bandwidth; TASK010 local repertoire; TASK009 SEO; TASK007 mobile
  overflow; plus Course Discovery, Practice Mode, Personal Explorer, PGN ID,
  related-openings UI, footer standardisation, sort controls, coverage
  reporting, state persistence, test cleanups) — see `archive.md`.

## What's Left

- **Video programme**: enable the monthly refresh Action (user: commit
  `tools/data/videos.sqlite` + confirm `YOUTUBE_API_KEY` secret); run the §2
  ship checklist locally (backfill → pipeline → audit → commit index); later V4
  family shelves, V5/V6 taxonomy + chapter matching, studies data work
- **TASK016 chunk 9**: Global polish pass (broken tests, dead CSS, focus rings)
- **Bottom nav investigation**: Bottom nav may be missing on Analyse page —
  verify
- **TASK006 — Coverage**: Backend 90%+, frontend 70%+ targets
- **Advanced Filtering**: Filter by win rate, draw rate, etc.
- **Tooltip Abstraction**: Central ARIA tooltip component

## Known Issues

- **React 19 / Testing Library**: Compatibility area to watch during upgrades
