require('dotenv').config();
const fs = require('fs');
const path = require('path');
const RSSVideoDiscovery = require('./lib/rss-discovery');
const PreFilterVideos = require('./lib/candidate-filter');
const VideoEnrichment = require('./lib/video-enricher');
const VideoMatcher = require('./lib/video-matcher');
const DatabaseSchema = require('./database/schema-manager');
const StaticFileGenerator = require('./database/static-file-generator');
const { consolidateVideoIndex } = require('../../scripts/consolidate-video-index');

/**
 * Scalable Incremental Video Pipeline
 *
 * 1. Discover videos via RSS (Fast, Free)
 * 2. Deduplicate against existing DB (Idempotent)
 * 3. Pre-filter candidates (Quality Gate)
 * 4. Enrich new candidates via YouTube API (Costly, but only for new videos)
 * 5. Match and Save (Incremental)
 * 6. Regenerate Static JSON (for Frontend)
 * 7. Consolidate Video Index (Legacy/Production Support)
 */
async function runIncrementalPipeline() {
  console.log('🚀 Starting Incremental Video Pipeline');
  console.log('======================================');

  const dbPath = path.join(__dirname, '../data/videos.sqlite');

  // Ensure data directory exists
  const dataDir = path.dirname(dbPath);
  if (!fs.existsSync(dataDir)) {
    console.log(`📁 Creating data directory: ${dataDir}`);
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const db = new DatabaseSchema(dbPath);

  try {
    // Step 0: Ensure DB schema exists
    await db.initializeSchema();

    // Step 0.5: Check and Populate Openings
    const openingCount = await new Promise((resolve, reject) => {
      db.db.get('SELECT COUNT(*) as count FROM openings', (err, row) => {
        if (err) reject(err);
        else resolve(row.count);
      });
    });

    if (openingCount === 0) {
      console.log('   ⚠️  Openings table is empty. Populating from ECO files...');
      const ecoDir = path.join(__dirname, '../../api/data/eco');
      if (fs.existsSync(ecoDir)) {
        let totalOpenings = 0;

        // Start transaction
        await new Promise((resolve, reject) => {
          db.db.run('BEGIN TRANSACTION', (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        try {
          for (const ecoFile of ['ecoA.json', 'ecoB.json', 'ecoC.json', 'ecoD.json', 'ecoE.json']) {
            const ecoPath = path.join(ecoDir, ecoFile);
            if (fs.existsSync(ecoPath)) {
              const ecoData = JSON.parse(fs.readFileSync(ecoPath, 'utf8'));
              for (const [fen, opening] of Object.entries(ecoData)) {
                await db.insertOpening({
                  fen: fen,
                  name: opening.name,
                  eco: opening.eco,
                  aliases: opening.aliases || [],
                });
                totalOpenings++;
              }
            }
          }

          // Commit transaction
          await new Promise((resolve, reject) => {
            db.db.run('COMMIT', (err) => {
              if (err) reject(err);
              else resolve();
            });
          });

          console.log(`   ✅ Populated ${totalOpenings} openings.`);
        } catch (error) {
          // Rollback on error
          db.db.run('ROLLBACK');
          throw error;
        }
      } else {
        console.error(`   ❌ ECO directory not found at ${ecoDir}`);
      }
    } else {
      console.log(`   ✅ Openings table has ${openingCount} entries.`);
    }

    // Step 1: Get existing video IDs for deduplication
    console.log('   Loading existing video IDs...');
    const existingVideoIds = await new Promise((resolve, reject) => {
      db.db.all('SELECT id FROM videos', (err, rows) => {
        if (err) reject(err);
        else resolve(new Set(rows.map((row) => row.id)));
      });
    });
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

    if (enrichedVideos.length > validEnrichedVideos.length) {
      console.log(
        `   Failed to enrich ${enrichedVideos.length - validEnrichedVideos.length} videos.`
      );
      const firstError = enrichedVideos.find((v) => v.enrichmentError);
      if (firstError) {
        console.log(`   ❌ Sample Error: ${firstError.enrichmentError}`);
      }
    }

    if (validEnrichedVideos.length === 0) {
      console.log('\n✅ No videos successfully enriched. Pipeline complete.');
      return;
    }

    // Step 6: Match and Save (Incremental)
    console.log('\n🎯 Step 6: Matching and Saving...');
    const matcher = new VideoMatcher(dbPath);

    const matchResults = await matcher.runMatchingWithVideos(validEnrichedVideos, {
      clearDb: false,
    });

    console.log(`\n🎉 Incremental Update Complete!`);
    console.log(`   Added ${matchResults.uniqueVideos} new videos.`);
    console.log(`   Created ${matchResults.finalMatches} new video-opening matches.`);

    // Step 7: Generate Static Files (JSON)
    console.log('\n📄 Step 7: Regenerating Static JSON Files...');
    const staticGenerator = new StaticFileGenerator(dbPath);
    const staticResult = await staticGenerator.generateAllStaticFiles();
    console.log('   ✅ Static files generated:', staticResult);

    // Step 8: Consolidate Video Index
    console.log('\n📦 Step 8: Consolidating Video Index...');
    const publicApiDir = path.join(__dirname, '../../public/api/openings');
    const apiDataDir = path.join(__dirname, '../../api/data');

    await consolidateVideoIndex(publicApiDir, apiDataDir);
    console.log('   ✅ Video index consolidated.');
  } catch (error) {
    console.error('❌ Pipeline failed:', error);
    process.exit(1);
  } finally {
    await db.close();
  }
}

runIncrementalPipeline().catch(console.error);
