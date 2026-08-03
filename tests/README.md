# Test Organization Guide

## Dual Testing Architecture

This project uses **two testing approaches** optimized for different components:

### **Backend Testing** (Jest - Root Level)

- **Location**: `tests/unit/`, `tests/integration/`, `tests/setup/`, and
  `tools/**/tests/`
- **Engine**: Jest with Node.js environment
- **Purpose**: API services, data processing, pipeline logic

> **Where tests must not go:** `testPathIgnorePatterns` in the root
> `package.json` excludes `packages/*/tests/`. A Jest test placed inside a
> package is silently skipped — it never runs and never fails. Put backend tests
> in root `tests/`, and pipeline tests in `tools/<pipeline>/tests/`.

### **Frontend Testing** (Vitest - Workspace Level)

- **Location**: `packages/web/src/**/__tests__/`
- **Engine**: Vitest with jsdom environment
- **Purpose**: React components, user interactions, frontend logic

---

## Directory Structure

### Backend Tests (Root Level)

```
tests/
├── setup/           # Environment & configuration tests
├── unit/            # Backend services, utilities, API logic
├── integration/     # Cross-component workflows, API endpoints
├── e2e/             # Playwright end-to-end specs (npm run test:e2e)
├── fixtures/        # Shared test data and mocks
└── README.md        # This file

tools/
├── video-pipeline/tests/    # also collected by Jest
└── family-taxonomy/tests/   # also collected by Jest
```

### Frontend Tests (Workspace Level)

```
packages/web/src/
├── components/
│   └── shared/__tests__/
│       └── SearchBar.test.tsx
├── pages/__tests__/
│   └── LandingPage.test.tsx
├── __tests__/
│   └── App.test.tsx
└── test/
    └── setup.ts     # Vitest configuration
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
- **Individual Tests**:
  `test('should [expected behavior] when [condition]', () => {})`

## 🧪 Testing Commands

### **Backend Tests (Jest)**

```bash
# All backend unit tests (from root)
npm run test:unit

# Specific backend test file
npm run test:unit -- --testPathPattern="eco-service.test.js"

# Backend tests with watch mode
npm run test:unit -- --watch

# Backend tests with coverage
npm run test:unit -- --coverage
```

### **Frontend Tests (Vitest)**

```bash
# All frontend tests (from root via workspace)
npm run test:frontend

# All tests (backend + frontend)
npm run test:all

# Frontend tests directly from web workspace
cd packages/web && npm test

# Frontend tests with watch mode
cd packages/web && npm run test:watch

# Frontend tests with coverage
cd packages/web && npm test -- --coverage

# Frontend tests with UI dashboard
cd packages/web && npm run test:ui
```

### **Combined Testing**

```bash
# Run all tests (backend + frontend)
npm run test:all

# Backend only
npm run test:backend

# Frontend only
npm run test:frontend
```

---

## 🎯 Testing Strategy by Component Type

### **React Components** → Use Frontend Tests (Vitest)

- **Why**: Better React support, fast HMR, modern tooling
- **Location**: `packages/web/src/**/__tests__/`
- **Tools**: Vitest + React Testing Library + jest-dom

### **Backend Services** → Use Backend Tests (Jest)

- **Why**: Node.js environment, mature ecosystem, extensive mocking
- **Location**: `tests/unit/` and `tests/integration/`
- **Tools**: Jest + Supertest + Node mocks

### **Integration Workflows** → Use Backend Tests (Jest)

- **Why**: Can test full API → DB → response flows
- **Location**: `tests/integration/`
- **Tools**: Jest + Supertest + Test databases

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
  writeFile: jest.fn(),
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
      expect(validateEcoCode('A00')).toBe(true); // Lower bound
      expect(validateEcoCode('E99')).toBe(true); // Upper bound
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
