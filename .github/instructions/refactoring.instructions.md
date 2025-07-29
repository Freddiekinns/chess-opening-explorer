---
applyTo: "**/*.{js,ts,tsx,jsx}"
---

# Refactoring: Simple & Clean

*Make code cleaner without breaking functionality.*

## 🎯 Quick Refactoring Triggers
```
When you see:
├─ Copy-pasted code → Extract function/constant
├─ Function >20 lines → Split responsibilities  
├─ Complex if/else → Simplify logic or extract
└─ Hard-coded values → Create constants
```

## ⚡ Refactoring Actions (In Order)
1. **Remove duplication** - Extract repeated code
2. **Simplify functions** - One responsibility per function
3. **Extract constants** - No magic numbers/strings
4. **Clear naming** - Self-documenting variable/function names

## 🎨 Before/After Examples
```javascript
// ❌ Before: Duplicated, unclear
if (user.type === 'admin' && user.permissions.includes('read')) {
  // admin logic
}
if (user.type === 'admin' && user.permissions.includes('write')) {
  // admin logic  
}

// ✅ After: Clear, no duplication
const isAdmin = user.type === 'admin';
const canRead = user.permissions.includes('read');
const canWrite = user.permissions.includes('write');
```

## 🚫 Anti-Patterns to Fix
- Copy-pasted code blocks
- Functions doing multiple things
- Magic numbers/strings
- Unclear variable names
- Unnecessary complexity

## ❌ Refactoring Anti-Patterns
- **Big bang refactoring** - Make small, incremental changes
- **Refactoring without tests** - Always have tests before refactoring
- **Premature optimization** - Focus on readability first
- **Over-abstraction** - Don't create abstractions too early
- **Breaking working code** - If it works, be cautious about changing it
