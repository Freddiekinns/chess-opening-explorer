#!/usr/bin/env node

/**
 * Optimize Chess Opening Explorer for Vercel Performance
 * Pre-processes all data at build time while keeping full functionality
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const API_DATA_DIR = path.join(ROOT_DIR, 'api', 'data');
const ECO_SERVICE_PATH = path.join(ROOT_DIR, 'packages', 'api', 'src', 'services', 'eco-service.js');

console.log('🚀 Optimizing Chess Opening Explorer for Vercel...');

class VercelOptimizer {
  constructor() {
    this.outputDir = API_DATA_DIR;
    this.processedData = {};
    this.startTime = Date.now();
  }

  /**
   * Pre-process all popular openings at build time
   */
  async preprocessPopularOpenings() {
    console.log('📊 Pre-processing popular openings...');
    
    // Import ECO service for data processing
    const ECOService = require(ECO_SERVICE_PATH);
    const ecoService = new ECOService();
    
    // Load and process all data once
    await ecoService.ensureECODataLoaded();
    
    // Pre-calculate popular openings for different parameters
    const preCalculatedData = {
      // Default popular openings
      popular_default: ecoService.getPopularOpenings(12),
      popular_20: ecoService.getPopularOpenings(20),
      popular_50: ecoService.getPopularOpenings(50),
      
      // By complexity
      popular_beginner: ecoService.getPopularOpenings(12, 'Beginner'),
      popular_intermediate: ecoService.getPopularOpenings(12, 'Intermediate'),
      popular_advanced: ecoService.getPopularOpenings(12, 'Advanced'),
      
      // Popular by ECO
      eco_default: ecoService.getPopularOpeningsByECO(),
      eco_A: ecoService.getPopularOpeningsByECO('A'),
      eco_B: ecoService.getPopularOpeningsByECO('B'),
      eco_C: ecoService.getPopularOpeningsByECO('C'),
      eco_D: ecoService.getPopularOpeningsByECO('D'),
      eco_E: ecoService.getPopularOpeningsByECO('E'),
      
      // Pre-calculate search index
      search_index: this.buildOptimizedSearchIndex(ecoService),
      
      // Cache opening details for most popular ones
      opening_details: this.cachePopularOpeningDetails(ecoService),
      
      // Timestamp for cache invalidation
      generated_at: new Date().toISOString(),
      version: '1.0.0'
    };
    
    // Save pre-calculated data
    const outputPath = path.join(this.outputDir, 'pre-calculated.json');
    fs.writeFileSync(outputPath, JSON.stringify(preCalculatedData, null, 2));
    
    const fileSize = fs.statSync(outputPath).size;
    console.log(`✅ Pre-calculated data saved: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);
    
    return preCalculatedData;
  }

  /**
   * Build optimized search index
   */
  buildOptimizedSearchIndex(ecoService) {
    console.log('🔍 Building optimized search index...');
    
    const allOpenings = ecoService.getAllOpenings();
    const popularityData = ecoService.loadPopularityData();
    
    // Create lightweight search index
    const searchIndex = allOpenings.map(opening => {
      const popularity = popularityData[opening.fen];
      return {
        eco: opening.eco,
        name: opening.name,
        fen: opening.fen,
        moves: opening.moves || '',
        games_analyzed: popularity?.games_analyzed || 0,
        rank: popularity?.rank || 0,
        // Only include essential search fields
        searchTerms: [
          opening.name?.toLowerCase(),
          opening.eco?.toLowerCase(),
          opening.moves?.toLowerCase()
        ].filter(Boolean).join(' ')
      };
    }).sort((a, b) => (b.games_analyzed || 0) - (a.games_analyzed || 0));
    
    console.log(`✅ Search index built: ${searchIndex.length} openings`);
    return searchIndex;
  }

  /**
   * Cache details for most popular openings
   */
  cachePopularOpeningDetails(ecoService) {
    console.log('💾 Caching popular opening details...');
    
    const popularOpenings = ecoService.getPopularOpenings(100); // Top 100
    const cached = {};
    
    popularOpenings.data.forEach(opening => {
      if (opening.eco) {
        try {
          const details = ecoService.getOpeningByECO(opening.eco);
          if (details) {
            cached[opening.eco] = {
              ...details,
              cached_at: new Date().toISOString()
            };
          }
        } catch (error) {
          console.warn(`⚠️ Could not cache details for ${opening.eco}: ${error.message}`);
        }
      }
    });
    
    console.log(`✅ Cached details for ${Object.keys(cached).length} openings`);
    return cached;
  }

  /**
   * Create optimized data structure summary
   */
  generateOptimizationSummary(data) {
    const summary = {
      timestamp: new Date().toISOString(),
      optimization_duration: `${Date.now() - this.startTime}ms`,
      data_size: {
        popular_openings: data.popular_default?.count || 0,
        eco_groups: Object.keys(data).filter(k => k.startsWith('eco_')).length,
        search_index: data.search_index?.length || 0,
        cached_details: Object.keys(data.opening_details || {}).length
      },
      performance_targets: {
        cold_start: '< 1 second',
        warm_response: '< 100ms',
        cache_hit_rate: '> 90%'
      }
    };
    
    const summaryPath = path.join(this.outputDir, 'optimization-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
    
    console.log('📋 Optimization Summary:');
    console.log(`   📊 Popular openings: ${summary.data_size.popular_openings}`);
    console.log(`   🎯 ECO groups: ${summary.data_size.eco_groups}`);
    console.log(`   🔍 Search index: ${summary.data_size.search_index}`);
    console.log(`   💾 Cached details: ${summary.data_size.cached_details}`);
    console.log(`   ⏱️ Build time: ${summary.optimization_duration}`);
    
    return summary;
  }

  /**
   * Run complete optimization
   */
  async optimize() {
    try {
      // Ensure data directory exists
      if (!fs.existsSync(this.outputDir)) {
        fs.mkdirSync(this.outputDir, { recursive: true });
      }
      
      // Run optimizations
      const preCalculatedData = await this.preprocessPopularOpenings();
      const summary = this.generateOptimizationSummary(preCalculatedData);
      
      console.log('🎉 Optimization complete!');
      console.log(`📦 Output directory: ${this.outputDir}`);
      
      return { data: preCalculatedData, summary };
      
    } catch (error) {
      console.error('❌ Optimization failed:', error);
      throw error;
    }
  }
}

// Run optimization if called directly
if (require.main === module) {
  const optimizer = new VercelOptimizer();
  optimizer.optimize()
    .then(() => {
      console.log('✅ Vercel optimization completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Optimization failed:', error);
      process.exit(1);
    });
}

module.exports = VercelOptimizer;
