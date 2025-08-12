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

### **⚠️ Important Testing Architecture**
- **Frontend Tests**: Use Vitest in `packages/web/src/**/__tests__/` 
- **Backend Tests**: Use Jest in `tests/unit/` directory  
- **Component Tests**: Always in frontend workspace for proper React environment
- **Service Tests**: Always in root tests/ for proper Node.js environment
- **Run Location**: Frontend tests from web workspace, backend tests from root

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

```powershell
# PowerShell timing
Measure-Command { Invoke-RestMethod "http://localhost:3010/api/openings/popular-by-eco" }
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
