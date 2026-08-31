# Progress: Chess Opening Explorer

One line per completed task. Detail lives in git commits and `archive.md`.

## What's Done (newest first)

- **The vite/vitest cluster and jest 30 landed** (2026-08-31, #99/#106/#116/
  #117): jest 30 merged alone on identical per-file counts; the other four went
  in as one branch because none was mergeable apart — #106 was green only by
  hoisting vitest 4 to the root over `^1.0.4` declarations it left in place.
  `manualChunks` became `codeSplitting.groups`, exposing that the vendor split
  had been inoperative under vite 5 (102-byte chunk, react-dom in two chunks);
  JS 373 → 361 kB. The three LandingPage timeouts were no regression — the
  slowest already took 9420ms against a 5000ms default that vitest 1 ignored.
- **Nine dependency majors triaged, five merged** (2026-08-31, #98-#114): helmet
  8, googleapis 176, react-router 7, lucide-react 1 and express 5 in;
  google-auth-library 11 answered by deleting the unused root declaration
  (#104). **Green checks lied three times** — the jsdom optional-peer drop
  (#103), #106's coverage board, and #109, which passed everything for an
  `app.all('*')` that throws under Express 5 with no test loading `server.js`
  (#113 the guard, #114 the fix). **`archive.md`.**
- **Worked the Dependabot backlog to empty, bar #86** (2026-08-29/30, #71–#75,
  #79, #85, #88, #90–#93, #95, #96): sixteen PRs across three passes — eleven
  merged, #76 split to drop `eslint-plugin-react-refresh` 0.5, #77/#78/#89 left
  blocked on #86. Four false greens, every one a bump no workflow covered: a
  Dependabot branch is tested against the `main` of the day it opened (#75
  silently lost two tests); local npm 11 writes a lockfile CI's npm 10 rejects;
  `tools/analysis` has no CI; nothing runs `concurrently`. Closing a PR
  suppresses only that version — #76 returned as #89 — so #94 was answered by
  deleting the dead dependency. `docs/reviews/2026-08-29-dependabot-triage.md`.
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
- **Opening pages carry their content in the HTML** (2026-08-07): Google dropped
  5,010 indexed pages on 30/31 July with no deploy and a healthy site — a
  quality purge, all 12,377 advertising the same template sentence over an empty
  `#root`. The middleware now renders each opening's own description and real
  win rates, unknown FENs 404, only the 271 same-board URLs canonicalise, and
  sitemaps got their first generator. **`archive.md`.**
- **Search answers in milliseconds, identically on all three surfaces**
  (2026-08-04, on `claude/player-details-layout-qxa1mo`): the top bar "hung"
  because the server took 1–3s to fuzzy-match a name over 12,377 descriptions
  and only the hero held an index to hide it behind. Literal name matching
  (`search/NameIndex.js`) answers in 2–5ms; the routing heuristics that guessed
  a query's shape are gone; Fuse is the typo net only; the index slice is shared
  by all three surfaces and fetched on the first keystroke, not on mount. One
  request per query, responses 55 KB → 4.4 KB, and PGN lookup finally sees the
  whole corpus.
- **Review pass over the seven-PR UX stack** (2026-08-04): a TopBar keyboard
  crash on an empty list, a stale-response race in `useOpeningSearch`, an
  `AbortError` shown as an error on Cancel, a 0%/0%/0% bar for `null` stats,
  "Loading Lichess data…" forever on mobile, an invisible Discover grid under
  reduced motion. **`archive.md`.**
- **Search consolidated, Analyse's cards rebuilt** (2026-08-02..03): three
  fetches and two debounces became `useOpeningSearch`, exposing that `eco` is
  not a Fuse key. **`archive.md`.**
- **The UX review programme** (2026-07-25..30): phases 0–5, `shared/SearchRow`,
  `GET /api/openings/browse`, the agent-docs restructure. **`archive.md`**.
- Everything before the UX review — **all detail in `archive.md`**: shared
  `PerfBar`; the opening-detail mobile overhaul; the `/api/explorer` proxy;
  Deviation Trainer slice 1; Study matching V2 (18.2%→35.7%); the video index
  (28.2%→72.8%); route splitting (409→189 kB) and `/api/openings/all` → 410;
  28-family taxonomy; domain migration; TASK006–016; Practice Mode. **Still true
  and not fixed**: the common-plans ECO-bucket defect shipped no code change.

## What's Left

- **#86's remaining half** — flat config and eslint 10 landed (#97); the
  react-hooks 7 `recommended` preset did not. Its compiler rules flag ~20 sites,
  `useOpeningSearch` among them. Land them at `warn`, clear in batches, promote.
- **vite 8 (#99), coverage-v8 4 (#106), typescript 7 (#107)** — rolldown rejects
  the object form of `manualChunks`; vitest@1 peers `vite@^5`, so #106 rides
  with it; TS 7 needs `baseUrl` gone and a typescript-eslint that declares
  support. `tools/analysis` still has no CI at all.
- **`npm run test:e2e` fails 8 of 9 specs on `main`** — selectors gone stale
  ("Search by pasting PGN" vs "Paste a game"), and no workflow runs them.
- **Watch the SEO recovery** (from 2026-08-07): indexed count, "Discovered – not
  indexed" and crawl stats in Search Console, weekly. Next levers if it stalls —
  slug URLs with 301s from the FEN form, related-opening links.
- **`packages/shared` has two latent defects** (phase 5): its `tests/` runs in
  no CI suite, and its barrels export without extensions.
- **Video programme**: enable the monthly refresh Action (commit
  `tools/data/videos.sqlite`, confirm `YOUTUBE_API_KEY`), then V4-V6.
- **Search is not a real combobox** — no roles, no live region. Biggest a11y
  gap.
- **Search returns near-duplicate names**: four identical "najdorf" rows
  separated only by ECO — a data problem.
- **Toasts need one host** (two within 4s cover an Undo), and **TASK006 —
  Coverage** wants `collectCoverageFrom` shrunk; it gates 90% on a subset.
- **Mobile Discover facet chips**, win-rate filtering, ARIA tooltips, name
  dedupe. See `archive.md`.
