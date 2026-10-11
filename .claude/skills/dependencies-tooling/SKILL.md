---
name: dependencies-tooling
description:
  Dependency, lockfile, lint and build-tooling rules with the incidents behind
  them. Use before adding, upgrading or removing a package, regenerating
  package-lock.json, triaging or merging a Dependabot PR, touching the
  security:audit gate, an eslint.config.js, a build script that spawns a
  process, vercel.json deployment settings, or the test-integrity hook.
---

# Dependencies and tooling

Every entry here broke CI, a deploy, or a gate once. Moved out of the root
`AGENTS.md` because they only matter when you touch these files.

## Hooks

- **A failing test comes first, and a hook stops it being unwritten.** For a bug
  fix: reproduce it as a test, confirm it fails for the reason you expect,
  commit that test, then fix the code without touching it.
  `.claude/hooks/test-integrity.js` runs as a `PreToolUse` hook and blocks an
  edit that adds `.skip` / `.only` / `xit` to a test file, and a shell command
  that removes a test path or writes a disabled test into one. It is a fence,
  not a wall — a shell is too expressive to police completely, and the wall is
  the PR diff. Its patterns are anchored to the start of a line so a disabler
  quoted inside a string is not mistaken for one being introduced.

  The deliberate exception is `ALLOW_TEST_SKIP=1`, and using it belongs in the
  commit message. Hooks inherit the environment of the process Claude Code runs
  in, so for `Edit` and `Write` it has to be exported **before** starting Claude
  Code — there is no per-call environment. A `Bash` command can carry it inline,
  as a prefix, which is also the way out of the fence's one real false positive:
  a heredoc whose body quotes a command the fence would block. Writing about
  this hook in a shell heredoc trips it, twice so far. Use `Edit` or `Write` for
  those files.

Git hooks are separate and bind later. The husky hooks (`pre-commit` runs
prettier + eslint, `pre-push` runs type-check and `test:all`) only bind once
`npm install` has run, because `prepare: husky` is what sets `core.hooksPath`. A
fresh remote session therefore commits with **no git hooks at all** until you
install — run `npm ci` before committing, or rely on CI, which runs lint and
`format:check` on every PR regardless.

## Lint

- **Lint is code quality, Prettier is formatting.** ESLint configs enforce
  code-quality rules only. Do not re-add stylistic rules
  (`indent`/`quotes`/`semi`/`linebreak-style`) — they fight Prettier.
  `packages/api`'s lint script is `eslint src/`; backend tests live at the repo
  root, not `packages/api/tests/`.

- **ESLint is flat config, and the file set lives in the config, not the CLI.**
  Each package has an `eslint.config.js` — CommonJS in `packages/api`, ESM in
  `packages/web` and `packages/shared`, matching each package's `type`. There is
  no `--ext` flag in ESLint 9+, so `files:` and `ignores:` decide what gets
  linted; `eslint .` in `packages/web` will otherwise reach `coverage/` and
  report its generated disable directives. `packages/shared`'s config was
  unreadable for months — `module.exports` under `"type": "module"` — because CI
  linted only api and web. It lints all three now; keep it that way.

- **react-hooks 7 is installed but its `recommended` preset is not.** The
  package enables the React Compiler rules through that preset, and the codebase
  violates them in ~20 places. `packages/web` enables `rules-of-hooks` and
  `exhaustive-deps` explicitly instead, which is what it has always enforced.
  Adopting the preset is #86's remaining half: land the rules at `warn`, clear
  the sites in batches, then promote to `error`. Do not add the preset without
  doing that work.

## The dependency gate

- **The dependency gate is scoped on purpose, and its allowlist expires.**
  `npm run security:audit` (`scripts/audit-dependencies.js`, run by CI) fails on
  high and critical advisories in **production** dependencies only. Dev-only
  findings — the vitest/vite/esbuild dev-server class — are Dependabot's job,
  not a merge blocker, because a gate that must be overridden every PR teaches
  the override. **The allowlist is empty, and the bar for adding to it is
  "unreachable from production _and_ no upgrade exists".** It briefly held
  `sqlite3`'s native build chain (`tar`, `node-gyp`, `cacache`,
  `make-fetch-happen`) on the unreachability argument alone, which was true and
  still the wrong answer — `sqlite3@6` cleared all five including the only
  critical in the tree. Every entry carries a reason and the condition that
  removes it, and **an entry whose advisory has gone fails the run**: that check
  is what forced the upgrade rather than letting the list sit there, and without
  it the gate quietly becomes decorative. Entries are keyed by package name, not
  advisory id, because node-tar accrues new GHSA ids faster than a list would
  stay current. **It fails closed**: `npm audit` answers a registry or proxy
  failure with a JSON error object and no `vulnerabilities` key, and reading
  that as an empty result made the gate report "no blocking advisories" and exit
  0 at the one moment it had checked nothing. A missing `vulnerabilities`/
  `metadata` pair is an error, never a clean tree. Reasoning and the full
  triage: `docs/reviews/2026-08-28-dependency-security-scanning.md`.

