---
applyTo: "packages/web/**/*.{ts,tsx,js,jsx}"
---

# Frontend Development Instructions

*These instructions extend the core TDD framework in `copilot-instructions.md` with React/TypeScript specific guidance.*

## React/TypeScript Patterns

### **Component Testing Strategy**
```typescript
// ✅ Test component behavior, not implementation
import { render, screen, fireEvent } from '@testing-library/react';
import { ChessBoard } from './ChessBoard';

test('should highlight selected square when clicked', () => {
  render(<ChessBoard />);
  const square = screen.getByTestId('square-e4');
  fireEvent.click(square);
  expect(square).toHaveClass('highlighted');
});
```

### **Mock Patterns for Frontend**
```typescript
// ✅ Mock API hooks
jest.mock('../hooks/useChessApi', () => ({
  useChessApi: () => ({
    loading: false,
    data: mockChessData,
    error: null
  })
}));

// ✅ Mock Vite imports
vi.mock('../assets/piece.svg', () => ({ default: 'mock-piece.svg' }));
```

### **Performance Targets**
- Component render tests: <100ms
- User interaction tests: <200ms
- Mock all API calls and external dependencies

### **React-Specific Anti-Patterns**
- ❌ Testing implementation details (state, props directly)
- ❌ Snapshot testing for dynamic content
- ❌ Not mocking external APIs in component tests
- ❌ Testing styling details instead of behavior

### **File Patterns This Applies To**
- `packages/web/**/*.{ts,tsx,jsx}` (React frontend)
- `packages/web/**/*.test.{ts,tsx,jsx}` (Frontend test files)
- `packages/shared/**/*.ts` (Shared TypeScript utilities)
