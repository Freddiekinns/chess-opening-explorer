#!/usr/bin/env node

/**
 * Validate analysis_json structure in ECO files
 * Ensures all analysis_json fields are proper JSON objects, not strings
 */

const fs = require('fs');
const path = require('path');

const ECO_DIR = path.join(__dirname, '..', 'api', 'data', 'eco');
const ECO_FILES = ['ecoA.json', 'ecoB.json', 'ecoC.json', 'ecoD.json', 'ecoE.json'];

function validateAnalysisJson(ecoFile) {
  const filePath = path.join(ECO_DIR, ecoFile);
  
  console.log(`\n🔍 Validating ${ecoFile}...`);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ File not found: ${filePath}`);
    return false;
  }

  let content;
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.log(`❌ Error reading file: ${error.message}`);
    return false;
  }

  let data;
  try {
    data = JSON.parse(content);
  } catch (error) {
    console.log(`❌ Error parsing JSON: ${error.message}`);
    return false;
  }

  let totalEntries = 0;
  let validAnalysisEntries = 0;
  let invalidAnalysisEntries = 0;
  let missingAnalysisEntries = 0;

  // Iterate through all entries in the ECO file
  for (const fen in data) {
    if (data.hasOwnProperty(fen)) {
      totalEntries++;
      const entry = data[fen];
      
      if (!entry.analysis_json) {
        missingAnalysisEntries++;
      } else if (typeof entry.analysis_json === 'string') {
        console.log(`❌ Invalid: ${entry.name || 'Unknown'} (${entry.eco || 'No ECO'}) - analysis_json is a string`);
        invalidAnalysisEntries++;
      } else if (typeof entry.analysis_json === 'object') {
        // Validate expected structure
        const analysis = entry.analysis_json;
        const requiredFields = ['style_tags', 'tactical_tags', 'positional_tags', 'common_plans'];
        const missingFields = requiredFields.filter(field => !analysis[field]);
        
        if (missingFields.length > 0) {
          console.log(`⚠️  Incomplete: ${entry.name || 'Unknown'} (${entry.eco || 'No ECO'}) - missing: ${missingFields.join(', ')}`);
        }
        
        validAnalysisEntries++;
      } else {
        console.log(`❌ Invalid: ${entry.name || 'Unknown'} (${entry.eco || 'No ECO'}) - analysis_json is ${typeof entry.analysis_json}`);
        invalidAnalysisEntries++;
      }
    }
  }

  const isValid = invalidAnalysisEntries === 0;
  
  console.log(`📊 Summary for ${ecoFile}:`);
  console.log(`   Total entries: ${totalEntries}`);
  console.log(`   Valid analysis_json: ${validAnalysisEntries}`);
  console.log(`   Invalid analysis_json: ${invalidAnalysisEntries}`);
  console.log(`   Missing analysis_json: ${missingAnalysisEntries}`);
  console.log(`   Status: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
  
  return isValid;
}

function main() {
  console.log('🔧 Starting analysis_json validation...');
  
  let allValid = true;
  
  for (const ecoFile of ECO_FILES) {
    const isValid = validateAnalysisJson(ecoFile);
    allValid = allValid && isValid;
  }
  
  console.log(`\n🎉 Validation complete! Overall status: ${allValid ? '✅ ALL VALID' : '❌ ISSUES FOUND'}`);
  return allValid;
}

if (require.main === module) {
  const success = main();
  process.exit(success ? 0 : 1);
}

module.exports = { validateAnalysisJson };
