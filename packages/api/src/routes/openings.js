const express = require('express');
const fs = require('fs');
const path = require('path');
const ECOService = require('../services/eco-service');
const VideoAccessService = require('../services/video-access-service');
const searchService = require('../services/search-service');
const pathResolver = require('../utils/path-resolver');

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

// Cache for search results
let searchIndexCache = null;
let searchIndexCacheTime = null;
const SEARCH_INDEX_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * @route GET /api/openings/popular
 * @desc Get popular openings sorted by absolute game count (games_analyzed)
 * @param {number} limit - Max results to return (default: 12, max: 50)
 */
router.get('/popular', (req, res) => {
  try {
    const { limit = 12, complexity } = req.query;
    
    const result = ecoService.getPopularOpenings(limit, complexity);
    
    res.json({
      success: true,
      data: result.data,
      count: result.count,
      total_analyzed: result.total_analyzed,
      source: result.source
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
    const { limit = 6, complexity, category } = req.query;
    
    const result = ecoService.getPopularOpeningsByECO(category, limit, complexity);
    
    res.json({
      success: true,
      data: result.data,
      metadata: result.metadata
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

/**
 * @route GET /api/openings/semantic-search
 * @desc Enhanced semantic search with natural language understanding
 * @param {string} q - Search query (natural language)
 * @param {number} limit - Max results to return (default: 20, max: 50)
 * @param {number} offset - Pagination offset (default: 0)
 */
router.get('/semantic-search', async (req, res) => {
  try {
    const { q, limit = 20, offset = 0 } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters long'
      });
    }
    
    const startTime = Date.now();
    const maxResults = Math.min(parseInt(limit) || 20, 50);
    const pageOffset = Math.max(parseInt(offset) || 0, 0);
    
    // Use the enhanced search service
    const searchResults = await searchService.search(q, {
      limit: maxResults,
      offset: pageOffset
    });
    
    const searchTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: searchResults.results,
      count: searchResults.results.length,
      totalResults: searchResults.totalResults,
      hasMore: searchResults.hasMore,
      searchTime: `${searchTime}ms`,
      searchType: searchResults.searchType || 'semantic',
      queryIntent: searchResults.queryIntent,
      query: q
    });
  } catch (error) {
    console.error('Semantic search error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/openings/search-suggestions
 * @desc Get intelligent search suggestions based on partial query
 * @param {string} q - Partial search query
 * @param {number} limit - Max suggestions to return (default: 8, max: 15)
 */
router.get('/search-suggestions', async (req, res) => {
  try {
    const { q, limit = 8 } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({
        success: true,
        data: [],
        count: 0,
        note: 'Query too short for suggestions'
      });
    }
    
    const startTime = Date.now();
    const maxResults = Math.min(parseInt(limit) || 8, 15);
    
    // Get basic suggestions from search service
    const suggestions = await searchService.getSuggestions(q, maxResults);
    
    // Add semantic suggestions for common patterns
    const semanticSuggestions = [];
    const queryLower = q.toLowerCase();
    
    // Add common natural language patterns
    if (queryLower.includes('aggr') || queryLower.includes('attack')) {
      semanticSuggestions.push('aggressive openings', 'attacking options for black');
    }
    if (queryLower.includes('solid') || queryLower.includes('def')) {
      semanticSuggestions.push('solid response to d4', 'solid defense against e4');
    }
    if (queryLower.includes('begin') || queryLower.includes('easy')) {
      semanticSuggestions.push('beginner queens pawn openings', 'beginner french defense');
    }
    if (queryLower.includes('d4')) {
      semanticSuggestions.push('response to d4', 'solid response to d4');
    }
    if (queryLower.includes('e4')) {
      semanticSuggestions.push('response to e4', 'attacking options for black');
    }
    
    // Combine and deduplicate
    const allSuggestions = [...new Set([...suggestions, ...semanticSuggestions])];
    const finalSuggestions = allSuggestions.slice(0, maxResults);
    
    const searchTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: finalSuggestions,
      count: finalSuggestions.length,
      searchTime: `${searchTime}ms`,
      query: q
    });
  } catch (error) {
    console.error('Search suggestions error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/openings/search-by-category
 * @desc Search openings by semantic category
 * @param {string} category - Category name (attacking, solid, beginner, etc.)
 * @param {number} limit - Max results to return (default: 20, max: 50)
 * @param {number} offset - Pagination offset (default: 0)
 */
router.get('/search-by-category', async (req, res) => {
  try {
    const { category, limit = 20, offset = 0 } = req.query;
    
    if (!category) {
      return res.status(400).json({
        success: false,
        error: 'Category parameter is required'
      });
    }
    
    const startTime = Date.now();
    const maxResults = Math.min(parseInt(limit) || 20, 50);
    const pageOffset = Math.max(parseInt(offset) || 0, 0);
    
    const searchResults = await searchService.searchByCategory(category, {
      limit: maxResults,
      offset: pageOffset
    });
    
    const searchTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: searchResults.results,
      count: searchResults.results.length,
      totalResults: searchResults.totalResults,
      hasMore: searchResults.hasMore,
      category: searchResults.category,
      searchTime: `${searchTime}ms`
    });
  } catch (error) {
    console.error('Category search error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/openings/search-categories
 * @desc Get all available search categories with counts
 */
router.get('/search-categories', async (req, res) => {
  try {
    const startTime = Date.now();
    
    const categories = await searchService.getCategories();
    
    const searchTime = Date.now() - startTime;
    
    res.json({
      success: true,
      data: categories,
      count: categories.length,
      searchTime: `${searchTime}ms`
    });
  } catch (error) {
    console.error('Categories error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
