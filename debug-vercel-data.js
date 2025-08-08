#!/usr/bin/env node

/**
 * Debug script to check what data files are available in different environments
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Vercel Data Debug Script');
console.log('==========================================');

// Environment info
console.log('\n📱 Environment Information:');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`VERCEL: ${process.env.VERCEL}`);
console.log(`Current Working Directory: ${process.cwd()}`);
console.log(`__dirname: ${__dirname}`);

// Check data directories
const possibleDataPaths = [
  path.join(process.cwd(), 'data'),
  path.join(process.cwd(), 'api', 'data'),
  path.join(__dirname, 'data'),
  path.join(__dirname, '..', 'data'),
];

console.log('\n📁 Data Directory Checks:');
possibleDataPaths.forEach(dataPath => {
  const exists = fs.existsSync(dataPath);
  console.log(`${exists ? '✅' : '❌'} ${dataPath}`);
  
  if (exists) {
    try {
      const contents = fs.readdirSync(dataPath);
      console.log(`   Contents: ${contents.join(', ')}`);
      
      // Check ECO subdirectory
      const ecoPath = path.join(dataPath, 'eco');
      if (fs.existsSync(ecoPath)) {
        const ecoContents = fs.readdirSync(ecoPath);
        console.log(`   ECO files: ${ecoContents.join(', ')}`);
      }
      
      // Check Videos subdirectory
      const videosPath = path.join(dataPath, 'Videos');
      if (fs.existsSync(videosPath)) {
        const videoContents = fs.readdirSync(videosPath);
        console.log(`   Videos count: ${videoContents.length} files`);
      }
    } catch (error) {
      console.log(`   Error reading directory: ${error.message}`);
    }
  }
});

// Test PathResolver
console.log('\n🛠️ PathResolver Test:');
try {
  const pathResolver = require('./packages/api/src/utils/path-resolver');
  console.log(`ECO Data Path: ${pathResolver.getECODataPath()}`);
  console.log(`Videos Data Path: ${pathResolver.getVideosDataPath()}`);
  console.log(`Popularity Stats Path: ${pathResolver.getPopularityStatsPath()}`);
  
  // Check if these paths exist
  console.log(`ECO Path exists: ${pathResolver.exists(pathResolver.getECODataPath())}`);
  console.log(`Videos Path exists: ${pathResolver.exists(pathResolver.getVideosDataPath())}`);
  console.log(`Popularity Stats exists: ${pathResolver.exists(pathResolver.getPopularityStatsPath())}`);
} catch (error) {
  console.log(`Error loading PathResolver: ${error.message}`);
}

// Test ECOService
console.log('\n🔧 ECOService Test:');
try {
  const ECOService = require('./packages/api/src/services/eco-service');
  const ecoService = new ECOService();
  const allOpenings = ecoService.getAllOpenings();
  console.log(`Total openings loaded: ${allOpenings.length}`);
  
  if (allOpenings.length > 0) {
    console.log(`Sample opening: ${allOpenings[0].name} (${allOpenings[0].eco})`);
  }
} catch (error) {
  console.log(`Error testing ECOService: ${error.message}`);
}

console.log('\n==========================================');
console.log('🏁 Debug Complete');
