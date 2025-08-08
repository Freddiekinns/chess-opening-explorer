````instructions
---
applyTo: "tools/**/*.{js,ts,ps1}"
---

# Tools & Scripts: Simple & Reliable

## 🛠️ Script Essentials
- **Arguments**: `const [input, output] = process.argv.slice(2);`
- **File ops**: Use `fs/promises` and `path.resolve()`
- **Errors**: Always handle with clear messages
- **Cross-platform**: Use Node.js `path` module, not shell commands

## 🚫 Avoid
- Sync file operations
- Hard-coded paths  
- Unclosed database connections
- Silent failures

````