- **Never spawn `npm` by name from a build script.** npm is `npm.cmd` on
  Windows, a batch shim: `execFileSync('npm', …)` throws ENOENT, and naming
  `npm.cmd` explicitly is no better because Node refuses to `execFile` a `.cmd`
  at all since the fix for CVE-2024-27980 and throws EINVAL. The audit gate did
  the first of those and so exited 1 before auditing anything, printing
  "Dependency audit could not be completed" — which reads like a real finding —
  for every Windows contributor, while Linux CI stayed green.

  `npmInvocation()` in `scripts/audit-dependencies.js` is the pattern: run npm's
  own `npm-cli.js` with `process.execPath`, taking the path from `npm_execpath`
  (which `npm run` sets) and falling back to the copy bundled beside the node
  binary. **Not `shell: true`** — the argv is fixed today, but a shell turns any
  later interpolation into an injection, and a security gate is the wrong place
  for that. `audit-dependencies.test.js` asserts the invocation is spawnable on
  the machine running it, which is the check that would have caught this
  originally.

## Lockfile and installs

- **Regenerate `package-lock.json` with the npm that CI runs.** That is now npm
  11, because CI moved to Node 24 on 2026-08-31; until then it was npm 10 and
  regenerating with anything newer broke the build. The rule has not changed,
  only which npm satisfies it: a lockfile has to be readable by CI's `npm ci`,
  and the two majors disagree about nested `node_modules/<pkg>/node_modules/*`
  entries. npm 11 drops them when it rewrites the file and npm 10's `ci` then
  refuses it outright — `Missing: picomatch@4.0.7 from lock file`, every job
  dead at install in about sixteen seconds. The reverse is fine: npm 11 reads an
  npm 10 lockfile, which is why the Node bump did not need a regeneration.

  **Never `npm install --package-lock-only`** — it drops nested entries on
  either major, and is what caused this in the first place. If you install with
  `--ignore-scripts`, follow it with `npm rebuild sqlite3` or the native binding
  is missing and `tools/video-pipeline` tests fail to run.

- **`jsdom` is a root devDependency because vitest hoists and jsdom did not.**
  `vitest` lands in the root `node_modules`, so its `import('jsdom')` resolves
  from the root and never sees `packages/web/node_modules/jsdom`. That worked
  for months only because npm auto-installed vitest's _optional peer_ `jsdom` at
  the root — an unversioned 20.0.3 nobody asked for. Any lockfile regeneration
  is free to drop an optional peer, and the first one that did (#100) took the
  whole frontend suite from 592 passing to `no tests` and 61
  `Cannot find package 'jsdom'` errors, on a PR that touched only `googleapis`.
  The root entry is the declaration that makes the resolution deliberate; keep
  it pinned to the same range as `packages/web` — `repo-invariants.test.js`
  fails if it drifts or goes missing.

- **`vitest` is a root devDependency too, because jest-dom resolves it from
  there.** jest-dom sits in the root `node_modules` and types its matchers by
  augmenting the `vitest` module. A bump can leave the old version holding the
  root slot, so npm nests the new one under each workspace instead — #162's
  Dependabot lockfile did exactly that, and every jest-dom matcher stopped
  type-checking (570 errors). npm always installs the root's own dependencies at
  the root, so the declaration pins it there. Keep it on the same range as
  `packages/web`; `repo-invariants.test.js` fails if it drifts, or if the
  lockfile installs vitest anywhere but `node_modules/vitest`.

## Dependabot

- **A Dependabot PR is tested against the `main` of the day it opened.** Run
  `gh pr update-branch` before believing its CI. #75 went green having silently
  lost two tests — its branch predated the commit that added them, and a test
  that vanishes is not a test that fails. Compare per-file test counts against
  `main`, not the total. Full triage:
  `docs/reviews/2026-08-29-dependabot-triage.md`.

- **Closing a Dependabot PR suppresses only the version you closed**, so a
  package blocked on tracked work returns on its next release — #76 came back as
  #89 twenty-two minutes later. Worse, a `0.x` minor is grouped rather than
  filed as a major, so it rides along with every future batch and takes the
  group red. That is why `.github/dependabot.yml` carries exactly one `ignore`
  entry (`eslint-plugin-react-refresh >=0.5.0`, removed when #86 lands). Like
  the `security:audit` allowlist, every entry states its reason and the
  condition that deletes it.

- **Dependabot branches do not deploy to Vercel.** `vercel.json` sets
  `git.deploymentEnabled` to `false` for `dependabot/**` (minimatch, so the `**`
  is what reaches `dependabot/npm_and_yarn/…`). Every deployment stores its own
  copy of the ~78 MB `api/data` in each function, and the Aug 30–31 pass shipped
  ~100 of them — Functions Storage reached 7.98 of Hobby's 10 GB and build CPU
  14h48m in a month. CI never read the previews. When a production dependency
  does want a preview (speed-insights 2 did), push the commit to a
  non-Dependabot branch: `git push origin <sha>:refs/heads/preview/<name>`.
  `repo-invariants.test.js` fails if the `dependabot/**` entry goes.

## Cross-platform paths

- **A path computed _for_ a platform must use that platform's path module** —
  `path.win32` or `path.posix`, never the ambient `path`. On Linux `path` is
  `path.posix`, which does not treat a backslash as a separator, so
  `path.dirname('C:\\a\\b')` is `'.'` there. `bundledNpmCli` got this wrong and
  took CI red: its Windows branch returned a bare relative path on Linux. A test
  that builds its expected value with the host's `path.join` agrees with the bug
  on Windows and fails on CI, so **expectations for another platform are written
  as literal strings**, not composed with `path.join`.
