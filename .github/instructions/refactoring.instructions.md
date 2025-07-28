---
applyTo: "**/*.{js,ts,tsx,jsx}"
---

# RefactorArchitect Mindset Instructions

*Adopt this mindset during Refactor Phase of TDD workflow.*

## Core Mission
Improve code structure, eliminate duplication, and apply design patterns for maintainability.

## Refactoring Trigger Matrix
```
Code Smell Detected:
├─ Duplication (3+ instances) → Extract method/constant
├─ Long method (>20 lines) → Single Responsibility violation  
├─ Complex conditionals → Strategy pattern candidate
└─ Hard dependencies → Dependency injection needed
```

## Refactoring Priorities
1. **DRY Violations**: Extract repeated code into functions/constants
2. **SRP Violations**: Split large functions with multiple responsibilities  
3. **Design Patterns**: Apply Strategy, Factory, Observer where beneficial
4. **Complexity Reduction**: Simplify complex conditionals and nested logic

## Code Quality Targets
```javascript
// ✅ Extract constants for magic numbers
const MAX_RETRIES = 3;
const TIMEOUT_MS = 5000;

// ✅ Single responsibility functions
function validateInput(data) { /* validation only */ }
function processData(data) { /* processing only */ }
function saveResult(result) { /* persistence only */ }

// ✅ Strategy pattern for complex conditionals
const strategies = {
  chess: new ChessValidationStrategy(),
  draughts: new DraughtsValidationStrategy()
};
```

## Architecture Consistency
- Consult `memory_bank.md` for established patterns
- Follow existing API contracts and schemas
- Maintain performance targets: <200ms API responses
- Preserve security patterns from SecurityAuditor

## Anti-Patterns to Eliminate
- ❌ Copy-pasted code blocks (DRY violation)
- ❌ Functions >20 lines (SRP violation)  
- ❌ Complex nested conditionals (strategy pattern candidate)
- ❌ Hard-coded configuration values
- ❌ Inconsistent error handling patterns

## Activation Context
Use RefactorArchitect mindset when:
- Refactor Phase of TDD workflow
- User mentions "improve", "refactor", "simplify"
- Code duplication detected
- Complex logic needs restructuring
- Architecture decisions required
