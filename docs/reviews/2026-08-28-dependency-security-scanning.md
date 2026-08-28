# Lightweight security scanning — findings and plan — 2026-08-28

The question: what should we run to catch serious CVEs, and is it Trivy or
SonarQube? The short answer is neither, at least not first. A scan of the tree
as it stands says the count is not the problem — the triage is.

`npm audit` reports **49 advisories, 26 of them in the production tree**
(`--omit=dev`). Both numbers overstate the exposure by a wide margin, and a
blocking gate switched on today would be red on the first run for reasons that
have nothing to do with what we deploy. So the sequence matters: clear the noise
first, then gate, or the gate teaches us to override it.

---

## What we actually deploy

Worth stating plainly, because it decides which tools are relevant:

- A static Vite build, served by Vercel's CDN.
- Serverless functions under `api/*.js`, each requiring Express and the route
  modules from `packages/api/src/`.
- No Dockerfile, no container, no OS image, no Kubernetes, essentially no IaC
  beyond `vercel.json`.
- Four data pipelines under `tools/` that run on a laptop or in a scheduled
  workflow, and never ship anywhere.

That last line is the one that reframes the audit output.

## The tools, judged against that

**Trivy.** Genuinely good, and the reason it is famous is container and OS-image
scanning — which we have no use for. Pointed at this repo it would run in `fs`
mode against `package-lock.json`, reading the same GitHub Advisory database
`npm audit` already reads, and telling us roughly what we already know. Its
secret-scanning and IaC modes are the parts that would earn a place, and GitHub
gives us the first natively and the second has almost nothing to scan. Not
harmful, just largely redundant here. Revisit it the day we containerise.

**SonarQube.** The wrong shape. It is principally a code-quality engine —
smells, duplication, coverage trends — with SAST alongside. We already run
ESLint, `tsc --noEmit`, Prettier, 90% coverage thresholds and Codecov on every
PR, so the overlap is most of the product. It also wants a server or a
SonarCloud org, which is real ceremony for a single-maintainer project. If we
want SAST, CodeQL is free, native, and better matched.

**What fits instead:** Dependabot, a scoped `npm audit` gate, GitHub secret
scanning with push protection, and CodeQL if we want static analysis. All native
to GitHub, all free on a public repo, no infrastructure to run.

---

## Findings

### 1. `axios` produces over half the advisories and has no live consumer

The single biggest result. `packages/web` declares `axios ^1.6.2`, and **nothing
in `packages/web/src` imports it** — zero files. Tracing the only non-test
consumer in the repo leads to `packages/api/src/services/youtube-service.js`,
which is itself required by nothing but its own test, and is already in the
`collectCoverageFrom` exclusion list in `package.json`. The live YouTube work
happens in `tools/video-pipeline/`, which uses its own fetch path.

So a package with no runtime consumer anywhere, declared in the workspace least
entitled to it, accounts for roughly 30 of the 49 advisories — prototype
pollution, SSRF via `NO_PROXY` bypass, header injection, several DoS paths.

It is also declared in the wrong place twice over: `packages/api` never lists
axios in its own `package.json` and has been resolving it by workspace hoisting.
Removing it from `packages/web` is therefore both the largest single reduction
in findings and a fix for a latent dependency-hygiene bug.

### 2. `xmldom` is critical, unmaintained, and has no fix

`xmldom@0.6.0`, CVSS 9.8, `fixAvailable: false` — seven advisories including XML
injection and uncontrolled recursion. There is no version to upgrade to; the
package is abandoned. One consumer:
`tools/video-pipeline/lib/rss-discovery.js:16`, parsing YouTube RSS feeds.

The answer is the maintained scoped fork, `@xmldom/xmldom`. Same API, same
`DOMParser` import shape, actively patched. This is the one finding where the
tooling's advice ("no fix available") is actively unhelpful and a human has to
choose the replacement.

### 3. The critical `tar` finding is build tooling that never deploys

`sqlite3@5.1.7` pulls `tar`, `node-gyp`, `cacache` and `make-fetch-happen` — six
findings, one of them CRITICAL. All of it is the native-module build toolchain
for the video pipeline's SQLite database. It runs on a laptop, it runs in the
pipeline workflow, and it is never part of a Vercel deployment.

`npm audit --omit=dev` still reports these, because `sqlite3` is a production
dependency of the root package even though only `tools/` uses it. This is the
main reason a naive gate goes red: the loudest severity in the "production"
output is a package that never reaches production.

Upgrading means `sqlite3@6`, a semver-major with a native rebuild. Worth doing,
but on its own schedule, not as part of a security change.

### 4. What genuinely reaches users

Two things, and they are the ones worth prioritising:

- **`react-router-dom@6.30.1`** — open redirect and XSS advisories, shipped to
  every browser that loads the site. Fixable within the 6.x line.
- **`express@4.21.2`** with `path-to-regexp`, `qs` and `body-parser` — runs in
  the serverless functions. Mostly ReDoS and DoS, materially blunted by the 30s
  `maxDuration` cap and Vercel's own limits, but real and non-breaking to patch.

Dev-only noise, for completeness: `vitest`, `vite`, `esbuild`,
`@vitest/coverage-v8`. The CVSS 9.8 vitest advisory requires the Vitest UI
server to be listening, which it never is outside local development.

### 5. `.env.production` is tracked in git

Flagging rather than asserting — the file is committed, and the contents have
not been inspected here. If it holds placeholders, the fix is cosmetic. If it
holds anything live, rotation matters considerably more than rewriting history,
because the value is already in every clone and in the GitHub API. Worth two
minutes of the maintainer's attention before the scanning work lands.

---

## Plan

Ordered by value per unit of effort, not by severity number.

### 1. Clear the noise — dependency cleanup

Remove `axios` from `packages/web`. Swap `xmldom` for `@xmldom/xmldom` in
`tools/video-pipeline/lib/rss-discovery.js`. Run non-breaking `npm audit fix` to
pick up `react-router-dom`, `express` and the transitive patches.

Explicitly out of scope: `sqlite3@6` and anything else semver-major. Those are a
separate change with a separate test burden.

Verification is the whole point of doing this first. The full suite is **932
backend and 590 frontend tests**, green before the change; both must stay green
after, plus `tsc --noEmit` and a real `npm run build:web`. The RSS parser swap
gets direct exercise rather than trusting the suite, since a drop-in fork is
exactly the kind of change that passes tests and breaks at runtime.

### 2. Dependabot

`.github/dependabot.yml`, weekly, grouped so we get a couple of PRs a week
rather than twenty. Security updates ungrouped so they arrive on their own and
are obvious. This is the highest-value item on the list and there is no config
today.

### 3. The CI gate

An `npm audit` job in `ci.yml`, scoped `--omit=dev --audit-level=high`.

The scoping is the design decision. Unscoped, the gate fails today over `tar` in
sqlite3's build chain — a finding that is real, unfixable without a major bump,
and irrelevant to anything we serve. A gate that must be routinely overridden is
worse than no gate, because it trains the override.

### 4. Secret scanning and push protection

Repository settings, not a workflow. Free on public repos, one click, and it
covers the `.env.production` class of problem going forward.

### 5. CodeQL — optional

Free SAST, native, if we want static analysis. Steps 1–4 carry most of the risk
reduction; this is the one to add only if it earns its place.

---

## What this does not solve

Dependency scanning finds known CVEs in third-party code. It says nothing about
our own logic — the fabricated-stats and unbounded-payload classes of bug that
`REVIEW.md` exists to catch are invisible to every tool named here. The scanning
is a floor, not a substitute for the review passes.
