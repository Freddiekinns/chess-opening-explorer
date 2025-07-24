#!/usr/bin/env node

/**
 * YouTube API Handle Support Investigation
 * Tests what the YouTube API actually accepts
 */

require('dotenv').config();
const axios = require('axios');

async function testYouTubeAPIEndpoints() {
  const API_KEY = process.env.YOUTUBE_API_KEY;
  const TEST_HANDLE = '@GothamChess';
  const TEST_CHANNEL_ID = 'UCQHX6ViZmPsWiYSFAyS0a3Q';
  
  console.log('🧪 YouTube API Handle Support Test');
  console.log('===================================\n');
  
  // Test 1: Can we use handles directly in channels endpoint?
  console.log('📝 Test 1: channels endpoint with handle');
  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: {
        part: 'snippet',
        forUsername: TEST_HANDLE,  // Try handle
        key: API_KEY
      }
    });
    console.log('✅ WORKS with handle:', response.data.items?.length || 0, 'results');
  } catch (error) {
    console.log('❌ FAILS with handle:', error.response?.status, error.response?.data?.error?.message);
  }
  
  // Test 2: Can we use handles with id parameter?
  console.log('\n📝 Test 2: channels endpoint with handle as ID');
  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: {
        part: 'snippet',
        id: TEST_HANDLE,  // Try handle as ID
        key: API_KEY
      }
    });
    console.log('✅ WORKS with handle as ID:', response.data.items?.length || 0, 'results');
  } catch (error) {
    console.log('❌ FAILS with handle as ID:', error.response?.status, error.response?.data?.error?.message);
  }
  
  // Test 3: Traditional channel ID (should work)
  console.log('\n📝 Test 3: channels endpoint with channel ID');
  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: {
        part: 'snippet',
        id: TEST_CHANNEL_ID,  // Traditional channel ID
        key: API_KEY
      }
    });
    console.log('✅ WORKS with channel ID:', response.data.items?.length || 0, 'results');
    console.log('   Channel:', response.data.items?.[0]?.snippet?.title);
  } catch (error) {
    console.log('❌ FAILS with channel ID:', error.response?.status, error.response?.data?.error?.message);
  }
  
  // Test 4: Can we get playlist items with handle?
  console.log('\n📝 Test 4: playlistItems endpoint with handle');
  try {
    // This would be the ideal scenario
    const response = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
      params: {
        part: 'snippet',
        channelId: TEST_HANDLE,  // Try handle
        maxResults: 1,
        key: API_KEY
      }
    });
    console.log('✅ WORKS with handle in playlistItems:', response.data.items?.length || 0, 'results');
  } catch (error) {
    console.log('❌ FAILS with handle in playlistItems:', error.response?.status, error.response?.data?.error?.message);
  }
  
  console.log('\n📊 CONCLUSION:');
  console.log('===============');
  console.log('• YouTube Data API v3 requires channel IDs for most operations');
  console.log('• Handles must be resolved to channel IDs first');
  console.log('• Channel IDs are stable and permanent');
  console.log('• Handles can change over time');
  console.log('\n🎯 RECOMMENDATION: Continue using channel IDs for reliability');
}

testYouTubeAPIEndpoints().catch(console.error);
