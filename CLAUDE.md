@AGENTS.md

## Claude Code

Skills cover the pipelines and the design system — `openingbook-design`,
`video-pipeline`, `course-discovery`, `popularity-stats`. Prefer them over
re-deriving a runbook from the READMEs.

Auto-memory is machine-local and is not shared between the desktop, web, and
remote sessions used on this project. Anything that needs to survive across them
belongs in `.github/memory-bank/`, which is committed.
