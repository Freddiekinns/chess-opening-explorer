---
applyTo: "tools/**/*.{js,ts}"
---

# Tools & Scripts Development Instructions

*These instructions provide guidance for creating robust command-line scripts and utilities in the `tools/` directory.*

## Scripting & Automation Patterns

### **Command-Line Argument Parsing**
```javascript
// ✅ Use process.argv for simple arguments
const args = process.argv.slice(2);
const inputFile = args[0];
const outputFile = args[1];

if (!inputFile || !outputFile) {
  console.error('Usage: node <script.js> <inputFile> <outputFile>');
  process.exit(1);
}
```

### **File System Operations**
```javascript
// ✅ Always use fs/promises for async file I/O
const fs = require('fs/promises');

async function processFile(inputPath, outputPath) {
  try {
    const data = await fs.readFile(inputPath, 'utf8');
    const processedData = JSON.parse(data).map(item => ({ ...item, processed: true }));
    await fs.writeFile(outputPath, JSON.stringify(processedData, null, 2));
    console.log(`Successfully processed file and saved to ${outputPath}`);
  } catch (error) {
    console.error(`Error processing file: ${error.message}`);
    process.exit(1);
  }
}
```

### **Database Interaction (SQLite)**
```javascript
// ✅ Encapsulate database logic and handle connections properly
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/videos.sqlite');

function getOpenings() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM openings', [], (err, rows) => {
      if (err) {
        return reject(err);
      }
      resolve(rows);
    });
  });
}

// ✅ Remember to close the database connection
function closeDb() {
  db.close();
}
```

### **Logging and Error Handling**
- **Use `console.log`** for status updates and progress indicators.
- **Use `console.error`** for all errors.
- **Exit with a non-zero status code** on failure (`process.exit(1)`).
- **Wrap all major operations** in `try/catch` blocks.

### **Scripting Anti-Patterns**
- ❌ Using synchronous file I/O (`fs.readFileSync`) unless absolutely necessary at startup.
- ❌ Hard-coding file paths; accept them as arguments instead.
- ❌ Leaving database connections open after the script finishes.
- ❌ Swallowing errors with empty `catch` blocks.
- ❌ Writing monolithic scripts; break logic into smaller, reusable functions.
