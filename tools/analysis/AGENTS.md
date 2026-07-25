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

`run_pipeline.py` downloads monthly PGN dumps from `database.lichess.org` and
processes them locally. The **shipped** `api/data/popularity_stats.json` did not
come from it: its metadata records an API-based generation against
`explorer.lichess.ovh` dated 2025-07-15. Schemas are compatible, but a rerun
will not reproduce the current numbers, and the original API method would now
401 (Lichess gated the explorer behind auth in 2026-03). See the
`popularity-stats` skill.

Full pipeline documentation, including the incremental mode and disk
requirements, is in `README.md` here.
