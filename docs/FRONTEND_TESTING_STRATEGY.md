# 🧪 Frontend Testing Strategy

## 📋 Overview

This document outlines the comprehensive testing approach for the Chess Opening Explorer frontend, implemented in **Phase 1 (August 2025)**.

## 🏗️ Testing Architecture

### **Dual Testing System**
- **Frontend**: Vitest + React Testing Library (Component focus)
- **Backend**: Jest + Node.js (Service/API focus)

### **Frontend Test Location**
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
    └── setup.ts
```

## 🎯 Core Component Test Suites

### **1. SearchBar Component** (`components/shared/__tests__/SearchBar.test.tsx`)

**Priority**: **CRITICAL** - Most complex component (442 lines)

**Coverage Areas**:
- **Basic Rendering**: Placeholder text, initial state, custom props
- **Search Functionality**: Autocomplete, filtering, debouncing, case insensitivity
- **Keyboard Navigation**: Arrow keys, Enter, Escape, boundary wrapping
- **Mouse Interactions**: Click selection, hover highlighting, outside clicks
- **Edge Cases**: Empty/null/malformed data, long search terms, special characters
- **Accessibility**: ARIA attributes, screen reader support, keyboard focus

**Test Structure**: 8 test groups, 25+ individual tests

### **2. App Component** (`__tests__/App.test.tsx`)

**Priority**: **HIGH** - Main application routing

**Coverage Areas**:
- **Routing**: Landing page, detail pages, invalid routes
- **Data Loading**: API fetch mocking, error handling, empty responses
- **Layout Structure**: Main elements, responsive classes
- **Error Boundaries**: Component error handling

**Test Structure**: 3 test groups, 7 individual tests

### **3. LandingPage Component** (`pages/__tests__/LandingPage.test.tsx`)

**Priority**: **HIGH** - Main user entry point

**Coverage Areas**:
- **Basic Rendering**: Title, description, search component, popular openings
- **Search Integration**: Data passing, selection handling
- **Popular Openings Grid**: Card display, ECO codes, moves, click handling
- **Responsive Design**: Grid classes, mobile viewport
- **Loading States**: Empty data, null data, loading indicators
- **Error Handling**: Malformed data, missing props
- **Accessibility**: Heading hierarchy, input labels, keyboard navigation

**Test Structure**: 6 test groups, 18 individual tests

## 🛠️ Testing Tools & Configuration

### **Core Stack**
- **Vitest**: Fast, modern test runner with HMR
- **React Testing Library**: Component testing focused on user behavior
- **jest-dom**: Extended matchers for DOM assertions
- **jsdom**: Browser environment simulation

### **Mocking Strategy**
- **React Router**: Navigation and routing functionality
- **Fetch API**: External API calls and data loading
- **Component Dependencies**: Isolated component testing

### **Setup Files**
- **setup.ts**: Global test configuration, polyfills, custom matchers
- **vite.config.ts**: Vitest configuration with globals enabled

## 🚀 Test Commands

### **Development Workflow**
```bash
# Watch mode for active development
cd packages/web && npm run test:watch

# Single run for CI/validation
npm run test:frontend

# Coverage analysis
cd packages/web && npm test -- --coverage

# Interactive UI dashboard
cd packages/web && npm run test:ui
```

### **Integration with Backend Tests**
```bash
# All tests (frontend + backend)
npm run test:all

# Backend only (for comparison)
npm run test:unit
```

## 📊 Quality Standards

### **Coverage Targets**
- **Phase 1**: 40% coverage (core paths)
- **Phase 2**: 60% coverage (user interactions)
- **Phase 3**: 80% coverage (edge cases)

### **Test Quality Criteria**
- **User-Focused**: Test behavior users actually experience
- **Accessible**: Include accessibility and keyboard navigation
- **Robust**: Handle edge cases and error conditions
- **Fast**: Execute quickly to support TDD workflow
- **Maintainable**: Clear test names and structure

## 🔄 Testing Workflow

### **TDD Process**
1. **Red**: Write failing test for new feature
2. **Green**: Implement minimal code to pass
3. **Refactor**: Improve code while keeping tests green

### **Component Testing Approach**
1. **Render**: Mount component with realistic props
2. **Interact**: Simulate user actions (click, type, navigate)
3. **Assert**: Verify expected behavior and state changes

### **Mock Strategy**
- **External Dependencies**: Always mock (API calls, routing)
- **Child Components**: Mock only when necessary for isolation
- **User Interactions**: Use real events, not component methods

## 🚧 Current Status & Next Steps

### **Phase 1 Complete** ✅
- **Infrastructure**: Vitest configuration and setup
- **Test Suites**: 50+ comprehensive tests across 3 core components
- **Mocking**: React Router, fetch API, component dependencies
- **Documentation**: Complete testing strategy and commands

### **Phase 2 Goals** 🎯
- **Component Interface Alignment**: Fix prop mismatches and get tests passing
- **Integration Testing**: Component interaction testing
- **Performance Testing**: Search debouncing, render optimization
- **Visual Regression**: Screenshot testing for UI consistency

### **Long-term Vision** 🌟
- **E2E Testing**: Full user journey validation
- **Accessibility Automation**: Automated a11y testing
- **Performance Monitoring**: Bundle size and render performance
- **Test Data Management**: Realistic test fixtures and scenarios

## 📚 Resources

### **Documentation**
- **Test Commands**: `.github/instructions/dev-commands.instructions.md`
- **Architecture**: `tests/README.md`
- **Coverage Plan**: `docs/UNIT_TEST_COVERAGE_PLAN.md`

### **Best Practices**
- **React Testing Library**: [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- **Vitest**: [Vitest Guide](https://vitest.dev/guide/)
- **Accessibility Testing**: [jest-axe](https://github.com/nickcolley/jest-axe)

---

**Updated**: August 2025  
**Status**: Phase 1 Complete - Foundation Established
