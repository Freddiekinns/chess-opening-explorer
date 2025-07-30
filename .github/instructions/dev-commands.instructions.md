---
applyTo: "**"
---

# Development Quick Reference

*Fast decisions, commands, and quality checks for chess opening explorer development.*

**📚 Context Sources:**
- **Long-term project context**: See `memory_bank.md` in root directory
- **Specialized patterns**: See other `.github/instructions/*.instructions.md` files
- **This file**: Immediate development workflow and commands

## 🚀 Development Flow
```
What are you building?
├─ Fix a bug → Direct implementation + test
├─ Simple feature → Make it work → Make it clean
├─ Complex feature → Break into small parts
└─ New architecture → Check existing patterns first
```

## 🎯 Quality Checks (Before Committing)
```
├─ Does it work? → Test manually + unit tests
├─ Is it readable? → Clear names, simple logic
├─ Is it secure? → Validate inputs, no secrets logged
└─ Is it fast? → <200ms responses, mocked externals
```

## 🧪 Testing Commands

### **Backend Tests (Jest)**
```bash
# All backend unit tests (from root)
npm run test:unit

# Specific test file
npm run test:unit -- --testPathPattern="eco-service.test.js"

# Test with watch mode
npm run test:unit -- --watch

# Test with coverage
npm run test:unit -- --coverage
```

### **Frontend Tests (Vitest)**
```bash
# All frontend tests (from root via workspace)
cd packages/web && npm test

# Test with coverage
cd packages/web && npm test -- --coverage
```

### **⚠️ Important Test Organization**
- **All tests**: Must be in `tests/unit/` directory (never inside source folders)
- **Run location**: Always run tests from project ROOT directory
- **Naming**: Use clear descriptive names like `video-service.test.js`

## ⚡ Development Servers

```bash
# Both servers (API on :3010, Web on :3000/3001)
npm run dev

# Backend only
npm run dev:api

# Frontend only  
npm run dev:web
```

## 🔧 Performance Testing

```bash
# PowerShell timing
Measure-Command { Invoke-RestMethod "http://localhost:3010/api/openings/popular-by-eco" }

# cURL with timing
curl -w "Time: %{time_total}s\n" -o /dev/null -s "URL"
```

## 📦 Build Commands

```bash
# Build all workspaces
npm run build

# Individual builds
npm run build:api
npm run build:web
```

---

**Key Pattern**: Always run tests from **ROOT** directory unless specifically testing workspace isolation.

## 🧹 Refactoring Signals
```
Refactor when you see:
├─ Copy-pasted code → Extract function/constant
├─ Function >20 lines → Split responsibilities
├─ Magic numbers → Create constants
└─ Unclear names → Rename for clarity
```

## 📁 Project Structure Guide
- **Frontend** (`packages/web/**`): Use simplified.css, minimal components
- **Backend** (`packages/api/**`): Simple routes, clear error handling  
- **Shared** (`packages/shared/**`): Pure functions, clear types
- **CSS**: Single consolidated file with CSS variables
