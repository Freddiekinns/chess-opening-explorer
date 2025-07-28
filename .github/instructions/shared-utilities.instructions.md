---
applyTo: "packages/shared/**/*.ts"
---
# Shared Utilities Instructions

*These instructions extend the core TDD framework in `copilot-instructions.md` with shared TypeScript utilities guidance.*

## Shared Package Patterns

### **Type-Safe Development**
```typescript
// ✅ Export clear, reusable types
export interface ChessPosition {
  fen: string;
  turn: 'w' | 'b';
  castling: string;
  enPassant: string | null;
}

// ✅ Validation utilities with proper error handling
export function validateFEN(fen: string): ValidationResult {
  if (!fen || typeof fen !== 'string') {
    return { valid: false, error: 'FEN must be a non-empty string' };
  }
  // Validation logic
  return { valid: true };
}
```

### **Testing Shared Utilities**
```typescript
// ✅ Test all edge cases and error conditions
import { validateFEN, ChessPosition } from '../src/utils/validation';

describe('validateFEN', () => {
  test('should validate correct FEN strings', () => {
    const result = validateFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    expect(result.valid).toBe(true);
  });

  test('should reject invalid FEN strings', () => {
    const result = validateFEN('invalid-fen');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('invalid');
  });

  test('should handle null and undefined inputs', () => {
    expect(validateFEN(null as any).valid).toBe(false);
    expect(validateFEN(undefined as any).valid).toBe(false);
  });
});
```

### **Export Strategy**
```typescript
// ✅ Barrel exports for clean imports
// packages/shared/src/index.ts
export * from './types';
export * from './utils';
export * from './schemas';

// ✅ Consumers can import cleanly
import { ChessPosition, validateFEN } from '@chess-trainer/shared';
```

### **Performance Targets**
- Utility function tests: <50ms each
- Type validation: <10ms per call
- Mock any file I/O or external dependencies

### **Shared Package Anti-Patterns**
- ❌ Heavy dependencies in shared utilities
- ❌ Platform-specific code (Node.js or browser only)
- ❌ Stateful utilities (prefer pure functions)
- ❌ Complex business logic (keep utilities simple)

### **File Patterns This Applies To**
- `packages/shared/src/**/*.ts` (Shared TypeScript utilities)
- `packages/shared/tests/**/*.test.ts` (Shared utility tests)
