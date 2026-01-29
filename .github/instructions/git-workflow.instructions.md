---
description: "Git commit message standards and workflow best practices"
applyTo: "**"
---

# Git Workflow and Commit Standards

## Commit Message Format

### Structure

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type

Must be one of the following:

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, missing semicolons, etc.)
- **refactor**: Code refactoring (no functional changes)
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Maintenance tasks (dependencies, build config, etc.)
- **ci**: CI/CD configuration changes

### Scope (Optional)

The scope specifies what part of the codebase is affected:

- **frontend**: React components, pages, UI
- **pipeline**: Data pipelines (video, enrichment, stats)
- **analysis**: Analysis tools and scripts
- **data**: Data files and schemas
- **config**: Configuration files
- **deps**: Dependencies

### Subject

- Use imperative mood ("add" not "added" or "adds")
- Don't capitalize first letter
- No period at the end
- Keep under 50 characters
- Be specific and descriptive

### Body (Optional)

- Explain **what** and **why**, not **how**
- Wrap at 72 characters
- Separate from subject with blank line
- Use bullet points for multiple items

### Footer (Optional)

- Reference issues: `Fixes #123`, `Closes #456`
- Breaking changes: `BREAKING CHANGE: description`

## Examples

### Good Commit Messages

**Simple feature**

```
feat(frontend): add popularity badge to opening cards

Display a "Popular" badge on openings with >15% popularity
to help users identify commonly played openings.
```

**Bug fix**

```
fix(pipeline): handle missing video metadata gracefully

The video pipeline was crashing when YouTube API returned
videos without descriptions. Now defaults to empty string
and logs a warning.

Fixes #234
```

**Refactoring**

```
refactor(analysis): extract win rate calculation to utility

Moved win rate calculation logic from multiple files into
a shared utility function to reduce duplication and improve
maintainability.
```

**Documentation**

```
docs: update README with video pipeline instructions

Added section explaining how to run the video discovery
pipeline and configure YouTube API credentials.
```

**Chore**

```
chore(deps): update dependencies to latest versions

- react 18.2.0 -> 18.3.0
- next 13.4.0 -> 13.5.0
- prettier 2.8.0 -> 3.0.0
```

**Breaking change**

```
feat(data)!: change opening data schema format

BREAKING CHANGE: Opening data now uses nested structure
for variations instead of flat array. Migration script
provided in scripts/migrate-opening-data.js

Closes #456
```

### Bad Commit Messages

```
fix: bug fix                    # Too vague
feat: stuff                     # Not descriptive
Updated files                   # No type, not imperative
Fixed the thing that was broken # Not specific
WIP                            # Work in progress commits should be squashed
```

## Branch Naming

### Format

```
<type>/<short-description>
```

### Examples

```
feat/opening-popularity-badges
fix/video-pipeline-crash
refactor/stats-calculation
docs/update-readme
chore/update-dependencies
```

### Branch Types

