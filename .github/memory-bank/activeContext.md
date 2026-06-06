# Active Context

**Date:** 2026-06-06

## Current Task: CI Green-Up — Lint + Coverage Gates Fixed

**Status:** Complete and merged to `main` (PRs #35, #36, #37). Both the `CI` and
`Coverage` workflows now pass on `main` for the first time.

Investigating "PR lint + coverage checks fail" surfaced **four pre-existing CI
bugs**, none caused by feature work, all failing on every PR/merge:

1. **API lint script** targeted a non-existent `packages/api/tests/` dir →
   eslint exited 2 before linting. Fixed: `eslint src/`.
2. **ESLint vs Prettier conflict** — `packages/api/.eslintrc.js` enforced
   `indent`/`quotes`/`semi`/`linebreak-style` (Prettier owns these), producing
   ~110 spurious errors. Fixed: dropped those rules (ESLint = code-quality only,
   mirroring `packages/web`), then resolved the ~17 genuine errors (unused
   imports/vars, dead `matchType` in search-service, `while(true)` → `for(;;)`,
   redundant regex escape).
3. **Coverage PR-comment step** lacked `pull-requests: write` → job failed even
   when thresholds passed. Fixed: added `permissions:` + `continue-on-error`.
4. **Codecov badge** upload failed tokenless on protected `main`
   (`fail_ci_if_error: true`, no `CODECOV_TOKEN`). Fixed:
   `fail_ci_if_error: false` + pass token if present.

Also added 3 tests for `families.routes.js` (68% → 100% branches; global
branches 88.46% → 90.23%, clearing the 90% gate).

**Key finding:** the "linting" failure was never about formatting —
`format:check` was already green on CI. The "79 drifted files" seen locally was
a Windows CRLF artifact (`core.autocrlf=true`, no `.gitattributes`); on CI
(Linux/LF) they're clean. See the CLAUDE.md gotcha.

**Optional follow-up (chip spawned):** remove the now-dead codecov badge step
from `coverage.yml` (no-ops without a `CODECOV_TOKEN`).

## Previous Task: Opening Family Rollups — Shipped (2026-06-06)

Merged via PR #34. Analyse page groups a player's openings by family with an
expandable W/D/L distribution-bar row (shared `DistributionBar`), per-side
`Group by family` toggle + `Sort` dropdown, uncategorised footnote. Built on the
Phase-1 28-family taxonomy + build-time `family_id` (98.45%) +
`GET /api/families`. 195 frontend tests. Full detail in `archive.md`.
