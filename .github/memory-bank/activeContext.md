# Active Context

**Date:** 2026-08-31

## Current Task: The Dependabot backlog, fourth pass

Five PRs (#98-#102), every one a major, all cut from the tip `738d3d3c`. #98
helmet 8, #100 googleapis 176 and #102 react-router 7 merged; #101 was answered
by deleting the dependency (#104); #99 vite 8 stays open with its triage on the
PR. Two supporting PRs of my own landed alongside, #103 and #105.

**The two red frontend suites were one bug, and it was in neither bump.** #100
and #101 reported `Cannot find package 'jsdom'` 61 times and collected
`no tests`. vitest hoists to the root, so its `import('jsdom')` never reaches
`packages/web/node_modules/jsdom`; it had been resolving an unversioned 20.0.3
that npm auto-installed as vitest's **optional peer**, and a lockfile
regeneration is free to drop one. #103 declares jsdom at the root at
`packages/web`'s own range; the suite runs on 23 now, same 592 passes.

**react-router 7 is the smallest migration a routing major will ever give this
repo.** No data router, no loaders, no `json()`/`defer()`, and every navigation
target is absolute — so `v7_relativeSplatPath` cannot bite despite the
`path="*"` catch-all. Exercised against a running dev server rather than
trusting green checks: `%2F`-encoded FEN deep links, detail-to-detail param
changes, the catch-all, back, and `useNavigate` from search. It also clears the
open-redirect advisory the 2026-08-28 review said needed exactly this bump. The
`router` chunk goes 12.28 → 17.52 kB gzip; the entry chunk is unchanged.

**The intermittent red afterwards was a slow query, not a flake.** One test in
`PopularOpeningsGrid.test.tsx` failed three of seven runs, always
`Test timed out in 5000ms`, on branches whose installed tree was byte-identical
to a green `main`. It is the file's only accessibility-tree query — 2066ms
locally against ~900ms for the `findByText` ones, and a loaded runner takes the
file from ~11s to ~28s. Fixing it took three goes: #105 raised the `findBy`
timeout, which vitest's per-test deadline pre-empts; #111 moved it onto that
test, and the next-slowest one failed instead; #112 widened the file. Three of
its ten tests are over 1.5s locally, so the file was always the right scope.

**#101 and #99 are opposite shapes.** google-auth-library was imported nowhere,
so #104 deleted the declaration and the installed tree did not move — 903
lockfile entries either side. vite 8 is real work: rolldown rejects the object
form of `manualChunks`, and vitest@1 peers vite@^5. Also found, not fixed:
`npm run test:e2e` fails 8 of 9 specs on `main`, its selectors gone stale.

## Previous Task: The Dependabot backlog, third pass

Three PRs after #92, cut from `fc1a43c9`. #93 and #95 merged, #94 answered by
deleting the dependency (#96). `open-pull-requests-limit` stays at 5 and root
`engines.node` became `>=20.19.0`. Full detail in `archive.md`; triage in
`docs/reviews/2026-08-29-dependabot-triage.md`.
