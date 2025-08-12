---
applyTo: "**/*.{js,ts,tsx,jsx}"
---

# Testing: Dual Architecture Strategy

*Practical testing patterns for both frontend and backend code.*

## 🎯 Testing Priorities
1. **Make it work first** - Then add comprehensive tests
2. **Test behavior** - Not implementation details
3. **Mock externals** - APIs, databases, file system
4. **Keep tests fast** - <1 second per test

## 📁 Dual Testing Architecture

### Backend Tests (Jest)
- **Location**: `tests/unit/` directory only
- **Run from**: Project root with `npm run test:unit`
- **Purpose**: API endpoints, services, utilities
- **Environment**: Node.js with Jest

### Frontend Tests (Vitest + React Testing Library)
- **Location**: `packages/web/src/**/__tests__/`
- **Run from**: `npm run test:frontend` or `cd packages/web && npm test`
- **Purpose**: React components, UI interactions, client-side logic
- **Environment**: jsdom with Vitest

## 🧪 Backend Testing Patterns (Jest)
```javascript
// ✅ Simple, clear test structure
describe('Opening validation', () => {
  test('should accept valid ECO codes', () => {
    expect(isValidEco('B20')).toBe(true);
    expect(isValidEco('E92')).toBe(true);
  });
  
  test('should reject invalid ECO codes', () => {
    expect(isValidEco('X99')).toBe(false);
    expect(isValidEco('')).toBe(false);
  });
});

// ✅ Mock external dependencies
jest.mock('../api/client', () => ({
  fetchOpenings: jest.fn().mockResolvedValue(mockData)
}));
```

## ⚛️ Frontend Testing Patterns (Vitest + RTL)
```tsx
// ✅ Component testing with React Testing Library
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchBar } from '../SearchBar';

describe('SearchBar Component', () => {
  test('should render search input', () => {
    render(<SearchBar onSearch={vi.fn()} />);
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });
  
  test('should call onSearch when typing', async () => {
    const mockOnSearch = vi.fn();
    render(<SearchBar onSearch={mockOnSearch} />);
    
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'Sicilian' } });
    
    expect(mockOnSearch).toHaveBeenCalledWith('Sicilian');
  });
});

// ✅ Mock React Router
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  Link: ({ children, to }: any) => <a href={to}>{children}</a>
}));
```

## 🎭 Mocking Strategy

### Backend Mocks (Jest)
```javascript
// ✅ Mock with error scenarios
jest.mock('../database', () => ({
  query: jest.fn()
    .mockResolvedValueOnce(successData)
    .mockRejectedValueOnce(new Error('Connection failed'))
}));
```

### Frontend Mocks (Vitest)
```typescript
// ✅ Mock fetch API
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve(mockOpenings)
});

// ✅ Mock external libraries
vi.mock('some-library', () => ({
  default: vi.fn().mockImplementation(() => 'mocked-result')
}));
```

## 🚫 Avoid These
- Real API calls in tests
- Database connections in tests  
- File system operations without mocks
- Tests that take >1 second
- Testing implementation details
- Mixing frontend and backend test patterns

## ❌ Testing Anti-Patterns
- **Slow tests** - Real database connections, API calls
- **Flaky tests** - Time-dependent or order-dependent tests
- **Brittle tests** - Testing internal implementation details
- **Unclear tests** - Vague test names or unclear assertions
- **Monolithic tests** - Testing multiple behaviors in one test
- **Wrong environment** - Using Jest patterns in Vitest or vice versa
