# Working through the Dependabot backlog — 2026-08-29

Nine open Dependabot PRs, opened 2026-08-28 by the config that
`docs/reviews/2026-08-28-dependency-security-scanning.md` put in place. This is
the first pass through them. Six merged, one split, two rejected and left open.

The brief was to merge what is safe without breaking the site, so every PR was
verified locally as well as in CI — which turned out to matter twice.

---

## What landed

| PR          | Change                                                                                                  | Verification beyond CI                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| #71         | actions group: `checkout`/`setup-node` v4 → v7, `codecov-action` v4 → v7, `lcov-reporter` 0.3.1 → 0.4.0 | None needed — no lockfile, and the v4 actions were already being force-run on Node 24           |
| #72 #73 #74 | `python-dateutil` ≥2.9.0.post0, `requests` ≥2.34.2, `zstandard` ≥0.25.0                                 | Resolved together in a throwaway venv on Python 3.13, then a smoke test of the exact call sites |
| #75         | npm-production, 9 packages                                                                              | Rebased onto `main`, then `build`, `test:all`, `build:vercel`, and a browser check of the board |
| #79         | `@vercel/analytics` 1.5.0 → 2.0.1 (major)                                                               | Release notes read, then confirmed live in production                                           |
| #85         | npm-development, 7 of 8 packages                                                                        | Full local suite plus `format:check` and `security:audit`                                       |

**The Python PRs had no CI at all.** Nothing under `tools/analysis` is covered
by a workflow, so "green" meant nothing there. The three floors were installed
together and the four call sites the pipeline actually uses were exercised:
`zstd.ZstdDecompressor().stream_reader` wrapped in a `TextIOWrapper` feeding
`chess.pgn.read_game`, `dateutil.relativedelta`, and a plain `requests.Session`.
All four are stable API surface, which is why the bump was cheap — but the check
is the only reason we know that.

**`@vercel/analytics` 2.0.0 is a major that does not touch us.** Its three
breaking changes are the licence (MPL-2.0 → MIT), Nuxt module support, and
relative `src`/`endpoint` paths. The app imports `Analytics` from
`@vercel/analytics/react` and renders it with no props; that subpath still
exists and the React peer range is unchanged at `^18 || ^19`. Confirmed after
merge on production: `POST /_vercel/insights/view → 200`.

---

## The split: #76

The npm-development group carried eight updates and exactly one of them was
poison. `eslint-plugin-react-refresh` 0.4 → 0.5 drops eslintrc support, and
`packages/web` still configures ESLint through `.eslintrc.cjs`. The plugin
resolves, the `plugins: ['react-refresh']` entry loads, and then the rule never
registers — so every linted file fails with
`Definition for rule 'react-refresh/only-export-components' was not found`. 149
errors, none of them about the code.

The other seven were fine, so they went in as #85 and #76 was closed. Worth
noting as a pattern: **a red group PR is not evidence that the group is
unsafe.** Read the failure before rejecting the batch.

#85 also carries a prettier reformat of `middleware.ts`, `pieceSvgs.ts` and
`OpeningDetailPage.tsx`. Prettier 3.9 no longer forces the leading-pipe
multi-line form on a union type that fits on one line. It is whitespace only,
and it is in the same PR because `format:check` gates CI — a prettier bump that
leaves the tree unformatted is a broken build, not a tidy-up for later.

---

## Rejected: #77 and #78

Both need the ESLint flat-config migration. Tracked in #86.

**#77, `eslint` 8.57.1 → 10.9.1.** ESLint 9 made flat config the default and 10
removes eslintrc entirely, so all three configs (`packages/web/.eslintrc.cjs`,
`packages/api/.eslintrc.js`, `packages/shared/.eslintrc.js`) have to move. Two
further things mean the PR cannot go green whatever happens to those files:
`@typescript-eslint` is pinned at `^6.14.0` and v6 does not support ESLint 9+,
and `--ext` — which `packages/web`'s lint script passes — was removed in
ESLint 9.

