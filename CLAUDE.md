# Claude AI Assistant Guide

## Quick Rules (Always Apply)

1. **CSS Modules when touching styles** - Extract component CSS into `.module.css` files when modifying styles. Legacy global styles in `packages/web/src/styles/simplified.css`. See `reactjs.instructions.md` for migration guide & checklist.
2. **TypeScript** for React components
3. **Python** for `tools/analysis/` only
4. **Tests alongside source** - Backend: `tests/`, Frontend: `packages/web/src/**/__tests__/`
5. **Commits**: conventional format (`feat`/`fix`/`chore`)
6. **Early returns** over nested conditionals
7. **Named exports** for utilities, default for components
8. **No console.log** in production code
9. **Update activeContext.md** after significant changes
10. **Ask rather than assume** requirements

---

## Quick Start

1. **First Time?** Read [context.md](.github/memory-bank/context.md)
2. **Check Current State** via `activeContext.md` and `progress.md`
3. **Load instructions** only when relevant to your task

## Memory Bank

```
.github/memory-bank/
├── context.md        # Project foundation (architecture, tech, patterns)
├── activeContext.md  # Current work focus
└── progress.md       # What works, what's left
```

**Always read first**: `activeContext.md` + `progress.md`

## Instructions (Load As Needed)

| Task | File |
|------|------|
| **JavaScript/Node.js** | `javascript.instructions.md` |
| **Python** | `python.instructions.md` |
| **React** | `reactjs.instructions.md` |
| **Code Quality** | `code-standards.instructions.md` |
| **Testing** | `testing.instructions.md` |
| **Git/Commits** | `workflow.instructions.md` |
| **Project Overview** | `project-overview.instructions.md` |

## Project Structure

```
chess-opening-explorer/
├── packages/
│   ├── api/          # API logic
│   ├── web/          # React frontend
│   └── shared/       # Shared utilities
├── api/              # Vercel serverless wrappers
├── data/             # JSON data files
├── tools/            # Data pipelines
├── tests/            # Backend tests (Jest)
└── .github/
    ├── instructions/ # Coding standards
    └── memory-bank/  # Project context
```

## Workflows

- `/enrich-openings` - Run LLM enrichment pipeline
- `/update-popularity-stats` - Update Lichess statistics
- `/video-pipeline` - Discover and match YouTube videos
- `/course-discover` - Discover courses from Lichess educators (see `tools/course-discovery/README.md`)

## Common Patterns

### Bug Fix
1. Read `activeContext.md` + `progress.md`
2. Load language-specific + `testing.instructions.md`
3. Fix, test, commit

### New Feature
1. Read `activeContext.md` + `progress.md` + `context.md`
2. Load language-specific + `testing.instructions.md`
3. Implement, test, commit

### Refactoring
1. Read `context.md` (for patterns) + `activeContext.md`
2. Load `code-standards.instructions.md`
3. Refactor, test, commit
