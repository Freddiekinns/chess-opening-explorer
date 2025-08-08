const fs = require('fs');
const pathResolver = require('../packages/api/src/utils/path-resolver');

// Load courses data
let coursesData = null;

function loadCoursesData() {
  if (coursesData === null) {
    try {
      const coursesPath = pathResolver.getAPIDataPath('courses.json');
      
      if (fs.existsSync(coursesPath)) {
        const data = fs.readFileSync(coursesPath, 'utf8');
        coursesData = JSON.parse(data);
        console.log('Loaded courses data');
      } else {
        // Fallback empty structure
        coursesData = {
          courses: [],
          statistics: {
            total_courses: 0,
            total_lessons: 0,
            avg_difficulty: 0
          }
        };
        console.log('No courses data found, using empty structure');
      }
    } catch (error) {
      console.error('Error loading courses data:', error);
      coursesData = {
        courses: [],
        statistics: {
          total_courses: 0,
          total_lessons: 0,
          avg_difficulty: 0
        }
      };
    }
  }
  return coursesData;
}

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
    const route = pathname.replace('/api/courses', '');
    
    // GET /api/courses/stats
    if (route === '/stats') {
      const data = loadCoursesData();
      return res.json({
        success: true,
        data: data.statistics
      });
    }
    
    // GET /api/courses/:fen
    if (route.startsWith('/') && route.length > 1) {
      const fen = decodeURIComponent(route.substring(1));
      
      if (!isValidFEN(fen)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid FEN format'
        });
      }
      
      const data = loadCoursesData();
      
      // Filter courses that match this FEN position
      // This is a simplified implementation - you may want more sophisticated matching
      const matchingCourses = data.courses.filter(course => {
        // Simple check if course mentions this position
        return course.positions && course.positions.includes(fen);
      });
      
      return res.json({
        success: true,
        data: {
          courses: matchingCourses,
          count: matchingCourses.length
        }
      });
    }
    
    // GET /api/courses
    if (route === '' || route === '/') {
      const data = loadCoursesData();
      return res.json({
        success: true,
        data: data.courses,
        count: data.courses.length
      });
    }
    
    return res.status(404).json({
      success: false,
      error: `Route ${route} not found`
    });
    
  } catch (error) {
    console.error('Courses API Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
