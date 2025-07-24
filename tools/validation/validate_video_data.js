#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const glob = require('glob');

/**
 * YouTube Video Data Validation Script
 * 
 * This script validates the integrity and quality of YouTube video data
 * that has been integrated into chess opening analysis.
 */

/**
 * Validate a single video object
 */
function validateVideo(video, index) {
  const errors = [];
  
  // Required fields
  if (!video.title) errors.push(`Video ${index}: Missing title`);
  if (!video.url) errors.push(`Video ${index}: Missing URL`);
  if (!video.channel) errors.push(`Video ${index}: Missing channel`);
  if (!video.channel_id) errors.push(`Video ${index}: Missing channel_id`);
  
  // URL validation
  if (video.url && !video.url.includes('youtube.com/watch?v=')) {
    errors.push(`Video ${index}: Invalid YouTube URL format`);
  }
  
  // Relevance score validation
  if (video.relevance_score && (video.relevance_score < 0 || video.relevance_score > 1)) {
    errors.push(`Video ${index}: Relevance score must be between 0 and 1`);
  }
  
  // View count validation
  if (video.view_count && video.view_count < 0) {
    errors.push(`Video ${index}: View count cannot be negative`);
  }
  
  return errors;
}

/**
 * Validate videos in an analysis object
 */
function validateAnalysis(analysis, openingName) {
  const errors = [];
  
  if (!analysis.videos || !Array.isArray(analysis.videos)) {
    return [`${openingName}: Missing or invalid videos array`];
  }
  
  analysis.videos.forEach((video, index) => {
    const videoErrors = validateVideo(video, index);
    errors.push(...videoErrors.map(err => `${openingName}: ${err}`));
  });
  
  // Check for timestamp
  if (!analysis.video_last_updated) {
    errors.push(`${openingName}: Missing video_last_updated timestamp`);
  }
  
  return errors;
}

/**
 * Validate all ECO files
 */
async function validateAllEcoFiles() {
  const ecoDir = path.join(process.cwd(), 'data', 'eco');
  const ecoFiles = await fs.readdir(ecoDir);
  
  const results = {
    totalOpenings: 0,
    openingsWithVideos: 0,
    totalVideos: 0,
    errors: [],
    warnings: []
  };
  
  console.log('🔍 Validating video data in ECO files...');
  
  for (const file of ecoFiles) {
    if (!file.endsWith('.json')) continue;
    
    const filePath = path.join(ecoDir, file);
    const data = JSON.parse(await fs.readFile(filePath, 'utf8'));
    
    console.log(`📄 Validating ${file}...`);
    
    for (const opening of data.openings) {
      results.totalOpenings++;
      
      if (opening.analysis_json) {
        try {
          const analysis = JSON.parse(opening.analysis_json);
          
          if (analysis.videos && analysis.videos.length > 0) {
            results.openingsWithVideos++;
            results.totalVideos += analysis.videos.length;
            
            // Validate videos
            const errors = validateAnalysis(analysis, opening.name);
            results.errors.push(...errors);
            
            // Check for duplicate videos
            const videoUrls = analysis.videos.map(v => v.url);
            const uniqueUrls = new Set(videoUrls);
            if (videoUrls.length !== uniqueUrls.size) {
              results.warnings.push(`${opening.name}: Duplicate video URLs found`);
            }
          }
        } catch (error) {
          results.errors.push(`${opening.name}: Invalid JSON in analysis_json`);
        }
      }
    }
  }
  
  return results;
}

/**
 * Generate validation report
 */
function generateReport(results) {
  console.log('\n📊 Validation Report');
  console.log('============================');
  console.log(`Total Openings: ${results.totalOpenings}`);
  console.log(`Openings with Videos: ${results.openingsWithVideos}`);
  console.log(`Total Videos: ${results.totalVideos}`);
  
  const coverage = (results.openingsWithVideos / results.totalOpenings * 100).toFixed(1);
  console.log(`Coverage: ${coverage}%`);
  
  const avgVideosPerOpening = (results.totalVideos / results.openingsWithVideos).toFixed(1);
  console.log(`Average Videos per Opening: ${avgVideosPerOpening}`);
  
  if (results.errors.length > 0) {
    console.log(`\n❌ Errors Found: ${results.errors.length}`);
    results.errors.slice(0, 10).forEach(error => {
      console.log(`   • ${error}`);
    });
    
    if (results.errors.length > 10) {
      console.log(`   ... and ${results.errors.length - 10} more errors`);
    }
  }
  
  if (results.warnings.length > 0) {
    console.log(`\n⚠️  Warnings: ${results.warnings.length}`);
    results.warnings.slice(0, 5).forEach(warning => {
      console.log(`   • ${warning}`);
    });
    
    if (results.warnings.length > 5) {
      console.log(`   ... and ${results.warnings.length - 5} more warnings`);
    }
  }
  
  if (results.errors.length === 0 && results.warnings.length === 0) {
    console.log('\n✅ All video data is valid!');
  }
}

/**
 * Main validation function
 */
async function main() {
  try {
    console.log('🚀 YouTube Video Data Validation');
    console.log('=================================');
    
    const results = await validateAllEcoFiles();
    generateReport(results);
    
    if (results.errors.length > 0) {
      console.log('\n💥 Validation failed with errors');
      process.exit(1);
    } else {
      console.log('\n✅ Validation completed successfully');
    }
    
  } catch (error) {
    console.error('💥 Validation failed:', error.message);
    process.exit(1);
  }
}

// Run the script if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = {
  validateVideo,
  validateAnalysis,
  validateAllEcoFiles,
  generateReport,
  main
};
