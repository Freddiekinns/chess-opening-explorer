/**
 * Backfill view counts, thumbnails, descriptions and tags for existing DB
 * videos from the YouTube API. Descriptions/tags feed the matcher's content
 * checks, so running this once upgrades databases created before those
 * columns existed — after which rematch re-scores with full evidence.
 * Uses batched requests (50 IDs per call) to minimize quota usage.
 */
require('dotenv').config();
const { google } = require('googleapis');
const DatabaseSchema = require('../database/schema-manager');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/videos.sqlite');
const BATCH_SIZE = 50;

async function backfill() {
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.error('No YouTube API key found. Set YOUTUBE_API_KEY in .env');
    process.exit(1);
  }

  const youtube = google.youtube({ version: 'v3', auth: apiKey });
  const db = new DatabaseSchema(DB_PATH);
  await db.initializeSchema(); // Ensures description/tags columns exist

  // Get all video IDs from DB
  const videos = await new Promise((resolve, reject) => {
    db.db.all('SELECT id FROM videos', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  console.log(`Found ${videos.length} videos to enrich`);
  console.log(`Will make ~${Math.ceil(videos.length / BATCH_SIZE)} API calls`);

  let updated = 0;
  let errors = 0;

  for (let i = 0; i < videos.length; i += BATCH_SIZE) {
    const batch = videos.slice(i, i + BATCH_SIZE);
    const ids = batch.map((v) => v.id);

    try {
      const response = await youtube.videos.list({
        part: ['statistics', 'snippet'],
        id: ids,
      });

      if (response.data.items) {
        await new Promise((resolve, reject) => {
          db.db.run('BEGIN TRANSACTION', (err) => (err ? reject(err) : resolve()));
        });

        for (const item of response.data.items) {
          const viewCount = parseInt(item.statistics?.viewCount || '0', 10);
          const thumbnail = item.snippet?.thumbnails?.default?.url || null;
          const description = item.snippet?.description || '';
          const tags = JSON.stringify(item.snippet?.tags || []);

          await new Promise((resolve, reject) => {
            db.db.run(
              'UPDATE videos SET view_count = ?, thumbnail_url = ?, description = ?, tags = ? WHERE id = ?',
              [viewCount, thumbnail, description, tags, item.id],
              (err) => (err ? reject(err) : resolve())
            );
          });
          updated++;
        }

        await new Promise((resolve, reject) => {
          db.db.run('COMMIT', (err) => (err ? reject(err) : resolve()));
        });
      }

      console.log(
        `  Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(videos.length / BATCH_SIZE)}: enriched ${response.data.items?.length || 0} videos`
      );
    } catch (err) {
      errors++;
      console.error(`  Batch error: ${err.message}`);
    }
  }

  console.log(`\nDone: ${updated} updated, ${errors} batch errors`);

  // Verify
  const stats = await new Promise((resolve, reject) => {
    db.db.get(
      'SELECT COUNT(*) as total, SUM(CASE WHEN view_count > 0 THEN 1 ELSE 0 END) as withViews, SUM(CASE WHEN thumbnail_url IS NOT NULL THEN 1 ELSE 0 END) as withThumbs FROM videos',
      (err, row) => (err ? reject(err) : resolve(row))
    );
  });
  console.log(
    `DB stats: ${stats.withViews}/${stats.total} with views, ${stats.withThumbs}/${stats.total} with thumbnails`
  );

  await db.close();
}

backfill().catch(console.error);
