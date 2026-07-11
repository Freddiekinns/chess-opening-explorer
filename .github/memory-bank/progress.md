# Progress: Chess Opening Explorer

## What's Done (newest first)

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
- **TASK009 — SEO** (2026-02-28): Edge Middleware + React 19 metadata + JSON-LD
  for 12,377 pages.
- **TASK007 — Mobile Overflow Fix** (2026-02-23): CSS Grid `minmax(0,1fr)`;
  Playwright regression test.
- Earlier work (Course Discovery, Practice Mode, Personal Explorer, PGN ID,
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
