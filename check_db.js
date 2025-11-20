const DatabaseSchema = require('./tools/database/schema-manager');
const path = require('path');

async function checkDb() {
    const dbPath = path.join(__dirname, 'data/videos.sqlite');
    const db = new DatabaseSchema(dbPath);

    try {
        const openings = await new Promise((resolve, reject) => {
            db.db.get('SELECT COUNT(*) as count FROM openings', (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });
        console.log(`Openings count: ${openings}`);

        const videos = await new Promise((resolve, reject) => {
            db.db.get('SELECT COUNT(*) as count FROM videos', (err, row) => {
                if (err) reject(err);
                else resolve(row.count);
            });
        });
        console.log(`Videos count: ${videos}`);

    } catch (err) {
        console.error(err);
    } finally {
        db.close();
    }
}

checkDb();
