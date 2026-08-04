---
name: popularity-stats
description:
  Run the Python pipeline that computes opening popularity and win/draw/loss
  statistics from the Lichess rated-games database. Use when refreshing
  popularity data, adding a month of games, or debugging opening statistics.
---

# Popularity stats

Processes the Lichess rated-games database into opening statistics.

```bash
pip install -r tools/analysis/requirements.txt
python tools/analysis/run_pipeline.py --incremental   # only new months since last run
python tools/analysis/run_pipeline.py                 # full re-run
```

This pipeline downloads monthly PGN dumps from `database.lichess.org` and
decompresses them with zstd, so it needs Python 3.9+, a stable connection, and
substantial free disk — a single busy month can approach 50 GB. Incremental is
much faster and is the normal mode; use a full run only after ECO files change.

## The shipped data did not come from this pipeline

Check `metadata` in `api/data/popularity_stats.json` before assuming a rerun
reproduces what's live. The current file was generated **2025-07-15** and
records `"analysis_method": "API-based (not PGN processing)"` against
`explorer.lichess.ovh/lichess` — a script that no longer exists in this repo.
`run_pipeline.py` is the maintained path and writes a compatible schema
(`positions` keyed by FEN, consumed by `eco-service.js` and
`popularity-stats-service.js`), but it derives the numbers differently, and the
live data is roughly a year old.

Two consequences: don't expect a rerun to match the current values, and don't
try to reproduce the original API method — the Lichess explorer has required
authentication since 2026-03 and would 401.

## The caveat that reaches users

This data covers **all rated Lichess players, not master games** — the source is
the `/lichess` explorer endpoint, and the shipped sample carries `avg_rating`
around 2016. Every label, caption and column header derived from it must say so.
Calling it master data is a factual error visible to users; it has shipped
before.

Full pipeline documentation: `tools/analysis/README.md`.
