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
├── activeContext.md  # Current work focus (frequently updated)
└── progress.md       # What works, what's left (frequently updated)
```

### When to Update

1. After implementing significant changes
2. When discovering new patterns
3. When user requests **update memory bank**

### Commands

- **update memory bank** - Review and update ALL memory bank files
- **add task** / **create task** - Create new task
- **update task [ID]** - Update existing task
- **show tasks [filter]** - Display filtered task list

### At Session Start

Always read:

1. `activeContext.md` - Current work focus
2. `progress.md` - What works and what's left
