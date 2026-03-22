---
description: 'Git workflow, commits, and memory bank management'
applyTo: '**'
---

# Workflow Standards

## Git Commit Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation
- **refactor**: Code refactoring
- **test**: Adding/updating tests
- **chore**: Maintenance (deps, config)

### Scopes

- **frontend**: React components, pages
- **pipeline**: Data pipelines
- **analysis**: Analysis tools
- **data**: Data files
- **config**: Configuration

### Examples

```
feat(frontend): add popularity badge to opening cards

Display "Popular" badge on openings with >15% popularity.
```

```
fix(pipeline): handle missing video metadata gracefully

Fixes #234
```

## Branch Naming

```
<type>/<short-description>

feat/opening-search
fix/video-pipeline-crash
refactor/stats-calculation
```

## Workflow

```bash
# Feature development
git checkout main && git pull
git checkout -b feat/opening-search
# ... make changes ...
git commit -m "feat(frontend): add opening search"
git push -u origin feat/opening-search
# Create PR on GitHub
```

## PR Checklist

- [ ] Code follows project style
- [ ] Tests added/updated
- [ ] No breaking changes (or documented)
- [ ] Squash commits before merge

---

## Memory Bank

The memory bank tracks project state across sessions.

### Structure

```
.github/memory-bank/
├── context.md        # Project foundation (rarely changes)
├── activeContext.md  # Current + previous task only (< 50 lines)
├── progress.md       # One-liner per task + what's left (< 100 lines)
├── archive.md        # Historical session details (never auto-loaded)
└── user-journeys.md  # Core user flows and functionality
```

### Size Limits

| File               | Max Lines | Content                               |
| ------------------ | --------- | ------------------------------------- |
| `activeContext.md` | 50        | Current task + previous task          |
| `progress.md`      | 100       | One-liner per task, what's left       |
| `context.md`       | 160       | Architecture, tech stack, decisions   |
| `archive.md`       | No limit  | Full session details (read on demand) |

### When to Update

1. **Task completes**: One-liner to `progress.md`, details to `archive.md`, wipe
   from `activeContext.md`
2. **New task starts**: Replace current task section in `activeContext.md`
3. **Architecture changes**: Update `context.md`
4. **User requests**: "update memory bank"

### Rules

- **Never append** to `activeContext.md` — replace the current task section
- **Trim when exceeding limits** — move excess to `archive.md`
- **Detailed history** belongs in git commits and `archive.md`

### At Session Start

Always read:

1. `activeContext.md` - Current work focus
2. `progress.md` - What's done and what's left
