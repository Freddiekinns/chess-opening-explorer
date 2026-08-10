require('dotenv').config();
const fs = require('fs');
const path = require('path');
const RSSVideoDiscovery = require('./lib/rss-discovery');
const PreFilterVideos = require('./lib/candidate-filter');
const VideoEnrichment = require('./lib/video-enricher');
const VideoMatcher = require('./lib/video-matcher');
const ChannelDiscovery = require('./lib/channel-discovery');
const { loadEnrichmentCorpus } = require('./lib/enrichment-corpus');
const DatabaseSchema = require('./database/schema-manager');
const StaticFileGenerator = require('./database/static-file-generator');
const { consolidateVideoIndex } = require('../../scripts/consolidate-video-index');

/**
 * Video Pipeline — Mode-based dispatch
 *
 * Modes:
 *   incremental (default) — RSS discovery for new videos only
 *   full                  — YouTube API full-catalogue rebuild
 *   rematch               — Re-score all existing videos (zero API cost)
 */

const DB_PATH = path.join(__dirname, '../data/videos.sqlite');

/**
 * Ensure DB schema and openings are populated
 */
async function initDatabase(db) {
  await db.initializeSchema();

  const openingCount = await new Promise((resolve, reject) => {
    db.db.get('SELECT COUNT(*) as count FROM openings', (err, row) => {
      if (err) reject(err);
      else resolve(row.count);
    });
  });

  if (openingCount === 0) {
    console.log('   ⚠️  Openings table is empty. Populating from ECO files...');
    const ecoDir = path.join(__dirname, '../../api/data/eco');
    if (!fs.existsSync(ecoDir)) {
      throw new Error(`ECO directory not found at ${ecoDir}`);
    }

    let totalOpenings = 0;
    await new Promise((resolve, reject) => {
      db.db.run('BEGIN TRANSACTION', (err) => (err ? reject(err) : resolve()));
    });

    try {
      for (const ecoFile of ['ecoA.json', 'ecoB.json', 'ecoC.json', 'ecoD.json', 'ecoE.json']) {
        const ecoPath = path.join(ecoDir, ecoFile);
        if (fs.existsSync(ecoPath)) {
          const ecoData = JSON.parse(fs.readFileSync(ecoPath, 'utf8'));
          for (const [fen, opening] of Object.entries(ecoData)) {
            await db.insertOpening({
              fen,
              name: opening.name,
              eco: opening.eco,
              aliases: opening.aliases || [],
            });
            totalOpenings++;
          }
        }
      }
      await new Promise((resolve, reject) => {
        db.db.run('COMMIT', (err) => (err ? reject(err) : resolve()));
      });
      console.log(`   ✅ Populated ${totalOpenings} openings.`);
    } catch (error) {
      db.db.run('ROLLBACK');
      throw error;
    }
  } else {
    console.log(`   ✅ Openings table has ${openingCount} entries.`);
  }
}

/**
 * Convert a videos-table row to the candidate shape runMatchingWithVideos
 * expects. Databases written before the description/tags columns existed
 * (or before backfill-views was re-run) fall back to empty values.
 */
function dbRowToMatchInput(row) {
  let tags = [];
  try {
    tags = row.tags ? JSON.parse(row.tags) : [];
  } catch (error) {
    tags = [];
  }

  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    channelId: row.channelId,
    channelTitle: row.channelTitle,
    duration: row.duration, // Already integer seconds from DB
    statistics: { viewCount: String(row.view_count || 0) },
    publishedAt: row.publishedAt,
    thumbnails: { default: { url: row.thumbnail_url } },
    tags,
  };
}

/**
 * Get existing video IDs for deduplication
 */
async function getExistingVideoIds(db) {
  return new Promise((resolve, reject) => {
    db.db.all('SELECT id FROM videos', (err, rows) => {
      if (err) reject(err);
      else resolve(new Set(rows.map((row) => row.id)));
    });
  });
}

