#!/usr/bin/env node

/**
 * Test video access functionality to debug the issue
 */

const VideoAccessService = require('./packages/api/src/services/video-access-service');

async function testVideoAccess() {
  console.log('🧪 Testing Video Access Service...');
  
  const videoService = new VideoAccessService();
  
  // Test with the exact FEN from the index that has videos
  const testFEN = '1r1qkbnr/pppnpppp/3p4/8/2PP2b1/1Q3N2/PP2PPPP/RNB1KB1R w KQk - 3 5';
  
  console.log(`Testing FEN: ${testFEN}`);
  console.log(`Sanitized: ${videoService.sanitizeFEN(testFEN)}`);
  
  try {
    const videos = await videoService.getVideosForPosition(testFEN);
    console.log(`Found ${videos.length} videos`);
    
    if (videos.length > 0) {
      console.log('First video:', videos[0]);
    } else {
      console.log('❌ No videos found - let me check what keys exist in the index...');
      
      // Let's also check if the index is loaded
      if (videoService.videoIndex) {
        console.log(`✅ Index loaded with ${videoService.videoIndex.totalPositions} positions`);
        
        // Check if our sanitized key exists
        const sanitizedKey = videoService.sanitizeFEN(testFEN);
        const exists = videoService.videoIndex.positions[sanitizedKey];
        console.log(`Key exists in index: ${!!exists}`);
        
        if (exists) {
          console.log(`Position data:`, exists);
        }
      }
    }
    
  } catch (error) {
    console.error('Error testing video access:', error);
  }
}

testVideoAccess();
