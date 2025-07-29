# Test Organization Guide

## 🏗️ Standardized Test Structure

This project follows a centralized testing approach with clear separation of concerns.

### Directory Structure

```
tests/
├── setup/           # Environment & configuration tests
├── unit/            # Individual component/service tests
├── integration/     # Cross-component workflow tests
├── fixtures/        # Shared test data
└── README.md       # This file
```

### 📋 Naming Conventions

#### Files
- **Pattern**: `[feature].[type].test.[ext]`
- **Examples**:
  - `opening-validator.unit.test.js`
  - `course-pipeline.integration.test.js`
  - `api-routes.unit.test.ts`

#### Test Descriptions
- **Unit**: `describe('[ComponentName]', () => {})`
- **Integration**: `describe('[FeatureName] Integration', () => {})`
- **Individual Tests**: `test('should [expected behavior] when [condition]', () => {})`

### 🎯 Test Categories

#### Unit Tests (`unit/`)
- Test individual functions/components in isolation
- Mock all external dependencies
- Fast execution (< 1 second each)
- Focus on business logic and edge cases

#### Integration Tests (`integration/`)
- Test component interactions
- Test full workflows end-to-end
- Mock external APIs but allow internal communication
- Verify data flow between layers

#### Setup Tests (`setup/`)
- Environment configuration validation
- Package.json structure tests
- Build pipeline verification
- Development environment checks

### 🧪 Test Standards

#### What to Test
- ✅ Business logic and edge cases
- ✅ Error handling scenarios
- ✅ API endpoints and data validation
- ✅ Component behavior and state changes
- ✅ Integration between internal services

#### What NOT to Test
- ❌ Implementation details
- ❌ Third-party library functionality
- ❌ Simple getters/setters
- ❌ String comparisons against themselves
- ❌ Framework-provided functionality

### 🎭 Mocking Strategy

```javascript
// ✅ Good: Mock external dependencies
jest.mock('@google-cloud/vertexai');
jest.mock('../api/youtube-service');

// ✅ Good: Mock file system operations
jest.mock('fs', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn()
}));

// ❌ Bad: Real API calls or file operations
```

### 📝 Example Test Structure

```javascript
describe('OpeningValidator', () => {
  describe('validateEcoCode', () => {
    test('should accept valid ECO codes', () => {
      expect(validateEcoCode('B20')).toBe(true);
      expect(validateEcoCode('E92')).toBe(true);
    });
    
    test('should reject invalid ECO codes', () => {
      expect(validateEcoCode('X99')).toBe(false);
      expect(validateEcoCode('')).toBe(false);
      expect(validateEcoCode(null)).toBe(false);
    });
    
    test('should handle edge cases', () => {
      expect(validateEcoCode('A00')).toBe(true);  // Lower bound
      expect(validateEcoCode('E99')).toBe(true);  // Upper bound
      expect(validateEcoCode('F00')).toBe(false); // Out of range
    });
  });
});
```

### 🔧 Configuration

Tests use:
- **Jest** for Node.js packages (API, tools)
- **Vitest** for frontend packages (web)
- **Centralized fixtures** for shared test data
- **Environment-specific mocking** (test vs production)

### 🚀 Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# With coverage
npm run test:coverage
```
