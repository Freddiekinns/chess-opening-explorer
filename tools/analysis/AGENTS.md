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

Full pipeline documentation, including the incremental mode and disk
requirements, is in `README.md` here.
