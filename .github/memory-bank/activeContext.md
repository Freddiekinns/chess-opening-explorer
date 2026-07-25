# Active Context

**Date:** 2026-07-25

## Current Task: Agent instruction docs audit + restructure

**Status:** Implemented on branch `claude/new-session-u6sizp`. Audited all 31
agent-facing markdown docs against Claude 5 context-engineering guidance
(Anthropic removed 80%+ of Claude Code's system prompt; the prescription is to
spend CLAUDE.md tokens on codebase gotchas and cut anything derivable from the
repo). Audit: `docs/reviews/2026-07-25-agent-docs-audit.md`.

Found four dead mechanisms: `.claude/agents/*.md` had no YAML frontmatter so
never registered; `design-system/project/SKILL.md` wasn't under
`.claude/skills/` so `/openingbook-design` didn't exist;
`design-system/README.md` referenced a directory name that doesn't exist;
`.agent/workflows/` isn't read by anything. Plus four npm scripts pointing at
the non-existent `tools/production/`, and `markdown.instructions.md` was an
unmodified Microsoft blog template requiring a `microsoft_alias` frontmatter
field.

**Structure now:** portable `AGENTS.md` (repo summary + gotchas) imported by a
thin `CLAUDE.md`; scoped `packages/web`, `packages/api`, `tools/analysis`
`AGENTS.md` files each with a one-line `CLAUDE.md` stub, so a future Codex
switch needs no rework; four registered skills (`openingbook-design`,
`video-pipeline`, `course-discovery`, `popularity-stats`); `pipeline-reviewer`
subagent revived with frontmatter. Deleted `.github/instructions/` (Copilot no
longer used here) and `.agent/`.

**Follow-up:** run `/doctor` locally — it can't run from a remote session, and
it proposes CLAUDE.md trims in the same direction.

## Previous Task: Video matcher — modifier-aware sibling-variation matching

Shipped 2026-07-20 from `fix/video-matcher-sibling-variations`. Word-boundary,
diacritic-normalized `findPhrase` with config-driven `variation_modifiers`
rejects sibling-variation videos. Sibling matches 301→0; top-200 coverage held
183/200; contamination 0. 15 new tests. Detail in `archive.md`.
