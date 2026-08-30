# Active Context

**Date:** 2026-08-30

## Current Task: The Dependabot backlog, second pass

Merging the first pass changed `main`, so Dependabot re-evaluated and opened
four more PRs a minute after #87 landed. Three merged — #88 `tqdm` ≥4.70, #90
`dotenv` 17.4.2, #91 `cross-env` 10.1.0 — and one was a rejection wearing a new
version number. All four were cut from the current tip, so the stale-branch trap
below did not apply; checked with `git merge-base` rather than assumed.

**dotenv 17 was the only real behaviour change and it cannot reach production.**
Vercel serves `api/*.js`; none of them require dotenv and `api/package.json`
does not list it. Nothing requires `packages/api/src/server.js` at all — it is
the `dev:api` server. v17 prints a banner to stdout on every `config()`, even
with no `.env` present, so `dev:api` gained two lines of advertising carrying
the resolved `.env` path; both calls now pass `{ quiet: true }`. The bump also
collapsed a duplicate — root was already on `^17.2.0` while `packages/api`
pinned a nested 16.6.1.

**#91 changes nothing.** `cross-env` is referenced by no npm script anywhere in
the repo; its only mention is `tests/setup/root-package-json.test.js:58`
asserting it exists in `devDependencies`. Removing both is still outstanding.

**#89 is why `.github/dependabot.yml` now carries one `ignore` entry** (#92).
Closing a Dependabot PR suppresses only the version closed, so #76 returned as
#89 twenty-two minutes later. Worse, `eslint-plugin-react-refresh` 0.4 → 0.5 is
a `0.x` **minor**, so Dependabot batches it into `npm-development` rather than
filing it as a standalone major — left alone it rides along with every future
dev bump and takes the whole group red. **Delete the entry when #86 lands.**
Full triage: `docs/reviews/2026-08-29-dependabot-triage.md`.

## Previous Task: The Dependabot backlog, first pass

Nine PRs opened 2026-08-28 by the config from the security-scanning pass. Six
merged; #76 split to drop `eslint-plugin-react-refresh` 0.5, whose eslintrc drop
unregisters its own rule under `packages/web/.eslintrc.cjs` — 149 errors, none
about the code. #77 (eslint 10) and #78 (react-hooks 7) left open, blocked on
#86, the flat-config migration.

Two false greens found, both now rules in `AGENTS.md`. A Dependabot branch is
tested against the `main` of the day it opened — #75 ran 590 tests where `main`
ran 592, having silently lost two its base predated, and a vanished test is not
a failing one. And local npm 11 writes a lockfile CI's npm 10 rejects, by
dropping nested entries.
