/**
 * Static File Generator
 * Phase 2 of Pipeline Overhaul - Database Migration
 * 
 * Pre-computes API responses from SQLite database to static JSON files.
 * Enables blazing-fast frontend queries without database overhead.
 * 
 * Key Features:
 * - Opening-specific API file generation (public/api/openings/{id}.json) 
 * - Video data optimization and caching for frontend consumption
 * - Incremental static file updates for changed openings
 * - Static file validation and integrity checks
 * - Compression and performance optimization
 * - Batch processing with progress tracking
 * - Error handling and recovery mechanisms
 */

const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

class StaticFileGenerator {
  constructor(options = {}) {
    this.outputDir = options.outputDir || path.join(__dirname, '../../public/api/openings');
    this.databasePath = options.databasePath || path.join(__dirname, '../../data/videos.sqlite');
    
    // Use provided schema or delay creation until needed
    if (options.schema) {
      this.schema = options.schema;
    } else {
      this.schema = null; // Will be lazy-loaded when needed
    }
    
    // Configuration with defaults
    this.config = {
      format: options.format || 'json',
      compression: options.compression !== undefined ? options.compression : false,
      maxVideosPerOpening: options.maxVideosPerOpening || 10,
      minMatchScore: options.minMatchScore || 40, // Much higher threshold for quality
      batchSize: options.batchSize || 50,
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 1000,
      ...options
    };
    
    // State tracking
    this.generationState = {
      startTime: null,
      processed: 0,
      errors: [],
      currentBatch: 0
    };
  }

  /**
   * Lazily initialize database schema
   * @returns {Object} Database schema instance
   */
  _getSchema() {
    if (!this.schema) {
      const DatabaseSchema = require('./schema-manager');
      this.schema = new DatabaseSchema(this.databasePath);
    }
    return this.schema;
  }

  /**
   * Ensure output directory exists
   * @returns {Promise<void>}
   */
  async ensureOutputDirectory() {
    try {
      await fs.access(this.outputDir);
    } catch (error) {
      await fs.mkdir(this.outputDir, { recursive: true });
    }
  }

