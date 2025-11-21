require('dotenv').config();
const path = require('path');
const DatabaseSchema = require('./database/schema-manager');
const VideoEnrichment = require('./lib/video-enricher');
const VideoMatcher = require('./lib/video-matcher');

async function backfillVideos() {
  console.log('🚀 Starting Video Backfill...');
  
  const dbPath = path.join(__dirname, '../data/videos.sqlite');
  const db = new DatabaseSchema(dbPath);
  await db.initializeSchema();

  // Initialize services
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    console.error('❌ No API Key found. Cannot search YouTube.');
    process.exit(1);
  }
  const enricher = new VideoEnrichment(apiKey);
  const matcher = new VideoMatcher(dbPath);

  // Get openings to backfill
  // For testing, we'll take 5 popular openings (by name)
  // We can't easily determine popularity from DB alone without game stats, 
  // but we can pick some well-known ones.
  const targetOpenings = [
    'Sicilian Defense',
    'Ruy Lopez',
    'Queen\'s Gambit',
    'King\'s Indian Defense',
    'French Defense'
  ];

  console.log(`🎯 Targeting ${targetOpenings.length} major openings for backfill...`);

  let totalNewVideos = 0;

  for (const openingName of targetOpenings) {
    console.log(`\n🔍 Processing: ${openingName}`);
    
    // 1. Search for videos
    const query = `Chess opening ${openingName} guide`;
    console.log(`   Searching YouTube for: "${query}"`);
    
    const searchResults = await enricher.searchVideos(query, 10); // Get top 10
    console.log(`   Found ${searchResults.length} search results.`);

    if (searchResults.length === 0) continue;

    // 2. Enrich videos (to get duration, views, etc.)
    console.log('   Enriching videos...');
    const enrichedVideos = await enricher.batchEnrichVideos(searchResults);
    const validVideos = enrichedVideos.filter(v => !v.enrichmentError);
    console.log(`   Successfully enriched ${validVideos.length} videos.`);

    if (validVideos.length === 0) continue;

    // 3. Match and Save
    console.log('   Matching and saving...');
    // We pass clearDb: false to append to existing data
    const matchResults = await matcher.runMatchingWithVideos(validVideos, { clearDb: false });
    
    totalNewVideos += matchResults.uniqueVideos;
  }

  console.log('\n✅ Backfill Complete!');
  console.log(`   Total new videos added: ${totalNewVideos}`);

  await db.close();
}

backfillVideos().catch(console.error);
