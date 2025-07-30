---
applyTo: "**/*.{js,ts,tsx,jsx}"
---

# Testing: Simple & Effective

*Practical testing patterns for reliable code.*

## 🎯 Testing Priorities
1. **Make it work first** - Then add comprehensive tests
2. **Test behavior** - Not implementation details
3. **Mock externals** - APIs, databases, file system
4. **Keep tests fast** - <1 second per test

## 📁 Test Files: `tests/unit/` only
- **All tests**: Must be in `tests/unit/` directory (NOT inside source folders)
- **Run from root**: Always execute `npm run test:unit` from project root

## 🧪 Testing Patterns
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
```

## 🎭 Mocking Strategy
```javascript
// ✅ Mock external dependencies
jest.mock('../api/client', () => ({
  fetchOpenings: jest.fn().mockResolvedValue(mockData)
}));

// ✅ Mock with error scenarios
jest.mock('../database', () => ({
  query: jest.fn()
    .mockResolvedValueOnce(successData)
    .mockRejectedValueOnce(new Error('Connection failed'))
}));
```

## 🚫 Avoid These
- Real API calls in tests
- Database connections in tests  
- File system operations without mocks
- Tests that take >1 second
- Testing implementation details

## ❌ Testing Anti-Patterns
- **Slow tests** - Real database connections, API calls
- **Flaky tests** - Time-dependent or order-dependent tests
- **Brittle tests** - Testing internal implementation details
- **Unclear tests** - Vague test names or unclear assertions
- **Monolithic tests** - Testing multiple behaviors in one test
