#!/usr/bin/env node

/**
 * LLM Enrichment Script
 * Enriches chess opening data with AI-generated analysis
 * Usage: node tools/production/enrich_openings_llm.js --batchSize=25
 */

require('dotenv').config();
const yargs = require('yargs');
const DatabaseService = require('../../packages/api/src/services/database-service');
const LLMService = require('../../packages/api/src/services/llm-service');

class EnrichmentPipeline {
  constructor() {
    this.databaseService = new DatabaseService();
    this.llmService = new LLMService();
  }

  /**
   * Main enrichment process
   * @param {number} batchSize - Number of openings to process
   */
  async run(batchSize = 10) {
    console.log('🚀 Starting LLM Enrichment Pipeline');
    console.log(`📊 Batch size: ${batchSize}`);
    
    try {
      // Get initial statistics
      const initialStats = await this.databaseService.getEnrichmentStats();
      console.log('📈 Initial Statistics:');
      console.log(`   Total openings: ${initialStats.total_openings}`);
      console.log(`   Already enriched: ${initialStats.enriched_openings}`);
      console.log(`   Pending enrichment: ${initialStats.pending_enrichment}`);
      
      if (initialStats.pending_enrichment === 0) {
        console.log('✅ All openings are already enriched!');
        return;
      }

      // Fetch batch of openings to enrich
      console.log(`\n🔍 Fetching batch of ${batchSize} openings...`);
      const openings = await this.databaseService.getOpeningsToEnrich(batchSize);
      
      if (openings.length === 0) {
        console.log('✅ No openings need enrichment');
        return;
      }

      console.log(`📋 Processing ${openings.length} openings:`);
      
      // Process each opening
      let processed = 0;
      let errors = 0;
      
      for (const opening of openings) {
        let retryCount = 0;
        const maxRetries = 3;
        let success = false;
        
        while (retryCount < maxRetries && !success) {
          try {
            if (retryCount > 0) {
              console.log(`\n🔄 Retry ${retryCount}/${maxRetries - 1}: ${opening.name} (${opening.eco})`);
            } else {
              console.log(`\n🔄 Processing: ${opening.name} (${opening.eco})`);
            }
            console.log(`   FEN: ${opening.fen.substring(0, 50)}...`);
            console.log(`   Moves: ${opening.moves || 'N/A'}`);
            
            // Generate enrichment
            const analysis = await this.llmService.generateEnrichment(opening);
            
            // Update the opening
            await this.databaseService.updateOpeningAnalysis(opening.fen, analysis, opening.eco, opening.name);
            
            processed++;
            success = true;
            console.log(`   ✅ Enriched successfully`);
            console.log(`   🎯 Complexity: ${analysis.complexity}`);
            console.log(`   📝 Style tags: ${analysis.style_tags.length}`);
            
            // Brief pause to avoid overwhelming the API
            await new Promise(resolve => setTimeout(resolve, 500));
            
          } catch (error) {
            retryCount++;
            console.error(`   ❌ Error processing ${opening.name}: ${error.message}`);
            
            if (retryCount < maxRetries) {
              console.log(`   🔄 Retrying in 2 seconds...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
              errors++;
              console.error(`   💥 Failed after ${maxRetries} retries`);
              console.error(`   FEN: ${opening.fen}`);
            }
          }
        }
      }

      // Final statistics
      const finalStats = await this.databaseService.getEnrichmentStats();
      console.log('\n📊 Final Statistics:');
      console.log(`   Total openings: ${finalStats.total_openings}`);
      console.log(`   Enriched openings: ${finalStats.enriched_openings}`);
      console.log(`   Pending enrichment: ${finalStats.pending_enrichment}`);
      console.log(`\n🎯 Batch Results:`);
      console.log(`   Processed: ${processed}/${openings.length}`);
      console.log(`   Errors: ${errors}`);
      console.log(`   Success rate: ${((processed / openings.length) * 100).toFixed(1)}%`);
      
      if (finalStats.pending_enrichment > 0) {
        console.log(`\n🔄 Run again to continue enriching remaining ${finalStats.pending_enrichment} openings`);
      } else {
        console.log('\n🎉 All openings have been enriched!');
      }
      
    } catch (error) {
      console.error('💥 Pipeline error:', error.message);
      process.exit(1);
    }
  }
}

// Parse command line arguments
const argv = yargs(process.argv.slice(2))
  .option('batchSize', {
    alias: 'b',
    type: 'number',
    default: 10,
    describe: 'Number of openings to process in this batch'
  })
  .help()
  .alias('help', 'h')
  .argv;

// Validate batch size
if (argv.batchSize < 1 || argv.batchSize > 1000) {
  console.error('❌ Batch size must be between 1 and 1000');
  process.exit(1);
}

// Check for required environment variables
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  console.error('❌ Missing required environment variable: GOOGLE_APPLICATION_CREDENTIALS_JSON');
  console.error('📋 Please set up your .env file with Google Cloud credentials');
  process.exit(1);
}

// Run the pipeline
const pipeline = new EnrichmentPipeline();
pipeline.run(argv.batchSize)
  .then(() => {
    console.log('\n✅ Pipeline completed successfully');
  })
  .catch(error => {
    console.error('\n💥 Pipeline failed:', error.message);
    process.exit(1);
  });
