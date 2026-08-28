# The AI-native SDLC, minus what we already do — 2026-08-28

Against Anthropic's
[AI-Native SDLC playbook](https://claude.com/blog/the-ai-native-sdlc-playbook)
(Louis Claxton, 2026-08-21): six stages — Plan, Design, Build, Test, Deploy,
Maintain — each committing an artifact the next stage reads, with two layers of
control (skills and CLAUDE.md make good behaviour likely; hooks and tests make
bad behaviour impossible).

**We already run five of the six.** Intent lives in
`.github/memory-bank/tasks/`, specs in `docs/superpowers/specs/`, plans in
`docs/superpowers/plans/`, repo memory in `AGENTS.md` plus three scoped files,
policy in four skills, the feedback loop in `npm run test:all` and the
`scripts/audit-*.js` pass. None of that needs renaming to `intent.md` /
`spec.md` / `plan.md`; the artifact chain is the point, not the filenames.

This records only what actually changes.

---

## The delta

### 1. Guard tests for the load-bearing gotchas — done

`AGENTS.md` carries ~30 rules earned from real regressions, and enforcement is
uneven. These are asserted nowhere and each is a handful of lines:

- `vercel.json` has no `/api/explorer` entry (a config header would clobber the
  route's per-band TTLs).
- The `middleware.ts` matcher excludes `sitemap.xml`, `sitemap-index.xml` and
  `robots.txt` (currently correct, and broke once already).
- `description` is not in `FUSE_OPTIONS.keys`. The ECO-code branch is tested;
  this rule is only a comment.
- Search routes project through `toSearchResult` rather than returning raw
  service results.

Related: `openings.routes.js` is in the `collectCoverageFrom` exclusions in
`package.json`, so the file holding the bandwidth-critical projection is the one
file coverage cannot see.

Why this first: it is the playbook's core argument applied to us. Prose in
`AGENTS.md` is advisory; a test is deterministic. It is also how that file
shrinks towards the playbook's "keep it under a page" without losing anything —
the rule moves into the check that enforces it.

### 2. Test integrity: failing test first, and a hook that means it — done

The playbook's rule for bug fixes: reproduce the bug as a test, confirm it fails
for the reason you expect, commit that test, then fix the code without editing
it — enforced by a hook blocking test-file edits during a fix task, because "an
agent fixing code must not be able to weaken the check on that code."

`AGENTS.md` already says never skip, disable or quarantine a test, but that sits
in the PR-handling section and nothing enforces it. `.claude/settings.json`
currently holds a deny list for `.env*` and no hooks at all. A `PreToolUse`
matcher over `tests/**` and `packages/web/src/**/*.test.*` is the whole change.

### 3. `REVIEW.md` — done

Most code here is agent-authored and the review bar is project-specific:
fabricated stats, unbounded payloads, middleware/page description parity,
pipeline ratchets. Written down once, `/code-review` and any PR-review pass
check our bar instead of generic style opinions.

Half a page, following the playbook's shape: named passes; what Important means
here as against a nit; a five-nit cap; skip generated paths and anything CI
already enforces (which is the same list item 1 keeps growing).

### 4. Detection bands — larger, and deliberately later

The one stage we do not run. Google dropped 5,010 opening pages on 30/31 July
and we learned it from impressions at 111 → 4; the Accelerated Dragon
contamination was reported by a human, not detected. Both were visible in
metrics we already compute.

The playbook's shape: a deterministic script on a rolling baseline, tiers in a
`bands.yaml` — 1σ log, 2σ read-only diagnosis, 3σ propose a PR — and dismissals
tune the bands. Detection involves no model at all, which is what makes it
compatible with the wake-up cost rule in `AGENTS.md`: the script is free to run
hourly, and a breach files an issue rather than waking a session.

Two candidate metrics, both cheap: the `scripts/audit-video-matches.js --json`
figures diffed against a committed baseline (coverage, top-1 specificity,
cross-family contamination, index age), and a synthetic fetch of a handful of
`/opening/` URLs asserting `#root` is non-empty and the description is not the
template string. The second would have caught the de-indexing cause on the day
it shipped.

---

## Deliberately not adopting

- **Approval-gate hooks, managed settings, sandboxing, per-environment autonomy
  tiers.** These solve enterprise separation of duties. Here the deploy gate is
  one person merging to `main`; ask-hooks would add prompts to our own sessions
  and nothing else.
- **A 20–50 task eval suite gating changes to `AGENTS.md` and skills.** Right
  idea, wrong scale for a solo project. Items 1 and 2 buy most of the same
  protection deterministically and for nothing per run.
- **Agent-invoked incident response, chat on-call, recurring model-driven
  scans.** All assume a team on the other end.
- **Renaming our artifacts to the playbook's filenames.** No behaviour change
  for a week of churn across `docs/` and the memory bank.

## How we would know it worked

- The de-indexing class of failure is found by a check rather than by noticing a
  graph, and the time from breach to a filed issue is measurable.
- Regressions of a gotcha already written down stop recurring — the playbook's
  own test for whether a written policy is actually being applied.
- `AGENTS.md` gets shorter as rules move into checks, without any rule being
  lost.

## Order

1, 2 and 3 shipped. 4 is its own piece of work and should get a task file first.

## What shipping 1 and 2 turned up

- `/api/openings/search` and `/api/openings/search-by-category` were returning
  whole opening records. The rule was written down; nothing asserted it, and two
  routes had drifted. Both now project through `toSearchResult`. Neither has a
  caller in `packages/web`, so this is a payload reduction rather than a
  behaviour change any surface will notice.
- Git hooks do not exist in a fresh clone. `prepare: husky` sets
  `core.hooksPath` during `npm install`, so a remote session that has not
  installed commits with no prettier, no eslint and no pre-push test run. CI
  catches the formatting; nothing local does. Recorded in `AGENTS.md`, and the
  proper fix is a SessionStart hook that installs — not in this change.
