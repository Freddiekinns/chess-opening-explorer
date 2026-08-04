# Progress: Chess Opening Explorer

One line per completed task. Detail lives in git commits and `archive.md`.

## What's Done (newest first)

- **Review pass over the seven-PR UX stack** (2026-08-04, on
  `claude/player-details-layout-qxa1mo`): read `feat/ux-review...HEAD`, then CSS
  on its own. Fixed a TopBar keyboard crash on an empty list, a stale-response
  race in `useOpeningSearch`, an `AbortError` shown as an error on Cancel, a
  0%/0%/0% bar for `null` stats from `/browse`, a permanent "Loading Lichess
  data…" on mobile, and an invisible Discover grid under reduced motion.
- **One search behaviour, not three — and ECO codes actually work** (2026-08-03,
  on `claude/player-details-layout-qxa1mo`): three fetches, two debounces and
  two no-results strings became `useOpeningSearch`; only the hero had expanded
  abbreviations. Exposed that `eco` is not a Fuse key, so `B90` gave 0 results
  wherever there was no local index. Saved openings now win ties.
- **Mobile search overlay closes on tab navigation** (2026-08-03, on
  `ux/phase-5-analyse`): the footer tabs did navigate, but the overlay outlived
  it and sat over the new page. It renders inside the sticky TopBar's stacking
  context, so the tab bar hit-tests above it by design; the missing half was
  closing on `pathname` change. Search stays top-right — a mode, not a place.
- **Mobile filter sheet: the grabber works, the family list is opt-in**
  (2026-08-02, on `claude/player-details-layout-qxa1mo`): a decorative 36×4 pill
  promised a drag the sheet could not do, on a device with no Escape key. Guards
  in `FilterSheet.test.tsx` — jsdom has no `PointerEvent`.
- **Analyse summary cards rebuilt into one row** (2026-08-02, on
  `claude/player-details-layout-qxa1mo`): reverses phase 5 §3 on composition.
  Exposed a latent defect — W/D/L were tallied inside the classified branch, so
  a real result with an unrecognised opening vanished from "Your record".
- **TopBar search field sized to its own panel**, and **Discover's empty
  repertoire slot got its box back** (2026-08-02): a 380px dropdown on a 240px
  field; a handoff divergence frozen by a test. **Detail in `archive.md`.**
- **Search unified across the hero, top bar and mobile overlay** (2026-07-30, on
  `ux/phase-5-analyse`): typing changed _what_ was listed and _how_ each opening
  was drawn; `shared/SearchRow.tsx` is now the one row. Five defects fell out.
  Spec §3.3, guard `search-row-parity.test.tsx`; **detail in `archive.md`**.
- **Practice demoted to accent-outline** and **master games moved up the mobile
  stack** (2026-07-30, on `ux/phase-5-analyse`): two **spec decisions
  reversed**, not bugs. Spec §3.4; guard `pages/__tests__/mobile-stack-order`.
  **Detail in `archive.md`.**
- **UX review implementation audit** (2026-07-29): six phases read back; six
  half-applied changes. **Detail in `archive.md`.**
- **UX review phase 5 — Analyse** (2026-07-28, `ux/phase-5-analyse`): one
  header; "Career totals" → "This analysis / Your record" (it claimed a lifetime
  for one run); dated fixtures; PGN reduction into `packages/shared`.
- **UX review phase 4 — opening detail desktop** (2026-07-28,
  `ux/phase-4-detail-desktop`): `ExplorerCard` draws one border around the level
  filter and everything it governs; master games move out into a shared
  `MasterGamesCard`. One `explorerStats` module owns every level-scoped label.
- **UX review phases 0–3** (2026-07-27..28): systemic pass, Discover's star/undo
  loop, `GET /api/openings/browse`, the faceted bar. See `archive.md`.
- **Agent docs restructure** (2026-07-25, on `main`): portable `AGENTS.md` plus
  scoped `packages/*/AGENTS.md` imported by a thin `CLAUDE.md`; workflows and
  the design system became `.claude/skills/`. **Detail in `archive.md`**.
- Everything before the UX review — **all detail in `archive.md`**: shared
  `PerfBar` and the opening-detail mobile overhaul; the `/api/explorer` proxy;
  Deviation Trainer slice 1; Study matching V2 (18.2%→35.7%); the video index
  (28.2%→72.8%); route splitting (409→189 kB) and `/api/openings/all` → 410;
  28-family taxonomy; domain migration; TASK006–016; Practice Mode. **Still true
  and not fixed**: the common-plans ECO-bucket investigation found a real defect
  and shipped no code change (see `archive.md`).

## What's Left

- **Merge the UX review to `main`** — order matters. Merge PRs #58 → #59 → #60 →
  #61 → #62 → #63 → #65 with **"Create a merge commit"**, deleting each head
  branch so the next PR retargets onto `feat/ux-review`; all are fast-forwards.
  **Never squash or rebase-merge inside the stack** — new SHAs make the child
  conflict everywhere. `main` is already merged into the tip.
- **`packages/shared` has two latent defects** (phase 5): its `tests/` runs in
  no CI suite, so shared-module tests live in the web suite; and its barrels
  export without extensions, so `dist/index.js` is unimportable from Node ESM.
- **Video programme**: enable the monthly refresh Action (user: commit
  `tools/data/videos.sqlite` + confirm `YOUTUBE_API_KEY` secret); then V4
  shelves, V5/V6 taxonomy + chapter matching, studies data work.
- **Search is not a real combobox** — its biggest remaining gap. No
  `role="combobox"`/`listbox`, `aria-expanded`, `aria-activedescendant` or live
  region, so a screen-reader user gets no signal when results arrive; the
  keyboard cursor rides a `data-active` hook `aria-activedescendant` should
  replace. One query hook to announce from.
- **Toasts need one host, not one per component.** Every `useRepertoireToast`
  caller renders its own `.toast` at the same fixed slot, so a star on the
  Discover grid and an unstar in the repertoire row within 4s of each other
  stack and cover an Undo. Found 2026-08-04; a shared host is the fix.
- **Search returns near-duplicate names**: "najdorf" gives four rows reading
  "Sicilian Defense: Najdorf Variation", separated only by ECO. Ranking/data.
- **Mobile Discover shows no facet chips**: the trigger reads "Filters (2)", so
  which are active is legible only inside the sheet (desktop states each value).
- **TASK006 — Coverage**: backend 90%+, frontend 70%+ targets; shrink
  `collectCoverageFrom` in `package.json`, which gates 90% on a backend subset.
- **Win-rate filtering**; central ARIA tooltip component. (Win-rate _sort_
  rejected: a min-sample floor makes `total` depend on `sort`.) **Agent docs**:
  run `/doctor` locally on the 2026-07-25 restructure — not from a remote.
  **`rankNotableGames` dedupes by exact player name**, so Lichess variants
  ("Caruana, F." vs "Caruana, Fabiano") slip through as separate players.

## Known Issues

- **React 19 / Testing Library**: Compatibility area to watch during upgrades
