# Progress: Chess Opening Explorer

One line per completed task. Detail lives in git commits and `archive.md`.

## What's Done (newest first)

- **Analyse summary cards rebuilt into one row** (2026-08-02, on
  `claude/player-details-layout-qxa1mo`). Reverses phase 5 §3 ("the record card
  keeps its existing layout"): structure was never the problem, composition was
  — figures hugging the top-left of an equal-height cell ~40% empty, and the
  only card in the row with no bar. Now bottom-anchored across three full-width
  columns (win left / draw centre / loss right) over the shared PerfBar track.
  Fell out of it: bar height 6 vs 8px, headline 22 vs 20px, tracked-uppercase
  "WINS" vs sentence-case "win rate", a sage border on the mobile Wins tile
  alone. Then the slack it exposed: a third line, the overall win rate, which
  turned up a latent defect — W/D/L were tallied inside the classified branch,
  so a real result with an unrecognised opening vanished from "Your record".
  Guards in `PersonalOpeningStats.test.tsx` + `personalAnalysis.test.ts`.
- **Discover's empty repertoire slot gets its box back** (2026-08-02, on
  `ux/phase-5-analyse`): the mock draws a bordered one-line bar with a star; the
  build shipped bare text. Change 03 bought height (a ~180px dashed panel →
  ~40px), not chrome — "one-line prompt" was read as "one line of text" at plan
  step, undocumented, then frozen by a test asserting "not a panel". Empty and
  populated are the same slot, so the first save should fill a container rather
  than summon one. Prompt now drawn in `components-repertoire-row`.
- **Search unified across the hero, top bar and mobile overlay** (2026-07-30, on
  `ux/phase-5-analyse`). Two passes: first _what_ typing showed — Surprise me
  and the repertoire were swapped out wholesale, so Surprise me survives as a
  footer outside the scroller and "Saved" rides on matching rows (a count line
  was built then cut: the search scores every record above zero, 4,269 for
  "sicilian"). Then _how_ — three result-row implementations and two hub rows
  across two type scales, so typing redrew each opening at a different size,
  weight and layout; `shared/SearchRow.tsx` is now the one row. Five defects
  fell out of it — **detail in `archive.md`**. Spec §3.3; guard at
  `shared/__tests__/search-row-parity.test.tsx`.
- **Practice demoted to accent-outline** (2026-07-30, on `ux/phase-5-analyse`):
  filled orange → orange border + orange label, both breakpoints. **A spec
  decision reversed on the owner's call** — §3 argued from implementation
  completeness, not the question that decides button weight. Names the third
  button tier (the bundle had two while the guard called an orange outline
  "secondary", never true of the grey `.btn--secondary`). Proportion fixed:
  desktop 11px in 24px padding vs mobile 13px → both 13px, mobile min 44px. Spec
  §3.4; guard now asserts the breakpoints agree.
- **Master games moved up the mobile stack** (2026-07-30): a **spec decision
  reversed**, not a bug — the review table sent it below videos and studies to
  "make both breakpoints agree", which was false. Now Overview · explorer ·
  master games · plans · resources · search. Guard at
  `pages/__tests__/mobile-stack-order`.
- **UX review implementation audit** (2026-07-29): six phases read back against
  the handoff bundle; six half-applied changes. **Detail in `archive.md`.**
- **UX review phase 5 — Analyse** (2026-07-28, `ux/phase-5-analyse`): one
  header; "Career totals" → "This analysis / Your record" (it claimed a lifetime
  for one run); wins sage / losses brick; "GP" → "Games"; dated sample fixtures;
  PGN reduction into `packages/shared`; gear to overlay.
- **UX review phase 4 — opening detail desktop** (2026-07-28,
  `ux/phase-4-detail-desktop`): new `ExplorerCard` draws one border around the
  level filter and everything it governs; master games move outside it into a
  shared `MasterGamesCard`. `WinRateBar` and `MobileMasterGames` deleted; one
  `explorerStats` module owns every level-scoped label. Explorer error beacon
  moved into the hook (was desktop-only, so mobile failures went unreported).
- **UX review phases 0–3** (2026-07-27..28): systemic pass, Discover's star/undo
  loop, `GET /api/openings/browse`, the faceted bar. See `archive.md`.
- Everything before the UX review — **all detail in `archive.md`**: shared
  `PerfBar` and the opening-detail mobile overhaul; the `/api/explorer` proxy;
  Deviation Trainer slice 1; Study matching V2 (18.2%→35.7%); the video index
  (28.2%→72.8%); route splitting (409→189 kB) and `/api/openings/all` → 410;
  28-family taxonomy; domain migration; TASK006–016; Practice Mode.
- **Still true and not fixed**: the common-plans ECO-bucket investigation found
  a real defect and shipped no code change.

## What's Left

- **Merge `feat/ux-review` to `main`**: PRs #58–#63 in order into the
  integration branch, then one PR to `main`. Expect conflicts in CLAUDE.md +
  memory bank.
- **`packages/shared` has two latent defects** (phase 5): its `tests/` runs in
  no CI suite, so shared-module tests live in the web suite; and its barrels
  re-export without extensions, so `dist/index.js` is unimportable from Node ESM
  — scripts import `dist/utils/<module>.js` directly.
- **Video programme**: enable the monthly refresh Action (user: commit
  `tools/data/videos.sqlite` + confirm `YOUTUBE_API_KEY` secret); then V4
  shelves, V5/V6 taxonomy + chapter matching, studies data work
- **Search is not a real combobox** — the biggest remaining gap in it. No
  `role="combobox"`/`listbox`, `aria-expanded`, `aria-activedescendant` or live
  region, so a screen-reader user gets no signal when results arrive. Three
  surfaces: `SearchBar`, `TopBar`, `SearchOverlay`.
- **Search returns near-duplicate names**: "najdorf" gives four rows reading
  "Sicilian Defense: Najdorf Variation", separated only by ECO. Ranking/data.
- **Mobile Discover shows no facet chips**: the trigger reads "Filters (2)", so
  which are active is legible only inside the sheet (desktop states each value).
- **TASK006 — Coverage**: backend 90%+, frontend 70%+ targets
- **Win-rate filtering**; central ARIA tooltip component. (Win-rate _sort_ was
  rejected: a min-sample floor makes `total` depend on `sort`.)
- **`rankNotableGames` dedupes by exact player name**, so Lichess name variants
  ("Caruana, F." vs "Caruana, Fabiano") slip through as separate players.

## Known Issues

- **React 19 / Testing Library**: Compatibility area to watch during upgrades
