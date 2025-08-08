const fs = require('fs');
const pathResolver = require('../packages/api/src/utils/path-resolver');

// Load popularity stats
let popularityStats = null;

function loadPopularityStats() {
  if (popularityStats === null) {
    try {
      const realStatsPath = pathResolver.getPopularityStatsPath();
      const mockStatsPath = pathResolver.getAPIDataPath('mock_popularity_stats.json');
      
      let statsPath = mockStatsPath;
      let useRealStats = false;
      
      if (fs.existsSync(realStatsPath)) {
        const realStatsData = fs.readFileSync(realStatsPath, 'utf8');
        try {
          const realStats = JSON.parse(realStatsData);
          if (Object.keys(realStats).length > 0) {
            statsPath = realStatsPath;
            useRealStats = true;
          }
        } catch (realParseError) {
          console.log('Real stats file exists but is invalid, using mock data');
        }
      }
      
      const statsData = fs.readFileSync(statsPath, 'utf8');
      popularityStats = JSON.parse(statsData);
      
      console.log(`Loaded popularity stats from ${useRealStats ? 'real' : 'mock'} data`);
    } catch (error) {
      console.error('Error loading popularity stats:', error);
      popularityStats = { positions: {}, summary: { total_games: 0 } };
    }
  }
  return popularityStats;
}

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
    const { url } = req;
    const pathname = new URL(url, `http://${req.headers.host}`).pathname;
    const route = pathname.replace('/api/stats', '');
    
    if (route === '/popularity') {
      const stats = loadPopularityStats();
      return res.json({
        success: true,
        data: stats
      });
    }
    
    // Handle FEN-specific stats: /api/stats/{fen}
    if (route.startsWith('/') && route.length > 1) {
      const fen = decodeURIComponent(route.substring(1));
      
      if (!fen) {
        return res.status(400).json({
          success: false,
          error: 'FEN string is required'
        });
      }
      
      const stats = loadPopularityStats();
      
      // Look up stats for this FEN - handle both real data structure (nested under "positions") 
      // and mock data structure (direct keys)
      let openingStats = stats[fen]; // Try direct access first (mock data)
      if (!openingStats && stats.positions) {
        openingStats = stats.positions[fen]; // Try nested access (real data)
      }
      
      if (!openingStats) {
        return res.status(404).json({
          success: false,
          error: 'Statistics not found for this opening'
        });
      }
      
      return res.json({
        success: true,
        data: openingStats
      });
    }
    
    return res.status(404).json({
      success: false,
      error: `Route ${route} not found`
    });
    
  } catch (error) {
    console.error('Stats API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
