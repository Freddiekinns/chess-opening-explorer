const express = require('express');
const fs = require('fs');
const path = require('path');
const ECOService = require('../services/eco-service');
const VideoAccessService = require('../services/video-access-service');

const router = express.Router();
const ecoService = new ECOService();
const videoAccessService = new VideoAccessService();

// Simple in-memory cache for search results
const searchCache = new Map();
const CACHE_MAX_SIZE = 100;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * @route GET /api/openings/eco-analysis/:code
 * @desc Get ECO analysis data including descriptions, plans, and complexity
 * @param {string} code - ECO code (e.g., "A00", "B01") 
 */
router.get('/eco-analysis/:code', (req, res) => {
  try {
    const { code } = req.params;
    const ecoCode = code.toUpperCase();
    
    // Get analysis data from ECO service
    const analysisData = ecoService.getECOAnalysis(ecoCode);
    
    if (!analysisData) {
      return res.status(404).json({
        success: false,
        error: `No analysis data found for ECO code ${ecoCode}`
      });
    }
    
    res.json({
      success: true,
      data: analysisData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/openings/fen-analysis
 * @desc Get ECO analysis data for a specific FEN position
 * @body {string} fen - FEN string of the position
 */
router.post('/fen-analysis', (req, res) => {
  try {
    const { fen } = req.body;
    
    if (!fen) {
      return res.status(400).json({
        success: false,
        error: 'FEN string is required in request body'
      });
    }
    
    // Get analysis data from ECO service by FEN
    const analysisData = ecoService.getECOAnalysisByFEN(fen);
    
    if (!analysisData) {
      return res.status(404).json({
        success: false,
        error: `No analysis data found for FEN position`
      });
    }
    
    res.json({
      success: true,
      data: analysisData
    });
  } catch (error) {
    console.log('ERROR in FEN-analysis endpoint:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/openings/eco/:code
 * @desc Get openings by ECO code
 * @param {string} code - ECO code (e.g., "A00", "B01")
 */
router.get('/eco/:code', (req, res) => {
  try {
    const { code } = req.params;
    const openings = ecoService.getOpeningsByECO(code.toUpperCase());
    
    res.json({
      success: true,
      data: openings,
      count: openings.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/openings/search
 * @desc Search openings by name with caching and performance optimizations
 * @param {string} q - Search query
 * @param {number} limit - Max results to return (default: 10, max: 50)
 */
router.get('/search', (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters long'
      });
    }
    
    // Limit results to prevent performance issues
    const maxResults = Math.min(parseInt(limit) || 10, 50);
    const cacheKey = `${q.toLowerCase()}_${maxResults}`;
    
    // Check cache first
    if (searchCache.has(cacheKey)) {
      const cached = searchCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return res.json({
          success: true,
          data: cached.data,
          count: cached.data.length,
          cached: true
        });
      } else {
        searchCache.delete(cacheKey);
      }
    }
    
    const startTime = Date.now();
    const openings = ecoService.searchOpeningsByName(q, maxResults);
    const searchTime = Date.now() - startTime;
    
    // Cache the result
    if (searchCache.size >= CACHE_MAX_SIZE) {
      // Remove oldest entry
      const firstKey = searchCache.keys().next().value;
      searchCache.delete(firstKey);
    }
    
    searchCache.set(cacheKey, {
      data: openings,
      timestamp: Date.now()
    });
    
    res.json({
      success: true,
      data: openings,
      count: openings.length,
      searchTime: `${searchTime}ms`,
      cached: false
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/openings/fen/:fen
 * @desc Get opening by FEN position
 * @param {string} fen - FEN string (URL encoded)
 */
router.get('/fen/:fen', (req, res) => {
  try {
    const { fen } = req.params;
    const decodedFen = decodeURIComponent(fen);
    const opening = ecoService.getOpeningByFEN(decodedFen);
    
    if (!opening) {
      return res.status(404).json({
        success: false,
        error: 'Opening not found for this position'
      });
    }
    
    res.json({
      success: true,
      data: opening
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/openings/classification/:classification
 * @desc Get openings by classification (A, B, C, D, E)
 * @param {string} classification - Classification letter (A, B, C, D, E)
 */
router.get('/classification/:classification', (req, res) => {
  try {
    const { classification } = req.params;
    const upperClass = classification.toUpperCase();
    
    if (!['A', 'B', 'C', 'D', 'E'].includes(upperClass)) {
      return res.status(400).json({
        success: false,
        error: 'Classification must be A, B, C, D, or E'
      });
    }
    
    const openings = ecoService.getOpeningsByClassification(upperClass);
    
    res.json({
      success: true,
      data: openings,
      count: openings.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/openings/random
 * @desc Get random opening for training
 */
router.get('/random', (req, res) => {
  try {
    const opening = ecoService.getRandomOpening();
    
    res.json({
      success: true,
      data: opening
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/openings/categories
 * @desc Get all ECO categories
 */
router.get('/categories', (req, res) => {
  try {
    const categories = ecoService.getECOCategories();
    
    res.json({
      success: true,
      data: categories,
      count: categories.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/openings/stats
 * @desc Get opening database statistics
 */
router.get('/stats', (req, res) => {
  try {
    const stats = ecoService.getStatistics();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Load popularity data once at startup
let popularityData = null;
let searchIndexCache = null;
let searchIndexCacheTime = null;
const SEARCH_INDEX_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function loadPopularityData() {
  if (popularityData) return popularityData;
  
  try {
    const popularityStatsPath = path.join(__dirname, '../../../../data/popularity_stats.json');
    if (fs.existsSync(popularityStatsPath)) {
      const data = JSON.parse(fs.readFileSync(popularityStatsPath, 'utf8'));
      
      // Extract from the "positions" key in the data structure
      const positions = data.positions || {};
      popularityData = Object.entries(positions)
        .filter(([fen, stats]) => stats.games_analyzed && stats.games_analyzed > 0)
        .map(([fen, stats]) => ({
          fen,
          games_analyzed: stats.games_analyzed,
          rank: stats.rank || 0
        }))
        .sort((a, b) => b.games_analyzed - a.games_analyzed);
      
      console.log(`✅ Loaded ${popularityData.length} openings with games data`);
    } else {
      console.warn('No popularity stats file found');
      popularityData = [];
    }
  } catch (error) {
    console.error('Error loading popularity data:', error);
    popularityData = [];
  }
  
  return popularityData;
}

/**
 * @route GET /api/openings/popular
 * @desc Get popular openings sorted by absolute game count (games_analyzed)
 * @param {number} limit - Max results to return (default: 12, max: 50)
 */
router.get('/popular', (req, res) => {
  try {
    const { limit = 12 } = req.query;
    const maxResults = Math.min(parseInt(limit) || 12, 50);
    
    const allOpenings = ecoService.getAllOpenings();
    const popularity = loadPopularityData();
    
    if (popularity.length === 0) {
      // Fallback to old method if no popularity data
      const popularOpenings = allOpenings
        .filter(opening => opening.analysis && opening.analysis.popularity && opening.analysis.popularity > 0)
        .sort((a, b) => (b.analysis?.popularity || 0) - (a.analysis?.popularity || 0))
        .slice(0, maxResults);
      
      res.json({
        success: true,
        data: popularOpenings,
        count: popularOpenings.length,
        total_analyzed: allOpenings.length,
        source: 'fallback'
      });
      return;
    }
    
    // Create a map for quick lookup of game counts by FEN
    const gameCountsByFen = new Map();
    popularity.forEach(item => {
      gameCountsByFen.set(item.fen, {
        games_analyzed: item.games_analyzed,
        rank: item.rank
      });
    });
    
    // Filter openings that have popularity data and enrich with game counts
    const popularOpenings = allOpenings
      .filter(opening => gameCountsByFen.has(opening.fen))
      .map(opening => {
        const popularityInfo = gameCountsByFen.get(opening.fen);
        return {
          ...opening,
          games_analyzed: popularityInfo.games_analyzed,
          popularity_rank: popularityInfo.rank
        };
      })
      // Sort by absolute game count (descending), then alphabetically
      .sort((a, b) => {
        const gameCountDiff = (b.games_analyzed || 0) - (a.games_analyzed || 0);
        if (gameCountDiff !== 0) return gameCountDiff;
        return a.name.localeCompare(b.name);
      })
      .slice(0, maxResults);
    
    res.json({
      success: true,
      data: popularOpenings,
      count: popularOpenings.length,
      total_analyzed: allOpenings.length,
      source: 'games_analyzed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/openings/popular-by-eco
 * @desc Get top openings by ECO category for optimized grid display
 * @param {number} limit - Max results per category (default: 6, max: 20)
 */
router.get('/popular-by-eco', (req, res) => {
  try {
    const { limit = 6, complexity } = req.query;
    const maxResultsPerCategory = Math.min(parseInt(limit) || 6, 20); // Increased from 10 to 20
    
    const startTime = Date.now();
    let allOpenings = ecoService.getAllOpenings();
    
    // Filter by complexity if provided
    if (complexity && ['Beginner', 'Intermediate', 'Advanced'].includes(complexity)) {
      allOpenings = allOpenings.filter(opening => 
        opening.analysis_json?.complexity === complexity
      );
    }
    const popularity = loadPopularityData();
    
    if (popularity.length === 0) {
      // Fallback: group by ECO family using analysis.popularity
      const ecoCategories = { A: [], B: [], C: [], D: [], E: [] };
      
      allOpenings
        .filter(opening => opening.analysis && opening.analysis.popularity && opening.analysis.popularity > 0)
        .forEach(opening => {
          const ecoFamily = opening.eco ? opening.eco[0] : null;
          if (ecoFamily && ecoCategories[ecoFamily]) {
            ecoCategories[ecoFamily].push(opening);
          }
        });
      
      // Sort and limit each category
      Object.keys(ecoCategories).forEach(category => {
        ecoCategories[category] = ecoCategories[category]
          .sort((a, b) => (b.analysis?.popularity || 0) - (a.analysis?.popularity || 0))
          .slice(0, maxResultsPerCategory);
      });
      
      const responseTime = Date.now() - startTime;
      
      res.json({
        success: true,
        data: ecoCategories,
        metadata: {
          total_openings_analyzed: allOpenings.length,
          response_time_ms: responseTime,
          source: 'fallback',
          categories_included: ['A', 'B', 'C', 'D', 'E'],
          limit_per_category: maxResultsPerCategory
        }
      });
      return;
    }
    
    // Create optimized lookup map by FEN
    const gameCountsByFen = new Map();
    popularity.forEach(item => {
      gameCountsByFen.set(item.fen, {
        games_analyzed: item.games_analyzed,
        rank: item.rank
      });
    });
    
    // Group ALL openings by ECO family and enrich with popularity data
    const ecoCategories = { A: [], B: [], C: [], D: [], E: [] };
    
    allOpenings.forEach(opening => {
      const ecoFamily = opening.eco ? opening.eco[0] : null;
      if (ecoFamily && ecoCategories[ecoFamily]) {
        const popularityInfo = gameCountsByFen.get(opening.fen);
        
        ecoCategories[ecoFamily].push({
          ...opening,
          games_analyzed: popularityInfo ? popularityInfo.games_analyzed : 0,
          popularity_rank: popularityInfo ? popularityInfo.rank : null
        });
      }
    });
    
    // Sort each category by games_analyzed (descending) and take top N
    Object.keys(ecoCategories).forEach(category => {
      ecoCategories[category] = ecoCategories[category]
        .sort((a, b) => {
          const gameCountDiff = (b.games_analyzed || 0) - (a.games_analyzed || 0);
          if (gameCountDiff !== 0) return gameCountDiff;
          return a.name.localeCompare(b.name);
        })
        .slice(0, maxResultsPerCategory);
    });
    
    const responseTime = Date.now() - startTime;
    const totalOpeningsReturned = Object.values(ecoCategories).reduce((sum, arr) => sum + arr.length, 0);
    
    res.json({
      success: true,
      data: ecoCategories,
      metadata: {
        total_openings_analyzed: allOpenings.length,
        total_openings_returned: totalOpeningsReturned,
        response_time_ms: responseTime,
        source: 'games_analyzed',
        categories_included: ['A', 'B', 'C', 'D', 'E'],
        limit_per_category: maxResultsPerCategory
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/openings/search-index
 * @desc Get lightweight search index for client-side search (names and ECO codes only)
 * @param {number} limit - Max results to return (default: all, can limit for faster initial load)
 */
router.get('/search-index', (req, res) => {
  try {
    const startTime = Date.now();
    const { limit } = req.query;
    
    // Check cache first
    const cacheKey = limit ? `limited_${limit}` : 'full';
    const now = Date.now();
    
    if (searchIndexCache && searchIndexCache[cacheKey] && 
        searchIndexCacheTime && (now - searchIndexCacheTime) < SEARCH_INDEX_CACHE_TTL) {
      const cached = searchIndexCache[cacheKey];
      res.json({
        ...cached,
        searchTime: `${Date.now() - startTime}ms (cached)`,
        cached: true
      });
      return;
    }
    
    const allOpenings = ecoService.getAllOpenings();
    
    // Create lightweight index with only essential search fields
    let searchIndex = allOpenings.map(opening => ({
      fen: opening.fen,
      name: opening.name,
      eco: opening.eco,
      moves: opening.moves || '',
      // Only include games_analyzed if available for sorting
      ...(opening.games_analyzed && { games_analyzed: opening.games_analyzed })
    }));
    
    // If limit specified, prioritize by games_analyzed and take top N
    if (limit) {
      const maxResults = Math.min(parseInt(limit) || searchIndex.length, searchIndex.length);
      searchIndex = searchIndex
        .sort((a, b) => (b.games_analyzed || 0) - (a.games_analyzed || 0))
        .slice(0, maxResults);
    }
    
    const searchTime = Date.now() - startTime;
    
    const response = {
      success: true,
      data: searchIndex,
      count: searchIndex.length,
      total_available: allOpenings.length,
      searchTime: `${searchTime}ms`,
      note: limit ? `Top ${searchIndex.length} popular openings for search` : 'Complete search index',
      cached: false
    };
    
    // Cache the result
    if (!searchIndexCache) searchIndexCache = {};
    searchIndexCache[cacheKey] = response;
    searchIndexCacheTime = now;
    
    res.json(response);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/openings/all
 * @desc Get all openings for client-side search
 */
router.get('/all', (req, res) => {
  try {
    const startTime = Date.now();
    const allOpenings = ecoService.getAllOpenings();
    const searchTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: allOpenings,
      count: allOpenings.length,
      searchTime: `${searchTime}ms`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/openings/family/:familyCode
 * @desc Get openings by ECO family (A, B, C, D, E)
 * @param {string} familyCode - ECO family letter (A, B, C, D, E)
 */
router.get('/family/:familyCode', (req, res) => {
  try {
    const { familyCode } = req.params;
    const family = familyCode.toUpperCase();
    
    // Validate family code
    if (!['A', 'B', 'C', 'D', 'E'].includes(family)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid family code. Must be A, B, C, D, or E'
      });
    }
    
    // Get openings for this family
    const familyOpenings = ecoService.getOpeningsByFamily(family);
    
    if (!familyOpenings || familyOpenings.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No openings found for family ${family}`
      });
    }
    
    res.json({
      success: true,
      data: familyOpenings,
      family: family,
      count: familyOpenings.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/openings/videos/:fen
 * @desc Get videos for a specific chess position
 * @param {string} fen - FEN string (URL encoded)
 */
router.get('/videos/:fen', async (req, res) => {
  try {
    const { fen } = req.params;
    const decodedFen = decodeURIComponent(fen);
    
    // Get videos for this FEN position
    const videos = await videoAccessService.getVideosForPosition(decodedFen);
    
    res.json({
      success: true,
      data: videos,
      count: videos.length,
      fen: decodedFen
    });
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load videos'
    });
  }
});

module.exports = router;
