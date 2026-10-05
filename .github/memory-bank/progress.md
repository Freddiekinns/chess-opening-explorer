# Progress: Chess Opening Explorer

One line per completed task. Detail lives in git commits and `archive.md`.

## What's Done (newest first)

- **`irregular` family split** (2026-10-02): 519 positions to three new families
  and six re-routes; top-200 pages on the `irregular` shelf 16 → 4. A test now
  fails when the ECO files drift from the resolver.
- **Jev video experiment and filter** (2026-10-02): Jev rejections 99% right,
  acceptances half wrong; pipeline now drops confident rejections (31,605 of
  72,283 pairs), then pins 18 Jev-and-judge-agreed videos (top-200 own-page
  coverage 181). Style tags proposal gated on `query_shape` data.
- **Sixth Dependabot pass** (2026-09-28, #149-#152): both groups; vitest 5 pair
  as one PR, unblocked by importing `@testing-library/jest-dom/vitest`.
- **Logo refresh** (2026-09-27): the raster pawn-on-a-book became a flat SVG of
  the same idea — pawn seated in curved pages; favicon set, `og:image`, TopBar
  mark, design-system masters. Two rejected rounds in `explorations/`.
- **Behavioural analytics on PostHog** (2026-09-24): `trackEvent` sends to
  PostHog EU (lazy slim SDK, production host only, cookieless, anonymous id);
  five new events; `/api/event` deleted. Vercel Web Analytics was on all along.
  #146 added `$pageview` (slim build has no history autocapture).
- **Feature review and backlog rev 4** (2026-09-24): every proposal re-checked
  against `main`. Trainer slice 2 was never started and the August audit's P0s
  are all still open; beacons are unreadable (1h log retention on Hobby).
  Backlog re-sequenced: credibility → loop → trainer → platform, with an
  owner-agreed archive. `docs/reviews/2026-09-24-feature-review.md`.
- **SEO check-up, Vercel usage, and the Dependabot queue** (2026-09-22,
  #133/#138/#140-#143): indexed 5,750 → 7,174 but impressions still ~8/day
  against 100–250 in July — the purge has not lifted. Vercel Active CPU per
  invocation ~3× since mid-August (crawler cold starts loading 78 MB of JSON);
  ~100 Dependabot deployments filled Functions Storage to 7.98/10 GB, so
  `dependabot/**` no longer deploys. 81 soft 404s were "Opening not found"
  painted on any failed fetch; the 568 KB site icon is 46 KB. **`archive.md`.**
- **Fifth Dependabot pass: all but typescript 7** (2026-08-31, #99-#129). jest
  30; vite 8 / vitest 4 / coverage-v8 4 / plugin-react 6 as one branch, #106
  being green only by hoisting vitest 4 to the root over `^1.0.4` declarations
  it left in place; supertest 7, jest-dom 7, speed-insights 2, jsdom 30; `glob`
  deleted not bumped. `manualChunks` → `codeSplitting.groups` exposed a vendor
  split inoperative under vite 5 — JS 373 → 361 kB, builds 4.7s → 0.8s. **Node
  20 had been EOL since March**; CI moved to 24, unblocking jsdom 30 — frontend
  job 2m01s → 1m16s, `testTimeout` restored.
- **Fourth pass: nine majors, five merged** (2026-08-31, #98-#114): helmet 8,
  googleapis 176, react-router 7, lucide-react 1, express 5; green checks lied
  three times. **`archive.md`.**
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
- Everything up to 2026-08-10 — **all detail in `archive.md`**: opening pages
  carry their content in the HTML (2026-08-07); video matching stopped trusting
  descriptions (2026-08-10); search answers in milliseconds via `NameIndex`
  (2026-08-04); the UX-stack review pass; search consolidated into
  `useOpeningSearch`; the UX review programme (phases 0–5,
  `GET /api/openings/browse`); shared `PerfBar`; the opening-detail mobile
  overhaul; the `/api/explorer` proxy; Deviation Trainer slice 1; Study matching
  V2 (18.2%→35.7%); the video index (28.2%→72.8%); route splitting (409→189 kB)
  and `/api/openings/all` → 410; 28-family taxonomy; domain migration;
  TASK006–016; Practice Mode. **Still true and not fixed**: the common-plans
  ECO-bucket defect shipped no code change.

## What's Left

- **#86's remaining half** — flat config and eslint 10 landed (#97); the
  react-hooks 7 `recommended` preset did not. Its compiler rules flag ~20 sites,
  `useOpeningSearch` among them. Land them at `warn`, clear in batches, promote.
- **Blocked upstream**: TS 7 (#107) — typescript-eslint 8.70.1 still peers
  `typescript <6.1.0`. `tools/analysis` still has no CI at all.
- **`npm run test:e2e` fails 8 of 9 specs on `main`** — selectors gone stale
  ("Search by pasting PGN" vs "Paste a game"), and no workflow runs them.
- **Watch the SEO recovery**: 2026-09-22 — 7,174 indexed, 2,038 discovered-not-
  indexed, sitemaps 5–7 never read, impressions flat. Next lever: slug URLs with
  301s. Also: `/opening/a/b/…` (unencoded FEN) serves a self-canonical
  duplicate.
- **Lazy-load `video-index.json`** if Active CPU nears Hobby's 4h (1h55m/30d).
- **`packages/shared` has two latent defects** (phase 5): its `tests/` runs in
  no CI suite, and its barrels export without extensions.
- **Video programme**: enable the monthly refresh Action (commit
  `tools/data/videos.sqlite`, confirm `YOUTUBE_API_KEY`, add `JEV_API_KEY`),
  then V4-V6.
- **Search is not a real combobox** — no roles, no live region. Biggest a11y
  gap.
- **Search returns near-duplicate names**: four identical "najdorf" rows
  separated only by ECO — a data problem.
- **Toasts need one host** (two within 4s cover an Undo), and **TASK006 —
  Coverage** wants `collectCoverageFrom` shrunk; it gates 90% on a subset.
- **Mobile Discover facet chips**, win-rate filtering, ARIA tooltips, name
  dedupe. See `archive.md`.