**#78, `eslint-plugin-react-hooks` 4.6.2 → 7.1.1.** This one is not
configuration. v7 enables the React Compiler rules in `recommended`, and the
codebase violates them in about twenty places: eighteen `setState` synchronously
within an effect, six `Cannot access refs during render`, one memoization the
compiler cannot preserve (`OpeningTree.tsx:128`), and one use-before-declare
(`PGNInputModal.tsx:50`). Spread across `OpeningDetailPage.tsx`,
`MobileDataSurface.tsx`, `OpeningTree.tsx`, `OpeningNavigator.tsx`,
`MasterGamesCard.tsx`, `PositionSheet.tsx`, `FilterSheet.tsx`,
`PGNInputModal.tsx`, `SearchHub.tsx`, and the `useBrowse`, `useExplorerResult`,
`useMediaQuery`, `useOpeningSearch`, `useOpeningTree`, `useRepertoireToast` and
`usePersonalGames` hooks.

`useOpeningSearch` is on that list, and `packages/web/AGENTS.md` is explicit
that it is shared by all three search surfaces with a parity test holding client
and server ranking together. These are real findings worth fixing, but as their
own reviewed change — land the plugin with the compiler rules at `warn`, clear
the sites in batches, then promote to `error`.

**Both were left open rather than closed**, on the rule already written into
`.github/dependabot.yml`: majors stay visible as a PR each. Closing a Dependabot
PR also stops it re-proposing that version, so a close would have quietly
removed the reminder as well as the PR.

---

## Two traps, both of which produced a false green

### A Dependabot branch is cut from the `main` of the day it opened

#75's frontend suite ran 590 tests where `main` ran 592. Nothing failed — the
two tests did not exist, because the branch predated the commit that added
`STATIC_ROUTES is the route table` to `App.test.tsx`. CI reported the PR green
and was right to: **a test that vanishes is not a test that fails.**

That is a general hazard, not a #75 one. Any Dependabot PR older than the last
few commits is being tested against a codebase that no longer exists.

**So: `gh pr update-branch` every Dependabot PR before believing its CI**, and
compare per-file test counts against `main` rather than trusting the total.

### npm 11 writes a lockfile that npm 10 rejects

Regenerating `package-lock.json` locally (npm 11.6.2, Node 24) dropped the
nested `node_modules/tinyglobby/node_modules/picomatch@4.0.7` — tinyglobby
arrives via `sqlite3` → `node-gyp`. CI pins Node 20, and its `npm ci` refused
the result outright with `Missing: picomatch@4.0.7 from lock file`. Every job
failed at install in about sixteen seconds.

The local tree was genuinely broken too, not just the lockfile:
`npm ls picomatch --all` reported `invalid: picomatch@2.3.2` against
tinyglobby's `^4.0.4`. `npm install --package-lock-only` was the worse of the
two — it drops nested entries even where a full install would keep them.

Regenerating with `npx -y npm@10.8.2 install` produced the correct tree first
time. The rule is now in `AGENTS.md`.

---

## Second pass — 2026-08-30

Merging the first pass changed `main`, so Dependabot re-evaluated and opened
four more PRs one minute after #87 landed. Three merged, one was the same
rejection wearing a new version number.

All four were cut from `a354ab474`, the tip at the time, so the stale-branch
trap below did not apply to any of them — checked with `git merge-base` rather
than assumed. Frontend tests stayed at 592, matching `main`.

| PR  | Change                     | Verification beyond CI                                                                  |
| --- | -------------------------- | --------------------------------------------------------------------------------------- |
| #88 | `tqdm` ≥4.66.0 → ≥4.70.0   | Still no CI under `tools/analysis`. Venv on 3.13, every call site exercised — see below |
| #90 | `dotenv` 16.6.1 → 17.4.2   | Merged locally with #88/#91, full gate set, plus a stdout capture of the v17 banner     |
| #91 | `cross-env` 7.0.3 → 10.1.0 | Inert — see below                                                                       |

**#88's green checks were meaningless and the merge was still safe.** Nothing
under `tools/analysis` is covered by a workflow, so the nine green checks were
the JS suite passing on an unrelated file. The actual check was a venv on Python
3.13 running the full constructor kwarg set the pipeline uses (`unit_scale`,
`unit_divisor`, `ncols`, `mininterval`/`maxinterval`, `position`,
`dynamic_ncols`, `file`), plus `tqdm.write()`, `tqdm.set_lock(RLock())` and the
`-> tqdm` return annotation on `create_progress_bar`.

