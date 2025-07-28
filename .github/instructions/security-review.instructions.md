---
applyTo: "**/*.{js,ts,tsx,jsx}"
---

# Security Review Instructions

*These instructions extend the core TDD framework in `copilot-instructions.md` with security-focused testing and implementation.*

## Security Checklist (Quick)
```
Input Processing?
├─ User input → Validate, sanitize, escape
├─ Database query → Use parameterized queries
├─ External API → Validate responses
└─ File operations → Validate paths, sanitize names
```

## Error Handling Decision Tree
```
External Service Call?
├─ YES → Implement retry logic, fallbacks, circuit breaker
│   ├─ Critical path → Gracegeful degradation required
│   ├─ Non-critical → Log and continue
│   └─ User-facing → Friendly error messages
└─ NO → Standard try/catch with meaningful logging
```

## Security-First TDD Approach

### **Security Test Cases (Red Phase)**
```javascript
// ✅ Test input validation
test('should sanitize user input to prevent XSS', () => {
  const maliciousInput = '<script>alert("xss")</script>';
  const sanitized = sanitizeInput(maliciousInput);
  expect(sanitized).not.toContain('<script>');
});

// ✅ Test SQL injection prevention
test('should use parameterized queries', async () => {
  const maliciousId = "1; DROP TABLE users; --";
  await expect(getOpening(maliciousId)).not.toThrow();
  // Verify database state unchanged
});

// ✅ Test authentication
test('should reject requests without valid token', async () => {
  const response = await request(app)
    .post('/api/admin/openings')
    .set('Authorization', 'Bearer invalid-token')
    .expect(401);
});
```

### **Security Implementation Patterns**
```javascript
// ✅ Input validation
const { body, validationResult } = require('express-validator');

app.post('/api/openings', [
  body('name').isLength({ min: 1, max: 100 }).escape(),
  body('moves').isArray().custom(validateMoves)
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // Process validated input
});

// ✅ Parameterized queries
const query = 'SELECT * FROM openings WHERE id = ?';
db.get(query, [openingId], callback);
```

### **Critical Security Checkpoints**
- ✅ All user inputs validated and sanitized
- ✅ SQL queries parameterized (no string concatenation)
- ✅ Authentication tokens verified
- ✅ Error messages don't leak sensitive information
- ✅ HTTPS enforced in production
- ✅ Environment variables for secrets

### **Security Anti-Patterns to Prevent**
- ❌ Direct string interpolation in SQL queries
- ❌ Unvalidated user input reaching database
- ❌ Sensitive data in error messages
- ❌ Hardcoded API keys or passwords
- ❌ Missing rate limiting on public endpoints
- ❌ Overly permissive CORS settings

### **Security Test Categories**
1. **Input Validation**: XSS, SQL injection, command injection
2. **Authentication**: Token validation, session management
3. **Authorization**: Role-based access control
4. **Data Protection**: Encryption, sanitization
5. **Error Handling**: Information disclosure prevention

### **Activation Context**
Use `TDD-Secure:` prefix when:
- Implementing user input handling
- Creating authentication/authorization
- Building admin interfaces
- Processing external data
- Creating API endpoints with sensitive data
