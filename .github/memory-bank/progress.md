# Progress: Chess Opening Explorer

One line per completed task. Detail lives in git commits and `archive.md`.

## What's Done (newest first)

- **Mobile search overlay closes on tab navigation** (2026-08-03, on
  `ux/phase-5-analyse`): the footer tabs did navigate, but the overlay outlived
  it and sat over the new page. It renders inside the sticky TopBar's stacking
  context, so the tab bar hit-tests above it by design; the missing half was
  closing on `pathname` change. Search stays top-right — a mode, not a place.
- **Mobile filter sheet: the grabber works, the family list is opt-in**
  (2026-08-02, on `claude/player-details-layout-qxa1mo`): a decorative 36×4 pill
  promised a drag the sheet could not do, on a device with no Escape key. Now
  drags and closes on tap; 29 families no longer open every visit 2,000px deep.
  Guards in `FilterSheet.test.tsx` — jsdom has no `PointerEvent`.
- **Analyse summary cards rebuilt into one row** (2026-08-02, on
  `claude/player-details-layout-qxa1mo`): reverses phase 5 §3 on composition,
  not structure. Exposed a latent defect — W/D/L were tallied inside the
  classified branch, so a real result with an unrecognised opening vanished from
  "Your record". **Detail in `archive.md`.**
- **TopBar search field sized to its own panel** (2026-08-02): the 380px
  dropdown flared past a 240px field; field now `clamp(300px, 30vw, 380px)`,
  panel flush at `left/right: 0` (tablet keeps the grow-leftwards panel).
- **Discover's empty repertoire slot gets its box back** (2026-08-02, on
  `ux/phase-5-analyse`): the mock draws a bordered one-line bar with a star; the
  build shipped bare text — a handoff divergence frozen by a test asserting "not
  a panel". **Detail in `archive.md`.**
- **Search unified across the hero, top bar and mobile overlay** (2026-07-30, on
  `ux/phase-5-analyse`): typing changed _what_ was listed and _how_ each opening
  was drawn; `shared/SearchRow.tsx` is now the one row for all three surfaces.
  Five defects fell out. Spec §3.3, guard `search-row-parity.test.tsx`; **detail
  in `archive.md`**.
- **Practice demoted to accent-outline** (2026-07-30, on `ux/phase-5-analyse`):
  **a spec decision reversed on the owner's call**; names the third button tier
  and fixes its proportion across breakpoints. Spec §3.4. **Detail in
  `archive.md`.**
- **Master games moved up the mobile stack** (2026-07-30): a **spec decision
  reversed**, not a bug — "make both breakpoints agree" was false. Guard at
  `pages/__tests__/mobile-stack-order`.
- **UX review implementation audit** (2026-07-29): six phases read back; six
  half-applied changes. **Detail in `archive.md`.**
- **UX review phase 5 — Analyse** (2026-07-28, `ux/phase-5-analyse`): one
  header; "Career totals" → "This analysis / Your record" (it claimed a lifetime
  for one run); wins sage / losses brick; dated fixtures; PGN reduction into
  `packages/shared`.
- **UX review phase 4 — opening detail desktop** (2026-07-28,
  `ux/phase-4-detail-desktop`): `ExplorerCard` draws one border around the level
  filter and everything it governs; master games move out into a shared
  `MasterGamesCard`. One `explorerStats` module owns every level-scoped label;
  the explorer error beacon moved into the hook (it was desktop-only).
- **UX review phases 0–3** (2026-07-27..28): systemic pass, Discover's star/undo
  loop, `GET /api/openings/browse`, the faceted bar. See `archive.md`.
- **Agent docs restructure** (2026-07-25, on `main`): portable `AGENTS.md` plus
  scoped `packages/*/AGENTS.md` imported by a thin `CLAUDE.md`; workflows and
  the design system became `.claude/skills/`. **Detail in `archive.md`**.
- Everything before the UX review — **all detail in `archive.md`**: shared
  `PerfBar` and the opening-detail mobile overhaul; the `/api/explorer` proxy;
  Deviation Trainer slice 1; Study matching V2 (18.2%→35.7%); the video index
  (28.2%→72.8%); route splitting (409→189 kB) and `/api/openings/all` → 410;
  28-family taxonomy; domain migration; TASK006–016; Practice Mode.
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
