# Cline Rules: Simplicity-First TDD

Expert Lead TDD Engineer focused on **simplicity, functionality, and clean code**.

## 📚 Context Sources
- **Long-term context**: Check and update `memory_bank.md` for architectural decisions, patterns, and project history
- **Development commands**: Use `.github/instructions/dev-commands.instructions.md` for testing and server commands
- **Specialized patterns**: Follow `.github/instructions/` for domain-specific guidance:
  - `general-standards.instructions.md` - Naming, organization, imports
  - `frontend-dev.instructions.md` - React/TypeScript specific patterns
  - `backend-dev.instructions.md` - Node.js/Express API patterns
  - `testing.instructions.md` - Jest/Vitest testing strategies
  - `security-review.instructions.md` - Input validation & security checks
  - `shared-utilities.instructions.md` - Shared package patterns

## 🎯 Core Principles (Priority Order)
1. **Functionality First**: Make it work correctly
2. **Unit Testing**: 90% test coverage required for new components (Vitest/Jest)
3. **Simplicity**: Choose the simplest solution that works
4. **Clean Code**: Self-documenting, minimal, readable
5. **TDD**: Red → Green → Refactor (when complexity requires it)

## 🔄 Cline TDD Workflow with Role-Based Mindsets

### **Phase 1: Planning & Analysis**
- **Explore first**: Use `read_file` and `list_files` to understand context
- **Check existing patterns**: Reference `memory_bank.md` and `.github/instructions/`
- **Plan approach**: Break complex tasks into iterative steps

### **Phase 2: Red Phase (🧪 TestEngineer)**
- Write failing tests that break implementations
- Focus on edge cases, error scenarios, mocking external dependencies
- Ask: "How can this break?" "What about null/undefined?" "Network failures?"
- **Cline pattern**: Create test file → Run tests → Verify failure

### **Phase 3: Green Phase (Implementation)**
- Write minimal code to make tests pass
- Use `replace_in_file` for targeted changes, `write_to_file` for new files
- Simplest solution that works, no over-engineering
- **Cline pattern**: Implement → Run tests → Verify success

### **Phase 4: Refactor Phase (🏗️ RefactorArchitect)**
- Improve code structure and quality after tests pass
- Remove duplication, improve naming, simplify structure
- Ask: "Is this duplicated?" "Does this function do too much?" "Are names clear?"
- **Cline pattern**: Refactor → Run tests → Verify still passing

### **Phase 5: Security Review (🔒 SecurityAuditor)**
- Validate security aspects of implementation
- Input validation, SQL injection prevention, no secrets in logs
- Ask: "Are inputs validated?" "Using parameterized queries?" "Any secrets leaked?"

## ⚡ Cline Tool Usage Patterns

### **File Operations**
- **Exploration**: `read_file` before making changes to understand context
- **Targeted edits**: Prefer `replace_in_file` for specific changes
- **New files**: Use `write_to_file` for complete new files
- **File discovery**: Use `list_files` to understand project structure

### **Command Execution**
- **Testing**: Always run `npm run test:unit` from root after changes
- **Development servers**: Use `npm run dev` for both API and web
- **Performance testing**: Use PowerShell `Measure-Command` for API timing

### **Code Quality Workflow**
1. Make changes using file tools
2. Run tests to verify functionality
3. Check for security issues (input validation, etc.)
4. Verify performance requirements (<200ms API responses)

## 🎭 Virtual Roundtable (For Complex Decisions)

When facing architectural decisions or conflicting requirements:

**Use Virtual Roundtable for:**
- New architecture patterns
- Performance vs. security trade-offs  
- Complex refactoring decisions
- Unclear requirements with multiple solutions

**Cline Process:**
1. **Explore context**: Read relevant files and documentation
2. **TestEngineer** perspective: How to ensure reliability?
3. **RefactorArchitect** perspective: How to ensure maintainability?
4. **SecurityAuditor** perspective: How to ensure safety?
5. **Synthesis**: Weigh trade-offs and document the decision rationale
6. **Update memory_bank.md**: Record architectural decision

## ⚡ Quick Decision Framework
```
Problem to Solve?
├─ Simple fix → Direct implementation with replace_in_file
├─ Complex logic → Break into small functions, test each
├─ Repeated code → Extract constants/functions
└─ Multiple concerns → Separate files/components
```

## 🎨 Clean Code Shortcuts
- **CSS**: Single consolidated file (`packages/web/src/styles/simplified.css`), minimal selectors, CSS variables
- **Components**: Single responsibility, clear props, minimal dependencies
- **Functions**: <20 lines, clear names, one purpose
- **Files**: Group related functionality, split unrelated concerns

## 🔒 Critical Non-Negotiables

### **Security**
- Validate inputs, parameterize queries, never log secrets
- Reference `.github/instructions/security-review.instructions.md`

### **Performance**
- <200ms API responses, mock external dependencies in tests
- Use client-side filtering for search (existing pattern)

### **Architecture (CRITICAL)**
- **AD-003**: NEVER create separate CSS files - always add to `simplified.css`
- All architectural decisions documented in `memory_bank.md`
- Follow existing patterns before creating new ones

## 🧪 Testing Integration

### **Test Execution Pattern**
```bash
# Backend tests (from root)
npm run test:unit

# Frontend tests
cd packages/web && npm test
```

### **Test Development Pattern**
1. Create test in `tests/unit/` directory
2. Run test to verify it fails (Red)
3. Implement minimal code to pass (Green)
4. Refactor while keeping tests passing
5. Run full test suite to ensure no regressions

## 🔧 Cline-Specific Workflow

### **Before Starting**
- Read `memory_bank.md` for project context
- Check relevant instruction files in `.github/instructions/`
- Explore existing code with `read_file` and `list_files`

### **During Development**
- Make one change at a time
- Test after each change
- Use iterative approach: explore → plan → implement → test → refactor

### **After Changes**
- Run appropriate test suite
- Verify no regressions
- Update documentation if architectural decisions made

## 📁 Project-Specific Quick Reference

- **Frontend** (`packages/web/**`): Use simplified.css, minimal components, clear state management
- **Backend** (`packages/api/**`): Simple routes, mocked dependencies in tests, clear error handling
- **Shared** (`packages/shared/**`): Pure functions, clear types, minimal dependencies
- **Tests**: All in `tests/unit/` directory, run from project root
- **CSS**: Single file at `packages/web/src/styles/simplified.css` (2,100+ lines)

## 🚀 Development Commands Quick Reference

See `.github/instructions/dev-commands.instructions.md` for complete command reference.

**Essential commands:**
- Tests: `npm run test:unit` (from root)
- Servers: `npm run dev` (both), `npm run dev:api`, `npm run dev:web`
- Build: `npm run build`

---

*Adapted from GitHub Copilot instructions for Cline's iterative, tool-based workflow while preserving proven TDD methodology and architectural decisions.*
