#!/usr/bin/env node

/**
 * LLM Enrichment Script
 * Enriches chess opening data with AI-generated analysis
 * Usage: node tools/production/enrich_openings_llm.js --batchSize=25
 */

require('dotenv').config();
const yargs = require('yargs');
const fs = require('fs');
const path = require('path');
const DatabaseService = require('../../packages/api/src/services/database-service');
const LLMService = require('../../packages/api/src/services/llm-service');

class Logger {
  constructor(options = {}) {
    this.verbose = options.verbose || false;
    this.quiet = options.quiet || false;
    this.logFile = options.logFile || null;
    
    if (this.logFile) {
      // Clear or create log file
      fs.writeFileSync(this.logFile, '', 'utf8');
    }
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    
    // Write to file if configured
    if (this.logFile) {
      fs.appendFileSync(this.logFile, logMessage + '\n', 'utf8');
    }
    
    // Console output based on verbosity
    if (this.quiet && level !== 'error') {
      return;
    }
    
    if (level === 'error') {
      console.error(message);
    } else if (level === 'verbose' && this.verbose) {
      console.log(message);
    } else if (level === 'info') {
      console.log(message);
    }
  }

  info(message) {
    this.log(message, 'info');
  }

  verbose(message) {
    this.log(message, 'verbose');
  }

  error(message) {
    this.log(message, 'error');
  }
}

class StateManager {
  constructor(stateFile) {
    this.stateFile = stateFile;
    this.state = this.load();
  }

  load() {
    if (!this.stateFile || !fs.existsSync(this.stateFile)) {
      return {
        enrichedFens: [],
        lastRun: null,
        totalEnriched: 0
      };
    }

    try {
      const data = fs.readFileSync(this.stateFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.warn(`Warning: Could not load state file: ${error.message}`);
      return {
        enrichedFens: [],
        lastRun: null,
        totalEnriched: 0
      };
    }
  }

  save() {
    if (!this.stateFile) return;

    try {
      this.state.lastRun = new Date().toISOString();
      fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2), 'utf8');
    } catch (error) {
      console.error(`Error saving state: ${error.message}`);
    }
  }

  isEnriched(fen) {
    return this.state.enrichedFens.includes(fen);
  }

  markEnriched(fen) {
    if (!this.state.enrichedFens.includes(fen)) {
      this.state.enrichedFens.push(fen);
      this.state.totalEnriched++;
    }
  }
}

class ErrorTracker {
  constructor(errorFile = 'enrich-errors.json') {
    this.errorFile = path.join(__dirname, errorFile);
    this.errors = [];
  }

