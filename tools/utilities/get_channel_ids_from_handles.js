#!/usr/bin/env node

/**
 * YouTube Handle to Channel ID Converter
 * Converts @handle format to actual YouTube channel IDs using YouTube API
 */

require('dotenv').config();
const YouTubeService = require('../../packages/api/src/services/youtube-service');

const CHANNEL_HANDLES = [
  '@STLChessClub',
  '@HangingPawns', 
  '@DanielNaroditskyGM',
  '@chessbrah',
  '@GingerGM',
  '@ChessNetwork',
  '@GMBenjaminFinegold',
  '@eric-rosen',
  '@GothamChess',
  '@agadmator'
];

// Map handles to display names
const HANDLE_TO_NAME = {
  '@STLChessClub': 'Saint Louis Chess Club',
  '@HangingPawns': 'Hanging Pawns',
  '@DanielNaroditskyGM': 'Daniel Naroditsky',
  '@chessbrah': 'Chessbrah',
  '@GingerGM': 'GingerGM', 
  '@ChessNetwork': 'Chess Network',
  '@GMBenjaminFinegold': 'Ben Finegold',
  '@eric-rosen': 'Eric Rosen',
  '@GothamChess': 'GothamChess',
  '@agadmator': 'agadmator'
};

async function getChannelIdFromHandle(youtubeService, handle) {
  try {
    // Try searching for the channel by handle/name
    const searchQuery = handle.replace('@', '');
    const searchResponse = await youtubeService.searchChannels(searchQuery);
    
    if (searchResponse && searchResponse.length > 0) {
      // Look for exact match in channel title or customUrl
      const exactMatch = searchResponse.find(channel => 
        channel.snippet.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        channel.snippet.customUrl === handle ||
        channel.snippet.customUrl === handle.toLowerCase()
      );
      
      if (exactMatch) {
        return {
          handle: handle,
          name: HANDLE_TO_NAME[handle],
          channelId: exactMatch.id.channelId || exactMatch.snippet.channelId,
          title: exactMatch.snippet.title,
          customUrl: exactMatch.snippet.customUrl
        };
      }
    }
    
    return {
      handle: handle,
      name: HANDLE_TO_NAME[handle],
      channelId: null,
      error: 'No exact match found'
    };
    
  } catch (error) {
    return {
      handle: handle,
      name: HANDLE_TO_NAME[handle], 
      channelId: null,
      error: error.message
    };
  }
}

async function main() {
  console.log('🔍 YouTube Handle to Channel ID Converter');
  console.log('==========================================\n');
  
  if (!process.env.YOUTUBE_API_KEY) {
    console.log('❌ YOUTUBE_API_KEY environment variable is required');
    process.exit(1);
  }
  
  const youtubeService = new YouTubeService({
    apiKey: process.env.YOUTUBE_API_KEY
  });
  
  console.log('📋 Converting handles to channel IDs...\n');
  
  const results = [];
  
  for (const handle of CHANNEL_HANDLES) {
    console.log(`🔍 Processing: ${handle} (${HANDLE_TO_NAME[handle]})`);
    const result = await getChannelIdFromHandle(youtubeService, handle);
    results.push(result);
    
    if (result.channelId) {
      console.log(`   ✅ Found: ${result.channelId}`);
      console.log(`   📺 Title: ${result.title}`);
      if (result.customUrl) {
        console.log(`   🔗 URL: ${result.customUrl}`);
      }
    } else {
      console.log(`   ❌ Error: ${result.error}`);
    }
    console.log('');
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n📊 SUMMARY RESULTS:');
  console.log('===================\n');
  
  const successful = results.filter(r => r.channelId);
  const failed = results.filter(r => !r.channelId);
  
  console.log('✅ Successfully resolved:');
  successful.forEach(result => {
    console.log(`   ${result.name}: ${result.channelId}`);
  });
  
  if (failed.length > 0) {
    console.log('\n❌ Failed to resolve:');
    failed.forEach(result => {
      console.log(`   ${result.name} (${result.handle}): ${result.error}`);
    });
  }
  
  // Generate config update
  console.log('\n📝 Updated channel IDs for youtube_channels.json:');
  console.log('=================================================\n');
  
  successful.forEach(result => {
    console.log(`"${result.name}": "${result.channelId}",`);
  });
}

main().catch(error => {
  console.error('💥 Error:', error.message);
  process.exit(1);
});
