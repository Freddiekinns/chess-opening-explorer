const fs = require('fs');
const path = require('path');

/**
 * Service for accessing videos using the new FEN-based file structure
 * Replaces embedded video access from analysis_json
 */
class VideoAccessService {
  constructor() {
    this.videoDirectory = path.join(process.cwd(), 'data', 'videos');
    this.videoCache = new Map();
  }

  /**
   * Sanitize FEN string for use as filename
   * @param {string} fen - The FEN string
   * @returns {string} - Sanitized filename
   */
  sanitizeFEN(fen) {
    return fen.replace(/\//g, '_')
              .replace(/\s+/g, '_')
              .replace(/-/g, 'dash');
  }

  /**
   * Get videos for a specific chess position
   * @param {string} fen - The FEN string of the position
   * @returns {Array} - Array of video objects, or empty array if none found
   */
  async getVideosForPosition(fen) {
    if (!fen) return [];

    // Check cache first
    if (this.videoCache.has(fen)) {
      return this.videoCache.get(fen);
    }

    try {
      const sanitizedFEN = this.sanitizeFEN(fen);
      const videoFilePath = path.join(this.videoDirectory, `${sanitizedFEN}.json`);

      if (!fs.existsSync(videoFilePath)) {
        // Cache empty result to avoid repeated file checks
        this.videoCache.set(fen, []);
        return [];
      }

      const videoData = JSON.parse(fs.readFileSync(videoFilePath, 'utf8'));
      const videos = videoData.videos || [];

      // Cache the result
      this.videoCache.set(fen, videos);
      return videos;

    } catch (error) {
      console.warn(`Error loading videos for FEN ${fen}: ${error.message}`);
      return [];
    }
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
   */
  async saveVideosForPosition(fen, metadata, videos) {
    if (!fen || !videos || videos.length === 0) return;

    try {
      const sanitizedFEN = this.sanitizeFEN(fen);
      const videoFilePath = path.join(this.videoDirectory, `${sanitizedFEN}.json`);

      // Ensure directory exists
      if (!fs.existsSync(this.videoDirectory)) {
        fs.mkdirSync(this.videoDirectory, { recursive: true });
      }

      const videoData = {
        fen: fen,
        name: metadata.name || 'Unknown Opening',
        eco: metadata.eco || '',
        extracted_at: new Date().toISOString(),
        video_count: videos.length,
        videos: videos
      };

      fs.writeFileSync(videoFilePath, JSON.stringify(videoData, null, 2));

      // Update cache
      this.videoCache.set(fen, videos);

      console.log(`✅ Saved ${videos.length} videos for ${metadata.name || fen}`);

    } catch (error) {
      console.error(`Error saving videos for FEN ${fen}: ${error.message}`);
      throw error;
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
