/**
 * Phase 1 Pipeline Coordinator
 * Pipeline Overhaul - Quality Issues Fix
 * 
 * Orchestrates the complete Phase 1 transformation:
 * RSS Discovery → Pre-Filter → Video Enrichment
 * 
 * Target: 88% API quota reduction and zero irrelevant matches
 */

const RssVideoDiscovery = require('./1-discover-videos-rss');
const PreFilterVideos = require('./2-prefilter-candidates');
const VideoEnrichment = require('./3-enrich-videos');

class Phase1Pipeline {
  constructor(options = {}) {
    this.rssDiscovery = new RssVideoDiscovery();
    this.preFilter = new PreFilterVideos();
    this.enrichment = new VideoEnrichment(options.youtubeApiKey, options.enrichmentOptions);
    
    // API quota costs (YouTube Data API v3 units)
    this.API_COSTS = {
      SEARCH_PER_CALL: 100,      // Old system: search.list
      VIDEOS_PER_VIDEO: 1,       // New system: videos.list per video
      RSS_COST: 0                // RSS feeds are free
    };
  }

  /**
   * Processes all channels through the complete Phase 1 pipeline
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} - Pipeline results with videos and statistics
   */
  async processAllChannels(options = {}) {
    const startTime = Date.now();
    
    try {
      // Step 1: RSS Discovery (replaces expensive YouTube search)
      console.log('🔍 Phase 1 Step 1: RSS Video Discovery...');
      const rssVideos = await this.rssDiscovery.discoverVideos();
      
      const rssStats = {
        totalVideosFound: rssVideos.length
      };
      
      console.log(`✅ Found ${rssVideos.length} videos via RSS feeds`);
      
      if (rssVideos.length === 0) {
        return this.createResult([], {
          rssDiscovery: rssStats,
          preFilter: { totalInput: 0, totalCandidates: 0, rejectedCount: 0, reductionPercentage: 0 },
          enrichment: { totalInput: 0, totalEnriched: 0, totalErrors: 0, apiCallsUsed: 0, successRate: 0 },
          overall: { inputVideos: 0, finalVideos: 0, overallReduction: 0, apiQuotaSaved: 0 }
        });
      }

      // Step 2: Pre-Filter Candidates (eliminates 80% before API calls)
      console.log('🧹 Phase 1 Step 2: Pre-filtering candidates...');
      const filterResults = this.preFilter.filterCandidates(rssVideos);
      
      console.log(`✅ Pre-filter: ${filterResults.totalCandidates}/${filterResults.totalInput} candidates (${filterResults.reductionPercentage}% reduction)`);
      
      if (filterResults.candidates.length === 0) {
        return this.createResult([], {
          rssDiscovery: rssStats,
          preFilter: filterResults,
          enrichment: { totalInput: 0, totalEnriched: 0, totalErrors: 0, apiCallsUsed: 0, successRate: 0 },
          overall: this.calculateOverallStats(rssVideos.length, 0, 0)
        });
      }

      // Step 3: Video Enrichment (efficient batch API calls)
      console.log('⚡ Phase 1 Step 3: Enriching candidates with YouTube API...');
      const enrichedVideos = await this.enrichment.batchEnrichVideos(filterResults.candidates);
      const enrichmentStats = this.enrichment.getLastEnrichmentStats();
      
      console.log(`✅ Enrichment: ${enrichmentStats.totalEnriched}/${enrichmentStats.totalInput} videos (${(enrichmentStats.successRate || 0).toFixed(1)}% success)`);

      // Calculate final statistics
      const overallStats = this.calculateOverallStats(
        rssVideos.length,
        enrichedVideos.length,
        enrichmentStats.apiCallsUsed
      );

      const endTime = Date.now();
      console.log(`🎉 Phase 1 Complete: ${enrichedVideos.length} videos in ${endTime - startTime}ms`);
      console.log(`💰 API Quota Saved: ${overallStats.apiQuotaSaved || 0} units (${overallStats.overallReduction}% reduction)`);

      return this.createResult(enrichedVideos, {
        rssDiscovery: rssStats,
        preFilter: filterResults,
        enrichment: enrichmentStats,
        overall: overallStats
      });

    } catch (error) {
      console.error('❌ Phase 1 Pipeline Error:', error.message);
      
      // Determine which step failed and provide context
      let errorContext = 'Unknown error';
      if (error.message.includes('RSS') || error.message.includes('feed') || error.message.includes('fetch')) {
        errorContext = `RSS Discovery failed: ${error.message}`;
      } else if (error.message.includes('filter') || error.message.includes('candidate')) {
        errorContext = `Pre-Filter failed: ${error.message}`;
      } else if (error.message.includes('enrich') || error.message.includes('API') || error.message.includes('quota')) {
        errorContext = `Video Enrichment failed: ${error.message}`;
      } else {
        errorContext = `Pipeline failed: ${error.message}`;
      }

      return this.createErrorResult(errorContext);
    }
  }

