# Active Context

**Date:** 2026-11-01

## Current Task: #204/#205, popular at your level

Plan: `docs/superpowers/plans/2026-10-29-level-ranking.md`. Phases 1, 2 and 4
are merged (#213, #214; closes #204). Stats come from the last 3 Lichess monthly
files (2026-07..09, 270.8M blitz/rapid/classical games, bots and abandoned
excluded), summarised by `tools/analysis/summarise_month.py` and combined by
`combine_window.py` into `popularity_stats.json`, `popularity-bands.json` and
256 `position-stats/` shards. Under 20 games a position keeps its count with
null rates. Discover ranks by level (`/browse?band=`) and shows "Lichess ·
Jul–Sep 2026" under the count, desktop only (mobile cards show no game counts).
The detail page reads every Lichess band from the page response (`bands`,
`parentBands`); only Masters still calls `/api/explorer`.
`repo-invariants.test.js` holds shards under 250 KB and the bands file under 3.5
MB. Next: register the refresh task (`schedule/register-task.ps1`; owner
approves the task definition first; October's file lands ~3–10 Nov), then Phase
3 (#205, needs the chess.com-line decision), then Task 3c (retire the old
pipeline after the first scheduled refresh).

## Previous Task: backlog split into issues and an idea pool

`docs/backlog.md` is now the ranking, the decisions and the ideas not yet ready.
An item becomes a GitHub issue once it has a clear problem, a "done when" and a
link to its review or PRD; its bullet becomes `→ #N`. The five **Next** items
are #195–199. **Now** was done apart from the popularity refresh, which was
already parked and moved to **Parked**. `AGENTS.md` points here. Owner's call: a
trial on Now/Next first; move the rest only if issues get used.

Standing: revisit analytics late Nov 2026 with six weeks of the new events;
search ranking and the video pipeline are paused until then (`archive.md`).
