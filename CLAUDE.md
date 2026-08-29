@AGENTS.md

## Claude Code

Skills cover the pipelines, the design system, and the two subsystems whose
invariants are too deep for `AGENTS.md` — `openingbook-design`,
`video-pipeline`, `course-discovery`, `popularity-stats`, `seo-crawl-graph`,
`search-ranking`. Prefer them over re-deriving a runbook from the READMEs.

Auto-memory is machine-local and is not shared between the desktop, web, and
remote sessions used on this project. Anything that needs to survive across them
belongs in `.github/memory-bank/`, which is committed.