/**
 * Regenerate static files and consolidate video index
 */
async function regenerateStaticFiles(dbPath) {
  console.log('\n📄 Regenerating Static JSON Files...');
  const outputDir = path.join(__dirname, '../../public/api/openings');
  const staticGenerator = new StaticFileGenerator({
    databasePath: dbPath,
    outputDir: outputDir,
  });
  const staticResult = await staticGenerator.generateAllStaticFiles();
  console.log('   ✅ Static files generated:', staticResult);

  // Remove files from previous runs whose key scheme/openings no longer match,
  // so the consolidated index doesn't pick up stale duplicates
  const cleanupResult = await staticGenerator.cleanupOrphanedFiles();
  if (cleanupResult.deleted > 0) {
    console.log(`   🧹 Removed ${cleanupResult.deleted} stale static files.`);
  }

  console.log('\n📦 Consolidating Video Index...');
  const publicApiDir = path.join(__dirname, '../../public/api/openings');
  const apiDataDir = path.join(__dirname, '../../api/data');
  await consolidateVideoIndex(publicApiDir, apiDataDir);
  console.log('   ✅ Video index consolidated.');
}

// ─── Mode: Incremental (RSS) ─────────────────────────────────

async function runIncremental(db) {
  console.log('🚀 Starting Incremental Video Pipeline');
  console.log('======================================');

  await initDatabase(db);

  // Step 1: Get existing video IDs for deduplication
  console.log('   Loading existing video IDs...');
  const existingVideoIds = await getExistingVideoIds(db);
  console.log(`   Found ${existingVideoIds.size} existing videos in database.`);

  // Step 2: Discover videos via RSS
  console.log('\n🔍 Step 2: Discovering videos via RSS...');
  const rssDiscovery = new RSSVideoDiscovery();
  const discoveryResult = await rssDiscovery.discoverNewVideos();
  const allDiscoveredVideos = discoveryResult.videos;
  console.log(`   Found ${allDiscoveredVideos.length} videos from RSS feeds.`);

  // Step 3: Deduplicate
  console.log('\n♻️  Step 3: Deduplicating...');
  const newVideos = allDiscoveredVideos.filter((v) => !existingVideoIds.has(v.id));
  console.log(`   Found ${newVideos.length} NEW videos to process.`);
  console.log(`   Skipped ${allDiscoveredVideos.length - newVideos.length} existing videos.`);

  if (newVideos.length === 0) {
    console.log('\n✅ No new videos to process. Pipeline complete.');
    return;
  }

  // Step 4: Pre-filter
  console.log('\n🚫 Step 4: Pre-Filtering New Videos...');
  const preFilter = new PreFilterVideos();
  const filterResult = preFilter.filterCandidates(newVideos);
  const candidates = filterResult.candidates;

  console.log(`   Passed: ${candidates.length} / ${newVideos.length} videos`);
  console.log(`   Rejected: ${filterResult.rejectedCount} videos`);

  if (candidates.length === 0) {
    console.log('\n✅ No candidates passed pre-filter. Pipeline complete.');
    return;
  }

  // Step 5: Enrich
  console.log('\n⚡ Step 5: Enriching Candidates (YouTube API)...');
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.warn('⚠️  Warning: No API Key found. Enrichment will likely fail.');
  }
  const enrichment = new VideoEnrichment(apiKey);
  const enrichedVideos = await enrichment.batchEnrichVideos(candidates);
  const validEnrichedVideos = enrichedVideos.filter((v) => !v.enrichmentError);
  console.log(`   Successfully enriched ${validEnrichedVideos.length} videos.`);

  if (validEnrichedVideos.length === 0) {
    console.log('\n✅ No videos successfully enriched. Pipeline complete.');
    return;
  }

  // Step 6: Match and Save (Incremental)
  console.log('\n🎯 Step 6: Matching and Saving...');
  const matcher = new VideoMatcher(DB_PATH);
  const matchResults = await matcher.runMatchingWithVideos(validEnrichedVideos, {
    clearDb: false,
  });

  console.log(`\n🎉 Incremental Update Complete!`);
  console.log(`   Added ${matchResults.uniqueVideos} new videos.`);
  console.log(`   Created ${matchResults.finalMatches} new video-opening matches.`);

  // Step 7: Regenerate
  await regenerateStaticFiles(DB_PATH);
}

