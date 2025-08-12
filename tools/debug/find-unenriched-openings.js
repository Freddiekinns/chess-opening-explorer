#!/usr/bin/env node

/**
 * Find Unenriched Openings Script
 * Analyzes all ECO files to find openings missing or with empty analysis_json
 * Usage: node tools/debug/find-unenriched-openings.js
 */

const fs = require('fs');
const path = require('path');

class UnenrichedFinder {
  constructor() {
    this.ecoDataPath = path.join(__dirname, '../../api/data/eco');
    this.ecoFiles = ['ecoA.json', 'ecoB.json', 'ecoC.json', 'ecoD.json', 'ecoE.json'];
  }

  /**
   * Check if analysis_json is missing or empty
   * @param {Object} opening - The opening object
   * @returns {boolean} - True if needs enrichment
   */
  needsEnrichment(opening) {
    // No analysis_json field
    if (!opening.hasOwnProperty('analysis_json')) {
      return true;
    }
    
    // analysis_json is null or undefined
    if (opening.analysis_json == null) {
      return true;
    }
    
    // analysis_json is an empty object
    if (typeof opening.analysis_json === 'object' && Object.keys(opening.analysis_json).length === 0) {
      return true;
    }
    
    // analysis_json is an empty string
    if (typeof opening.analysis_json === 'string' && opening.analysis_json.trim() === '') {
      return true;
    }
    
    return false;
  }

  /**
   * Analyze all ECO files and find unenriched openings
   */
  async findUnenriched() {
    console.log('🔍 Analyzing ECO files for unenriched openings...');
    console.log(`📁 ECO data path: ${this.ecoDataPath}`);
    
    const results = {
      totalOpenings: 0,
      unenrichedOpenings: [],
      fileStats: {},
      enrichmentTypes: {
        missing: 0,
        null: 0,
        emptyObject: 0,
        emptyString: 0
      }
    };

    for (const filename of this.ecoFiles) {
      const filePath = path.join(this.ecoDataPath, filename);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${filename}`);
        continue;
      }

      console.log(`\n📄 Analyzing ${filename}...`);
      
      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const ecoData = JSON.parse(fileContent);
        
        const fileOpenings = Object.keys(ecoData);
        const fileUnenriched = [];
        
        for (const fen of fileOpenings) {
          const opening = ecoData[fen];
          results.totalOpenings++;
          
          if (this.needsEnrichment(opening)) {
            // Determine the type of missing enrichment
            let enrichmentType = 'unknown';
            if (!opening.hasOwnProperty('analysis_json')) {
              enrichmentType = 'missing';
              results.enrichmentTypes.missing++;
            } else if (opening.analysis_json == null) {
              enrichmentType = 'null';
              results.enrichmentTypes.null++;
            } else if (typeof opening.analysis_json === 'object' && Object.keys(opening.analysis_json).length === 0) {
              enrichmentType = 'emptyObject';
              results.enrichmentTypes.emptyObject++;
            } else if (typeof opening.analysis_json === 'string' && opening.analysis_json.trim() === '') {
              enrichmentType = 'emptyString';
              results.enrichmentTypes.emptyString++;
            }
            
            const unenrichedOpening = {
              file: filename,
              fen: fen,
              eco: opening.eco,
              name: opening.name,
              moves: opening.moves || 'N/A',
              enrichmentType: enrichmentType,
              analysis_json_value: opening.analysis_json
            };
            
            fileUnenriched.push(unenrichedOpening);
            results.unenrichedOpenings.push(unenrichedOpening);
          }
        }
        
        results.fileStats[filename] = {
          total: fileOpenings.length,
          unenriched: fileUnenriched.length,
          enriched: fileOpenings.length - fileUnenriched.length
        };
        
        console.log(`   Total openings: ${fileOpenings.length}`);
        console.log(`   Unenriched: ${fileUnenriched.length}`);
        console.log(`   Enriched: ${fileOpenings.length - fileUnenriched.length}`);
        
      } catch (error) {
        console.error(`❌ Error processing ${filename}: ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Display detailed results
   */
  displayResults(results) {
    console.log('\n📊 SUMMARY REPORT');
    console.log('=' .repeat(50));
    
    console.log(`\n🎯 Overall Statistics:`);
    console.log(`   Total openings: ${results.totalOpenings}`);
    console.log(`   Unenriched openings: ${results.unenrichedOpenings.length}`);
    console.log(`   Enriched openings: ${results.totalOpenings - results.unenrichedOpenings.length}`);
    console.log(`   Enrichment rate: ${((results.totalOpenings - results.unenrichedOpenings.length) / results.totalOpenings * 100).toFixed(1)}%`);
    
    console.log(`\n📂 Per-file Statistics:`);
    for (const [filename, stats] of Object.entries(results.fileStats)) {
      const enrichmentRate = ((stats.enriched / stats.total) * 100).toFixed(1);
      console.log(`   ${filename}: ${stats.enriched}/${stats.total} enriched (${enrichmentRate}%)`);
    }
    
    console.log(`\n🔍 Enrichment Issue Types:`);
    console.log(`   Missing field: ${results.enrichmentTypes.missing}`);
    console.log(`   Null value: ${results.enrichmentTypes.null}`);
    console.log(`   Empty object: ${results.enrichmentTypes.emptyObject}`);
    console.log(`   Empty string: ${results.enrichmentTypes.emptyString}`);
    
    if (results.unenrichedOpenings.length > 0) {
      console.log(`\n📋 First 10 Unenriched Openings:`);
      const sampleOpenings = results.unenrichedOpenings.slice(0, 10);
      
      for (const opening of sampleOpenings) {
        console.log(`\n   📄 ${opening.file}`);
        console.log(`      ECO: ${opening.eco}`);
        console.log(`      Name: ${opening.name}`);
        console.log(`      FEN: ${opening.fen.substring(0, 50)}...`);
        console.log(`      Moves: ${opening.moves.substring(0, 30)}${opening.moves.length > 30 ? '...' : ''}`);
        console.log(`      Issue: ${opening.enrichmentType}`);
        console.log(`      Value: ${JSON.stringify(opening.analysis_json_value)}`);
      }
      
      if (results.unenrichedOpenings.length > 10) {
        console.log(`\n   ... and ${results.unenrichedOpenings.length - 10} more unenriched openings`);
      }
    }
    
    // Export detailed list to file
    if (results.unenrichedOpenings.length > 0) {
      const outputFile = path.join(__dirname, 'unenriched-openings-report.json');
      fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
      console.log(`\n💾 Detailed report saved to: ${outputFile}`);
    }
  }
}

// Run the analysis
const finder = new UnenrichedFinder();
finder.findUnenriched()
  .then(results => {
    finder.displayResults(results);
    
    if (results.unenrichedOpenings.length === 0) {
      console.log('\n🎉 All openings are properly enriched!');
    } else {
      console.log(`\n⚠️  Found ${results.unenrichedOpenings.length} openings that need enrichment`);
      console.log('💡 Run the LLM enrichment script to process these openings');
    }
  })
  .catch(error => {
    console.error('💥 Analysis failed:', error.message);
    process.exit(1);
  });
