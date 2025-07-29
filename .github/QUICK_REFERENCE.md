---
applyTo: "**"
---

# Quick Decision Reference

## � Simple Development Flow
```
What are you building?
├─ Fix a bug → Direct implementation + test
├─ Simple feature → Make it work → Make it clean
├─ Complex feature → Break into small parts
└─ New architecture → Check existing patterns first
```

## 🎯 Code Quality Quick Checks
```
Before committing:
├─ Does it work? → Test manually
├─ Is it readable? → Clear names, simple logic
├─ Is it secure? → Validate inputs, no secrets logged
└─ Is it fast? → <200ms responses, mocked externals
```

## 🧹 Refactoring Signals
```
Refactor when you see:
├─ Copy-pasted code → Extract function/constant
├─ Function >20 lines → Split responsibilities
├─ Magic numbers → Create constants
└─ Unclear names → Rename for clarity
```

## � Project Structure Guide
- **Frontend** (`packages/web/**`): Use simplified.css, minimal components
- **Backend** (`packages/api/**`): Simple routes, clear error handling
- **Shared** (`packages/shared/**`): Pure functions, clear types
- **CSS**: Single consolidated file with CSS variables
