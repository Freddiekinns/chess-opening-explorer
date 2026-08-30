# Active Context

**Date:** 2026-08-30

## Current Task: The Dependabot backlog, third pass

Three more PRs after #92, all cut from the tip `fc1a43c9` — base SHAs checked,
so the stale-branch trap did not apply. #93 (react-refresh 0.4.26) and #95
(concurrently 10.0.5) merged; #94 was answered by deleting the dependency, #96.

**#93 is the `ignore` entry behaving.** It pins `>=0.5.0`, so the 0.4 line still
flows as an ordinary `npm-development` bump and Lint stays green — the check
that produced 149 errors on #76 and #89.

**#95's green checks did not cover the thing being changed.** No workflow runs
`concurrently`; it is named only by `dev` and `start`. Verified by installing
v10 in a scratch directory and pointing it at the real commands — Vite on 3000,
nodemon plus the API on 3010. Same shape as #88's `tqdm` bump.

**#94 bumped a package nothing uses.** Root Jest is `testEnvironment: "node"`,
so is `packages/api`, no `@jest-environment` pragma exists, and `packages/web`
runs Vitest against its own `jsdom@23`; `jest-environment-jsdom@30` beside
`jest@29` would have been a live mismatch. Dropped with `cross-env` in #96,
because **deleting the dependency is the only thing that stops Dependabot
proposing it** — closing suppresses one version, per #76 → #89.

**Both open decisions are now made.** `open-pull-requests-limit` stays at 5:
raising it mattered only while #77 and #78 held two npm slots, and the
flat-config migration closes both. Root `engines.node` is `>=20.19.0`, the floor
ESLint 10 actually needs, rather than concurrently 10's `>=22` — CI runs Node 20
and a manifest that declares its own CI unsupported is the worse error. It is
the only Node declaration in the repo and it is a range, not a pin, so Vercel's
function runtime is unaffected.

Full triage: `docs/reviews/2026-08-29-dependabot-triage.md`.

## Previous Task: The Dependabot backlog, second pass

Four PRs a minute after #87 landed. #88 `tqdm` ≥4.70, #90 `dotenv` 17.4.2 and
#91 `cross-env` 10.1.0 merged; #89 was #76 wearing a new version number.

dotenv 17 was the only real behaviour change and cannot reach production —
Vercel serves `api/*.js`, none of which require it. v17 prints a banner to
stdout on every `config()`, so `dev:api` gained two lines of advertising; both
calls now pass `{ quiet: true }`.

#89 is why `.github/dependabot.yml` carries one `ignore` entry (#92): closing a
Dependabot PR suppresses only the version closed, and react-refresh 0.4 → 0.5 is
a `0.x` minor, so it rides along with every future dev bump and takes the group
red. **Delete the entry when #86 lands.**
