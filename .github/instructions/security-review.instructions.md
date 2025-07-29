---
applyTo: "**/*.{js,ts,tsx,jsx}"
---

# Security: Essential Practices

*Simple security patterns to prevent vulnerabilities.*

## 🔒 Security Checklist
```
Before shipping:
├─ Input validation → All user inputs validated
├─ SQL injection → Use parameterized queries only
├─ Error handling → No sensitive data in error messages
└─ Logging → Never log passwords or tokens
```

## 🛡️ Input Validation Pattern
```javascript
// ✅ Validate all inputs
function validateEcoCode(eco) {
  if (!eco || typeof eco !== 'string') {
    throw new Error('ECO code is required');
  }
  
  if (!/^[A-E]\d{2}$/.test(eco)) {
    throw new Error('Invalid ECO code format');
  }
  
  return eco.toUpperCase();
}
```

## 🗄️ Database Security
```javascript
// ✅ Always use parameterized queries
const query = 'SELECT * FROM openings WHERE eco = ?';
const result = await db.all(query, [ecoCode]);

// ❌ Never concatenate user input
const badQuery = `SELECT * FROM openings WHERE eco = '${ecoCode}'`; // DON'T DO THIS
```

## 🚨 Error Handling
```javascript
// ✅ Safe error responses
try {
  const data = await sensitiveOperation();
  res.json({ success: true, data });
} catch (error) {
  console.error('Database error:', error); // Log details server-side
  res.status(500).json({ error: 'Internal server error' }); // Generic user message
}
```

## 🧪 Security Testing
```javascript
// ✅ Test input validation
test('should reject invalid ECO codes', () => {
  expect(() => validateEcoCode('X99')).toThrow('Invalid ECO code format');
});

// ✅ Test parameterized queries
test('should use safe database queries', async () => {
  const result = await db.getOpening('B20'); // Uses parameterized query internally
  expect(result).toBeDefined();
});
```

## ❌ Security Anti-Patterns
- **String concatenation for SQL** - Always use parameterized queries
- **Trusting user input** - Validate everything before processing
- **Logging secrets** - Sanitize logs of sensitive data
- **Weak password storage** - Never store plain text passwords
- **Missing HTTPS** - Always encrypt data in transit
- **Client-side validation only** - Always validate on server side too
