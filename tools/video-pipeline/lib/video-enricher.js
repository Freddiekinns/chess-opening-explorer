/**
 * Video Enrichment Service
 * Phase 1 of Pipeline Overhaul - Quality Issues Fix
 * 
 * Efficiently enriches pre-filtered video candidates with YouTube API data.
 * Uses intelligent batching, caching, and rate limiting to minimize API usage.
 * 
 * Performance Target: 50 videos in <5 seconds
 * API Efficiency: Batch requests of 50 videos max per call
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class VideoEnrichment {
  constructor(apiKey = null, options = {}) {
    this.youtube = google.youtube({
      version: 'v3',
      auth: apiKey || process.env.YOUTUBE_API_KEY
    });
    
    this.batchSize = 50; // YouTube API allows up to 50 video IDs per request
    this.cacheDir = path.join(__dirname, '../../data');
    this.cacheFile = path.join(this.cacheDir, 'video_enrichment_cache.json');
    this.cacheMaxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    this.enableCache = options.enableCache !== false; // Allow disabling cache for tests
    
    this.lastEnrichmentStats = null;
    
    // Ensure cache directory exists
    if (this.enableCache) {
      this.ensureCacheDirectory();
    }
  }

  /**
   * Enriches a single video with YouTube API data
   * @param {Object} candidateVideo - Pre-filtered video candidate
   * @returns {Promise<Object>} - Enriched video data
   */
  async enrichVideo(candidateVideo) {
    try {
      // Check cache first (if enabled)
      if (this.enableCache) {
        const cachedData = this.getCachedVideoData(candidateVideo.id);
        if (cachedData && this.isCacheFresh(cachedData.enrichedAt)) {
          return cachedData;
        }
      }

      // Fetch from YouTube API
      const response = await this.youtube.videos.list({
        part: ['snippet', 'contentDetails', 'statistics'],
        id: [candidateVideo.id]
      });

      if (!response.data || !response.data.items) {
        return this.createErrorResult(candidateVideo, 'Invalid API response structure');
      }
      
      if (response.data.items.length === 0) {
        return this.createErrorResult(candidateVideo, 'Video not found in YouTube API');
      }

      const apiVideo = response.data.items[0];
      const enrichedVideo = this.transformApiResponse(apiVideo);
      
      // Cache the result (if enabled)
      if (this.enableCache) {
        this.cacheVideoData(enrichedVideo);
      }
      
      return enrichedVideo;
      
    } catch (error) {
      return this.createErrorResult(candidateVideo, error.message);
    }
  }

  /**
   * Enriches multiple videos in efficient batches
   * @param {Array} candidateVideos - Array of pre-filtered video candidates
   * @returns {Promise<Array>} - Array of enriched video data
   */
  async batchEnrichVideos(candidateVideos) {
    const startTime = Date.now();
    const results = [];
    let totalApiCalls = 0;
    let successCount = 0;
    let errorCount = 0;

    // Process in chunks of batchSize
    for (let i = 0; i < candidateVideos.length; i += this.batchSize) {
      const batch = candidateVideos.slice(i, i + this.batchSize);
      const batchResults = await this.processBatch(batch);
      
      results.push(...batchResults);
      totalApiCalls++;
      
      // Count successes and errors
      batchResults.forEach(result => {
        if (result.enrichmentError) {
          errorCount++;
        } else {
          successCount++;
        }
      });
    }

    // Store statistics
    this.lastEnrichmentStats = {
      totalInput: candidateVideos.length,
      totalEnriched: successCount,
      totalErrors: errorCount,
      apiCallsUsed: totalApiCalls,
      successRate: candidateVideos.length > 0 ? (successCount / candidateVideos.length) * 100 : 0,
      duration: Date.now() - startTime
    };

    return results;
  }

  /**
   * Processes a single batch of videos
   * @param {Array} batch - Batch of candidate videos
   * @returns {Promise<Array>} - Batch results
   */
  async processBatch(batch) {
    try {
      const videoIds = batch.map(video => video.id);
      
      const response = await this.youtube.videos.list({
        part: ['snippet', 'contentDetails', 'statistics'],
        id: videoIds
      });

      if (!response.data || !response.data.items) {
        throw new Error('Invalid API response structure');
      }

      const apiVideos = response.data.items;
      const results = [];

      // Map API results back to candidates
      for (const candidate of batch) {
        const apiVideo = apiVideos.find(v => v.id === candidate.id);
        
        if (apiVideo) {
          const enrichedVideo = this.transformApiResponse(apiVideo);
          if (this.enableCache) {
            this.cacheVideoData(enrichedVideo);
          }
          results.push(enrichedVideo);
        } else {
          results.push(this.createErrorResult(candidate, 'Video not found in YouTube API'));
        }
      }

      return results;
      
    } catch (error) {
      // If batch fails, return error results for all videos in batch
      return batch.map(candidate => this.createErrorResult(candidate, error.message));
    }
  }

  /**
   * Transforms YouTube API response to our standard format
   * @param {Object} apiVideo - YouTube API video object
   * @returns {Object} - Standardized video object
   */
  transformApiResponse(apiVideo) {
    const snippet = apiVideo.snippet || {};
    const contentDetails = apiVideo.contentDetails || {};
    const statistics = apiVideo.statistics || {};

    return {
      id: apiVideo.id,
      title: snippet.title || '',
      description: snippet.description || '',
      channelTitle: snippet.channelTitle || '',
      publishedAt: snippet.publishedAt || '',
      duration: contentDetails.duration || '',
      tags: snippet.tags || [],
      categoryId: snippet.categoryId || '',
      viewCount: parseInt(statistics.viewCount || '0', 10),
      likeCount: parseInt(statistics.likeCount || '0', 10),
      commentCount: parseInt(statistics.commentCount || '0', 10),
      enrichedAt: new Date().toISOString()
    };
  }

  /**
   * Creates an error result for a failed enrichment
   * @param {Object} candidateVideo - Original candidate video
   * @param {string} errorMessage - Error description
   * @returns {Object} - Error result object
   */
  createErrorResult(candidateVideo, errorMessage) {
    return {
      ...candidateVideo,
      enrichmentError: errorMessage,
      enrichedAt: new Date().toISOString()
    };
  }

  /**
   * Gets the last enrichment statistics
   * @returns {Object|null} - Statistics object or null
   */
  getLastEnrichmentStats() {
    return this.lastEnrichmentStats;
  }

  /**
   * Ensures cache directory exists
   */
  ensureCacheDirectory() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Gets cached video data if available
   * @param {string} videoId - Video ID to look up
   * @returns {Object|null} - Cached data or null
   */
  getCachedVideoData(videoId) {
    try {
      if (!fs.existsSync(this.cacheFile)) {
        return null;
      }

      const cacheData = JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
      return cacheData[videoId] || null;
      
    } catch (error) {
      // Cache file corrupted or invalid, ignore
      return null;
    }
  }

  /**
   * Caches video data for future use
   * @param {Object} videoData - Enriched video data to cache
   */
  cacheVideoData(videoData) {
    try {
      let cacheData = {};
      
      if (fs.existsSync(this.cacheFile)) {
        cacheData = JSON.parse(fs.readFileSync(this.cacheFile, 'utf8'));
      }

      cacheData[videoData.id] = videoData;
      
      fs.writeFileSync(this.cacheFile, JSON.stringify(cacheData, null, 2));
      
    } catch (error) {
      // Cache write failed, but don't fail the enrichment
      console.warn('Failed to write cache:', error.message);
    }
  }

  /**
   * Checks if cached data is still fresh
   * @param {string} enrichedAt - ISO timestamp of when data was enriched
   * @returns {boolean} - Whether cache is fresh
   */
  isCacheFresh(enrichedAt) {
    const cacheAge = Date.now() - new Date(enrichedAt).getTime();
    return cacheAge < this.cacheMaxAge;
  }
}

module.exports = VideoEnrichment;
