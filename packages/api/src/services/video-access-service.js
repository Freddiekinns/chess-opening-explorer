const fs = require('fs');
const path = require('path');
const pathResolver = require('../utils/path-resolver');

// Constants
const VIDEO_FILE_EXTENSION = '.json';
const CACHE_DEFAULT_SIZE = 1000; // Maximum cached positions

/**
 * Service for accessing videos using either consolidated index (production) or individual files (development)
 * Replaces embedded video access from analysis_json
 */
class VideoAccessService {
  constructor() {
    // Use path resolver for environment-aware paths
    this.videoDirectory = pathResolver.getVideosDataPath();
    this.videoCache = new Map();
    this.maxCacheSize = CACHE_DEFAULT_SIZE;
    
    // Check for consolidated video index first (for production/Vercel)
    this.consolidatedIndexPath = pathResolver.getAPIDataPath('video-index.json');
    this.videoIndex = null;
    this.useConsolidatedIndex = false;
    
    this._initializeVideoAccess();
  }

  /**
   * Initialize video access method based on available data sources
   * @private
   */
  _initializeVideoAccess() {
    // Check for consolidated index first (production/Vercel environment)
    if (fs.existsSync(this.consolidatedIndexPath)) {
      try {
        console.log('📦 Loading consolidated video index...');
        const indexContent = fs.readFileSync(this.consolidatedIndexPath, 'utf8');
        this.videoIndex = JSON.parse(indexContent);
        this.useConsolidatedIndex = true;
        console.log(`✅ Loaded consolidated video index: ${this.videoIndex.totalPositions} positions`);
        return;
      } catch (error) {
        console.warn('Failed to load consolidated video index, falling back to individual files:', error.message);
      }
    }
    
    // Fallback to individual files (development environment)
    if (!fs.existsSync(this.videoDirectory)) {
      console.warn(`Video directory not found: ${this.videoDirectory}`);
    } else {
      console.log(`📁 Using individual video files from: ${this.videoDirectory}`);
    }
  }

