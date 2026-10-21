# Active Context

**Date:** 2026-10-21

## Current Task: backlog split into issues and an idea pool

`docs/backlog.md` is now the ranking, the decisions and the ideas not yet ready.
An item becomes a GitHub issue once it has a clear problem, a "done when" and a
link to its review or PRD; its bullet becomes `→ #N`. The five **Next** items
are #195–199. **Now** was done apart from the popularity refresh, which was
already parked and moved to **Parked**. `AGENTS.md` points here. Owner's call: a
trial on Now/Next first; move the rest only if issues get used.

## Previous Task: #187 — clean up unused Claude skills and agents

Transcripts from 11 Jul to 20 Oct showed `scout`, `implementer` and `/docs-sync`
never chosen, so they are deleted. `course-discovery` and `popularity-stats`
never loaded because nothing touched their pipelines; their unique content
(rematch staleness, the shipped stats' provenance) moved into
`tools/*/README.md`. `CLAUDE.md` now routes `test:all` and builds to `verifier`
(the main session had run them inline ~25 times to its 3), and `AGENTS.md` gates
new skills on the third repeat. Untracked `.agents/` and `.codex/` copies of the
skills (16 Sep) had drifted; not tracked, left alone.

`.claude/settings.json` disables the vercel and ralph-loop plugins here: none
loaded once. Re-enable vercel if its MCP is wanted (#188).

Standing: revisit analytics late Nov 2026 with six weeks of the new events;
search ranking and the video pipeline are paused until then (`archive.md`).
