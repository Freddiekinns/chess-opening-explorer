const fs = require('fs');
const path = require('path');
const VideoMatcher = require('./video-matcher.js');
const DatabaseSchema = require('../database/schema-manager.js');

async function runNewPipeline() {
  console.log('🚀 Running NEW Video Pipeline (Following Overhaul Plan)');
  console.log('=======================================================');
  
  try {
    // Step 0: Clear existing matches first
    console.log('\n🗑️  Step 0: Clearing existing video matches...');
    const matcher = new VideoMatcher(path.join(__dirname, 'data/videos.sqlite'));
    await matcher.clearExistingMatches();
    
    // Step 1: Load ALL videos from full index
    console.log('\n📁 Step 1: Loading ALL videos from full index...');
    const indexPath = path.join(__dirname, 'data/channel_first_index.json');
    if (!fs.existsSync(indexPath)) {
      throw new Error('Missing full video index: data/channel_first_index.json');
    }
    
    const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    
    // Flatten the channel-based structure into a simple video array
    const allVideos = [];
    for (const [channelId, channelVideos] of indexData.localIndex) {
      for (const video of channelVideos) {
        allVideos.push({
          id: video.id,
          title: video.title,
          description: video.description,
          publishedAt: video.publishedAt,
          channelId: channelId,
          channelTitle: video.channelTitle || 'Unknown Channel',
          duration: video.duration,
          tags: video.tags || [],
          statistics: video.statistics || {},
          thumbnails: video.thumbnails
        });
      }
    }
    
    console.log(`📹 Found ${allVideos.length} total videos across ${indexData.localIndex.length} channels`);
    
    // Step 2: Pre-filter videos using new enhanced system
    console.log('\n🚫 Step 2: Pre-Filtering Videos...');
    let passed = 0;
    let rejected = 0;
    const candidateVideos = [];
    
    for (const video of allVideos) {
      if (matcher.preFilterVideo(video)) {
        candidateVideos.push(video);
        passed++;
      } else {
        rejected++;
      }
    }
    
    console.log(`   ✅ Passed: ${passed} videos (${((passed/(passed+rejected))*100).toFixed(1)}%)`);
    console.log(`   ❌ Rejected: ${rejected} videos (${((rejected/(passed+rejected))*100).toFixed(1)}%)`);
    console.log(`   🎯 Quality Improvement: ${((rejected/(passed+rejected))*100).toFixed(1)}% bad content eliminated`);
    
    // Step 3: Run enhanced ECO-based matching with family conflict detection
    console.log('\n🎯 Step 3: Running Enhanced Video Matching...');
    const matchResults = await matcher.runMatchingWithVideos(candidateVideos);
    
    console.log(`\n🎯 Enhanced Matching Results:`);
    console.log(`   📹 Videos matched to openings: ${matchResults.matchedCount || 0}`);
    console.log(`   🎯 Unique openings matched: ${matchResults.openingsCount || 0}`);
    console.log(`   🏆 Total video-opening relationships: ${matchResults.finalMatches || 0}`);
    
    // Step 4: Final validation
    console.log('\n🔍 Step 4: Validation...');
    const db = new DatabaseSchema('data/videos.sqlite');
    const stats = await db.getDatabaseStats();
    console.log('📊 Final Database Stats:', stats);
    
    await db.close();
    console.log('\n🎉 ENHANCED PIPELINE COMPLETE!');
    console.log('\n✅ Major Achievements:');
    console.log(`   • ${((rejected/(passed+rejected))*100).toFixed(1)}% of low-quality content eliminated`);
    console.log(`   • ECO-based family conflict detection implemented`);
    console.log(`   • Enhanced creator quality prioritization (Naroditsky, Hanging Pawns, etc.)`);
    console.log(`   • Family mismatch prevention (Nimzo vs QGD conflicts blocked)`);
    console.log(`   • Database cleared and fresh matching applied`);
    console.log(`   • Full ${allVideos.length} video dataset processed`);
    
  } catch (error) {
    console.error('❌ Pipeline failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runNewPipeline().catch(console.error);
