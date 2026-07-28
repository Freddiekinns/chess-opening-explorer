# Progress: Chess Opening Explorer

One line per completed task. Detail lives in git commits and `archive.md`.

## What's Done (newest first)

- **UX review phase 3 — faceted filter bar** (2026-07-28,
  `ux/phase-3-filter-bar`, stacked on phase 2): two unlabelled pill rows become
  Level · Style · Family · Sort, each stating its own value; grid, count and
  facet counts come from one `/api/openings/browse` request, so the count
  mismatch on the landing page is gone. Filter state in URL params (back
  restores the facets); cards stay crawlable `<Link>`s; families grouped by
  first move, with the 2 grab-bag families in "Other openings" rather than filed
  under a move that is not theirs. One mobile sheet, all four facets, applied
  live, portalled to `<body>` (a transformed ancestor was capturing its
  `position: fixed`). `ComplexityFilters` and `CategoryFilter` deleted. 833
  backend + 413 frontend green.
- **UX review phase 2 — browse API** (2026-07-28, `ux/phase-2-browse-api`,
  stacked on phase 1): `GET /api/openings/browse` returns items, `total`,
  `remaining` and facet counts from one index in one request, so the count on
  screen and the grid contents cannot disagree. One primary style per opening
  (raw `style_tags` are ~7 per opening and would give every bucket half the
  corpus); facets exclude their own dimension; unknown values 400; page size
  capped at 48. No UI change. 829 backend tests green.
- **UX review phase 1 — Discover closes the loop** (2026-07-27,
  `ux/phase-1-discover`, stacked on phase 0): shared `Toast` with Undo +
  `useRepertoireToast` (one place decides wording and timing), star on every
  grid card, slim empty prompt so content leads a first visit, persistent
  top-bar search on every page, shared `SearchHub` for desktop dropdown and
  mobile overlay, `/repertoire` route (noindex), three mobile tabs with a count
  badge. Find → save → revisit no longer needs a detail page. 372 frontend tests
  green.
- **UX review phase 0 — systemic pass** (2026-07-27, `ux/phase-0-systemic` →
  `feat/ux-review`): one button spec (Practice primary, Load more tertiary),
  self-labelling `ResultBar` adopted by both `OpeningCard` variants, decorative
  orange removed, one repertoire name, sentence case, global focus ring, 44px
  star target. No behaviour change. 336 frontend + 784 backend green.
- **Opening-detail & analyse UI tweaks** (2026-07-20): "Most popular next moves"
  caption, mobile show-more 5→3, unified mobile Analyse cards via a shared
  `PerfBar`, full move lines in both lists. 326 frontend green.
- **Opening detail mobile overhaul** (2026-07-18, PR #53): Claude Design 2a "one
  data surface" at ≤767px — compact header, board control row + FEN sheet, one
  merged data card with sticky level pills, accordions, search overlay; desktop
  right column reordered; `ScrollToTop` fix. 323 green.
- **Mobile landing filter UI fix** (2026-07-15): long ECO labels clipped in the
  mobile pill row → `CategoryFilter` dropdown at ≤767px. 288 green.
- **Sidebar unification + explorer proxy** (2026-07-12): `/api/explorer` proxy
  (Lichess gated the explorer behind auth 2026-03), then LevelLens governs
  WinRatePanel and the Opening book; fixed move-number off-by-one. 284 green.
- **Deviation Trainer slice 1 — evidence engine** (2026-07-11): Lichess explorer
  client, level-check strip, rating-band selector, master games, Analyse bridge
  card, `/api/event` beacon.
- **Ko-fi tip jar** (2026-07-11): footer support link; "Send feedback" reword;
  added `.claude/launch.json`.
- **Study matching V2** (2026-07-10/11): cached fetch + offline rematch,
  multi-anchor scored matcher, schema v2, dual-schema audit. Coverage
  18.2%→35.7% all / 62.5%→91.5% top-200; contamination and dupes → 0.
- **Video index refresh — §2 ship checklist** (2026-07-08, PR #47): backfilled
  all 1,708 videos, full rematch — coverage 28.2%→72.8%, cross-family 0%.
- **Video experience V1–V3** (2026-07-07, PR #46): family fallback for empty
  galleries, match-reason badges, in-place youtube-nocookie player + watched
  state, monthly refresh Action (guarded).
- **Analyse dashboard redesign** (2026-07-07, PR #45): personal-performance
  tokens (sage/grey/brick), carded sections, slim distribution bars.
- **Review remediation — perf + features** (2026-07-06): route splitting +
  static MiniBoard (main chunk 409→189 kB), self-hosted fonts, sharded edge SEO
  lookup, `/api/openings/all` → 410, aggregate `/api/openings/page/:fen`,
  `api/data/` now the single canonical data home. 724+200 green.
- Older work through 2026-07-02 (project review — two review docs, found the
  improved video index never shipped and popularity stats stale since
  2025-07-15; video matching + pipeline hardening — intra-family variation
  guard, specificity scoring, `audit-video-matches.js`, 67% coverage;
  common-plans ECO-bucket investigation — still no code fix; design review fixes
  killing `Math.random()` W/D/L and the dropdown stacking bug; CI green-up +
  28-family taxonomy and `GET /api/families`; TASK008 feature roadmap;
  sticky-board detail layout; primary-domain migration to `openingbook.xyz`;
  mobile footer/card polish; TASK016 design overhaul + token migration; TASK015
  opening-tree nav; user-journeys doc; video overindexing fix; TASK012 video
  pipeline; TASK011 search bandwidth; TASK010 local repertoire; TASK009 SEO;
  TASK007 mobile overflow; plus Course Discovery, Practice Mode, Personal
  Explorer, PGN ID, related-openings UI, footer standardisation, sort controls,
  coverage reporting, state persistence, test cleanups) — see `archive.md`.

## What's Left

- **UX review phases 4–5**: desktop detail shell (4), Analyse (5) — both land on
  `feat/ux-review`, which merges to `main` as a single PR. Plans written when
  reached.
- **Video programme**: enable the monthly refresh Action (user: commit
  `tools/data/videos.sqlite` + confirm `YOUTUBE_API_KEY` secret); later V4
  family shelves, V5/V6 taxonomy + chapter matching, studies data work
- **Bottom nav investigation**: may be missing on Analyse page — verify
- **TASK006 — Coverage**: backend 90%+, frontend 70%+ targets
- **Win-rate filtering**; central ARIA tooltip component. (Win-rate _sort_ was
  rejected: a min-sample floor makes `total` depend on `sort`.)

## Known Issues

- **React 19 / Testing Library**: Compatibility area to watch during upgrades