  /**
   * Validate database connection and get stats
   * @returns {Promise<Object>} Validation result
   */
  async validateDatabase() {
    try {
      const stats = await this._getSchema().getDatabaseStats();
      return {
        valid: true,
        stats: stats
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Get all openings from database
   * @returns {Promise<Array>} All openings
   */
  async getAllOpenings() {
    return this._getSchema().getOpeningsByEco('%');
  }

  /**
   * Get videos for specific opening with filtering
   * @param {string} openingId - Opening FEN identifier
   * @param {Object} options - Filter options
   * @returns {Promise<Array>} Filtered videos
   */
  async getVideosForOpening(openingId, options = {}) {
    const limit = options.limit || this.config.maxVideosPerOpening;
    const minScore = options.minScore || this.config.minMatchScore;
    
    const videos = await this._getSchema().getTopVideosForOpening(openingId, limit);
    
    // Filter by minimum match score
    return videos.filter(video => video.match_score >= minScore);
  }

  /**
   * Generate optimized API response for opening
   * @param {Object} opening - Opening data
   * @param {Array} videos - Associated videos
   * @returns {Promise<Object>} API response object
   */
  async generateApiResponse(opening, videos) {
    const cacheVersion = this.generateCacheVersion(opening, videos);
    
    return {
      opening: {
        id: opening.id,
        name: opening.name,
        eco: opening.eco,
        aliases: opening.aliases || []
      },
      videos: videos.map(video => ({
        id: video.id,
        title: video.title,
        channel: video.channel_title,
        duration: video.duration,
        views: video.view_count,
        published: video.published_at,
        thumbnail: video.thumbnail_url,
        url: `https://youtube.com/watch?v=${video.id}`,
        score: video.match_score
      })),
      metadata: {
        total_videos: videos.length,
        generated_at: new Date().toISOString(),
        cache_version: cacheVersion
      }
    };
  }

  /**
   * Generate cache version hash for cache invalidation
   * @param {Object} opening - Opening data
   * @param {Array} videos - Video data
   * @returns {string} Cache version hash
   */
  generateCacheVersion(opening, videos) {
    const data = JSON.stringify({
      opening: opening.id,
      videoIds: videos.map(v => v.id).sort(),
      timestamp: new Date().toISOString().slice(0, 10) // Daily cache invalidation
    });
    
    return crypto.createHash('md5').update(data).digest('hex').slice(0, 8);
  }

  /**
   * Generate safe filename from opening ID
   * @param {string} openingId - Opening FEN or identifier
   * @returns {string} Safe filename path
   */
  getStaticFilename(openingId) {
    // Convert FEN to safe filename
    const safeId = openingId
      .replace(/\//g, '_')    // Replace slashes
      .replace(/\s+/g, '-')   // Replace spaces with hyphens
      .replace(/[^a-zA-Z0-9_-]/g, '') // Remove special characters
      .toLowerCase();
    
    return path.join(this.outputDir, `${safeId}.json`);
  }

  /**
   * Write static file with optional compression
   * @param {string} openingId - Opening identifier
   * @param {Object} apiResponse - API response data
   * @returns {Promise<void>}
   */
  async writeStaticFile(openingId, apiResponse) {
    const filename = this.getStaticFilename(openingId);
    
    const content = this.config.compression 
      ? JSON.stringify(apiResponse)
      : JSON.stringify(apiResponse, null, 2);
    
    try {
      await fs.writeFile(filename, content, 'utf8');
    } catch (error) {
      // Enhance error with context
      error.context = {
        operation: 'writeStaticFile',
        openingId: openingId,
        outputPath: filename,
        timestamp: new Date().toISOString()
      };
      throw error;
    }
  }

  /**
   * Write static file with retry logic
   * @param {string} openingId - Opening identifier  
   * @param {Object} apiResponse - API response data
   * @returns {Promise<void>}
   */
  async writeStaticFileWithRetry(openingId, apiResponse) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        await this.writeStaticFile(openingId, apiResponse);
        return; // Success
      } catch (error) {
        lastError = error;
        
        if (attempt < this.config.retryAttempts) {
          // Exponential backoff
          const delay = this.config.retryDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Validate static file integrity
   * @param {string} openingId - Opening identifier
   * @returns {Promise<Object>} Validation result
   */
  async validateStaticFile(openingId) {
    const filename = this.getStaticFilename(openingId);
    
    try {
      const content = await fs.readFile(filename, 'utf8');
      const parsed = JSON.parse(content);
      
      return {
        valid: true,
        content: parsed
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Process batch of openings
   * @param {Array} openings - Batch of openings to process
   * @returns {Promise<Object>} Batch processing result
   */
  async processBatch(openings) {
    const results = {
      generated: 0,
      errors: []
    };
    
    for (const opening of openings) {
      try {
        const videos = await this.getVideosForOpening(opening.id);
        const apiResponse = await this.generateApiResponse(opening, videos);
        await this.writeStaticFile(opening.id, apiResponse);
        
        results.generated++;
        this.generationState.processed++;
        
      } catch (error) {
        results.errors.push(`${opening.id}: ${error.message}`);
        this.generationState.errors.push(error);
      }
    }
    
    return results;
  }

  /**
   * Generate static files for all openings
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generation result
   */
  async generateAllStaticFiles(options = {}) {
    this.generationState.startTime = Date.now();
    this.generationState.processed = 0;
    this.generationState.errors = [];
    
    await this.ensureOutputDirectory();
    
    const openings = await this.getAllOpenings();
    const batchSize = this.config.batchSize;
    
    const results = {
      generated: 0,
      errors: [],
      total: openings.length
    };
    
    // Process in batches
    for (let i = 0; i < openings.length; i += batchSize) {
      const batch = openings.slice(i, i + batchSize);
      this.generationState.currentBatch = Math.floor(i / batchSize) + 1;
      
      const batchResult = await this.processBatch(batch);
      results.generated += batchResult.generated;
      results.errors.push(...batchResult.errors);
      
      // Report progress if callback provided
      if (options.onProgress) {
        options.onProgress({
          processed: this.generationState.processed,
          total: openings.length,
          percentage: Math.round((this.generationState.processed / openings.length) * 100),
          currentOpening: batch[batch.length - 1]?.name || 'Unknown'
        });
      }
    }
    
    return results;
  }

  /**
   * Update static files for specific openings
   * @param {Array} openingIds - Array of opening IDs to update
   * @returns {Promise<Object>} Update result
   */
  async updateStaticFiles(openingIds) {
    const results = {
      updated: 0,
      errors: []
    };
    
    for (const openingId of openingIds) {
      try {
        const videos = await this.getVideosForOpening(openingId);
        const opening = { id: openingId }; // Minimal opening data for incremental updates
        const apiResponse = await this.generateApiResponse(opening, videos);
        await this.writeStaticFile(openingId, apiResponse);
        
        results.updated++;
      } catch (error) {
        results.errors.push(`${openingId}: ${error.message}`);
      }
    }
    
    return results;
  }

  /**
   * Clean up orphaned static files
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupOrphanedFiles() {
    const existingFiles = await fs.readdir(this.outputDir);
    const currentOpenings = await this.getAllOpenings();
    const currentOpeningFiles = new Set(
      currentOpenings.map(opening => 
        path.basename(this.getStaticFilename(opening.id))
      )
    );
    
    const results = {
      deleted: 0,
      errors: []
    };
    
    for (const file of existingFiles) {
      if (file.endsWith('.json') && !currentOpeningFiles.has(file)) {
        try {
          await fs.unlink(path.join(this.outputDir, file));
          results.deleted++;
        } catch (error) {
          results.errors.push(`${file}: ${error.message}`);
        }
      }
    }
    
    return results;
  }

  /**
   * Validate all static files
   * @returns {Promise<Object>} Validation result
   */
  async validateAllStaticFiles() {
    const files = await fs.readdir(this.outputDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    const results = {
      total: jsonFiles.length,
      valid: 0,
      invalid: 0,
      errors: []
    };
    
    for (const file of jsonFiles) {
      try {
        const content = await fs.readFile(path.join(this.outputDir, file), 'utf8');
        JSON.parse(content); // Validate JSON
        results.valid++;
      } catch (error) {
        results.invalid++;
        results.errors.push(`${file}: ${error.message}`);
      }
    }
    
    return results;
  }

  /**
   * Generate comprehensive report
   * @returns {Promise<Object>} Generation report
   */
  async generateReport() {
    const dbValidation = await this.validateDatabase();
    const files = await fs.readdir(this.outputDir).catch(() => []);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    
    // Calculate file sizes
    let totalSize = 0;
    for (const file of jsonFiles) {
      try {
        const stats = await fs.stat(path.join(this.outputDir, file));
        totalSize += stats.size;
      } catch (error) {
        // Skip files that can't be accessed
      }
    }
    
    const averageFileSize = jsonFiles.length > 0 ? Math.round(totalSize / jsonFiles.length) : 0;
    
    return {
      timestamp: new Date().toISOString(),
      database_stats: dbValidation.valid ? dbValidation.stats : {},
      static_files: {
        total_generated: jsonFiles.length,
        output_directory: this.outputDir,
        compression_enabled: this.config.compression,
        max_videos_per_opening: this.config.maxVideosPerOpening
      },
      performance: {
        generation_duration_ms: this.generationState.startTime 
          ? Date.now() - this.generationState.startTime 
          : 0,
        average_file_size_bytes: averageFileSize,
        total_disk_usage_bytes: totalSize
      }
    };
  }

  /**
   * Resume failed generation from partial result
   * @param {Object} partialResult - Previous generation result
   * @returns {Promise<Object>} Resume result
   */
  async resumeFailedGeneration(partialResult) {
    const allOpenings = await this.getAllOpenings();
    const remainingOpenings = allOpenings.slice(partialResult.generated);
    
    const resumeResult = await this.generateAllStaticFiles();
    
    return {
      resumed_from: partialResult.generated,
      total_generated: partialResult.generated + resumeResult.generated,
      new_errors: resumeResult.errors,
      total_errors: partialResult.errors.concat(resumeResult.errors)
    };
  }

  /**
   * Close database connection
   * @returns {Promise<void>}
   */
  async close() {
    if (this.schema) {
      await this.schema.close();
    }
  }
}

module.exports = StaticFileGenerator;
