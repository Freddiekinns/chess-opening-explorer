/**
 * Example of how to integrate caching into ECO service
 * This preserves ALL search functionality while dramatically improving performance
 */

const fs = require('fs');
const path = require('path');
const { getGlobalCache } = require('./cache-service');

class OptimizedECOService {
  constructor() {
    this.cache = getGlobalCache();
    // ... your existing constructor code
  }

  /**
   * Load ECO data with smart caching
   * Cache the heavy file loading, not the search results
   */
  async loadECOData() {
    return await this.cache.getOrSet(
      'eco-data-loaded',
      async () => {
        console.log('🔄 Loading ECO data from files (cache miss)...');
        
        // Your existing file loading logic
        const ecoData = {};
        for (const file of this.ecoFiles) {
          const filePath = path.join(this.dataDir, file);
          if (fs.existsSync(filePath)) {
            const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            Object.assign(ecoData, content);
          }
        }
        
        console.log(`✅ Loaded ${Object.keys(ecoData).length} ECO entries`);
        return ecoData;
      },
      3600000 // Cache for 1 hour
    );
  }

  /**
   * Load popularity data with caching
   */
  async loadPopularityData() {
    return await this.cache.getOrSet(
      'popularity-data-loaded',
      async () => {
        console.log('🔄 Loading popularity data (cache miss)...');
        
        // Your existing popularity loading logic
        const popularityPath = path.join(this.dataDir, '../popularity_stats.json');
        if (fs.existsSync(popularityPath)) {
          return JSON.parse(fs.readFileSync(popularityPath, 'utf8'));
        }
        return {};
      },
      3600000 // Cache for 1 hour
    );
  }

  /**
   * Get popular openings - FULL search functionality preserved!
   * Only the data loading is cached, not the search results
   */
  async getPopularOpenings(limit = 20, complexity = null) {
    // Get cached data (fast)
    const allOpenings = await this.loadECOData();
    const popularityData = await this.loadPopularityData();
    
    // Your existing search/filter logic runs fresh every time
    // This preserves ALL functionality while being fast!
    
    const maxResults = Math.min(parseInt(limit) || 20, 50);
    
    let filteredOpenings = Object.values(allOpenings);
    
    // Filter by complexity if provided (PRESERVED!)
    if (complexity && ['Beginner', 'Intermediate', 'Advanced'].includes(complexity)) {
      filteredOpenings = filteredOpenings.filter(opening => 
        opening.analysis_json?.complexity === complexity
      );
    }

    // Create popularity map
    const gameCountsByFen = new Map();
    Object.entries(popularityData).forEach(([fen, stats]) => {
      if (stats.games_analyzed && stats.games_analyzed > 0) {
        gameCountsByFen.set(fen, {
          games_analyzed: stats.games_analyzed,
          rank: stats.rank || 0
        });
      }
    });

    // Filter and sort (PRESERVED!)
    const popularOpenings = filteredOpenings
      .filter(opening => gameCountsByFen.has(opening.fen))
      .map(opening => {
        const popularityInfo = gameCountsByFen.get(opening.fen);
        return {
          ...opening,
          games_analyzed: popularityInfo.games_analyzed,
          popularity_rank: popularityInfo.rank
        };
      })
      .sort((a, b) => {
        const gameCountDiff = (b.games_analyzed || 0) - (a.games_analyzed || 0);
        if (gameCountDiff !== 0) return gameCountDiff;
        return a.name.localeCompare(b.name);
      })
      .slice(0, maxResults);

    return {
      data: popularOpenings,
      count: popularOpenings.length,
      total_analyzed: filteredOpenings.length,
      source: 'games_analyzed_cached'
    };
  }

  /**
   * Search functionality - FULLY PRESERVED!
   * Only data loading is cached, search runs fresh
   */
  async searchOpenings(query, filters = {}) {
    // Get cached data (fast)
    const allOpenings = await this.loadECOData();
    
    // Your existing search logic runs fresh every time
    // All dynamic functionality preserved!
    
    let results = Object.values(allOpenings);
    
    // Text search (PRESERVED!)
    if (query) {
      const searchTerm = query.toLowerCase();
      results = results.filter(opening => 
        opening.name?.toLowerCase().includes(searchTerm) ||
        opening.eco?.toLowerCase().includes(searchTerm) ||
        opening.moves?.toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply filters (PRESERVED!)
    if (filters.eco) {
      results = results.filter(opening => 
        opening.eco?.startsWith(filters.eco.toUpperCase())
      );
    }
    
    if (filters.complexity) {
      results = results.filter(opening => 
        opening.analysis_json?.complexity === filters.complexity
      );
    }
    
    return {
      data: results,
      count: results.length,
      query,
      filters
    };
  }

  /**
   * Get cache statistics (for monitoring)
   */
  getCacheStats() {
    return this.cache.getStats();
  }
}

module.exports = OptimizedECOService;
