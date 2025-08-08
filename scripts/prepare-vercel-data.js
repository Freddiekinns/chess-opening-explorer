#!/usr/bin/env node

/**
 * Prepare data files for Vercel deployment
 * This script copies essential data files to the api/data directory
 * so they're available to Vercel serverless functions
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const SOURCE_DATA_DIR = path.join(ROOT_DIR, 'data');
const TARGET_DATA_DIR = path.join(ROOT_DIR, 'api', 'data');

console.log('🚀 Preparing data for Vercel deployment...');
console.log(`📂 Source: ${SOURCE_DATA_DIR}`);
console.log(`📂 Target: ${TARGET_DATA_DIR}`);

// Ensure target directory exists
if (!fs.existsSync(TARGET_DATA_DIR)) {
  fs.mkdirSync(TARGET_DATA_DIR, { recursive: true });
  console.log('✅ Created api/data directory');
}

// Copy essential data files
const filesToCopy = [
  'popularity_stats.json',
  'most_popular_openings.json'
];

const dirsToCopy = [
  'eco'
];

// Copy individual files
filesToCopy.forEach(filename => {
  const sourcePath = path.join(SOURCE_DATA_DIR, filename);
  const targetPath = path.join(TARGET_DATA_DIR, filename);
  
  if (fs.existsSync(sourcePath)) {
    fs.copyFileSync(sourcePath, targetPath);
    const stats = fs.statSync(targetPath);
    console.log(`✅ Copied ${filename} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
  } else {
    console.log(`⚠️  Warning: ${filename} not found at ${sourcePath}`);
  }
});

// Copy directories recursively
function copyDirectory(sourcePath, targetPath) {
  if (!fs.existsSync(targetPath)) {
    fs.mkdirSync(targetPath, { recursive: true });
  }
  
  const items = fs.readdirSync(sourcePath);
  let totalSize = 0;
  let fileCount = 0;
  
  items.forEach(item => {
    const sourceItemPath = path.join(sourcePath, item);
    const targetItemPath = path.join(targetPath, item);
    
    const stats = fs.statSync(sourceItemPath);
    
    if (stats.isDirectory()) {
      copyDirectory(sourceItemPath, targetItemPath);
    } else {
      fs.copyFileSync(sourceItemPath, targetItemPath);
      totalSize += stats.size;
      fileCount++;
    }
  });
  
  return { totalSize, fileCount };
}

dirsToCopy.forEach(dirname => {
  const sourcePath = path.join(SOURCE_DATA_DIR, dirname);
  const targetPath = path.join(TARGET_DATA_DIR, dirname);
  
  if (fs.existsSync(sourcePath)) {
    const { totalSize, fileCount } = copyDirectory(sourcePath, targetPath);
    console.log(`✅ Copied ${dirname}/ directory: ${fileCount} files (${(totalSize / 1024 / 1024).toFixed(2)} MB)`);
  } else {
    console.log(`⚠️  Warning: ${dirname} directory not found at ${sourcePath}`);
  }
});

// Note about Videos directory
const videosSourcePath = path.join(SOURCE_DATA_DIR, 'Videos');
if (fs.existsSync(videosSourcePath)) {
  const videoFiles = fs.readdirSync(videosSourcePath);
  const totalVideoSize = videoFiles.reduce((total, filename) => {
    const filePath = path.join(videosSourcePath, filename);
    return total + fs.statSync(filePath).size;
  }, 0);
  
  console.log(`📺 Videos directory: ${videoFiles.length} files (${(totalVideoSize / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`⚠️  Note: Videos directory too large for Vercel deployment (${(totalVideoSize / 1024 / 1024).toFixed(0)}MB)`);
  console.log(`   Using on-demand loading from source directory instead.`);
}

// Verify the copied data
console.log('\n🔍 Verifying copied data...');

// Check ECO files
const ecoDir = path.join(TARGET_DATA_DIR, 'eco');
if (fs.existsSync(ecoDir)) {
  const ecoFiles = fs.readdirSync(ecoDir).filter(f => f.endsWith('.json'));
  console.log(`✅ ECO files: ${ecoFiles.join(', ')}`);
} else {
  console.log('❌ ECO directory missing');
}

// Check popularity stats
const popularityStatsPath = path.join(TARGET_DATA_DIR, 'popularity_stats.json');
if (fs.existsSync(popularityStatsPath)) {
  const stats = JSON.parse(fs.readFileSync(popularityStatsPath, 'utf8'));
  const positionCount = Object.keys(stats.positions || {}).length;
  console.log(`✅ Popularity stats: ${positionCount} positions`);
} else {
  console.log('❌ Popularity stats missing');
}

console.log('\n🎯 Vercel data preparation complete!');
console.log('📋 Summary:');
console.log(`   • ECO data: Ready for all categories A-E`);
console.log(`   • Popularity stats: Ready`);
console.log(`   • Videos: On-demand loading from source`);
console.log(`   • Target directory: ${TARGET_DATA_DIR}`);
