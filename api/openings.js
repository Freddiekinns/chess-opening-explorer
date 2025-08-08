// Import the services directly
const ECOService = require('../packages/api/src/services/eco-service');
const VideoAccessService = require('../packages/api/src/services/video-access-service');

const ecoService = new ECOService();
const videoAccessService = new VideoAccessService();

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
      if (route === '/all') {
        const openings = ecoService.getAllOpenings();
        return res.json({
          success: true,
          data: openings,
          count: openings.length
        });
      }
      
      if (route === '/popular-by-eco') {
        const { limit = 6, category } = req.query || {};
        const openings = ecoService.getPopularOpeningsByECO(
          category,
          parseInt(limit) || 6
        );
        return res.json({
          success: true,
          data: openings,
          count: openings.length
        });
      }
      
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
      
      if (route.startsWith('/videos/')) {
        const fen = decodeURIComponent(route.replace('/videos/', ''));
        const videos = await videoAccessService.getVideosForPosition(fen);
        return res.json({
          success: true,
          data: videos,
          count: videos.length
        });
      }
      
      if (route === '/search') {
        const { q, limit = 10 } = req.query || {};
        if (!q) {
          return res.status(400).json({
            success: false,
            error: 'Search query required'
          });
        }
        
        const maxResults = Math.min(parseInt(limit) || 10, 50);
        const openings = ecoService.searchOpeningsByName(q, maxResults);
        return res.json({
          success: true,
          data: openings,
          count: openings.length
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
