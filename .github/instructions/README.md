# Instructions Directory

This directory contains instruction files that guide AI assistants (like Claude Code) in understanding project standards, conventions, and best practices for the Chess Opening Explorer project.

## Purpose

These instruction files serve as a comprehensive knowledge base that helps AI assistants:

- Understand project-specific patterns and architecture
- Follow consistent coding standards across languages
- Maintain code quality and performance
- Apply proper testing and documentation practices
- Work efficiently within the project's established workflows

## Instruction Files

### Core Standards

- **[code-quality.instructions.md](code-quality.instructions.md)** - General code quality standards and best practices
- **[self-explanatory-code-commenting.instructions.md](self-explanatory-code-commenting.instructions.md)** - Guidelines for writing self-documenting code with minimal comments
- **[performance-optimization.instructions.md](performance-optimization.instructions.md)** - Comprehensive performance optimization practices for all layers

### Language-Specific

- **[javascript.instructions.md](javascript.instructions.md)** - JavaScript/Node.js development standards
- **[python.instructions.md](python.instructions.md)** - Python development standards for analysis tools
- **[reactjs.instructions.md](reactjs.instructions.md)** - React development standards for the frontend

### Documentation & Content

- **[markdown.instructions.md](markdown.instructions.md)** - Markdown formatting and documentation standards

### Project Management

- **[memory-bank.instructions.md](memory-bank.instructions.md)** - Memory bank system for maintaining project context
- **[project-overview.instructions.md](project-overview.instructions.md)** - Project architecture and domain knowledge
- **[testing.instructions.md](testing.instructions.md)** - Testing standards and practices
- **[git-workflow.instructions.md](git-workflow.instructions.md)** - Git commit messages and workflow standards

## File Format

All instruction files follow this format:

```markdown
---
description: "Brief description of what this file covers"
applyTo: "glob pattern for which files these instructions apply to"
---

# Title

[Content organized with clear headings and examples]
```

## Using These Instructions

### For AI Assistants

1. Read relevant instruction files at the start of each task
2. Apply the standards and patterns described
3. Reference specific sections when making decisions
4. Update instructions when discovering new patterns (with user approval)

### For Developers

1. Review these files to understand project standards
2. Use as a reference when writing code
3. Update when team agrees on new conventions
4. Keep instructions in sync with actual codebase practices

## Maintenance

- **Review regularly**: Ensure instructions match current project state
- **Update proactively**: Add new patterns as the project evolves
- **Keep concise**: Focus on actionable guidance, not theory
- **Use examples**: Show concrete code examples whenever possible
- **Version control**: Track changes to understand evolution of standards

## Related Documentation

- **[../.github/memory-bank/](../memory-bank/)** - Project memory bank with context files
- **[../../README.md](../../README.md)** - Main project README
- **[../../docs/](../../docs/)** - Additional project documentation (if exists)
