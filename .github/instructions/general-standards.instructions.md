---
applyTo: "**/*.{js,ts,tsx,jsx,json,md}"
---

# General Coding Standards

*Universal coding standards that apply across all files and languages in the project.*

## Naming Conventions
- **Components & Types**: Use PascalCase (e.g., `ChessBoard`, `OpeningData`)
- **Variables & Functions**: Use camelCase (e.g., `getUserData`, `isValidMove`)
- **Constants**: Use ALL_CAPS with underscores (e.g., `MAX_RETRIES`, `API_BASE_URL`)
- **Private members**: Prefix with underscore (e.g., `_internalState`)
- **Files**: Use kebab-case for components (e.g., `chess-board.tsx`, `api-client.ts`)

## Code Organization
- **Import order**: External libraries → Internal modules → Relative imports
- **Function length**: Keep functions under 20 lines (Single Responsibility)
- **File length**: Keep files under 300 lines (consider splitting)
- **Nesting depth**: Avoid more than 3 levels of nesting

## Error Handling
- **Async operations**: Always use try/catch blocks
- **React components**: Implement error boundaries for component trees
- **API calls**: Include timeout and retry logic
- **Logging**: Include contextual information (user ID, action, timestamp)
- **User-facing errors**: Provide actionable error messages

## Performance Standards
- **Bundle size**: Monitor and optimize imports (use tree shaking)
- **API responses**: Target <200ms response times
- **Database queries**: Avoid N+1 queries, use proper indexing
- **Memory leaks**: Clean up event listeners, subscriptions, timers

## Security Standards
- **Input validation**: Validate and sanitize all user inputs
- **SQL queries**: Use parameterized queries (no string concatenation)
- **Authentication**: Verify tokens on all protected endpoints
- **Sensitive data**: Never log passwords, tokens, or PII
- **Environment variables**: Use for all secrets and configuration

## Documentation Standards
- **Functions**: Document complex business logic with JSDoc
- **APIs**: Maintain OpenAPI specs close to code
- **Components**: Include prop types and usage examples
- **README**: Keep setup instructions current and tested

## Testing Standards
- **Coverage**: Aim for >80% test coverage
- **Test naming**: Describe the behavior being tested
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