// ─── Mode: Full (YouTube API catalogue) ──────────────────────

async function runFull(db) {
  console.log('🚀 Starting Full Catalogue Video Pipeline');
  console.log('==========================================');

  const apiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.error('❌ YOUTUBE_API_KEY is required for full mode.');
    process.exit(1);
  }

  await initDatabase(db);

  // Step 1: Get existing video IDs for deduplication
  console.log('\n📊 Loading existing video IDs...');
  const existingVideoIds = await getExistingVideoIds(db);
  console.log(`   Found ${existingVideoIds.size} existing videos in database.`);

  // Step 2: Discover ALL videos via YouTube API
  console.log('\n🔍 Discovering full catalogue via YouTube API...');
  const channelDiscovery = new ChannelDiscovery(apiKey);
  const discoveryResult = await channelDiscovery.discoverAllVideos();
  console.log(
    `   Discovered ${discoveryResult.totalVideos} total videos from ${discoveryResult.channelsCovered} channels.`
  );

  if (discoveryResult.errors.length > 0) {
    console.warn(`   ⚠️  ${discoveryResult.errors.length} channel(s) had errors.`);
  }

  // Step 3: Deduplicate — only enrich new videos
  const newVideos = discoveryResult.videos.filter((v) => !existingVideoIds.has(v.id));
  console.log(
    `\n♻️  ${newVideos.length} new videos to enrich (${existingVideoIds.size} already in DB).`
  );

  // Step 4: Pre-filter new candidates
  console.log('\n🚫 Pre-Filtering new candidates...');
  const preFilter = new PreFilterVideos();
  const filterResult = preFilter.filterCandidates(newVideos);
  const candidates = filterResult.candidates;
  console.log(`   Passed: ${candidates.length} / ${newVideos.length} videos`);

  // Step 5: Enrich new candidates via YouTube API
  let validEnrichedVideos = [];
  if (candidates.length > 0) {
    console.log('\n⚡ Enriching new candidates (YouTube API)...');
    const enrichment = new VideoEnrichment(apiKey);
    const enrichedVideos = await enrichment.batchEnrichVideos(candidates);
    validEnrichedVideos = enrichedVideos.filter((v) => !v.enrichmentError);
    console.log(`   Successfully enriched ${validEnrichedVideos.length} videos.`);
  }

  // Step 6: Re-match ALL videos (existing + new enriched)
  console.log('\n🎯 Re-matching ALL videos...');

  // Load all existing videos from DB (description/tags are persisted so
  // re-matching keeps the content-match evidence from the original run)
  const existingVideos = await new Promise((resolve, reject) => {
    db.db.all(
      'SELECT id, title, channel_id as channelId, channel_title as channelTitle, duration, view_count, published_at as publishedAt, thumbnail_url, description, tags FROM videos',
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });

  // Merge existing videos (already enriched) with newly enriched
  const allVideosForMatching = [
    ...existingVideos.map((v) => dbRowToMatchInput(v)),
    ...validEnrichedVideos,
  ];

  console.log(`   Total videos for matching: ${allVideosForMatching.length}`);

  const matcher = new VideoMatcher(DB_PATH);
  const matchResults = await matcher.runMatchingWithVideos(allVideosForMatching, {
    clearDb: true,
  });

  console.log(`\n🎉 Full Catalogue Pipeline Complete!`);
  console.log(`   ${matchResults.uniqueVideos} unique videos matched.`);
  console.log(`   ${matchResults.finalMatches} video-opening matches created.`);
  console.log(`   ${matchResults.openingsWithVideos} openings with videos.`);

  // Step 7: Regenerate
  await regenerateStaticFiles(DB_PATH);
}

