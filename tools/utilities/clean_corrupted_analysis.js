#!/usr/bin/env node

/**
 * Clean up corrupted analysis_json entries in ECO files
 * Removes "[object Object]" entries and replaces them with null
 */

const fs = require('fs');
const path = require('path');

const ECO_DATA_PATH = path.join(__dirname, '../../data/eco');

function cleanEcoFile(filename) {
  const filePath = path.join(ECO_DATA_PATH, filename);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filename}`);
    return;
  }
  
  console.log(`🔧 Cleaning ${filename}...`);
  
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const ecoData = JSON.parse(fileContent);
    
    let cleanedCount = 0;
    
    // Clean up corrupted analysis_json entries
    for (const [fen, opening] of Object.entries(ecoData)) {
      if (opening.analysis_json === '[object Object]') {
        opening.analysis_json = null;
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      fs.writeFileSync(filePath, JSON.stringify(ecoData, null, 2));
      console.log(`✅ Cleaned ${cleanedCount} corrupted entries in ${filename}`);
    } else {
      console.log(`✅ No corrupted entries found in ${filename}`);
    }
    
  } catch (error) {
    console.error(`💥 Error cleaning ${filename}:`, error.message);
  }
}

function main() {
  console.log('🧹 Starting ECO data cleanup...');
  
  const ecoFiles = ['ecoA.json', 'ecoB.json', 'ecoC.json', 'ecoD.json', 'ecoE.json'];
  
  for (const filename of ecoFiles) {
    cleanEcoFile(filename);
  }
  
  console.log('✅ ECO data cleanup complete!');
}

if (require.main === module) {
  main();
}

module.exports = { cleanEcoFile };
