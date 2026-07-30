# Progress: Chess Opening Explorer

One line per completed task. Detail lives in git commits and `archive.md`.

## What's Done (newest first)

- **Search unified across the hero, top bar and mobile overlay** (2026-07-30, on
  `ux/phase-5-analyse`). Two passes: first _what_ typing showed — Surprise me
  and the repertoire were swapped out wholesale, so Surprise me now survives as
  a footer outside the scroller and "Saved" rides on matching rows (a count line
  was built then cut: the search scores every record above zero, 4,269 for
  "sicilian"). Then _how_ — three result-row implementations and two hub rows
  across two type scales, so typing redrew each opening at a different size,
  weight and layout. `shared/SearchRow.tsx` is now the one row. Fell out of it:
  the hero hub panel had zero padding ("Recent" read as clipped), the top-bar
  dropdown was pinned to its 240px field so Surprise me lost its visible hint
  there, the results list showed under four of twenty, and Sparkles → Shuffle
  (Sparkles is the AI glyph). Spec §3.3; parity guard at
  `shared/__tests__/search-row-parity.test.tsx`.
- **Master games moved up the mobile stack** (2026-07-30, on
  `ux/phase-5-analyse`): a **spec decision reversed**, not a bug — the UX-review
  table sent it below videos, studies and the search pills to "make both
  breakpoints agree", which was false: desktop renders it in the rail under the
  explorer card, resources full-width below. Now Overview · explorer · master
  games · plans · resources · search: position data first, then a gradient away
  from the page. Spec §3.2 rewritten; order guard at
  `pages/__tests__/mobile-stack-order.test.tsx`.
- **UX review implementation audit** (2026-07-29, on `ux/phase-5-analyse`): all
  six phases read back against the handoff bundle. Six defects, every one a
  change half-applied — two Surprise me controls in the hero, a silent
  repertoire removal, `1. NF3`, mobile Practice still outlined, a filter URL
  400ing on case, the gear announcing "Settings". **Detail in `archive.md`.**
- **UX review phase 5 — Analyse** (2026-07-28, `ux/phase-5-analyse`): one
  header; "Career totals / Overall performance" → "This analysis / Your record"
  (it claimed a lifetime for one run's numbers); wins sage / losses brick; "GP"
  → "Games". Sample reports from committed fixtures (`npm run sample:generate`),
  dated on screen. PGN reduction moved to
  `packages/shared/src/utils/personal-analysis.ts` so generator and page share
  one implementation. Platform a real radio group; gear into the overlay.
- **UX review phase 4 — opening detail desktop** (2026-07-28,
  `ux/phase-4-detail-desktop`): new `ExplorerCard` draws one border around the
  level filter and everything it governs; master games move outside it into a
  shared `MasterGamesCard` serving both breakpoints. `WinRatePanel` now
  presentational; `WinRateBar` and `MobileMasterGames` deleted. One
  `explorerStats` module owns every level-scoped label. Explorer error beacon
  moved into the hook — it was desktop-only, so mobile failures went unreported.
- **UX review phases 0–3** (2026-07-27..28): **0** systemic — one button spec,
  self-labelling `ResultBar`, decorative orange out, sentence case, focus ring,
  44px star. **1** Discover closes the loop — shared `Toast` with Undo, star on
  every card, persistent top-bar search, `SearchHub`, `/repertoire`, three
  mobile tabs with a badge. **2** `GET /api/openings/browse` — items, `total`,
  `remaining` and facet counts from one index in one request, so the count and
  the grid cannot disagree. **3** the faceted bar — Level · Style · Family ·
  Sort, each stating its value, URL-param state, mobile sheet portalled.
- Work 2026-07-12..07-20 (shared `PerfBar` + full move lines; opening-detail
  mobile overhaul PR #53 — one data surface at ≤767px, sticky level pills,
  `ScrollToTop` fix; mobile landing filter dropdown; sidebar unification + the
  `/api/explorer` proxy after Lichess gated the explorer) — see `archive.md`.
- Work through 2026-07-11 (Deviation Trainer slice 1 — explorer client, rating
  bands, master games, `/api/event` beacon; Ko-fi tip jar; Study matching V2,
  coverage 18.2%→35.7% all / 62.5%→91.5% top-200; video index refresh PR #47,
  28.2%→72.8%; video experience V1–V3 PR #46; Analyse dashboard redesign PR #45)
  — see `archive.md`.
- **Review remediation — perf + features** (2026-07-06): route splitting +
  static MiniBoard (main chunk 409→189 kB), self-hosted fonts, sharded edge SEO
  lookup, `/api/openings/all` → 410, aggregate `/api/openings/page/:fen`,
  `api/data/` now the single canonical data home. 724+200 green.
- Older work through 2026-07-02 (project review; video matching + pipeline
  hardening; common-plans ECO-bucket investigation, still no code fix; design
  review fixes killing `Math.random()` W/D/L and the dropdown stacking bug; CI
  green-up + 28-family taxonomy; TASK008 roadmap; sticky-board detail layout;
  domain migration to `openingbook.xyz`; TASK016 design overhaul + token
  migration; TASK015 opening-tree nav; TASK012 video pipeline; TASK011 search
  bandwidth; TASK010 local repertoire; TASK009 SEO; TASK007 mobile overflow;
  plus Course Discovery, Practice Mode, Personal Explorer, PGN ID,
  related-openings UI, sort controls) — see `archive.md`.

## What's Left

- **Merge `feat/ux-review` to `main`**: PRs #58–#63 in order into the
  integration branch, then one PR to `main`. Expect conflicts in CLAUDE.md +
  memory bank.
- **`packages/shared` has two latent defects** (phase 5): its `tests/` runs in
  no CI suite, so shared-module tests live in the web suite; and its barrels
  re-export without extensions, so `dist/index.js` is unimportable from Node ESM
  — scripts import `dist/utils/<module>.js` directly.
- **Video programme**: enable the monthly refresh Action (user: commit
  `tools/data/videos.sqlite` + confirm `YOUTUBE_API_KEY` secret); then V4 family
  shelves, V5/V6 taxonomy + chapter matching, studies data work
- **Mobile Discover shows no facet chips**: the trigger reads "Filters (2)", so
  which are active is legible only inside the sheet (desktop states each value).
- **TASK006 — Coverage**: backend 90%+, frontend 70%+ targets
- **Win-rate filtering**; central ARIA tooltip component. (Win-rate _sort_ was
  rejected: a min-sample floor makes `total` depend on `sort`.)
- **`rankNotableGames` dedupes by exact player name**, so Lichess name variants
  ("Caruana, F." vs "Caruana, Fabiano") slip through as separate players.

## Known Issues

- **React 19 / Testing Library**: Compatibility area to watch during upgrades
