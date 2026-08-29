# Active Context

**Date:** 2026-08-29

## Current Task: Working through the Dependabot backlog

Nine PRs opened 2026-08-28 by the config from the security-scanning pass. Six
merged, one split, two rejected and left open. Full triage:
`docs/reviews/2026-08-29-dependabot-triage.md`.

**Merged**: #71 actions group (checkout/setup-node v4 → v7); #72/#73/#74 the
`tools/analysis` Python floors; #75 npm-production, 9 packages including react
19.2, fuse.js 7.5 and react-chessboard 5.12; #79 `@vercel/analytics` 1 → 2, a
major whose three breaking changes (licence, Nuxt, relative endpoints) miss a
React app rendering bare `<Analytics />` — confirmed live afterwards with
`POST /_vercel/insights/view → 200`.

**#76 was split.** Seven of its eight dev updates were fine; the eighth,
`eslint-plugin-react-refresh` 0.5, drops eslintrc support and so unregisters its
own rule under `packages/web/.eslintrc.cjs` — 149 errors, none about the code.
The seven landed as #85, which also carries a prettier 3.9 reformat of three
files because `format:check` gates CI. **A red group PR is not evidence the
group is unsafe; read the failure before rejecting the batch.**

**#77 (eslint 10) and #78 (react-hooks 7) are blocked on #86**, the flat-config
migration. #77 cannot go green alone regardless: `@typescript-eslint` 6 does not
support ESLint 9+, and `--ext` was removed. #78 is not configuration — v7 turns
on the React Compiler rules and the codebase violates them in ~20 places,
including `useOpeningSearch`. Both left **open** deliberately: majors stay
visible as a PR each, and closing one stops it being re-proposed.

**Two traps, both of which produced a false green.** A Dependabot branch is cut
from the `main` of the day it opened — #75 ran 590 tests against `main`'s 592,
having silently lost two that its base predated, and a vanished test is not a
failing one. And local npm 11 writes a lockfile CI's npm 10 rejects, by dropping
nested entries. Both rules are in `AGENTS.md` now.

## Previous Task: The corpus had no crawl graph

5,750 indexed pages earned 4,810 impressions in 90 days because nothing linked
into the corpus — the navigator links lived only in the React render, so the
sitemap was Google's sole route in. PRs #80/#81/#82 put ancestor and
related-opening links in the pre-render, 404'd non-pages via a shared
`STATIC_ROUTES`, and took `SHARD_COUNT` 64 → 96. `lastmod` was wrong twice and
is now omitted. Success metric: "Discovered — currently not indexed", 3,615 on
2026-08-28, re-checked in four to eight weeks. Full text in `archive.md`.