  /**
   * Creates a successful result object
   * @param {Array} videos - Final enriched videos
   * @param {Object} stats - Complete pipeline statistics
   * @returns {Object} - Result object
   */
  createResult(videos, stats) {
    return {
      videos,
      stats,
      success: true,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Creates an error result object
   * @param {string} errorMessage - Error description
   * @returns {Object} - Error result object
   */
  createErrorResult(errorMessage) {
    return {
      videos: [],
      error: errorMessage,
      success: false,
      timestamp: new Date().toISOString(),
      stats: {
        rssDiscovery: { totalVideosFound: 0 },
        preFilter: { totalInput: 0, totalCandidates: 0, rejectedCount: 0, reductionPercentage: 0 },
        enrichment: { totalInput: 0, totalEnriched: 0, totalErrors: 0, apiCallsUsed: 0, successRate: 0 },
        overall: { inputVideos: 0, finalVideos: 0, overallReduction: 0, apiQuotaSaved: 0 }
      }
    };
  }

  /**
   * Calculates overall pipeline statistics including API quota savings
   * @param {number} inputVideos - Total videos from RSS
   * @param {number} finalVideos - Final enriched videos
   * @param {number} apiCallsUsed - YouTube API calls made
   * @returns {Object} - Overall statistics
   */
  calculateOverallStats(inputVideos, finalVideos, apiCallsUsed) {
    // Old system cost calculation:
    // Would need to search for each video individually = inputVideos * SEARCH_PER_CALL
    const oldSystemCost = inputVideos * this.API_COSTS.SEARCH_PER_CALL;
    
    // New system cost calculation:
    // RSS is free + enrichment calls only for candidates
    const newSystemCost = apiCallsUsed * this.API_COSTS.VIDEOS_PER_VIDEO;
    
    const apiQuotaSaved = Math.max(0, oldSystemCost - newSystemCost);
    const overallReduction = inputVideos > 0 
      ? Math.round(((inputVideos - finalVideos) / inputVideos) * 100)
      : 0;

    return {
      inputVideos,
      finalVideos,
      overallReduction,
      apiQuotaSaved,
      oldSystemCost,
      newSystemCost,
      quotaEfficiency: oldSystemCost > 0 ? Math.round((apiQuotaSaved / oldSystemCost) * 100) : 0
    };
  }

  /**
   * Gets detailed performance metrics
   * @returns {Object} - Performance metrics
   */
  getPerformanceMetrics() {
    return {
      targetApiReduction: 88,        // Target: 88% API quota reduction
      targetFilterReduction: 80,     // Target: 80% pre-filter reduction
      targetProcessingTime: 30000,   // Target: Under 30 seconds
      targetSuccessRate: 90          // Target: 90% enrichment success
    };
  }

  /**
   * Validates pipeline results against targets
   * @param {Object} result - Pipeline result to validate
   * @returns {Object} - Validation report
   */
  validateResults(result) {
    const metrics = this.getPerformanceMetrics();
    const stats = result.stats;
    
    return {
      apiReductionMet: stats.overall.quotaEfficiency >= metrics.targetApiReduction,
      filterReductionMet: stats.preFilter.reductionPercentage >= metrics.targetFilterReduction,
      successRateMet: stats.enrichment.successRate >= metrics.targetSuccessRate,
      overallSuccess: result.success,
      recommendations: this.generateRecommendations(stats)
    };
  }

  /**
   * Generates recommendations based on pipeline performance
   * @param {Object} stats - Pipeline statistics
   * @returns {Array} - Array of recommendation strings
   */
  generateRecommendations(stats) {
    const recommendations = [];
    
    if (stats.preFilter.reductionPercentage < 70) {
      recommendations.push('Consider strengthening pre-filter rules to reduce API usage');
    }
    
    if (stats.enrichment.successRate < 85) {
      recommendations.push('Review YouTube API error patterns and implement retry logic');
    }
    
    if (stats.overall.quotaEfficiency < 80) {
      recommendations.push('Evaluate channel quality tiers and RSS feed timing');
    }
    
    return recommendations;
  }
}

module.exports = Phase1Pipeline;
