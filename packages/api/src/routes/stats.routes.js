const express = require('express');
const {
  getStatsForFen,
  validatePopularityStats,
} = require('../services/popularity-stats-service');

const router = express.Router();

/**
 * @route GET /api/stats/:fen
 * @desc Get popularity statistics for a chess opening by FEN
 * @param {string} fen - FEN string (URL encoded)
 */
router.get('/:fen', (req, res) => {
  try {
    const { fen } = req.params;
    const decodedFen = decodeURIComponent(fen);

    const openingStats = getStatsForFen(decodedFen);

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
