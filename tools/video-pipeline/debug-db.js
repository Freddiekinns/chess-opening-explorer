const path = require('path');
const fs = require('fs');

async function test() {
  try {
    console.log('Current directory:', __dirname);
    const dbPath = path.join(__dirname, '../data/videos.sqlite');
    console.log('Checking DB at:', dbPath);
    
    if (!fs.existsSync(dbPath)) {
        console.error('DB file not found!');
        return;
    }

    const DatabaseSchema = require('./database/schema-manager');
    const db = new DatabaseSchema(dbPath);
    await db.initializeSchema();
    
    const stats = await db.getDatabaseStats();
    console.log('Stats:', stats);
    
    const integrity = await db.validateDataIntegrity();
    console.log('Integrity:', integrity);

    await db.close();
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
