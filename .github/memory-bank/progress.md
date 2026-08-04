# Progress: Chess Opening Explorer

One line per completed task. Detail lives in git commits and `archive.md`.

## What's Done (newest first)

- **Mobile search overlay closes on tab navigation** (2026-08-03, on
  `ux/phase-5-analyse`): the footer tabs did navigate, but the overlay outlived
  it and sat over the new page. It renders inside the sticky TopBar's stacking
  context, so the tab bar hit-tests above it by design; the missing half was
  closing on `pathname` change. Search stays top-right — a mode, not a place.
- **TopBar search field sized to its own panel** (2026-08-02): the 380px
  dropdown flared past a 240px field; field now `clamp(300px, 30vw, 380px)`,
  panel flush at `left/right: 0` (tablet keeps the grow-leftwards panel).
- **Discover's empty repertoire slot gets its box back** (2026-08-02, on
  `ux/phase-5-analyse`): the mock draws a bordered one-line bar with a star, the
  build shipped bare text — "one-line prompt" read as "one line of text", then
  frozen by a test asserting "not a panel". **Detail in `archive.md`**.
- **Search unified across the hero, top bar and mobile overlay** (2026-07-30, on
  `ux/phase-5-analyse`): typing changed _what_ was listed and _how_ each opening
  was drawn; `shared/SearchRow.tsx` is now the one row for all three surfaces.
  Five defects fell out. Spec §3.3, guard `search-row-parity.test.tsx`; **detail
  in `archive.md`**.
- **Practice demoted to accent-outline** (2026-07-30, on `ux/phase-5-analyse`):
  filled orange → orange border + orange label, and 13px on both breakpoints.
  **A spec decision reversed on the owner's call**; names the third button tier.
  Spec §3.4; **detail in `archive.md`**.
- **Master games moved up the mobile stack** (2026-07-30, on
  `ux/phase-5-analyse`): a **spec decision reversed**, not a bug — the UX-review
  table sent it below videos and studies to "make both breakpoints agree", which
  was false. Spec §3.2; guard at `pages/__tests__/mobile-stack-order`.
- **UX review implementation audit** (2026-07-29, on `ux/phase-5-analyse`): six
  phases read back against the handoff bundle; six defects, every one a change
  half-applied. **Detail in `archive.md`.**
- **UX review phase 5 — Analyse** (2026-07-28, `ux/phase-5-analyse`): one
  header; "Career totals / Overall performance" → "This analysis / Your record"
  (it claimed a lifetime for one run's numbers); wins sage / losses brick; "GP"
  → "Games". Sample reports from committed fixtures, dated on screen. PGN
  reduction moved to `packages/shared/src/utils/personal-analysis.ts`.
- **UX review phase 4 — opening detail desktop** (2026-07-28,
  `ux/phase-4-detail-desktop`): new `ExplorerCard` draws one border around the
  level filter and everything it governs; master games move outside it into a
  shared `MasterGamesCard`. `WinRateBar` and `MobileMasterGames` deleted; one
  `explorerStats` module owns every level-scoped label. Explorer error beacon
  moved into the hook (was desktop-only, so mobile failures went unreported).
- **UX review phases 0–3** (2026-07-27..28): **0** systemic — button tiers,
  self-labelling `ResultBar`, decorative orange out, sentence case, focus ring,
  44px star. **1** Discover closes the loop — `Toast` with Undo, star on every
  card, persistent top-bar search, `SearchHub`, `/repertoire`, mobile tabs.
  **2** `GET /api/openings/browse` — one request for items, `total`, `remaining`
  and facet counts, so count and grid cannot disagree. **3** the faceted bar.
- **Agent docs restructure** (2026-07-25, on `main`): portable `AGENTS.md` plus
  scoped `packages/*/AGENTS.md` imported by a thin `CLAUDE.md`; workflows and
  the design system became `.claude/skills/`. **Detail in `archive.md`**.
- Everything before the UX review — **all detail in `archive.md`**: 07-12..20
  (`PerfBar`; detail-mobile PR #53; `/api/explorer` proxy); through 07-11
  (Deviation Trainer 1; Study matching V2 18.2%→35.7%; video index PR #47
  28.2%→72.8%; Analyse PR #45); 07-06 remediation (routes 409→189 kB;
  `/api/openings/all` → 410); through 07-02 (video pipeline; `Math.random()`
  W/D/L and dropdown-stacking fixes; 28-family taxonomy; domain migration;
  TASK006–016; Course Discovery; Practice Mode).
- **Still true and not fixed**: the common-plans ECO-bucket investigation found
  a real defect and shipped no code change (see `archive.md`).

## What's Left

- **Merge the UX review to `main`** — order matters. Merge PRs #58 → #59 → #60 →
  #61 → #62 → #63 → #65 with **"Create a merge commit"**, deleting each head
  branch so the next PR retargets onto `feat/ux-review`; all are fast-forwards.
  **Never squash or rebase-merge inside the stack** — new SHAs make the child
  conflict everywhere. `main` is already merged into the tip, so the final
  `feat/ux-review` → `main` PR is clean.
- **`packages/shared` has two latent defects** (phase 5): its `tests/` runs in
  no CI suite, so shared-module tests live in the web suite; and its barrels
  export without file extensions, so `dist/index.js` is unimportable from Node
  ESM — scripts import `dist/utils/<module>.js` directly.
- **Video programme**: enable the monthly refresh Action (user: commit
  `tools/data/videos.sqlite` + confirm `YOUTUBE_API_KEY` secret); then V4
  shelves, V5/V6 taxonomy + chapter matching, studies data work
- **Search is not a real combobox** — its biggest remaining gap. No
  `role="combobox"`/`listbox`, `aria-expanded`, `aria-activedescendant` or live
  region, so a screen-reader user gets no signal when results arrive; the
  keyboard cursor rides a `data-active` hook `aria-activedescendant` should
  replace. Three surfaces: `SearchBar`, `TopBar`, `SearchOverlay`.
- **Search returns near-duplicate names**: "najdorf" gives four rows reading
  "Sicilian Defense: Najdorf Variation", separated only by ECO. Ranking/data.
- **Mobile Discover shows no facet chips**: the trigger reads "Filters (2)", so
  which are active is legible only inside the sheet (desktop states each value).
- **TASK006 — Coverage**: backend 90%+, frontend 70%+ targets; shrink
  `collectCoverageFrom` in `package.json`, which gates 90% on a backend subset.
- **Win-rate filtering**; central ARIA tooltip component. (Win-rate _sort_ was
  rejected: a min-sample floor makes `total` depend on `sort`.)
- **`rankNotableGames` dedupes by exact player name**, so Lichess name variants
  ("Caruana, F." vs "Caruana, Fabiano") slip through as separate players.
- **Agent docs**: run `/doctor` locally as a second opinion on the 2026-07-25
  restructure — it can't run from a remote session.

## Known Issues

- **React 19 / Testing Library**: Compatibility area to watch during upgrades
