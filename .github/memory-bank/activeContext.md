# Active Context

**Date:** 2026-11-01

## Current Task: #208, progressive content review

Pages now have a review record: `data/content-review/ledger.json`, keyed by FEN,
with the date, a verdict and a hash of the description and plans. A page is due
again when its text changes or after 12 months. Seeded with the 105
brief-audited roots (2026-10-11). Batch 2026-11-01: PostHog views since
2026-09-24 (142 paths, 132 pages), top 50 by people reviewed, 17 fixed in
`api/data/eco/` (mostly bishop colours and pieces that aren't there; three
misread positions). 76 visited pages still due. Runbook:
`tools/content-review/README.md`. #208 stays open; #188 should export the
viewed-pages list so step 1 stops needing Chrome.

## Previous Task: #204/#205, popular at your level

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
MB. The refresh task is registered (2026-11-01); October's file lands ~3–10 Nov
and the run notifies when it starts and ends. Next: review the
`data/popularity-2026-10` branch it commits, then Phase 3 (#205, needs the
chess.com-line decision), then Task 3c (retire the old pipeline after the first
scheduled refresh).

Standing: revisit analytics late Nov 2026 with six weeks of the new events;
search ranking and the video pipeline are paused until then (`archive.md`).
