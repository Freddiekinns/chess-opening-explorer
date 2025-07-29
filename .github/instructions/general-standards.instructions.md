---
applyTo: "**/*.{js,ts,tsx,jsx,json,md}"
---

# General Coding Standards

*Simple, focused standards for clean, maintainable code.*

## 🎯 Naming (Clear & Consistent)
- **Components/Types**: `PascalCase` (ChessBoard, OpeningData)
- **Variables/Functions**: `camelCase` (getUserData, isValidMove)
- **Constants**: `ALL_CAPS` (MAX_RETRIES, API_BASE_URL)
- **Files**: `kebab-case` (chess-board.tsx, api-client.ts)

## 📁 Organization (Simple Structure)
- **Import order**: External → Internal → Relative
- **Function size**: <20 lines (one responsibility)
- **File cohesion**: Keep related code together, split unrelated concerns
- **Nesting**: Max 3 levels deep

## 🛡️ Essential Standards
- **Security**: Validate inputs, parameterize queries, never log secrets
- **Performance**: <200ms API responses, mock external dependencies
- **Error handling**: Try/catch for async, meaningful error messages
- **CSS**: Single consolidated file, CSS variables, minimal selectors

## 🧹 Clean Code Basics
- **Self-documenting**: Clear names over comments
- **Minimal**: Remove unused code immediately  
- **Consistent**: Follow existing patterns in the codebase
- **Functional**: Make it work first, then make it clean

## 🧪 Testing Standards
- **Coverage**: Aim for >80% test coverage
- **Test naming**: Describe the behavior being tested
- **Mock strategy**: Mock all external dependencies (APIs, file system)
- **Test performance**: Keep unit tests under 1 second each
- **Test isolation**: Each test should be independent and cleanup after itself

## 📋 Git & Version Control
- **Commit messages**: Use conventional commits (feat:, fix:, docs:)
- **Branch naming**: Use feature/, bugfix/, hotfix/ prefixes
- **Pull requests**: Include description of changes and testing done
- **Code review**: Review for security, performance, and maintainability

## 🔧 Code Quality Tools
- **Linting**: Use ESLint with project-specific rules
- **Formatting**: Use Prettier for consistent code formatting
- **Type checking**: Use TypeScript strict mode
- **Build tools**: Fail builds on linting or type errors
- **Mock strategy**: Mock all external dependencies (APIs, file system)
- **Test performance**: Keep unit tests under 1 second each
- **Test isolation**: Each test should be independent and cleanup after itself

## Git & Version Control
- **Commit messages**: Use conventional commits (feat:, fix:, docs:)
- **Branch naming**: Use feature/, bugfix/, hotfix/ prefixes
- **Pull requests**: Include description of changes and testing done
- **Code review**: Review for security, performance, and maintainability

## Code Quality Tools
- **Linting**: Use ESLint with project-specific rules
- **Formatting**: Use Prettier for consistent code formatting
- **Type checking**: Use TypeScript strict mode
- **Build tools**: Fail builds on linting or type errors
