---
name: Always update documentation with code changes
description:
  When changing pipeline code, commands, or architecture, update all related
  docs in the same PR
type: feedback
---

When making code changes that affect commands, architecture, or workflows,
always update all related documentation in the same change — don't leave it as a
separate step.

**Why:** TASK012 had no documentation updates in the original plan, and it
should have. Docs went stale across 8+ files. The user had to explicitly ask for
this.

**How to apply:** After any code change that modifies commands, modes, config,
or architecture, grep for references across: CLAUDE.md, README files,
`.agent/workflows/`, `.claude/agents/`, `.github/memory-bank/` (context,
progress, activeContext), `.github/instructions/`, and `tools/README.md`. Update
them all before committing.
