/**
 * Course Service for Chess Course Recommendations
 * Manages course data loading and FEN-based course lookup
 * Location: packages/api/src/services/course-service.js
 */

const fs = require('fs');
const pathResolver = require('../utils/path-resolver');

class CourseService {
  constructor() {
    this.courseDataPath = pathResolver.getAPIDataPath('courses.json');
    this.courseData = null;
  }

  /**
   * Load course data from the JSON file
   * @returns {Promise<Object>} Course data indexed by FEN
   */
  async loadCourseData() {
    try {
      // Return cached data if already loaded
      if (this.courseData !== null) {
        return this.courseData;
      }

      if (!fs.existsSync(this.courseDataPath)) {
        this.courseData = {};
        return this.courseData;
      }

      const fileContent = fs.readFileSync(this.courseDataPath, 'utf8');
      this.courseData = JSON.parse(fileContent);
      return this.courseData;
    } catch (error) {
      throw new Error(`Failed to load course data: ${error.message}`);
    }
  }

  /**
   * Get courses for a specific FEN position
   * @param {string} fen - FEN string for chess position
   * @returns {Promise<Array>} Array of course objects
   */
  async getCoursesByFen(fen) {
    if (!fen || typeof fen !== 'string' || fen.trim() === '') {
      return [];
    }

    if (!this.courseData) {
      await this.loadCourseData();
    }

    return this.courseData[fen] || [];
  }

  /**
   * Get search links for an opening name
   * @param {string} openingName - Name of the opening
   * @returns {{lichess: string, chessable: string}|null} Search URLs or null
   */
  getSearchLinks(openingName) {
    if (!openingName || typeof openingName !== 'string') return null;
    const trimmed = openingName.trim();
    const lichessEncoded = encodeURIComponent(trimmed);

    // Chessable search uses path-based URLs: /courses/s/{term}
    // Simplify the name: strip classifier words and the colon separator
    // to produce concise search terms like "sicilian najdorf"
    const chessableTerm = trimmed
      .replace(/:/g, '')
      .replace(/\b(Defense|Defence|Variation|Opening|Game)\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .toLowerCase();
    const chessableEncoded = encodeURIComponent(chessableTerm);

    return {
      lichess: `https://lichess.org/study/search?q=${lichessEncoded}`,
      chessable: `https://www.chessable.com/courses/s/${chessableEncoded}`
    };
  }
}

module.exports = CourseService;
