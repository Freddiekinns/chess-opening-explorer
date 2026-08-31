# Active Context

**Date:** 2026-08-31

## Current Task: The Dependabot backlog, fifth pass

Everything open bar typescript 7 (#107), which is blocked on typescript-eslint
peering `<6.1.0`. Merged: jest 30, the vite 8 / vitest 4 / coverage-v8 4 /
plugin-react 6 cluster as one branch, supertest 7 (converging a root/api split
at `^7.1.3` and `^6.3.3`), jest-dom 7, speed-insights 2 (checked on its own
preview deploy), jsdom 30, and `glob` deleted rather than bumped because nothing
imports it. `open-pull-requests-limit` went 5 → 10 to drain the majors, with the
condition to revert it in the file.

**A green board hid an unsatisfiable tree again.** #106 alone let npm hoist
vitest 4 to the root while `packages/web` and `packages/shared` still declared
`^1.0.4`, and stacked a second vite under `node_modules/vitest`. Bumping all
four declarations together resolves to one vite 8 and one vitest 4 per
workspace. The lesson is the PR limit: those three were diagnosable only because
all three were open at once.

**The `manualChunks` rewrite fixed a duplication nobody had noticed.** Under
vite 5 the `vendor` group produced a 102-byte chunk, react-dom was emitted into
`index` _and_ `router`, and jsx-runtime landed in `chess` — quietly inoperative.
As `codeSplitting.groups` it does what the comment always claimed: one 189.6 kB
`vendor`, total JS 373 → 361 kB, and React now survives a deploy in cache
instead of riding in the entry chunk. Builds went 4.7s → 0.8s.

**The slow LandingPage tests were jsdom 23.** CI moved off Node 20 (EOL since
2026-03-24) to 24, which unblocked jsdom 30; `testTimeout` is back at the 5000ms
default and the slowest test in the suite is 3.0s. LandingPage 41.2s → 12.3s,
CI's frontend job 2m01s → 1m16s. Never production behaviour — that page mounts
in 17ms and paints at 72ms in a real browser.

**Three filter triggers were naming themselves out of CSS.** `.trigger` is
`inline-flex` and `.srOnly` is `position: absolute`, both of which blockify
children, so a browser joins the accessible name with a space and a CSS-less
consumer gets "LevelAll". Chrome confirmed the spaced name is correct, so the
assertions were right and the markup was the weak link; the space is in the
content now and the triggers measure the same to the pixel.

## Previous Task: The Dependabot backlog, fourth pass

Nine PRs, every one a major. Merged helmet 8, googleapis 176, react-router 7,
lucide-react 1, express 5; google-auth-library 11 answered by deleting the
dependency. Green checks lied three times: the jsdom optional-peer drop, #106's
coverage board, and #109 — `app.all('*')` throws under Express 5 and no test
loaded `server.js`, so #113 added the guard and #114 the `'/{*splat}'` fix. Full
detail in `archive.md`.
