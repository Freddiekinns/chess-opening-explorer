/**
 * Course Service for Chess Course Recommendations
 * Manages course data loading and FEN-based course lookup
 * Location: packages/api/src/services/course-service.js
 */

const fs = require('fs');
const path = require('path');

class CourseService {
  constructor() {
    // Handle different working directories following established patterns
    const isRunningFromRoot = process.cwd().endsWith('chess-trainer');
    this.courseDataPath = isRunningFromRoot 
      ? path.join(process.cwd(), 'packages/api/src/data/courses.json')
      : path.join(process.cwd(), 'src/data/courses.json');
    
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
   * Get all courses from all FEN positions
   * @returns {Promise<Array>} Array of all course objects
   */
  async getAllCourses() {
    if (!this.courseData) {
      await this.loadCourseData();
    }

    const allCourses = [];
    if (this.courseData) {
      for (const courses of Object.values(this.courseData)) {
        allCourses.push(...courses);
      }
    }

    return allCourses;
  }

  /**
   * Get statistics about the course database
   * @returns {Promise<Object>} Statistics object
   */
  async getStatistics() {
    if (!this.courseData) {
      await this.loadCourseData();
    }

    const fens = Object.keys(this.courseData);
    const allCourses = await this.getAllCourses();
    const platforms = [...new Set(allCourses.map(course => course.platform))];

    return {
      totalFens: fens.length,
      totalCourses: allCourses.length,
      averageCoursesPerFen: fens.length > 0 ? allCourses.length / fens.length : 0,
      platforms: platforms
    };
  }
}

module.exports = CourseService;
