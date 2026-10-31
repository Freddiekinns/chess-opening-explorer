# Active Context

**Date:** 2026-10-31

## Current Task: #204/#205, popular at your level (branch `feat/level-ranking`)

Plan: `docs/superpowers/plans/2026-10-29-level-ranking.md`. Phase 0 and Task 3
done. Stats now come from the last 3 Lichess monthly files (2026-07..09, 270.8M
blitz/rapid/classical games, bots and abandoned excluded), summarised by
`tools/analysis/summarise_month.py` and combined by `combine_window.py` into
`popularity_stats.json`, `popularity-bands.json` and 256 `position-stats/`
shards. Cross-checked against the explorer on 2026-03: within 0.63%. Under 20
games a position keeps its count with null rates (601 positions, 9 ever
visited). Task 3b: `refresh.py` + `schedule/register-task.ps1` (runs from its
own worktree at origin/main, commits to `data/popularity-YYYY-MM`, never
pushes); register only after merge, owner approves the task definition. Phase 2:
`/browse?band=` ranks by level, Discover and the detail card date the stats
("Lichess games, Jul–Sep 2026"). Phases 1+2 are one PR (refs #204). Next: Task
10 (detail page from shards; closes #204), then Phase 3 (#205). Task 3c retires
the old pipeline after the first scheduled refresh.

## Previous Task: backlog split into issues and an idea pool

`docs/backlog.md` is now the ranking, the decisions and the ideas not yet ready.
An item becomes a GitHub issue once it has a clear problem, a "done when" and a
link to its review or PRD; its bullet becomes `→ #N`. The five **Next** items
are #195–199. **Now** was done apart from the popularity refresh, which was
already parked and moved to **Parked**. `AGENTS.md` points here. Owner's call: a
trial on Now/Next first; move the rest only if issues get used.

Standing: revisit analytics late Nov 2026 with six weeks of the new events;
search ranking and the video pipeline are paused until then (`archive.md`).
