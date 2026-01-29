# Claude AI Assistant Guide

Welcome! This file provides essential context for working on the Chess Opening Explorer project.

## Quick Start

1. **First Time?** Read [.github/instructions/project-overview.instructions.md](.github/instructions/project-overview.instructions.md) to understand the project
2. **Check Memory Bank** at `.github/memory-bank/` for current project state
3. **Load instructions as needed** based on what you're working on (see below)

## Context Management Philosophy

**Load instructions ONLY when relevant to your current task.** Don't read everything upfront - this prevents context overload and keeps focus sharp.

## When to Load Instructions

### Always Load First

- **[.github/memory-bank/activeContext.md](.github/memory-bank/activeContext.md)** - Current work focus and recent changes
- **[.github/memory-bank/progress.md](.github/memory-bank/progress.md)** - What works and what's left to build

### Load Based on Task Type

#### Planning & Architecture

- [.github/instructions/project-overview.instructions.md](.github/instructions/project-overview.instructions.md) - Project architecture and domain knowledge
- [.github/memory-bank/systemPatterns.md](.github/memory-bank/systemPatterns.md) - System architecture and design patterns
- [.github/memory-bank/techContext.md](.github/memory-bank/techContext.md) - Technologies and setup

#### Writing Code

**Python** (tools/analysis, pipelines):

- [.github/instructions/python.instructions.md](.github/instructions/python.instructions.md)
- [.github/instructions/code-quality.instructions.md](.github/instructions/code-quality.instructions.md)

**JavaScript/Node.js** (scripts, build tools):

- [.github/instructions/javascript.instructions.md](.github/instructions/javascript.instructions.md)
- [.github/instructions/code-quality.instructions.md](.github/instructions/code-quality.instructions.md)

**React** (frontend components):

- [.github/instructions/reactjs.instructions.md](.github/instructions/reactjs.instructions.md)
- [.github/instructions/code-quality.instructions.md](.github/instructions/code-quality.instructions.md)

#### Writing Tests

- [.github/instructions/testing.instructions.md](.github/instructions/testing.instructions.md)

#### Writing Documentation

- [.github/instructions/markdown.instructions.md](.github/instructions/markdown.instructions.md)
- [.github/instructions/self-explanatory-code-commenting.instructions.md](.github/instructions/self-explanatory-code-commenting.instructions.md)

#### Git & Version Control

- [.github/instructions/git-workflow.instructions.md](.github/instructions/git-workflow.instructions.md)

#### Performance Work

- [.github/instructions/performance-optimization.instructions.md](.github/instructions/performance-optimization.instructions.md)

#### Memory Bank Updates

- [.github/instructions/memory-bank.instructions.md](.github/instructions/memory-bank.instructions.md)

## Project Structure

```
chess-opening-explorer/
├── .github/
│   ├── instructions/       # Coding standards and guidelines
│   └── memory-bank/        # Project context and state
├── data/                   # Static JSON data files
├── pages/                  # Next.js pages (React)
├── components/             # React components
├── scripts/                # Build and utility scripts (JavaScript)
├── tools/
│   └── analysis/           # Python analysis tools
└── .agent/workflows/       # Custom workflows
```

## Custom Workflows

Run these with slash commands:

- `/enrich-openings` - Run LLM enrichment pipeline
- `/update-popularity-stats` - Update Lichess statistics
- `/video-pipeline` - Run video discovery pipeline

## Key Principles

1. **Context Efficiency**: Only load what you need for the current task
2. **Memory Bank First**: Always check memory bank for current state
3. **Follow Standards**: Apply relevant instruction files to your work
4. **Update Memory**: Keep memory bank current as work progresses
5. **Ask When Unclear**: Better to ask than assume

## Common Task Patterns

### Bug Fix

1. Read `activeContext.md` and `progress.md`
2. Load language-specific instructions (Python/JavaScript/React)
3. Load `testing.instructions.md`
4. Fix bug, write test, commit with `git-workflow.instructions.md`

### New Feature

1. Read `activeContext.md`, `progress.md`, `project-overview.instructions.md`
2. Load relevant language instructions
3. Load `testing.instructions.md`
4. Implement, test, document, commit

### Refactoring

1. Read `systemPatterns.md` and `activeContext.md`
2. Load `code-quality.instructions.md`
3. Load language-specific instructions
4. Refactor, test, commit

### Documentation

1. Read `activeContext.md` and `progress.md`
2. Load `markdown.instructions.md`
3. Write/update docs, commit

## Memory Bank Commands

- **update memory bank** - Review and update ALL memory bank files
- **add task** / **create task** - Create new task in memory bank
- **update task [ID]** - Update existing task
- **show tasks [filter]** - Display filtered task list

## Need Help?

- Check `.github/instructions/README.md` for full instruction index
- Review memory bank files for current project state
- Ask specific questions rather than requesting broad overviews
