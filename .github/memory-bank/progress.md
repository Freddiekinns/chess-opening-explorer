# Progress: Chess Opening Explorer

## What's Done (newest first)

- **Agent docs restructure** (2026-07-25): audited all 31 agent-facing docs
  against Claude 5 context-engineering guidance; split into portable `AGENTS.md`
  - scoped `packages/*/AGENTS.md`, converted workflows and the design system to
    `.claude/skills/`, deleted `.github/instructions/` and `.agent/`, fixed four
    broken npm scripts. Audit: `docs/reviews/2026-07-25-agent-docs-audit.md`.
- **Video matcher: modifier-aware sibling-variation fix** (2026-07-20):
  boundary-safe name matching rejects sibling variations
  (Hyper/Accelerated/plain Dragon no longer cross-contaminate). Sibling matches
  301→0, top-200 coverage held, contamination 0. 15 new tests.
- **Opening-detail & analyse UI tweaks** (2026-07-20): "Most popular next moves"
  caption, unified mobile Analyse cards via a shared `PerfBar`, full move lines
  on grouped and flat lists. 326 frontend tests green.
- **Opening detail mobile overhaul** (2026-07-18, PR #53): Claude Design 2a "one
  data surface" at ≤767px — compact header, single board control row, merged
  data card, full-screen search overlay, plus a route-change scroll fix. 323
  tests.
- **Mobile landing filter UI fix** (2026-07-15): ECO category filter collapses
  to a dropdown at ≤767px; level stays a swipeable pill row. 288 tests.
- **Sidebar unification + explorer proxy** (2026-07-12): `/api/explorer` proxy
  (Lichess gated the explorer behind auth in March), then LevelLens governing
  WinRatePanel and the merged "Next moves" opening book. 284 tests.
- **Deviation Trainer Slice 1 — Evidence Engine** (2026-07-11): Lichess explorer
  client, level-check strip, rating-band selector, notable master games,
  `/api/event` beacon. PRD:
  `docs/proposals/2026-07-11-deviation-trainer-prd.md`.
- **Study Matching V2** (2026-07-10/11): cached fetch + offline
  `course:rematch`, multi-anchor scored matcher with family guard, schema v2.
  Coverage 18.2%→36.4% all / 62.5%→92.0% top-200; contamination 5.8%→0; dupes
  1,329→0.
- **Video Index Refresh** (2026-07-08, PR #47): backfilled metadata for all
  1,708 videos, full rematch — coverage 28.2%→72.8%, top-200 91.5%, cross-family
  0%.
- **Video Experience V1–V3** (2026-07-07): family fallback shelves, match-reason
  badges, in-place youtube-nocookie player, monthly refresh Action (PR #46).
- Work through 2026-07-11 (Ko-fi tip jar; Analyse dashboard redesign, PR #45;
  review remediation; June's intra-family variation guard + pipeline fixes;
  Common Plans investigation; fake-stats + search-dropdown fixes; CI green-up;
  opening family rollups) — see `archive.md`.
- Older work through 2026-05 (TASK008 feature roadmap; sticky-board detail
  layout; primary-domain migration to `openingbook.xyz`; mobile footer/card
  polish; TASK016 design overhaul + token migration; TASK015 opening-tree nav;
  user-journeys doc; video overindexing fix; TASK012 video pipeline; TASK011
  search bandwidth; TASK010 local repertoire; TASK009 SEO; TASK007 mobile
  overflow; plus Course Discovery, Practice Mode, Personal Explorer, PGN ID,
  related-openings UI, footer standardisation, sort controls, coverage
  reporting, state persistence, test cleanups) — see `archive.md`.

Full detail for the 2026-07-07 → 2026-07-20 entries is in `archive.md`.

## What's Left

- **Video programme**: enable the monthly refresh Action (commit
  `tools/data/videos.sqlite` + confirm `YOUTUBE_API_KEY` secret); later V4
  family shelves, V5/V6 taxonomy + chapter matching, studies data work
- **TASK016 chunk 9**: Global polish pass (broken tests, dead CSS, focus rings)
- **Bottom nav investigation**: may be missing on the Analyse page — verify
- **TASK006 — Coverage**: shrink the `collectCoverageFrom` exclusion list in
  `package.json`; the 90% gate currently measures a subset of the backend
- **Advanced Filtering**: Filter by win rate, draw rate, etc.
- **Tooltip Abstraction**: Central ARIA tooltip component
- **Agent docs**: run `/doctor` locally as a second opinion on the 2026-07-25
  restructure

## Known Issues

- **React 19 / Testing Library**: Compatibility area to watch during upgrades
