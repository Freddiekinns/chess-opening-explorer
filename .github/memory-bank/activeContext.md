# Active Context

**Date:** 2026-09-28

## Current Task: Sixth Dependabot pass

Five open PRs. Both groups merged after a combined local run of every CI gate on
Node 24 / npm 11: #149 (lucide-react 1.48, posthog-js patch — replay only, which
the slim SDK does not load) and #150 (eight dev minors and patches).

vitest 5 and @vitest/coverage-v8 5 (#151, #152) went in as one PR, as the vitest
4 pair did, because coverage-v8 peers vitest exactly. Each Dependabot lockfile
was rejected by `npm ci`. The "blocked upstream" note from the last pass was
wrong: `test/setup.ts` now imports `@testing-library/jest-dom/vitest`, and the
558 matcher type errors are gone. CI runs neither vitest coverage nor
`packages/shared`'s tests; both were run by hand.

typescript 7 (#107) stays open: typescript-eslint 8.70.1 still peers
`typescript <6.1.0`. Detail in `archive.md`.

## Previous Task: Logo refresh

The raster pawn-on-a-book became a flat SVG of the same idea — pawn seated in an
open book. Icons in `packages/web/public/brand/` plus `favicon.ico`;
`icon-512.png` is `og:image`; the middleware matcher excludes both. Rules:
`design-system/project/README.md` → Logo. Detail in `archive.md`.
