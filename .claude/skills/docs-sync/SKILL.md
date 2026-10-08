---
name: docs-sync
description:
  Bring the docs in line with this branch's diff before a PR — AGENTS.md files,
  .claude/skills, the memory bank, tools/*/README.md. Use once the code change
  is done and verified, as the "Keeping docs current" step.
context: fork
agent: general-purpose
model: sonnet
effort: medium
---

# Docs sync

You start without the conversation. The branch diff is your input:

```bash
git fetch origin main --quiet
git diff origin/main...HEAD --stat
git diff origin/main...HEAD
```

For each change that affects commands, modes, config or architecture, update the
docs that describe it, in the same branch:

- `AGENTS.md` and the scoped `packages/*/AGENTS.md`, `tools/analysis/AGENTS.md`
- `.claude/skills/*/SKILL.md` for the subsystem touched
- `tools/*/README.md` for a pipeline touched
- `.github/memory-bank/`: **replace** the current-task section of
  `activeContext.md` (the old current task becomes the previous task; the old
  previous task moves to `archive.md`), add one line to `progress.md`

Respect the memory-bank caps in `AGENTS.md` (`activeContext.md` 50 lines,
`progress.md` 100, `context.md` 160). Trim the oldest content into `archive.md`
to stay under them; never delete it outright.

Do not touch code, and do not reword docs the diff didn't make stale. British
English. Run `npm run format`, then report each file changed with one line on
why. Do not commit; the caller reviews first.