**#90 is not a production path, which is why a major dotenv bump was cheap.**
Vercel serves `api/*.js`; none of those require dotenv and `api/package.json`
does not list it. Nothing requires `packages/api/src/server.js` at all — it is
the `dev:api` server. The bump also collapsed a duplicate: the root was already
on `^17.2.0` while `packages/api` held a nested `dotenv@16.6.1`, and both now
resolve to one hoisted 17.4.2.

dotenv 17 does have a real behaviour change. `config()` prints a banner to
**stdout** — an advert with a rotating tip, carrying the resolved `.env` path —
and it prints even when no `.env` exists. `server.js` calls `config()` twice, so
`dev:api` gained two lines of it. Both calls now pass `{ quiet: true }`.

The four pipeline call sites (`tools/video-pipeline/index.js`,
`backfill-videos.js`, `scripts/backfill-views.js`,
`tools/llm-enrichment/enrich_openings_llm.js`) have the same banner and were
left alone — the root was already on dotenv 17, so that is pre-existing noise
rather than something #90 introduced.

**#91 changes nothing.** `cross-env` is referenced by no npm script in the root
or in any workspace. Its only mention in the tree is
`tests/setup/root-package-json.test.js:58`, which asserts it is present in
`devDependencies` — a test holding an unused dependency in place. Removing both
is a real cleanup and deliberately not this PR's job. One loose end: cross-env
10 declares `node >=20` while the root `engines` still says `>=18.0.0`. CI pins
20 and npm does not enforce engines by default, so nothing breaks, but the
declaration is now wrong.

### The one that came back: #89, and why it is now ignored

#76 was closed at 08:01. Dependabot reopened the identical change as #89 at
08:23, because 0.5.5 is a different version to the one closed. The CI log is the
same line 149 times:
`Definition for rule 'react-refresh/only-export-components' was not found`.

**A close only suppresses the version closed.** That is a correction to the
first pass's reasoning, which treated closing as the thing that removes a PR
permanently. For a package blocked on tracked work, the next release brings it
straight back.

The sharper problem is which PR it comes back in. `eslint-plugin-react-refresh`
0.4 → 0.5 is a 0.x **minor**, so Dependabot batches it into `npm-development`
rather than filing it as a standalone major. Left open it rides along with every
future dev bump and takes the whole group red — which is exactly what forced #76
to be split into #85, and then happened again. Grouping is the point of
`dependabot.yml`; one package should not be able to poison the batch weekly.

So `.github/dependabot.yml` now carries **one** `ignore` entry, for
`eslint-plugin-react-refresh >=0.5.0`, with its reason and its removal condition
written next to it — the discipline already applied to the `security:audit`
allowlist. It does not hide the work: #86 names react-refresh explicitly.

This is not a hole in "majors are not ignored". Dependabot does not classify
this as a major, and the reason for the entry is group contamination rather than
avoidance.

---

## What is left

- **#86** — the flat-config migration, carrying #77, #78 and react-refresh 0.5.
  Delete the `ignore` entry in `.github/dependabot.yml` when it lands.
- **`react-router@7`** — still outstanding from the 2026-08-28 pass;
  `react-router-dom` is at `^6.20.1`. `sqlite3@6` from that same list has since
  landed.
- **`cross-env` is unused** — drop it from `devDependencies` and drop the
  assertion in `tests/setup/root-package-json.test.js:58` that pins it there.
- **Root `engines` says `node >=18.0.0`** and is no longer true: cross-env 10
  needs 20, and CI has pinned 20 throughout.
- **`tools/analysis` has no CI at all.** Three Python PRs have now been merged
  on hand-verification alone. A workflow that installs `requirements.txt` and
  imports the modules would turn that judgement call into a check.
- Four moderate advisories remain in the production tree. The gate blocks on
  high and critical only, deliberately, and the allowlist is still empty.
