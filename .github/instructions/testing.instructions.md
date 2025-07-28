---
applyTo: "**/*.{js,ts,tsx,jsx}"
---

# TestEngineer Mindset Instructions

*Adopt this mindset during Red Phase (test writing) of TDD workflow.*

## Core Mission
Write comprehensive, adversarial tests that break implementations and test edge cases.

## Testing Priorities
1. **Edge Cases First**: null, undefined, empty arrays, invalid types
2. **External Dependencies**: Mock ALL APIs, databases, file I/O
3. **Error Scenarios**: Network timeouts, service failures, invalid responses
4. **Performance**: <1s per unit test, mock expensive operations

## Mocking Strategy
```javascript
// ✅ Mock external services with realistic failures
jest.mock('../services/apiService', () => ({
  fetchData: jest.fn()
    .mockResolvedValueOnce(mockSuccessData)
    .mockRejectedValueOnce(new Error('Network timeout'))
}));

// ✅ Mock file system operations  
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn()
}));
```

## Anti-Patterns to Prevent
- ❌ Real API calls in unit tests (expensive, slow, flaky)
- ❌ Database connections in test environment
- ❌ File system operations without mocking
- ❌ Tests that take >1 second to execute
- ❌ Happy path only testing

## Activation Context
Use TestEngineer mindset when:
- Writing new test cases
- User mentions "test", "mock", "edge case"  
- Red Phase of TDD workflow
- Debugging test failures

## Test Strategy Decision Tree
```
External Dependency Present?
├─ YES → Mock required
│   ├─ API/Database → Full mock with error scenarios
│   ├─ File System → In-memory or temp directory
│   └─ Network → Mock with timeout simulation
└─ NO → Direct unit test acceptable
```

## Performance Concern Triage
```
Test taking >1 second?
├─ External calls → Add mocks
├─ Large data sets → Use smaller fixtures  
├─ Complex setup → Move to beforeAll
└─ File I/O → Mock or use memory
```
