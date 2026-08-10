# Progress: Chess Opening Explorer

One line per completed task. Detail lives in git commits and `archive.md`.

## What's Done (newest first)

- **Video matching stopped trusting descriptions and stopped losing its corpus**
  (2026-08-10): a "watch my other video" link scored +60 and bypassed the
  variation guard; rematch re-scored only past winners, so a better scorer could
  never recover a dropped one; ties fell to view count. 6,010 of 12,377 pages
  changed, specificity 47.7% → 54.2%, corpus 1,733 → 6,903 at zero API cost.
- **Opening pages carry their content in the HTML** (2026-08-07): Google indexed
  5,010 pages through June–July then dropped them on 30/31 July — no deploy that
  day, no manual action, site healthy. A quality purge: all 12,377 advertised
  themselves with the same template sentence over an empty `#root`, earning
  0.5–2.9% CTR at position ~11. The middleware now renders the opening's own
  description and real win rates into `#root` and uses that description as the
  meta; unknown FENs 404 rather than serving the landing page at 200; only the
  271 same-board URLs canonicalise, while a shared name gets its move list in
  the title; and sitemaps got their first generator, ordered by game volume.
- **Search answers in milliseconds, identically on all three surfaces**
  (2026-08-04, on `claude/player-details-layout-qxa1mo`): the top bar "hung"
  because the server took 1–3s to fuzzy-match a name over 12,377 descriptions
  and only the hero held an index to hide it behind. Literal name matching
  (`search/NameIndex.js`) answers in 2–5ms; the routing heuristics that guessed
  a query's shape are gone; Fuse is the typo net only; the index slice is shared
  by all three surfaces and fetched on the first keystroke, not on mount. One
  request per query, responses 55 KB → 4.4 KB, and PGN lookup finally sees the
  whole corpus.
- **Review pass over the seven-PR UX stack** (2026-08-04, on
  `claude/player-details-layout-qxa1mo`): read `feat/ux-review...HEAD`, then CSS
  on its own. Fixed a TopBar keyboard crash on an empty list, a stale-response
  race in `useOpeningSearch`, an `AbortError` shown as an error on Cancel, a
  0%/0%/0% bar for `null` stats, "Loading Lichess data…" forever on mobile, and
  an invisible Discover grid under reduced motion.
- **One search behaviour, not three — and ECO codes actually work** (2026-08-03,
  on `claude/player-details-layout-qxa1mo`): three fetches, two debounces and
  two no-results strings became `useOpeningSearch`; only the hero had expanded
  abbreviations. Exposed that `eco` is not a Fuse key, so `B90` gave 0 results
  wherever there was no local index. Saved openings now win ties.
- **Mobile search overlay closes on tab navigation** (2026-08-03) and **the
  filter sheet's grabber actually drags** (2026-08-02): both were affordances
  that looked real and did nothing — the overlay outlived the tab that
  navigated, and a 36×4 pill promised a drag on a device with no Escape key.
  **`archive.md`.**
- **Analyse summary cards rebuilt into one row** (2026-08-02): reverses phase 5
  §3 on composition. Exposed a latent defect — W/D/L were tallied inside the
  classified branch, so a real result with an unrecognised opening vanished.
- **TopBar search field sized to its own panel**, **Discover's empty repertoire
  slot got its box back** (2026-08-02). **Detail in `archive.md`.**
- **Search rows unified across the three surfaces** (2026-07-30): typing changed
  _what_ was listed and _how_ each opening was drawn; `shared/SearchRow.tsx` is
  the one row. Spec §3.3, guard `search-row-parity.test.tsx`. **Practice demoted
  to accent-outline**, **master games moved up the mobile stack** (2026-07-30):
  two **spec decisions reversed**, not bugs. **UX review implementation audit**
  (2026-07-29): six phases read back, six half-applied. All in **`archive.md`**.
- **UX review phases 0–5** (2026-07-27..28): systemic pass, Discover's star/undo
  loop, `GET /api/openings/browse`, the faceted bar, `ExplorerCard`'s single
  border round the level filter, and Analyse's honest "This analysis / Your
  record" in place of a "Career totals" that claimed a lifetime.
  **`archive.md`.**
- **Agent docs restructure** (2026-07-25, `main`): portable `AGENTS.md` plus
  scoped `packages/*/AGENTS.md` under a thin `CLAUDE.md`; workflows and the
  design system became `.claude/skills/`. **`archive.md`**.
- Everything before the UX review — **all detail in `archive.md`**: shared
  `PerfBar`; the opening-detail mobile overhaul; the `/api/explorer` proxy;
  Deviation Trainer slice 1; Study matching V2 (18.2%→35.7%); the video index
  (28.2%→72.8%); route splitting (409→189 kB) and `/api/openings/all` → 410;
  28-family taxonomy; domain migration; TASK006–016; Practice Mode. **Still true
  and not fixed**: the common-plans ECO-bucket defect shipped no code change.

## What's Left

- **Watch the SEO recovery** (from 2026-08-07). Indexed count and "Discovered –
  currently not indexed" in Search Console, weekly. Crawl stats too: if requests
  fell around 30 July it is crawl, not quality. Next levers if it stalls — slug
  URLs (`/opening/vienna-game-anderssen-defence`) with 301s from the FEN form,
  and internal linking between related openings. Both are bigger jobs.
- **`packages/shared` has two latent defects** (phase 5): its `tests/` runs in
  no CI suite, so shared-module tests live in the web suite; and its barrels
  export without extensions, so `dist/index.js` is unimportable from Node ESM.
- **Video programme**: enable the monthly refresh Action (user: commit
  `tools/data/videos.sqlite` + confirm `YOUTUBE_API_KEY` secret); then V4
  shelves, V5/V6 taxonomy + chapter matching, studies data work.
- **Search is not a real combobox** — its biggest remaining gap. No
  `role="combobox"`/`listbox`, `aria-expanded`, `aria-activedescendant` or live
  region, so a screen-reader user gets no signal when results arrive.
- **Toasts need one host, not one per component.** Every `useRepertoireToast`
  caller renders its own `.toast` at one fixed slot, so two within 4s cover an
  Undo (2026-08-04).
- **Search returns near-duplicate names**: "najdorf" gives four rows reading
  "Sicilian Defense: Najdorf Variation", separated only by ECO — a data problem.
- **Mobile Discover shows no facet chips**: "Filters (2)" hides which are on.
- **TASK006 — Coverage**: backend 90%+, frontend 70%+ targets; shrink
  `collectCoverageFrom` in `package.json`, which gates 90% on a backend subset.
- **Win-rate filtering**; central ARIA tooltip component. (Win-rate _sort_
  rejected: a min-sample floor makes `total` depend on `sort`.)
  **`rankNotableGames` dedupes by exact player name**, so "Caruana, F." and
  "Caruana, Fabiano" are two. **React 19 / Testing Library** compatibility is
  the standing thing to watch during upgrades.
