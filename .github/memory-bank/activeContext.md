# Active Context

**Date:** 2026-08-31

## Current Task: The Dependabot backlog, fifth pass

Five PRs left over from the fourth pass, plus two that opened this morning. jest
30 (#117) merged on its own — per-file test counts identical, 1019/1019. The
vite/vitest cluster went in as one branch because no part of it was mergeable
alone: vite 8 (#99), `@vitejs/plugin-react` 6 (#116), `@vitest/coverage-v8` 4
(#106) and vitest 4, with `packages/shared` taken off vitest 1 at the same time.
typescript 7 (#107) stays open as a tracker.

**A green board hid an unsatisfiable tree again.** #106 alone let npm hoist
vitest 4 to the root while `packages/web` and `packages/shared` still declared
`^1.0.4`, and stacked a second vite under `node_modules/vitest`. Bumping all
four declarations together resolves to one vite 8 and one vitest 4 per
workspace, no nested copies.

**The `manualChunks` rewrite fixed a duplication nobody had noticed.** Under
vite 5 the `vendor` group produced a 102-byte chunk, react-dom was emitted into
`index` _and_ `router`, and jsx-runtime landed in `chess` — the split had been
quietly inoperative. As `codeSplitting.groups` (`advancedChunks` takes the same
shape and is already deprecated in 8.2.2) it does what the comment always
claimed: one 189.6 kB `vendor`, total JS 373 → 361 kB.

Also merged: supertest 7 (#120), which converged a root/api split that had sat
at `^7.1.3` and `^6.3.3`; `@testing-library/jest-dom` 7 (#119); and
`@vercel/speed-insights` 2 (#122), checked on its own preview deploy — script
200, beacon posting, no console errors. `open-pull-requests-limit` went 5 → 10
(#123) to drain the majors, with the condition to revert it in the file.

**The slow LandingPage tests are jsdom 23, and that is now measured.** Under
vitest 4 three of them fail the 5000ms default; on `main` the slowest already
took 9420ms and passed, because vitest 1 never enforced the deadline — hence
`testTimeout: 20000`. On jsdom 29 that same file goes 41,226ms → 2,981ms and the
whole frontend suite 163s → 69s of summed test time. **When jsdom moves, put
`testTimeout` back.** In a real browser the page mounts in 17ms and paints at
72ms, so none of this was ever production behaviour.

## Previous Task: The Dependabot backlog, fourth pass

Nine PRs in two waves, every one a major. Merged: helmet 8 (#98), googleapis 176
(#100), react-router 7 (#102), lucide-react 1 (#108) and express 5 (#114).
Answered by deleting the dependency: google-auth-library 11 (#101 → #104). Five
supporting PRs of my own: #103, #105, #111, #112, #113. Green checks lied three
times: the jsdom optional-peer drop (#103), #106's coverage board, and #109 —
`app.all('*')` throws under Express 5 and no test loaded `server.js`, so #113
added the guard and #114 the `'/{*splat}'` fix. Full detail in `archive.md`.
