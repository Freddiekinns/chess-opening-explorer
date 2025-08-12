#!/usr/bin/env node

/**
 * Fix incorrectly formatted analysis_json fields in ECO files
 * Converts stringified JSON to proper JSON objects
 */

const fs = require('fs');
const path = require('path');

const ECO_DIR = path.join(__dirname, '..', 'api', 'data', 'eco');
const ECO_FILES = ['ecoA.json', 'ecoB.json', 'ecoC.json', 'ecoD.json', 'ecoE.json'];

function fixAnalysisJson(ecoFile) {
  const filePath = path.join(ECO_DIR, ecoFile);
  
  console.log(`\n🔍 Checking ${ecoFile}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return;
  }

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.log(`❌ Error reading file: ${error.message}`);
    return;
  }

  let data;
  try {
    data = JSON.parse(content);
  } catch (error) {
    console.log(`❌ Error parsing JSON: ${error.message}`);
    return;
  }

  let fixedCount = 0;
  let totalEntries = 0;

  // Iterate through all entries in the ECO file
  for (const fen in data) {
    if (data.hasOwnProperty(fen)) {
      totalEntries++;
      const entry = data[fen];
      
      // Check if analysis_json exists and is a string
      if (entry.analysis_json && typeof entry.analysis_json === 'string') {
        try {
          // Parse the stringified JSON
          const parsedAnalysis = JSON.parse(entry.analysis_json);
          
          // Replace with the parsed object
          entry.analysis_json = parsedAnalysis;
          fixedCount++;
          
          console.log(`✅ Fixed entry: ${entry.name || 'Unknown'} (${entry.eco || 'No ECO'})`);
        } catch (parseError) {
          console.log(`❌ Failed to parse analysis_json for ${entry.name || 'Unknown'}: ${parseError.message}`);
        }
      }
    }
  }

  if (fixedCount > 0) {
    try {
      // Write the fixed data back to the file
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      console.log(`✅ Fixed ${fixedCount} entries out of ${totalEntries} total entries in ${ecoFile}`);
    } catch (writeError) {
      console.log(`❌ Error writing file: ${writeError.message}`);
    }
  } else {
    console.log(`✅ No issues found in ${ecoFile} (${totalEntries} entries checked)`);
  }
}

function main() {
  console.log('🔧 Starting analysis_json fix process...');
  
  for (const ecoFile of ECO_FILES) {
    fixAnalysisJson(ecoFile);
  }
  
  console.log('\n🎉 Analysis complete!');
}

if (require.main === module) {
  main();
}

module.exports = { fixAnalysisJson };
