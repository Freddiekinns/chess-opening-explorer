---
applyTo: "packages/shared/**/*.ts"
---

# Shared Utilities: Pure & Simple

*Clean, reusable functions and types.*

## 🎯 Shared Package Goals
- **Pure functions**: No side effects, predictable outputs
- **Clear types**: Well-defined interfaces
- **No dependencies**: Minimal external imports
- **Testable**: Easy to test in isolation

## 🧩 Function Patterns
```typescript
// ✅ Pure function with clear types
export function validateEcoCode(eco: string): boolean {
  return /^[A-E]\d{2}$/.test(eco);
}

// ✅ Clear interface definitions
export interface Opening {
  name: string;
  eco: string;
  moves: string;
  fen?: string;
}
```

## 🧪 Testing Approach
```typescript
// ✅ Simple, focused tests
describe('validateEcoCode', () => {
  test('accepts valid ECO codes', () => {
    expect(validateEcoCode('B20')).toBe(true);
    expect(validateEcoCode('E92')).toBe(true);
  });
  
  test('rejects invalid ECO codes', () => {
    expect(validateEcoCode('X99')).toBe(false);
    expect(validateEcoCode('')).toBe(false);
  });
});
```

## 📦 Export Strategy
- Export individual functions and types
- Avoid default exports for better tree shaking
- Keep function signatures simple
- Document complex business logic

## ❌ Shared Utilities Anti-Patterns
- **Heavy dependencies** - Keep shared code lightweight
- **Platform-specific code** - Avoid Node.js or browser-only features
- **Stateful utilities** - Prefer pure functions over classes
- **Complex business logic** - Keep utilities simple and focused
- **Default exports** - Use named exports for better tree shaking
