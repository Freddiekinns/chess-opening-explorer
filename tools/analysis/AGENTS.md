# Python rules

Python 3.9+, used only in this directory: the Lichess popularity-stats pipeline.
Everything else in `tools/` is Node.

- Type hints on function signatures
- `pathlib` for file operations, not `os.path`
- Dataclasses for structured data
- No bare `except:` — catch what you mean
- Context managers for resources
- `black` for formatting, `flake8` for linting, `pytest` for tests

## Domain caveat

The pipeline aggregates **all rated Lichess games, not master games.** Any
label, caption, or column header derived from this data must say so — calling it
master data is a factual error that reaches users.

## Provenance

`api/data/popularity_stats.json`, `popularity-bands.json` and `position-stats/`
come from `summarise_month.py` (one Lichess monthly file → a committed summary
in `data/monthly/`) and `combine_window.py` (the last 3 months → the served
files). `run_pipeline.py` and `analyze_lichess_popularity.py` are the original
pipeline: nothing runs them, their counting rules are wrong (see `README.md`),
and they are due to be removed. Don't build on them.

Change a counting rule only with a cross-check against the explorer
(`crosscheck_explorer.py`, the owner's personal token, never production's).

Full pipeline documentation, including the incremental mode and disk
requirements, is in `README.md` here.
