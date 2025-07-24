#!/usr/bin/env node

/**
 * Production Channel-First Video Pipeline Runner
 * 
 * Usage:
 * - npm run videos:channel-first
 * - node tools/production/run-channel-first-pipeline.js
 * - node tools/production/run-channel-first-pipeline.js --eco=A
 * - node tools/production/run-channel-first-pipeline.js --force-rebuild
 */

// Load environment variables from root .env file
require('dotenv').config();

const path = require('path');
const ChannelFirstVideoPipeline = require(path.resolve(__dirname, '../../packages/api/src/services/channel-first-video-pipeline'));

// Parse command line arguments
const args = process.argv.slice(2);
const options = {};

args.forEach(arg => {
  if (arg.startsWith('--eco=')) {
    options.ecoCode = arg.split('=')[1];
  } else if (arg === '--force-rebuild') {
    options.forceRebuild = true;
  } else if (arg === '--dry-run') {
    options.dryRun = true;
  } else if (arg === '--verbose') {
    options.verbose = true;
  }
});

async function main() {
  try {
    console.log('🚀 Channel-First Video Pipeline - Production Run');
    console.log('================================================');
    console.log(`🕐 Started at: ${new Date().toISOString()}`);
    
    if (options.ecoCode) {
      console.log(`🎯 Target ECO: ${options.ecoCode}`);
    }
    
    if (options.forceRebuild) {
      console.log('🔄 Force rebuild enabled');
    }
    
    if (options.dryRun) {
      console.log('🧪 Dry run mode');
    }
    
    // Check environment
    if (!process.env.YOUTUBE_API_KEY) {
      console.error('❌ YOUTUBE_API_KEY environment variable is required');
      process.exit(1);
    }
    
    // Initialize pipeline
    const pipeline = new ChannelFirstVideoPipeline({
      apiKey: process.env.YOUTUBE_API_KEY,
      quotaLimit: 8000, // Conservative limit for production
      maxResults: 3,
      batchSize: 20,
      requestsPerSecond: 1
    });
    
    // Run the pipeline
    const startTime = Date.now();
    const results = await pipeline.processOpenings(options);
    const duration = Date.now() - startTime;
    
    console.log('\n🎉 Pipeline Completed Successfully!');
    console.log('==================================');
    console.log(`⏱️  Total Duration: ${Math.round(duration / 1000)}s`);
    console.log(`📊 Final Results:`);
    console.log(`   - Processed: ${results.processed} openings`);
    console.log(`   - Videos Added: ${results.videosAdded}`);
    console.log(`   - Errors: ${results.errors}`);
    console.log(`   - Success Rate: ${((results.processed / (results.processed + results.errors)) * 100).toFixed(1)}%`);
    
    // Calculate efficiency
    const estimatedQuota = pipeline.metrics.quotaUsed || (results.processed * 50); // Rough estimate
    console.log(`   - Estimated Quota Used: ${estimatedQuota} units`);
    console.log(`   - Quota Efficiency: ${(results.videosAdded / estimatedQuota * 100).toFixed(2)} videos/100 units`);
    
  } catch (error) {
    console.error('\n💥 Pipeline Failed');
    console.error('==================');
    console.error(`❌ Error: ${error.message}`);
    console.error(`📍 Stack: ${error.stack}`);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT. Gracefully shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM. Gracefully shutting down...');
  process.exit(0);
});

// Run the pipeline
main().catch(error => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});
