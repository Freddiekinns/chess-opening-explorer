# Progress: Chess Opening Explorer

One line per completed task. Detail lives in git commits and `archive.md`.

## What's Done (newest first)

- **2026-10-10 (#171–#173)**: the 43 description claims the briefs marked wrong
  fixed; E2E 9/9 green and in CI (**Test E2E**); search intent misreads ("solid
  response to e4", "for white", "advanced sicilian defence").
- **Backlog Now 1–3** (2026-10-09): Analyse cards floor 3 with no fallback, "won
  X of Y", needs-work by games lost; billions as B; Discover "Difficulty";
  move-row legend; explorer steps keep their scroll offset.
- **Model routing** (2026-10-08): Haiku `scout`/`verifier`, Sonnet `implementer`
  and `/docs-sync`, `pipeline-reviewer` pinned to Sonnet high; routing rules in
  `CLAUDE.md`. Main session stays Opus, effort medium. `AGENTS.md` 441 → ~220
  lines, tooling and subsystem detail moved to skills and the scoped files.
- **Style tags** (2026-10-05, #160): a fixed six-axis taxonomy replaces the LLM
  tags on the detail page, cards, Discover facets and style search. 563
  variations cover 80% of pages and 65% of games; 848 tail variations remain.
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
- **Fifth Dependabot pass: all but typescript 7** (2026-08-31, #99-#129): jest
  30, vite 8 / vitest 4, jsdom 30; CI on Node 24 (20 was EOL). Detail in
  `archive.md`.
- **Fourth Dependabot pass and the backlog to empty** (2026-08-29/31, #71-#114):
  green checks lied repeatedly. **`archive.md`**, `docs/reviews/2026-08-29-*`.
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

- **Style tags tail**: 848 variations (16% of pages, 0.8% of games); plan in
  `archive.md`, runbook in `tools/style-tags/README.md`.
- **#86's remaining half** — flat config and eslint 10 landed (#97); the
  react-hooks 7 `recommended` preset did not. Its compiler rules flag ~20 sites,
  `useOpeningSearch` among them. Land them at `warn`, clear in batches, promote.
- **Blocked upstream**: TS 7 (#107) — typescript-eslint 8.70.1 still peers
  `typescript <6.1.0`. `tools/analysis` still has no CI at all.
- **Watch the SEO recovery**: 2026-09-22 — 7,174 indexed, 2,038 discovered-not-
  indexed, sitemaps 5–7 never read, impressions flat. Next lever: slug URLs with
  301s. Also: `/opening/a/b/…` (unencoded FEN) serves a self-canonical
  duplicate.
- **Lazy-load `video-index.json`** if Active CPU nears Hobby's 4h (1h55m/30d).
- **`packages/shared` has two latent defects** (phase 5): its `tests/` runs in
  no CI suite, and its barrels export without extensions.
- **Video programme**: enable the monthly refresh Action (commit
  `tools/data/videos.sqlite`, confirm `YOUTUBE_API_KEY`, add `JEV_API_KEY`),
  then V4-V6. Unused: Jev's video families (`docs/backlog.md` → Enablers).
- **Search is not a real combobox** — no roles, no live region. Biggest a11y
  gap.
- **Search returns near-duplicate names**: four identical "najdorf" rows
  separated only by ECO — a data problem.
- **Toasts need one host** (two within 4s cover an Undo), and **#166 —
  Coverage** wants `collectCoverageFrom` shrunk; it gates 90% on a subset.
- **Mobile Discover facet chips**, win-rate filtering, ARIA tooltips, name
  dedupe. See `archive.md`.
