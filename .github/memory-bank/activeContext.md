# Active Context

**Date:** 2026-08-31

## Current Task: The Dependabot backlog, fourth pass

Nine PRs in two waves, every one a major. Merged: helmet 8 (#98), googleapis 176
(#100), react-router 7 (#102), lucide-react 1 (#108) and express 5 (#114).
Answered by deleting the dependency: google-auth-library 11 (#101 → #104). Still
open as trackers: vite 8 (#99), `@vitest/coverage-v8` 4 (#106) and typescript 7
(#107), each with its triage on the PR. Five supporting PRs of my own: #103,
#105, #111, #112, #113.

**Green checks lied three times today, each in a different way.** #100 and #101
showed `Cannot find package 'jsdom'` because vitest hoists to the root and had
been resolving an unversioned 20.0.3 npm installed as its **optional peer** —
which a lockfile regeneration is free to drop (#103 declares it). #106's board
was green because no workflow runs `vitest --coverage` at all; its lockfile
quietly installs vitest 4 and vite 8 at the root beside `packages/web`'s 1.6.1.
And #109 passed every check for a change that takes the API down completely.

**#109 is the one to remember.** `app.all('*')` throws under Express 5's
path-to-regexp 8, and both entry points used it. No backend test ever loaded
`server.js` or `api/index.js` — they all build their own `express()` — and a
Vercel build succeeds because a function is only required on first invocation.
#113 added the guard (now covering all nine `api/*.js`), #114 landed the bump
with `'/{*splat}'` and the dev stack driven route by route.

**react-router 7 is the smallest migration a routing major will ever give this
repo.** No data router, no loaders, every navigation target absolute — so
`v7_relativeSplatPath` cannot bite despite the `path="*"` catch-all. Exercised
against a running server: `%2F`-encoded FEN deep links, param-only changes,
back, and `useNavigate` from search. Clears the open-redirect advisory the
2026-08-28 review said needed exactly this bump. `router` chunk 12.28 → 17.52 kB
gzip; entry chunk unchanged.

**One flake, three attempts.** `PopularOpeningsGrid.test.tsx` timed out at
5000ms on branches byte-identical to a green `main`. #105 raised the `findBy`
timeout, which vitest's per-test deadline pre-empts; #111 moved it onto the
test, and the next-slowest one failed instead; #112 widened the file. Three of
its ten tests are over 1.5s locally, so the file was always the right scope.
Also found, not fixed: `test:e2e` fails 8 of 9 specs on `main`, selectors stale.

## Previous Task: The Dependabot backlog, third pass

Three PRs after #92, cut from `fc1a43c9`. #93 and #95 merged, #94 answered by
deleting the dependency (#96). `open-pull-requests-limit` stays at 5 and root
`engines.node` became `>=20.19.0`. Full detail in `archive.md`; triage in
`docs/reviews/2026-08-29-dependabot-triage.md`.
