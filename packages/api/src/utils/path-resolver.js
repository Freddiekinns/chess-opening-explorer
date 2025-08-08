const path = require('path');
const fs = require('fs');

/**
 * Environment-aware path resolution for Vercel deployment
 * Handles both local development and serverless environments
 */
class PathResolver {
  constructor() {
    this.isVercel = !!process.env.VERCEL;
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  /**
   * Get the data directory path based on environment
   * @param {string} subPath - Optional sub-path within data directory
   * @returns {string} - Absolute path to data directory
   */
  getDataPath(subPath = '') {
    let dataPath;
    
    if (this.isVercel) {
      // In Vercel, use API data directory prepared by build script
      dataPath = path.join(process.cwd(), 'api', 'data');
    } else {
      // Local development - check if running from root or workspace
      const isRunningFromRoot = process.cwd().endsWith('chess-opening-explorer');
      dataPath = isRunningFromRoot 
        ? path.join(process.cwd(), 'api', 'data')
        : path.join(process.cwd(), '../../api', 'data');
    }
    
    return subPath ? path.join(dataPath, subPath) : dataPath;
  }

  /**
   * Get ECO data directory path
   * @returns {string} - Path to ECO data directory
   */
  getECODataPath() {
    return this.getDataPath('eco');
  }

  /**
   * Get videos data directory path
   * @returns {string} - Path to videos data directory
   */
  getVideosDataPath() {
    return this.getDataPath('Videos');
  }

  /**
   * Get popularity stats file path
   * @returns {string} - Path to popularity stats file
   */
  getPopularityStatsPath() {
    return this.getDataPath('popularity_stats.json');
  }

  /**
   * Get most popular openings file path
   * @returns {string} - Path to most popular openings file
   */
  getMostPopularOpeningsPath() {
    return this.getDataPath('most_popular_openings.json');
  }

  /**
   * Check if a path exists
   * @param {string} filePath - Path to check
   * @returns {boolean} - Whether the path exists
   */
  exists(filePath) {
    return fs.existsSync(filePath);
  }

  /**
   * Get fallback path for API data files
   * @param {string} filename - Name of the data file
   * @returns {string} - Path to fallback data file in API directory
   */
  getAPIDataPath(filename) {
    if (this.isVercel) {
      return path.join(process.cwd(), 'api', 'data', filename);
    } else {
      return path.join(__dirname, '../data', filename);
    }
  }
}

module.exports = new PathResolver();
