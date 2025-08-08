// Import the services directly
const ECOService = require('../packages/api/src/services/eco-service');
const VideoAccessService = require('../packages/api/src/services/video-access-service');
const searchService = require('../packages/api/src/services/search-service');

const ecoService = new ECOService();
const videoAccessService = new VideoAccessService();

// Simple in-memory cache for search results
const searchCache = new Map();
const CACHE_MAX_SIZE = 100;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { url, method } = req;
    const pathname = new URL(url, `http://${req.headers.host}`).pathname;
    
    // Remove /api/openings prefix
    const route = pathname.replace('/api/openings', '');
    
    if (method === 'GET') {
      // ECO Analysis endpoint
      if (route.startsWith('/eco-analysis/')) {
        const code = route.replace('/eco-analysis/', '').toUpperCase();
        const analysisData = ecoService.getECOAnalysis(code);
        
        if (!analysisData) {
          return res.status(404).json({
            success: false,
            error: `No analysis data found for ECO code ${code}`
          });
        }
        
        return res.json({
          success: true,
          data: analysisData
        });
      }
      
      // ECO code filter
      if (route.startsWith('/eco/')) {
        const code = route.replace('/eco/', '').toUpperCase();
        const openings = ecoService.getOpeningsByECO(code);
        
        return res.json({
          success: true,
          data: openings,
          count: openings.length
        });
      }
      
      // Search with caching
      if (route === '/search') {
        const { q, limit = 10 } = req.query || {};
        if (!q) {
          return res.status(400).json({
            success: false,
            error: 'Search query required'
          });
        }
        
        const cacheKey = `${q}_${limit}`;
        
        // Check cache first
        if (searchCache.has(cacheKey)) {
          const cached = searchCache.get(cacheKey);
          if (Date.now() - cached.timestamp < CACHE_TTL) {
            return res.json(cached.data);
          }
          searchCache.delete(cacheKey);
        }
        
        try {
          const searchResults = await searchService.search(q, { 
            limit: Math.min(parseInt(limit) || 10, 50) 
          });
          
          const response = {
            success: true,
            data: searchResults.results || [],
            count: searchResults.results?.length || 0,
            searchType: searchResults.searchType
          };
          
          // Cache the result
          if (searchCache.size >= CACHE_MAX_SIZE) {
            const firstKey = searchCache.keys().next().value;
            searchCache.delete(firstKey);
          }
          
          searchCache.set(cacheKey, {
            data: response,
            timestamp: Date.now()
          });
          
          return res.json(response);
        } catch (error) {
          return res.status(500).json({
            success: false,
            error: 'Search service error: ' + error.message
          });
        }
      }
      
      // FEN lookup
      if (route.startsWith('/fen/')) {
        const fen = decodeURIComponent(route.replace('/fen/', ''));
        const opening = ecoService.getOpeningByFEN(fen);
        
        if (!opening) {
          return res.status(404).json({
            success: false,
            error: 'Opening not found for the given FEN'
          });
        }
        
        return res.json({
          success: true,
          data: opening
        });
      }
      
      // Classification filter
      if (route.startsWith('/classification/')) {
        const classification = decodeURIComponent(route.replace('/classification/', ''));
        const openings = ecoService.getOpeningsByClassification(classification);
        
        return res.json({
          success: true,
          data: openings,
          count: openings.length
        });
      }
      
      // Random opening
      if (route === '/random') {
        const opening = ecoService.getRandomOpening();
        
        return res.json({
          success: true,
          data: opening
        });
      }
      
      // Categories
      if (route === '/categories') {
        const categories = ecoService.getECOCategories();
        
        return res.json({
          success: true,
          data: categories
        });
      }
      
      // Statistics
      if (route === '/stats') {
        const stats = ecoService.getStatistics();
        
        return res.json({
          success: true,
          data: stats
        });
      }
      
      // Popular openings (with complexity filter)
      if (route === '/popular') {
        const { limit = 20, complexity } = req.query || {};
        
        const result = ecoService.getPopularOpenings(limit, complexity);
        
        return res.json({
          success: true,
          data: result.data,
          count: result.count,
          total_analyzed: result.total_analyzed,
          source: result.source
        });
      }
      
      // Popular by ECO
      if (route === '/popular-by-eco') {
        const { limit = 6, category, complexity } = req.query || {};
        const result = ecoService.getPopularOpeningsByECO(
          category,
          parseInt(limit) || 6,
          complexity
        );
        return res.json({
          success: true,
          data: result.data,
          metadata: result.metadata
        });
      }
      
      // Search index
      if (route === '/search-index') {
        const { limit = 500 } = req.query || {};
        const openings = ecoService.getAllOpenings();
        const limitedOpenings = openings.slice(0, parseInt(limit) || 500);
        return res.json({
          success: true,
          data: limitedOpenings,
          count: limitedOpenings.length
        });
      }
      
      // All openings
      if (route === '/all') {
        const openings = ecoService.getAllOpenings();
        return res.json({
          success: true,
          data: openings,
          count: openings.length
        });
      }
      
      // Family filter
      if (route.startsWith('/family/')) {
        const familyCode = route.replace('/family/', '');
        const openings = ecoService.getOpeningsByFamily(familyCode);
        
        return res.json({
          success: true,
          data: openings,
          count: openings.length
        });
      }
      
      // Videos for position
      if (route.startsWith('/videos/')) {
        const fen = decodeURIComponent(route.replace('/videos/', ''));
        const videos = await videoAccessService.getVideosForPosition(fen);
        return res.json({
          success: true,
          data: videos,
          count: videos.length
        });
      }
      
      // Semantic search
      if (route === '/semantic-search') {
        const { q, limit = 10 } = req.query || {};
        if (!q) {
          return res.status(400).json({
            success: false,
            error: 'Search query required'
          });
        }
        
        try {
          const searchResults = await searchService.search(q, { 
            limit: Math.min(parseInt(limit) || 10, 50),
            searchType: 'semantic'
          });
          
          return res.json({
            success: true,
            data: searchResults.results || [],
            count: searchResults.results?.length || 0,
            searchType: searchResults.searchType
          });
        } catch (error) {
          return res.status(500).json({
            success: false,
            error: 'Semantic search error: ' + error.message
          });
        }
      }
      
      // Search suggestions
      if (route === '/search-suggestions') {
        const { q, limit = 5 } = req.query || {};
        if (!q) {
          return res.json({
            success: true,
            data: [],
            count: 0
          });
        }
        
        try {
          const suggestions = await searchService.getSuggestions(q, parseInt(limit) || 5);
          
          return res.json({
            success: true,
            data: suggestions,
            count: suggestions.length
          });
        } catch (error) {
          return res.status(500).json({
            success: false,
            error: 'Suggestions error: ' + error.message
          });
        }
      }
      
      // Search by category
      if (route === '/search-by-category') {
        const { category, limit = 20 } = req.query || {};
        if (!category) {
          return res.status(400).json({
            success: false,
            error: 'Category parameter required'
          });
        }
        
        try {
          const results = await searchService.searchByCategory(category, {
            limit: Math.min(parseInt(limit) || 20, 100)
          });
          
          return res.json({
            success: true,
            data: results.results || [],
            count: results.results?.length || 0
          });
        } catch (error) {
          return res.status(500).json({
            success: false,
            error: 'Category search error: ' + error.message
          });
        }
      }
      
      // Search categories
      if (route === '/search-categories') {
        try {
          const categories = await searchService.getCategories();
          
          return res.json({
            success: true,
            data: categories,
            count: categories.length
          });
        } catch (error) {
          return res.status(500).json({
            success: false,
            error: 'Categories error: ' + error.message
          });
        }
      }
      
      // Videos endpoint
      if (route.startsWith('/videos/')) {
        const fen = decodeURIComponent(route.replace('/videos/', ''));
        
        if (!fen) {
          return res.status(400).json({
            success: false,
            error: 'FEN string is required'
          });
        }
        
        try {
          // Get videos for this FEN position
          const videos = await videoAccessService.getVideosForPosition(fen);
          
          return res.json({
            success: true,
            data: videos,
            count: videos.length,
            fen: fen
          });
        } catch (error) {
          console.error('Error fetching videos:', error);
          return res.status(500).json({
            success: false,
            error: 'Failed to load videos'
          });
        }
      }
    }
    
    // Handle POST requests
    if (method === 'POST') {
      // FEN analysis endpoint
      if (route === '/fen-analysis') {
        const { fen } = req.body || {};
        
        if (!fen) {
          return res.status(400).json({
            success: false,
            error: 'FEN string is required in request body'
          });
        }
        
        const analysisData = ecoService.getECOAnalysisByFEN(fen);
        
        if (!analysisData) {
          return res.status(404).json({
            success: false,
            error: 'No analysis data found for FEN position'
          });
        }
        
        return res.json({
          success: true,
          data: analysisData
        });
      }
    }
    
    // Default response for unmatched routes
    return res.status(404).json({
      success: false,
      error: `Route ${route} not found`
    });
    
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
