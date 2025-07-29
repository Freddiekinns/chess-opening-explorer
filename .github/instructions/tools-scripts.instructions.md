---
applyTo: "tools/**/*.{js,ts}"
---

# Tools & Scripts: Simple & Reliable

*Clean command-line scripts and utilities.*

## 🛠️ Script Essentials
```javascript
// ✅ Simple argument handling
const [inputFile, outputFile] = process.argv.slice(2);

if (!inputFile || !outputFile) {
  console.error('Usage: node script.js <input> <output>');
  process.exit(1);
}
```

## 📁 File Operations
```javascript
// ✅ Use fs/promises for async operations
const fs = require('fs/promises');

async function processFile(inputPath, outputPath) {
  try {
    const data = await fs.readFile(inputPath, 'utf8');
    const result = JSON.parse(data).map(item => ({ ...item, processed: true }));
    await fs.writeFile(outputPath, JSON.stringify(result, null, 2));
    console.log(`Processed: ${outputPath}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}
```

## 🗄️ Database Scripts
```javascript
// ✅ Simple database operations
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/database.sqlite');

async function getOpenings() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM openings', [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// ✅ Always close connections
process.on('exit', () => db.close());
```

## 🚫 Avoid These
- Synchronous file operations (use async)
- Hard-coded file paths (use arguments)
- Unclosed database connections
- Empty catch blocks
- Monolithic scripts (break into functions)

## ❌ Tools/Scripts Anti-Patterns
- **No error handling** - Always handle failures gracefully
- **Silent failures** - Provide clear success/failure feedback
- **Complex one-liners** - Break complex logic into readable steps
- **No documentation** - Include help text and usage examples
- **Platform dependencies** - Use cross-platform compatible commands when possible
