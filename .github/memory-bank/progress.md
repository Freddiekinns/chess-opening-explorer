# Progress: Chess Opening Explorer

One line per completed task. Detail lives in git commits and `archive.md`.

## What's Done (newest first)

- **Worked the Dependabot backlog to empty, bar #86** (2026-08-29/30, #71–#75,
  #79, #85, #88, #90–#93, #95, #96): sixteen PRs across three passes — eleven
  merged, #76 split to drop `eslint-plugin-react-refresh` 0.5, #77/#78/#89 left
  blocked on #86. Four false greens, every one a bump no workflow covered: a
  Dependabot branch is tested against the `main` of the day it opened (#75
  silently lost two tests); local npm 11 writes a lockfile CI's npm 10 rejects;
  `tools/analysis` has no CI; and nothing runs `concurrently`, so #95 was
  verified against the real `dev` scripts. Closing a PR suppresses only that
  version — #76 returned as #89 — so `dependabot.yml` gained its first `ignore`
  entry, and #94 was answered by deleting the dead dependency (with `cross-env`)
  rather than bumping it. `docs/reviews/2026-08-29-dependabot-triage.md`.
- **The opening corpus got a crawl graph** (2026-08-28, #80/#81/#82): 5,750
  indexed pages earned 4,810 impressions in 90 days because nothing linked into
  the corpus. Ancestor and related-opening links now render before hydration;
  non-pages 404 and trailing slashes 308 via a shared `STATIC_ROUTES`;
  `SHARD_COUNT` 64 → 96; the audit gate runs on Windows. `lastmod` was wrong
  twice (mtime, then a shallow clone's graft boundary) and is now **omitted** on
  Vercel — no date beats a wrong one. Watch "Discovered — not indexed" (3,615).
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
- **Search consolidated, its affordances fixed, Analyse's cards rebuilt**
  (2026-08-02..03): three fetches and two debounces became `useOpeningSearch`,
  exposing that `eco` is not a Fuse key; the mobile overlay outlived the tab
  that navigated; the filter grabber promised a drag it never did; W/D/L were
  tallied inside the classified branch, so unrecognised openings vanished.
  **`archive.md`.**
- **The UX review programme** (2026-07-25..30): phases 0–5, the implementation
  audit that found six of six half-applied, `shared/SearchRow.tsx` unifying the
  three search surfaces (guard `search-row-parity.test.tsx`),
  `GET /api/openings/browse`, two spec decisions reversed, and the agent-docs
  restructure into `AGENTS.md` + `.claude/skills/`. All in **`archive.md`**.
- Everything before the UX review — **all detail in `archive.md`**: shared
  `PerfBar`; the opening-detail mobile overhaul; the `/api/explorer` proxy;
  Deviation Trainer slice 1; Study matching V2 (18.2%→35.7%); the video index
  (28.2%→72.8%); route splitting (409→189 kB) and `/api/openings/all` → 410;
  28-family taxonomy; domain migration; TASK006–016; Practice Mode. **Still true
  and not fixed**: the common-plans ECO-bucket defect shipped no code change.

## What's Left

- **ESLint flat-config migration (#86)** — carries eslint 10 (#77), react-hooks
  7 (#78) and react-refresh 0.5. #78 is the real work: v7's compiler rules flag
  ~20 sites, `useOpeningSearch` among them. Land them at `warn` first.
  `react-router@7` also still outstanding (`react-router-dom` is ^6.20.1).
- **Dependency loose ends**: `cross-env` is used by no script — drop it and the
  assertion pinning it (`root-package-json.test.js:58`); root `engines` claims
  node `>=18` but cross-env 10 needs 20; `tools/analysis` has no CI at all.
- **Watch the SEO recovery** (from 2026-08-07). Indexed count and "Discovered –
  currently not indexed" in Search Console, weekly. Crawl stats too: if requests
  fell around 30 July it is crawl, not quality. Next levers if it stalls — slug
  URLs (`/opening/vienna-game-anderssen-defence`) with 301s from the FEN form,
  and internal linking between related openings. Both are bigger jobs.
- **`packages/shared` has two latent defects** (phase 5): its `tests/` runs in
  no CI suite, so shared-module tests live in the web suite; and its barrels
  export without extensions, so `dist/index.js` is unimportable from Node ESM.
- **Video programme**: enable the monthly refresh Action (commit
  `tools/data/videos.sqlite`, confirm `YOUTUBE_API_KEY`); then V4-V6, studies.
- **Search is not a real combobox** — no combobox/listbox roles,
  `aria-expanded`, `aria-activedescendant` or live region. Biggest a11y gap.
- **Toasts need one host, not one per component**: two within 4s cover an Undo
  (2026-08-04).
- **Search returns near-duplicate names**: "najdorf" gives four rows reading
  "Sicilian Defense: Najdorf Variation", separated only by ECO — a data problem.
- **Mobile Discover shows no facet chips**: "Filters (2)" hides which.
- **TASK006 — Coverage**: backend 90%+, frontend 70%+; shrink
  `collectCoverageFrom`, which gates 90% on a backend subset.
- **Win-rate filtering**, ARIA tooltips, name dedupe. See `archive.md`.
