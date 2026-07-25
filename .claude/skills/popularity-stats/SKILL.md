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

Requires Python 3.9+, a stable connection, and roughly 50 GB of free disk for
temporary files. Incremental is much faster and is the normal mode; use a full
run only after ECO files change.

## The caveat that reaches users

This data covers **all rated Lichess players, not master games.** Every label,
caption and column header derived from it must say so. Calling it master data is
a factual error visible to users — it has shipped before.

Full pipeline documentation: `tools/analysis/README.md`.
