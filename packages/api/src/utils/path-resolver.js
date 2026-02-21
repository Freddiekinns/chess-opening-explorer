const path = require('path');
const fs = require('fs');

const isPosixPath = (value) => typeof value === 'string' && value.startsWith('/');

const joinFromBase = (basePath, ...segments) => {
  if (isPosixPath(basePath)) {
    return path.posix.join(basePath, ...segments);
  }
  return path.join(basePath, ...segments);
};

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
    const cwd = process.cwd();

    const pickExisting = (candidates) => {
      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          return candidate;
        }
      }
      return candidates[0];
    };

    if (this.isVercel) {
      const candidates = [
        joinFromBase(cwd, 'api', 'data'),
        joinFromBase(cwd, '..', 'api', 'data'),
        joinFromBase(cwd, '..', '..', 'api', 'data'),
        path.resolve(__dirname, '..', '..', '..', '..', 'api', 'data')
      ];
      dataPath = pickExisting(candidates);
    } else {
      const isRunningFromRoot = cwd.endsWith('chess-opening-explorer');
      const candidates = isRunningFromRoot
        ? [
            joinFromBase(cwd, 'api', 'data'),
            joinFromBase(cwd, '..', 'api', 'data')
          ]
        : [
            joinFromBase(cwd, '..', '..', 'api', 'data'),
            joinFromBase(cwd, '..', 'api', 'data')
          ];
      dataPath = pickExisting(candidates);
    }

    return subPath ? joinFromBase(dataPath, subPath) : dataPath;
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
      return joinFromBase(process.cwd(), 'api', 'data', filename);
    } else {
      return path.join(__dirname, '../data', filename);
    }
  }
}

module.exports = new PathResolver();
