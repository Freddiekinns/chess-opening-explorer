# Progress: Chess Opening Explorer

One line per completed task. Detail lives in git commits and `archive.md`.

## What's Done (newest first)

- **Search hub and results merged** (2026-07-30, on `ux/phase-5-analyse`):
  typing swapped the hub out wholesale, taking Surprise me and any sight of the
  repertoire with it. Surprise me now survives as a footer outside the scroller
  (arrow-reachable); a `role="status"` count line above the list is the whole of
  the feedback — no "did you mean"; "Saved" badges ride on matching rows rather
  than a section that would draw a saved match twice. Phrasing rules live in
  `lib/searchResultsSummary.ts`: the truncated form names no total (the search
  counts everything above zero — 4,269 for "sicilian" vs a family of ~1,710),
  and the move variant only fires when every row opens with it, spelled as the
  data spells it. All three surfaces. Fixed en route: the overlay's last result
  was clipped by the bottom tab bar. 506 + 834 green.
- **UX review implementation audit** (2026-07-29, on `ux/phase-5-analyse`): all
  six phases read back against the handoff bundle. Six defects, all half-applied
  changes: the hero kept its filled Surprise button _and_ never got the hub; the
  Discover repertoire row removed without Undo; family group headings uppercased
  `1. Nf3` into `1. NF3`; mobile Practice stayed outlined because phase 0 only
  changed the desktop rule; a filter URL 400d on a change of case and blanked
  the grid; the Analyse gear announced itself as "Settings". Guards added for
  the two stylesheet-only rules. 472 + 834 green.
- **UX review phase 5 — Analyse** (2026-07-28, `ux/phase-5-analyse`): one
  header; "Career totals / Overall performance" → "This analysis / Your record"
  (it claimed a lifetime for one run's numbers); wins sage / losses brick; "GP"
  → "Games". Sample reports "Magnus · Hikaru" from committed fixtures
  (`npm run sample:generate`), dated on screen, never cached. PGN reduction
  moved to `packages/shared/src/utils/personal-analysis.ts` so generator and
  page share one implementation. Platform a real radio group; progress/errors
  moved inside the centred column; gear off the blank state into the overlay.
- **UX review phase 4 — opening detail desktop** (2026-07-28,
  `ux/phase-4-detail-desktop`): new `ExplorerCard` draws one border around the
  level filter and everything it governs; master games move outside it into a
  shared `MasterGamesCard` serving both breakpoints. `WinRatePanel` is now
  presentational; `WinRateBar` and `MobileMasterGames` deleted. One
  `explorerStats` module owns every level-scoped label. Every reveal names its
  payload. Explorer error beacon moved into the hook — it was desktop-only, so
  mobile failures went unreported.
- **UX review phases 0–3** (2026-07-27..28): **0** systemic — one button spec,
  self-labelling `ResultBar`, decorative orange out, sentence case, focus ring,
  44px star. **1** Discover closes the loop — shared `Toast` with Undo, star on
  every card, persistent top-bar search, `SearchHub`, `/repertoire`, three
  mobile tabs with a badge. **2** `GET /api/openings/browse` — items, `total`,
  `remaining` and facet counts from one index in one request, so the count and
  the grid cannot disagree; page size capped at 48. **3** the faceted bar —
  Level · Style · Family · Sort, each stating its value, URL-param state, cards
  stay crawlable, mobile sheet portalled to `<body>`.
- Work 2026-07-12..07-20 (opening-detail & analyse UI tweaks — shared `PerfBar`,
  full move lines; opening-detail mobile overhaul PR #53 — one data surface at
  ≤767px, sticky level pills, `ScrollToTop` fix; mobile landing filter dropdown;
  sidebar unification + the `/api/explorer` proxy after Lichess gated the
  explorer behind auth) — see `archive.md`.
- Work through 2026-07-11 (Deviation Trainer slice 1 — explorer client,
  level-check strip, rating-band selector, master games, `/api/event` beacon;
  Ko-fi tip jar; Study matching V2 — cached fetch + offline rematch, scored
  matcher, coverage 18.2%→35.7% all / 62.5%→91.5% top-200; video index refresh
  PR #47, coverage 28.2%→72.8%; video experience V1–V3 PR #46; Analyse dashboard
  redesign PR #45) — see `archive.md`.
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

- **Merge `feat/ux-review` to `main`**: all six phases done. PRs #58–#63 merge
  in order into the integration branch, then one PR to `main`. `main` has moved
  (AGENTS.md restructure) — expect conflicts in CLAUDE.md and the memory bank.
- **`packages/shared` has two latent defects** (phase 5): its `tests/` runs in
  no CI suite, so shared-module tests live in the web suite; and its barrels
  re-export without file extensions, so `dist/index.js` is unimportable from
  Node ESM — scripts import `dist/utils/<module>.js` directly.
- **Video programme**: enable the monthly refresh Action (user: commit
  `tools/data/videos.sqlite` + confirm `YOUTUBE_API_KEY` secret); later V4
  family shelves, V5/V6 taxonomy + chapter matching, studies data work
- **Mobile Discover shows no facet chips**: the trigger reads "Filters (2)", so
  which filters are active is legible only inside the sheet (desktop states each
  value). Change 07 drew chips; the spec simplified to one control and a count.
- **TASK006 — Coverage**: backend 90%+, frontend 70%+ targets
- **Win-rate filtering**; central ARIA tooltip component. (Win-rate _sort_ was
  rejected: a min-sample floor makes `total` depend on `sort`.)
- **`rankNotableGames` dedupes by exact player name**, so Lichess name variants
  ("Caruana, F." vs "Caruana, Fabiano") slip through as separate players.

## Known Issues

- **React 19 / Testing Library**: Compatibility area to watch during upgrades