  addError(opening, error) {
    this.errors.push({
      fen: opening.fen,
      eco: opening.eco,
      name: opening.name,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }

  save() {
    if (this.errors.length === 0) return;

    try {
      fs.writeFileSync(this.errorFile, JSON.stringify(this.errors, null, 2), 'utf8');
    } catch (error) {
      console.error(`Error saving error log: ${error.message}`);
    }
  }
}

class EnrichmentPipeline {
  constructor(options = {}) {
    this.databaseService = new DatabaseService();
    this.llmService = new LLMService();
    this.logger = new Logger(options);
    this.stateManager = options.stateFile ? new StateManager(options.stateFile) : null;
    this.errorTracker = new ErrorTracker();
    this.options = options;
  }

  /**
   * Validate API key works before starting
   */
  async validateApiKey() {
    this.logger.verbose('Validating API key...');
    
    try {
      // Try a simple test - get stats (doesn't call LLM but validates service setup)
      await this.databaseService.getEnrichmentStats();
      this.logger.verbose('API configuration validated');
      return true;
    } catch (error) {
      this.logger.error(`API validation failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Filter openings based on options
   */
  filterOpenings(openings) {
    let filtered = openings;

    // Filter by ECO code
    if (this.options.ecoCode) {
      const ecoFilter = this.options.ecoCode.toUpperCase();
      filtered = filtered.filter(opening => 
        opening.eco && opening.eco.startsWith(ecoFilter)
      );
      this.logger.verbose(`Filtered to ECO code ${ecoFilter}: ${filtered.length} openings`);
    }

    // Exclude ECO codes
    if (this.options.excludeEco) {
      const excludeList = this.options.excludeEco.split(',').map(e => e.trim().toUpperCase());
      filtered = filtered.filter(opening => 
        !excludeList.some(exclude => opening.eco && opening.eco.startsWith(exclude))
      );
      this.logger.verbose(`Excluded ECO codes ${excludeList.join(', ')}: ${filtered.length} openings remaining`);
    }

    // Filter out already enriched (from state)
    if (this.stateManager && this.options.resume) {
      const beforeCount = filtered.length;
      filtered = filtered.filter(opening => !this.stateManager.isEnriched(opening.fen));
      const skipped = beforeCount - filtered.length;
      if (skipped > 0) {
        this.logger.info(`Skipped ${skipped} already enriched openings from previous run`);
      }
    }

    // Apply limit
    if (this.options.limit && filtered.length > this.options.limit) {
      filtered = filtered.slice(0, this.options.limit);
      this.logger.verbose(`Limited to ${this.options.limit} openings`);
    }

    return filtered;
  }

  /**
   * Main enrichment process
   * @param {number} batchSize - Number of openings to process
   */
  async run(batchSize = 10) {
    this.logger.info('🚀 Starting LLM Enrichment Pipeline');
    this.logger.info(`📊 Batch size: ${batchSize}`);
    
    if (this.options.dryRun) {
      this.logger.info('🔍 DRY RUN MODE - No changes will be made');
    }
    
    try {
      // Get initial statistics
      const initialStats = await this.databaseService.getEnrichmentStats();
      this.logger.info('📈 Initial Statistics:');
      this.logger.info(`   Total openings: ${initialStats.total_openings}`);
      this.logger.info(`   Already enriched: ${initialStats.enriched_openings}`);
      this.logger.info(`   Pending enrichment: ${initialStats.pending_enrichment}`);
      
      if (this.stateManager && this.options.resume) {
        this.logger.info(`   Previously enriched (this run): ${this.stateManager.state.totalEnriched}`);
      }
      
      if (initialStats.pending_enrichment === 0) {
        this.logger.info('✅ All openings are already enriched!');
        return;
      }

      // Fetch batch of openings to enrich
      this.logger.info(`\n🔍 Fetching batch of ${batchSize} openings...`);
      let openings = await this.databaseService.getOpeningsToEnrich(batchSize);
      
      // Apply filters
      openings = this.filterOpenings(openings);
      
      if (openings.length === 0) {
        this.logger.info('✅ No openings need enrichment (after applying filters)');
        return;
      }

      this.logger.info(`📋 Will process ${openings.length} openings:`);
      
      // Dry run - just show what would be processed
      if (this.options.dryRun) {
        this.logger.info('\n📝 Openings that would be enriched:');
        openings.slice(0, 10).forEach((opening, idx) => {
          this.logger.info(`   ${idx + 1}. ${opening.name} (${opening.eco}) - ${opening.fen.substring(0, 40)}...`);
        });
        if (openings.length > 10) {
          this.logger.info(`   ... and ${openings.length - 10} more`);
        }
        this.logger.info('\n✅ Dry run complete. Use without --dryRun to process these openings.');
        return;
      }
      
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
              this.logger.info(`\n🔄 Retry ${retryCount}/${maxRetries - 1}: ${opening.name} (${opening.eco})`);
            } else {
              this.logger.info(`\n🔄 Processing: ${opening.name} (${opening.eco})`);
            }
            this.logger.verbose(`   FEN: ${opening.fen.substring(0, 50)}...`);
            this.logger.verbose(`   Moves: ${opening.moves || 'N/A'}`);
            
            // Generate enrichment
            const analysis = await this.llmService.generateEnrichment(opening);
            
            // Update the opening
            await this.databaseService.updateOpeningAnalysis(opening.fen, analysis, opening.eco, opening.name);
            
            // Mark as enriched in state
            if (this.stateManager) {
              this.stateManager.markEnriched(opening.fen);
              this.stateManager.save();
            }
            
            processed++;
            success = true;
            this.logger.info(`   ✅ Enriched successfully`);
            this.logger.verbose(`   🎯 Complexity: ${analysis.complexity}`);
            this.logger.verbose(`   📝 Style tags: ${analysis.style_tags.length}`);
            
            // Brief pause to avoid overwhelming the API
            await new Promise(resolve => setTimeout(resolve, 500));
            
          } catch (error) {
            retryCount++;
            this.logger.error(`   ❌ Error processing ${opening.name}: ${error.message}`);
            
            if (retryCount < maxRetries) {
              this.logger.info(`   🔄 Retrying in 2 seconds...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
              errors++;
              this.errorTracker.addError(opening, error);
              this.logger.error(`   💥 Failed after ${maxRetries} retries`);
              this.logger.verbose(`   FEN: ${opening.fen}`);
            }
          }
        }
      }

      // Save error log
      this.errorTracker.save();

      // Final statistics
      const finalStats = await this.databaseService.getEnrichmentStats();
      this.logger.info('\n📊 Final Statistics:');
      this.logger.info(`   Total openings: ${finalStats.total_openings}`);
      this.logger.info(`   Enriched openings: ${finalStats.enriched_openings}`);
      this.logger.info(`   Pending enrichment: ${finalStats.pending_enrichment}`);
      this.logger.info(`\n🎯 Batch Results:`);
      this.logger.info(`   Processed: ${processed}/${openings.length}`);
      this.logger.info(`   Errors: ${errors}`);
      this.logger.info(`   Success rate: ${((processed / openings.length) * 100).toFixed(1)}%`);
      
      if (errors > 0) {
        this.logger.info(`\n⚠️  Error details saved to: ${this.errorTracker.errorFile}`);
      }
      
      if (finalStats.pending_enrichment > 0) {
        this.logger.info(`\n🔄 Run again to continue enriching remaining ${finalStats.pending_enrichment} openings`);
      } else {
        this.logger.info('\n🎉 All openings have been enriched!');
      }
      
    } catch (error) {
      this.logger.error('💥 Pipeline error: ' + error.message);
      this.logger.verbose(error.stack);
      process.exit(1);
    }
  }
}