  /**
   * Sanitize FEN string for use as filename
   * @param {string} fen - The FEN string
   * @returns {string} - Sanitized filename
   */
  sanitizeFEN(fen) {
    if (!fen || typeof fen !== 'string') {
      throw new Error('FEN must be a non-empty string');
    }
    
    return fen.replace(/\//g, '_')
              .replace(/\s+/g, '-')
              .toLowerCase();
  }

  /**
   * Generate the full file path for a FEN position
   * @param {string} fen - The FEN string
   * @returns {string} - Full file path
   * @private
   */
  _getVideoFilePath(fen) {
    const sanitizedFEN = this.sanitizeFEN(fen);
    return path.join(this.videoDirectory, `${sanitizedFEN}${VIDEO_FILE_EXTENSION}`);
  }

  /**
   * Manage cache size to prevent memory bloat
   * @private
   */
  _manageCacheSize() {
    if (this.videoCache.size >= this.maxCacheSize) {
      // Remove oldest entries (FIFO)
      const entriesToRemove = Math.floor(this.maxCacheSize * 0.2); // Remove 20%
      const keysToRemove = Array.from(this.videoCache.keys()).slice(0, entriesToRemove);
      keysToRemove.forEach(key => this.videoCache.delete(key));
    }
  }

  /**
   * Get videos for a specific chess position
   * @param {string} fen - The FEN string of the position
   * @returns {Promise<Array>} - Array of video objects, or empty array if none found
   */
  async getVideosForPosition(fen) {
    if (!fen) {
      return [];
    }

    // Check cache first
    if (this.videoCache.has(fen)) {
      return this.videoCache.get(fen);
    }

    try {
      let videos = [];
      
      if (this.useConsolidatedIndex) {
        // Use consolidated index (production)
        videos = await this._getVideosFromIndex(fen);
      } else {
        // Use individual files (development)
        videos = await this._getVideosFromFiles(fen);
      }
      
      this._cacheVideos(fen, videos);
      return videos;

    } catch (error) {
      console.warn(`Error loading videos for FEN ${fen}: ${error.message}`);
      return [];
    }
  }

  /**
   * Get videos from consolidated index
   * @param {string} fen - The FEN string
   * @returns {Promise<Array>} - Array of video objects
   * @private
   */
  async _getVideosFromIndex(fen) {
    if (!this.videoIndex || !this.videoIndex.positions) {
      return [];
    }

    const sanitizedFEN = this.sanitizeFEN(fen);
    const positionData = this.videoIndex.positions[sanitizedFEN];
    
    if (!positionData || !positionData.opening) {
      return [];
    }

    return positionData.opening.videos || [];
  }

  /**
   * Get videos from individual files (development)
   * @param {string} fen - The FEN string
   * @returns {Promise<Array>} - Array of video objects
   * @private
   */
  async _getVideosFromFiles(fen) {
    const videoFilePath = this._getVideoFilePath(fen);

    if (!fs.existsSync(videoFilePath)) {
      return [];
    }

    return await this._loadVideosFromFile(videoFilePath);
  }

  /**
   * Load and parse videos from a file
   * @param {string} filePath - Path to the video file
   * @returns {Promise<Array>} - Array of video objects
   * @private
   */
  async _loadVideosFromFile(filePath) {
    try {
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const videoData = JSON.parse(fileContent);
      
      if (!videoData || typeof videoData !== 'object') {
        throw new Error('Invalid video data format');
      }
      
      // Handle the structure from individual files: { opening: { videos: [...] } }
      if (videoData.opening && videoData.opening.videos) {
        return videoData.opening.videos;
      }
      
      // Fallback for other structures
      return videoData.videos || [];
    } catch (error) {
      throw new Error(`Failed to parse video file: ${error.message}`);
    }
  }

  /**
   * Cache videos with size management
   * @param {string} fen - The FEN string
   * @param {Array} videos - Array of video objects
   * @private
   */
  _cacheVideos(fen, videos) {
    this._manageCacheSize();
    this.videoCache.set(fen, videos);
  }

  /**
   * Check if a position has existing videos
   * @param {string} fen - The FEN string of the position
   * @returns {boolean} - True if videos exist for this position
   */
  async hasExistingVideos(fen) {
    const videos = await this.getVideosForPosition(fen);
    return videos.length > 0;
  }

  /**
   * Save videos for a position (used by video processing pipelines)
   * @param {string} fen - The FEN string of the position
   * @param {Object} metadata - Position metadata (name, eco, etc.)
   * @param {Array} videos - Array of video objects
   * @returns {Promise<void>}
   */
  async saveVideosForPosition(fen, metadata, videos) {
    if (!fen || !videos || videos.length === 0) {
      return;
    }

    try {
      const videoFilePath = this._getVideoFilePath(fen);

      // Ensure directory exists
      await this._ensureDirectoryExists(path.dirname(videoFilePath));

      const videoData = this._buildVideoDataStructure(fen, metadata, videos);
      
      fs.writeFileSync(videoFilePath, JSON.stringify(videoData, null, 2));

      // Update cache
      this._cacheVideos(fen, videos);

      console.log(`✅ Saved ${videos.length} videos for ${metadata.name || fen}`);

    } catch (error) {
      console.error(`Error saving videos for FEN ${fen}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Build the video data structure for saving
   * @param {string} fen - The FEN string
   * @param {Object} metadata - Position metadata
   * @param {Array} videos - Array of video objects
   * @returns {Object} - Structured video data
   * @private
   */
  _buildVideoDataStructure(fen, metadata, videos) {
    return {
      fen: fen,
      name: metadata.name || 'Unknown Opening',
      eco: metadata.eco || '',
      extracted_at: new Date().toISOString(),
      video_count: videos.length,
      videos: videos
    };
  }

  /**
   * Ensure directory exists
   * @param {string} dirPath - Directory path
   * @returns {Promise<void>}
   * @private
   */
  async _ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Get all positions that have videos
   * @returns {Array} - Array of FEN strings that have associated videos
   */
  async getPositionsWithVideos() {
    try {
      if (!fs.existsSync(this.videoDirectory)) {
        return [];
      }

      const videoFiles = fs.readdirSync(this.videoDirectory)
        .filter(file => file.endsWith('.json'));

      const positions = [];
      for (const file of videoFiles) {
        try {
          const videoData = JSON.parse(fs.readFileSync(
            path.join(this.videoDirectory, file), 'utf8'
          ));
          if (videoData.fen && videoData.videos && videoData.videos.length > 0) {
            positions.push(videoData.fen);
          }
        } catch (error) {
          console.warn(`Error reading video file ${file}: ${error.message}`);
        }
      }

      return positions;

    } catch (error) {
      console.error(`Error getting positions with videos: ${error.message}`);
      return [];
    }
  }

  /**
   * Clear the video cache (useful for testing or after updates)
   */
  clearCache() {
    this.videoCache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache statistics
   */
  getCacheStats() {
    return {
      cachedPositions: this.videoCache.size,
      totalPositionsWithVideos: this.videoCache.size
    };
  }
}

module.exports = VideoAccessService;
