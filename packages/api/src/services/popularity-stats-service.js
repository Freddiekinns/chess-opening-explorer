/**
 * Popularity Stats Service
 * Loads and serves the Lichess-derived popularity statistics, falling back to
 * the mock dataset when the real file is missing or empty. Extracted from
 * stats.routes.js so the aggregate page endpoint can reuse it in-process.
 */

const fs = require('fs');
const pathResolver = require('../utils/path-resolver');

let popularityStats = null;

function loadPopularityStats() {
  if (popularityStats === null) {
    try {
      // Try to load real stats file first (from project root data directory)
      const realStatsPath = pathResolver.getPopularityStatsPath();
      const mockStatsPath = pathResolver.getAPIDataPath('mock_popularity_stats.json');

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
        }
      }

      if (!useRealStats) {
        console.warn('Using mock popularity stats (real stats not available or empty)');
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
 * Get popularity statistics for a FEN, handling both the real data structure
 * (nested under "positions") and the mock structure (direct keys).
 * @returns {object|null}
 */
function getStatsForFen(fen) {
  const stats = loadPopularityStats();
  let openingStats = stats[fen]; // Try direct access first (mock data)
  if (!openingStats && stats.positions) {
    openingStats = stats.positions[fen]; // Try nested access (real data)
  }
  return openingStats || null;
}

/**
 * Validate PopularityStats object structure
 */
function validatePopularityStats(stats) {
  const requiredFields = [
    'popularity_score',
    'frequency_count',
    'games_analyzed',
    'confidence_score',
    'analysis_date',
  ];

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

/** Test hook: clear the module-level cache. */
function resetCache() {
  popularityStats = null;
}

module.exports = { getStatsForFen, validatePopularityStats, resetCache };
