@AGENTS.md

## Claude Code

Skills cover the pipelines, the design system, dependencies and tooling, and the
two subsystems whose invariants are too deep for `AGENTS.md` —
`openingbook-design`, `video-pipeline`, `course-discovery`, `popularity-stats`,
`seo-crawl-graph`, `search-ranking`, `dependencies-tooling`. Prefer them over
re-deriving a runbook from the READMEs.

Auto-memory is machine-local and is not shared between the desktop, web, and
remote sessions used on this project. Anything that needs to survive across them
belongs in `.github/memory-bank/`, which is committed.

### Models, effort and delegation

The owner is on a Pro plan; usage is the constraint. The main session stays on
Opus, because a wrong turn costs more to unpick than it saves. Effort is the
dial: **medium** (Opus 5.5's default) for most work, **high** for search
ranking, the SEO crawl graph, new subsystem design, or a bug still unexplained
after one attempt.

Delegate only when all three hold: the task is self-contained, a command can
verify it, and its output would otherwise flood this context. Otherwise do it
here — a subagent starts cold and re-reads `AGENTS.md` and the files it needs.

| Agent / skill       | Model          | Use for                                              |
| ------------------- | -------------- | ---------------------------------------------------- |
| `scout`             | Haiku, low     | Lookups; use it instead of Explore (session's model) |
| `verifier`          | Haiku, low     | `test:all`, `build`, `build:vercel`; failures only   |
| `implementer`       | Sonnet, medium | A written file-by-file plan; stops on mismatch       |
| `pipeline-reviewer` | Sonnet, high   | Pipeline changes before a run or commit              |
| `/docs-sync`        | Sonnet, medium | "Keeping docs current", from the branch diff         |

Review a subagent's diff before committing it. Batch data work (style-tag
research, classification) follows its own README's model choices.