// Load configuration file if it exists
function loadConfig(configPath) {
  const defaultConfigPath = path.join(__dirname, '.enrichrc.json');
  const configFile = configPath || (fs.existsSync(defaultConfigPath) ? defaultConfigPath : null);
  
  if (configFile && fs.existsSync(configFile)) {
    try {
      const data = fs.readFileSync(configFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.warn(`Warning: Could not load config file: ${error.message}`);
    }
  }
  
  return {};
}

// Parse command line arguments
const argv = yargs(process.argv.slice(2))
  .option('config', {
    alias: 'c',
    type: 'string',
    describe: 'Path to configuration file'
  })
  .option('batchSize', {
    alias: 'b',
    type: 'number',
    describe: 'Number of openings to process in this batch'
  })
  .option('ecoCode', {
    alias: 'e',
    type: 'string',
    describe: 'Filter by ECO code (e.g., A00, B, C50)'
  })
  .option('excludeEco', {
    type: 'string',
    describe: 'Exclude ECO codes (comma-separated)'
  })
  .option('limit', {
    alias: 'l',
    type: 'number',
    describe: 'Maximum total enrichments to perform'
  })
  .option('dryRun', {
    type: 'boolean',
    default: false,
    describe: 'Preview without making changes'
  })
  .option('resume', {
    type: 'boolean',
    default: false,
    describe: 'Resume from previous run using state file'
  })
  .option('stateFile', {
    type: 'string',
    describe: 'Path to state file for resume capability'
  })
  .option('logFile', {
    type: 'string',
    describe: 'Path to log file'
  })
  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    default: false,
    describe: 'Enable verbose output'
  })
  .option('quiet', {
    alias: 'q',
    type: 'boolean',
    default: false,
    describe: 'Minimal output (errors only)'
  })
  .help()
  .alias('help', 'h')
  .argv;

// Load config file
const config = loadConfig(argv.config);

// Merge config with CLI args (CLI takes precedence)
const options = {
  batchSize: argv.batchSize ?? config.batchSize ?? 10,
  ecoCode: argv.ecoCode ?? config.ecoCode ?? null,
  excludeEco: argv.excludeEco ?? config.excludeEco ?? null,
  limit: argv.limit ?? config.limit ?? null,
  dryRun: argv.dryRun ?? config.dryRun ?? false,
  resume: argv.resume ?? config.resume ?? false,
  stateFile: argv.stateFile ?? config.stateFile ?? null,
  logFile: argv.logFile ?? config.logFile ?? null,
  verbose: argv.verbose ?? config.verbose ?? false,
  quiet: argv.quiet ?? config.quiet ?? false
};

// Validate batch size
if (options.batchSize < 1 || options.batchSize > 1000) {
  console.error('❌ Batch size must be between 1 and 1000');
  process.exit(1);
}

// Validate quiet and verbose aren't both set
if (options.quiet && options.verbose) {
  console.error('❌ Cannot use both --quiet and --verbose');
  process.exit(1);
}

// Check for required environment variables
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  console.error('❌ Missing required environment variable: GOOGLE_APPLICATION_CREDENTIALS_JSON');
  console.error('📋 Please set up your .env file with Google Cloud credentials');
  console.error('💡 Note: The API key must be connected to a paid account with billing enabled');
  process.exit(1);
}

// Run the pipeline
const pipeline = new EnrichmentPipeline(options);
pipeline.run(options.batchSize)
  .then(() => {
    if (!options.quiet) {
      console.log('\n✅ Pipeline completed successfully');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Pipeline failed:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  });
