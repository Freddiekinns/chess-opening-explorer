---
applyTo: "packages/api/**/*.{js,ts}"
---

# Backend Development Instructions

*Node.js/Express specific patterns for TDD workflow.*

## Node.js/Express Patterns

### **API Testing Strategy**
```javascript
// ✅ Test API endpoints with mocked dependencies
const request = require('supertest');
const app = require('../src/app');

// Mock database
jest.mock('../src/database', () => ({
  query: jest.fn()
}));

test('GET /api/openings should return opening data', async () => {
  const mockData = [{ id: 1, name: 'Sicilian Defense' }];
  require('../src/database').query.mockResolvedValue(mockData);
  
  const response = await request(app)
    .get('/api/openings')
    .expect(200);
    
  expect(response.body).toEqual(mockData);
});
```

### **Database Mocking Patterns**
```javascript
// ✅ Mock SQLite for tests
jest.mock('sqlite3', () => ({
  Database: jest.fn().mockImplementation(() => ({
    all: jest.fn(),
    run: jest.fn(),
    close: jest.fn()
  }))
}));

// ✅ Mock file system operations
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn()
}));
```

### **Performance Targets**
- API route tests: <500ms
- Database operation mocks: <50ms
- Mock all external services and file I/O

### **Express-Specific Anti-Patterns**
- ❌ Real database connections in unit tests
- ❌ File system operations without mocking
- ❌ External API calls in test environment
- ❌ Missing error handling middleware tests

### **Security Testing Requirements**
```javascript
// ✅ Test input validation
test('should reject invalid opening ID', async () => {
  await request(app)
    .get('/api/openings/invalid-id')
    .expect(400);
});

// ✅ Test authentication
test('should require auth for protected routes', async () => {
  await request(app)
    .post('/api/admin/openings')
    .expect(401);
});
```

### **File Patterns This Applies To**
- `packages/api/**/*.js` (Node.js/Express backend)
- `tests/**/*.test.js` (Backend test files)
