const ECOService = require('./eco-service');

// Singleton instance
let ecoServiceInstance = null;

/**
 * Get openings data for search services
 * This acts as an adapter between the search service and ECO service
 * @returns {Promise<Array>} Array of opening objects
 */
async function getOpenings() {
  try {
    // Initialize ECO service if not already done
    if (!ecoServiceInstance) {
      ecoServiceInstance = new ECOService();
    }
    
    // Get all openings from ECO service
    const openings = ecoServiceInstance.getAllOpenings();
    
    // Ensure openings have the expected structure for search
    return openings.map(opening => ({
      fen: opening.fen,
      name: opening.name || '',
      eco: opening.eco || '',
      moves: opening.moves || '',
      src: opening.src || '',
      scid: opening.scid,
      aliases: opening.aliases || {},
      
      // Analysis JSON data (the rich semantic data)
      analysis_json: opening.analysis_json || {},
      
      // Popularity and game stats
      games_analyzed: opening.games_analyzed || 0,
      popularity_score: opening.popularity_score || 0,
      white_win_rate: opening.white_win_rate || null,
      black_win_rate: opening.black_win_rate || null,
      draw_rate: opening.draw_rate || null,
      avg_rating: opening.avg_rating || null
    }));
  } catch (error) {
    console.error('Error getting openings data:', error);
    throw new Error('Failed to load openings data');
  }
}

/**
 * Get a specific opening by FEN
 * @param {string} fen - FEN position string
 * @returns {Object|null} Opening object or null if not found
 */
async function getOpeningByFEN(fen) {
  try {
    if (!ecoServiceInstance) {
      ecoServiceInstance = new ECOService();
    }
    
    return ecoServiceInstance.getOpeningByFEN(fen);
  } catch (error) {
    console.error('Error getting opening by FEN:', error);
    return null;
  }
}

module.exports = {
  getOpenings,
  getOpeningByFEN
};
