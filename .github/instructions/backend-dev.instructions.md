---
applyTo: "packages/api/**/*.{js,ts}"
---

# Backend Development: Simple & Secure

*Node.js/Express patterns focused on functionality and security.*

## 🛠️ API Route Structure
```javascript
// ✅ Simple, clear route handler
app.get('/api/openings/:eco', async (req, res) => {
  try {
    const { eco } = req.params;
    
    // Validate input
    if (!eco || !/^[A-E]\d{2}$/.test(eco)) {
      return res.status(400).json({ error: 'Invalid ECO code' });
    }
    
    const opening = await db.getOpeningByEco(eco);
    res.json({ success: true, data: opening });
  } catch (error) {
    console.error('Error fetching opening:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

## 🛡️ Security Essentials
- **Input validation**: Validate all parameters and body data
- **SQL injection prevention**: Use parameterized queries
- **Error handling**: Don't leak sensitive information
- **Logging**: Log errors but never secrets

## 🧪 Testing Strategy
```javascript
// ✅ Mock database calls
jest.mock('../database', () => ({
  getOpeningByEco: jest.fn()
}));

test('GET /api/openings/:eco returns opening data', async () => {
  const mockOpening = { name: 'Sicilian Defense', eco: 'B20' };
  db.getOpeningByEco.mockResolvedValue(mockOpening);
  
  const response = await request(app)
    .get('/api/openings/B20')
    .expect(200);
    
  expect(response.body.data).toEqual(mockOpening);
});
```

## ⚡ Performance Guidelines
- **Response times**: Target <200ms for API calls
- **Database**: Use indexes, avoid N+1 queries
- **Caching**: Cache expensive operations
- **Error handling**: Fail fast with clear messages

## ❌ Backend Anti-Patterns
- **Real database connections** in unit tests
- **Unvalidated user input** reaching database
- **String concatenation** in SQL queries (SQL injection risk)
- **Sensitive data** in error responses or logs
- **Missing error handling** middleware
- **Synchronous operations** blocking the event loop
