/**
 * Course API Routes
 * Provides REST endpoints for course recommendations
 * Location: packages/api/src/routes/courses.js
 */

const express = require('express');
const CourseService = require('../services/course-service');

/**
 * Create course routes with optional service injection for testing
 * @param {CourseService} [injectedService] - Optional service for testing
 * @returns {express.Router} Express router with course routes
 */
function createCourseRoutes(injectedService = null) {
  const router = express.Router();
  const courseService = injectedService || new CourseService();

  /**
   * Validate FEN format
   * @param {string} fen - FEN string to validate
   * @returns {boolean} True if valid FEN format
   */
  function isValidFEN(fen) {
    if (!fen || typeof fen !== 'string' || fen.length > 200) {
      return false;
    }

    // Check for potentially malicious content
    if (fen.includes('<') || fen.includes('>') || fen.includes('script')) {
      return false;
    }

    // Basic FEN validation - should have 8 ranks separated by forward slashes
    const ranks = fen.split(' ')[0]; // Get board part only
    const rankArray = ranks.split('/');
    
    // Must have exactly 8 ranks and contain only valid FEN characters
    if (rankArray.length !== 8) {
      return false;
    }

    // Validate each rank contains only valid FEN characters
    const validFenChars = /^[a-zA-Z0-9\/\s\-]*$/;
    return validFenChars.test(fen);
  }

/**
 * GET /api/courses/stats
 * Get course database statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const statistics = await courseService.getStatistics();

    res.json({
      success: true,
      statistics: statistics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch course statistics'
    });
  }
});

/**
 * GET /api/courses/:fen
 * Get courses for a specific FEN position
 */
router.get('/:fen', async (req, res) => {
  try {
    const fen = decodeURIComponent(req.params.fen);

    // Validate FEN format
    if (!isValidFEN(fen)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid FEN format',
        message: 'FEN must contain 8 ranks separated by forward slashes'
      });
    }

    const courses = await courseService.getCoursesByFen(fen);

    res.json({
      success: true,
      fen: fen,
      courses: courses,
      count: courses.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch courses for FEN'
    });
  }
});

/**
 * GET /api/courses
 * Get all courses
 */
router.get('/', async (req, res) => {
  try {
    const courses = await courseService.getAllCourses();

    res.json({
      success: true,
      courses: courses,
      count: courses.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to fetch all courses'
    });
  }
});

  return router;
}

// Export the factory function and default router
module.exports = createCourseRoutes;
module.exports.createCourseRoutes = createCourseRoutes;