- **feat/**: New features
- **fix/**: Bug fixes
- **refactor/**: Code refactoring
- **docs/**: Documentation updates
- **chore/**: Maintenance tasks

## Workflow

### Feature Development

```bash
# 1. Create feature branch from main
git checkout main
git pull origin main
git checkout -b feat/opening-search

# 2. Make changes and commit
git add .
git commit -m "feat(frontend): add opening search functionality"

# 3. Push to remote
git push origin feat/opening-search

# 4. Create pull request on GitHub

# 5. After review and approval, merge to main
# (Use GitHub's merge button or rebase)
```

### Bug Fixes

```bash
# 1. Create fix branch
git checkout -b fix/video-matching-error

# 2. Write test that reproduces bug
git add .
git commit -m "test(pipeline): add test for video matching edge case"

# 3. Fix the bug
git add .
git commit -m "fix(pipeline): handle videos without descriptions

The video matching algorithm was failing when videos
had no description field. Now defaults to empty string.

Fixes #123"

# 4. Push and create PR
git push origin fix/video-matching-error
```

### Hotfixes

```bash
# 1. Create hotfix branch from main
git checkout main
git checkout -b hotfix/critical-data-corruption

# 2. Fix the issue
git add .
git commit -m "fix(data): prevent data corruption in opening stats

Critical fix for bug causing stats to be overwritten
incorrectly. Added validation to prevent future issues.

Fixes #789"

# 3. Push and merge immediately after review
git push origin hotfix/critical-data-corruption
```

## Pull Request Guidelines

### PR Title

Follow same format as commit messages:

```
feat(frontend): add opening search functionality
```

### PR Description Template

```markdown
## Description

Brief description of what this PR does.

## Changes

- List of specific changes
- Another change
- etc.

## Testing

How this was tested:

- [ ] Unit tests added/updated
- [ ] Manual testing performed
- [ ] Tested on production data

## Screenshots (if applicable)

[Add screenshots for UI changes]

## Related Issues

Closes #123
Related to #456

## Checklist

- [ ] Code follows project style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or documented if present)
```

### Review Process

1. **Self-review**: Review your own PR before requesting review
2. **Request review**: Tag appropriate reviewers
3. **Address feedback**: Make requested changes
4. **Squash commits**: Combine WIP commits before merging
5. **Merge**: Use "Squash and merge" for feature branches

## Commit Best Practices

### Atomic Commits

Each commit should be a single logical change:

```bash
# Good: Separate commits for separate concerns
git commit -m "feat(frontend): add search input component"
git commit -m "feat(frontend): add search results display"
git commit -m "feat(frontend): connect search to opening data"

# Bad: Everything in one commit
git commit -m "feat(frontend): add search feature"
# (contains UI, logic, tests, docs all together)
```

### Commit Often

```bash
# Make small, frequent commits during development
git commit -m "feat(search): add basic search input"
git commit -m "feat(search): add debouncing to search"
git commit -m "feat(search): add keyboard navigation"

# Squash before pushing if needed
git rebase -i HEAD~3
```

### Don't Commit

- Generated files (build output, node_modules, etc.)
- IDE-specific files (.vscode, .idea, etc.)
- Environment files with secrets (.env with real keys)
- Large binary files (unless necessary)
- Temporary files (_.tmp, _.log, etc.)

### Use .gitignore

```gitignore
# Dependencies
node_modules/
__pycache__/
*.pyc

# Build output
.next/
dist/
build/

# Environment
.env.local
.env.production

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
```

## Rebasing and Squashing

### Interactive Rebase

```bash
# Squash last 3 commits
git rebase -i HEAD~3

# In editor, change 'pick' to 'squash' for commits to combine
pick abc123 feat(search): add search input
squash def456 feat(search): add debouncing
squash ghi789 feat(search): add keyboard nav

# Edit commit message in next screen
```

### Rebase on Main

```bash
# Update feature branch with latest main
git checkout feat/my-feature
git fetch origin
git rebase origin/main

# Resolve conflicts if any
git add .
git rebase --continue

# Force push (only on feature branches!)
git push --force-with-lease origin feat/my-feature
```

## Git Hooks

### Pre-commit Hook

```bash
#!/bin/sh
# .git/hooks/pre-commit

# Run linter
npm run lint || exit 1

# Run tests
npm test || exit 1

# Check for console.log statements
if git diff --cached | grep -E "console\.(log|debug|info)"; then
  echo "Error: console.log found in staged files"
  exit 1
fi
```

### Commit Message Hook

```bash
#!/bin/sh
# .git/hooks/commit-msg

# Validate commit message format
commit_msg=$(cat "$1")
pattern="^(feat|fix|docs|style|refactor|perf|test|chore|ci)(\(.+\))?: .{1,50}"

if ! echo "$commit_msg" | grep -qE "$pattern"; then
  echo "Error: Commit message doesn't follow format"
  echo "Format: <type>(<scope>): <subject>"
  exit 1
fi
```

## Common Scenarios

### Amend Last Commit

```bash
# Fix typo in last commit message
git commit --amend -m "feat(frontend): add search (fixed typo)"

# Add forgotten file to last commit
git add forgotten-file.js
git commit --amend --no-edit
```

### Undo Last Commit (Keep Changes)

```bash
git reset --soft HEAD~1
# Changes are now unstaged, commit message is gone
```

### Discard All Local Changes

```bash
# Careful! This is destructive
git reset --hard HEAD
git clean -fd
```

### Cherry-pick Commit

```bash
# Apply specific commit from another branch
git cherry-pick abc123
```

## Remember

- Write clear, descriptive commit messages
- Make atomic commits (one logical change per commit)
- Use conventional commit format
- Keep commit history clean
- Don't commit secrets or generated files
- Review your own changes before requesting review