// ─── Mode: Rematch (zero API cost) ──────────────────────────

async function runRematch(db) {
  console.log('🚀 Starting Rematch (Re-scoring) Pipeline');
  console.log('==========================================');
  console.log('   ℹ️  Zero API cost — re-scores existing videos only.');

  await initDatabase(db);

  // Step 1: Load ALL videos from database
  console.log('\n📊 Loading all videos from database...');
  const videos = await new Promise((resolve, reject) => {
    db.db.all(
      'SELECT id, title, channel_id as channelId, channel_title as channelTitle, duration, view_count, published_at as publishedAt, thumbnail_url, description, tags FROM videos',
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });

  // Step 1b: Recover everything else ever enriched. The videos table only
  // holds past top-10 winners, so without this a scorer improvement can only
  // reshuffle the previous scorer's survivors — see lib/enrichment-corpus.js.
  console.log('\n♻️  Recovering videos from the enrichment cache...');
  const corpus = loadEnrichmentCorpus({ excludeIds: new Set(videos.map((v) => v.id)) });
  console.log(
    `   Cache holds ${corpus.total} videos; ${corpus.rejected} rejected by the pre-filter, ${corpus.recovered} recovered.`
  );

  if (videos.length === 0 && corpus.recovered === 0) {
    console.log('   ⚠️  No videos in database. Run incremental or full mode first.');
    return;
  }

  console.log(`   Found ${videos.length + corpus.recovered} videos to re-score.`);

  // Step 2: Clear only opening_videos table (keep videos intact)
  console.log('\n🗑️  Clearing opening_videos table only...');
  await new Promise((resolve, reject) => {
    db.db.run('DELETE FROM opening_videos', (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
  console.log('   ✅ opening_videos cleared.');

  // Step 3: Re-match all videos with current scorer
  console.log('\n🎯 Re-matching all videos with updated scorer...');

  // Convert DB rows to format expected by runMatchingWithVideos
  const videosForMatching = [...videos.map((v) => dbRowToMatchInput(v)), ...corpus.videos];

  const matcher = new VideoMatcher(DB_PATH);
  const matchResults = await matcher.runMatchingWithVideos(videosForMatching, {
    clearDb: false,
  });

  console.log(`\n🎉 Rematch Complete!`);
  console.log(`   ${matchResults.uniqueVideos} unique videos matched.`);
  console.log(`   ${matchResults.finalMatches} video-opening matches created.`);
  console.log(`   ${matchResults.openingsWithVideos} openings with videos.`);

  // Step 4: Regenerate
  await regenerateStaticFiles(DB_PATH);
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  // Parse --mode= from process.argv
  const modeArg = process.argv.find((arg) => arg.startsWith('--mode='));
  const mode = modeArg ? modeArg.split('=')[1] : 'incremental';

  if (!['incremental', 'full', 'rematch'].includes(mode)) {
    console.error(`❌ Unknown mode: ${mode}. Use: incremental, full, or rematch.`);
    process.exit(1);
  }

  console.log(`📋 Pipeline mode: ${mode}`);

  // Ensure data directory exists
  const dataDir = path.dirname(DB_PATH);
  if (!fs.existsSync(dataDir)) {
    console.log(`📁 Creating data directory: ${dataDir}`);
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const db = new DatabaseSchema(DB_PATH);

  try {
    if (mode === 'incremental') {
      await runIncremental(db);
    } else if (mode === 'full') {
      await runFull(db);
    } else if (mode === 'rematch') {
      await runRematch(db);
    }
  } catch (error) {
    console.error('❌ Pipeline failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

main().catch(console.error);
