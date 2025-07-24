const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Load popularity stats from JSON file
let popularityStats = null;

function loadPopularityStats() {
  if (popularityStats === null) {
    try {
      // Try to load real stats file first (from project root data directory)
      const realStatsPath = path.join(__dirname, '../../../../data/popularity_stats.json');
      const mockStatsPath = path.join(__dirname, '../data/mock_popularity_stats.json');
      
      let statsPath = mockStatsPath; // Default to mock
      let useRealStats = false;
      
      if (fs.existsSync(realStatsPath)) {
        const realStatsData = fs.readFileSync(realStatsPath, 'utf8');
        try {
          const realStats = JSON.parse(realStatsData);
          // Check if real stats has meaningful data (more than just empty object)
          if (Object.keys(realStats).length > 0) {
            statsPath = realStatsPath;
            useRealStats = true;
          }
        } catch (realParseError) {
          // Real stats file is invalid, fall back to mock
          console.log('Real stats file exists but is invalid, using mock data');
        }
      }
      
      if (useRealStats) {
        console.log('Using real popularity stats');
      } else {
        console.log('Using mock popularity stats (real stats not available or empty)');
      }
      
      const statsData = fs.readFileSync(statsPath, 'utf8');
      popularityStats = JSON.parse(statsData);
    } catch (error) {
      console.error('Error loading popularity stats:', error);
      popularityStats = {};
    }
  }
  return popularityStats;
}

/**
 * Validate PopularityStats object structure
 */
function validatePopularityStats(stats) {
  const requiredFields = ['popularity_score', 'frequency_count', 'games_analyzed', 'confidence_score', 'analysis_date'];
  
  for (const field of requiredFields) {
    if (!(field in stats)) {
      return false;
    }
  }
  
  // Type validation
  if (typeof stats.popularity_score !== 'number') return false;
  if (typeof stats.frequency_count !== 'number') return false;
  if (typeof stats.games_analyzed !== 'number') return false;
  if (typeof stats.confidence_score !== 'number') return false;
  if (typeof stats.analysis_date !== 'string') return false;
  
  return true;
}

/**
 * @route GET /api/stats/:fen
 * @desc Get popularity statistics for a chess opening by FEN
 * @param {string} fen - FEN string (URL encoded)
 */
router.get('/:fen', (req, res) => {
  try {
    const { fen } = req.params;
    const decodedFen = decodeURIComponent(fen);
    
    // Load stats data
    const stats = loadPopularityStats();
    
    // Look up stats for this FEN - handle both real data structure (nested under "positions") 
    // and mock data structure (direct keys)
    let openingStats = stats[decodedFen]; // Try direct access first (mock data)
    if (!openingStats && stats.positions) {
      openingStats = stats.positions[decodedFen]; // Try nested access (real data)
    }
    
    if (!openingStats) {
      return res.status(404).json({
        success: false,
        error: 'Statistics not found for this opening'
      });
    }
    
    // Validate data structure before sending
    if (!validatePopularityStats(openingStats)) {
      return res.status(500).json({
        success: false,
        error: 'Invalid statistics data structure'
      });
    }
    
    res.json({
      success: true,
      data: openingStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
