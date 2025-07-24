const fs = require('fs');
const path = require('path');
const VideoAccessService = require('./video-access-service');

class VideoProcessor {
  constructor(youtubeService, databaseService) {
    this.youtubeService = youtubeService;
    this.databaseService = databaseService;
    this.videoAccessService = new VideoAccessService();
    
    // Load configuration
    this.loadConfiguration();
    
    // Initialize alias mapping for search queries
    this.initializeAliases();
  }

  loadConfiguration() {
    try {
      const channelConfigPath = path.join(__dirname, '../../../../config/youtube_channels.json');
      const qualityConfigPath = path.join(__dirname, '../../../../config/video_quality_filters.json');
      
      this.channelConfig = JSON.parse(fs.readFileSync(channelConfigPath, 'utf8'));
      this.qualityFilters = JSON.parse(fs.readFileSync(qualityConfigPath, 'utf8'));
    } catch (error) {
      // In test environment, use mock data if provided
      if (this.isTestEnvironment() && global.mockChannelConfig && global.mockQualityFilters) {
        this.channelConfig = global.mockChannelConfig;
        this.qualityFilters = global.mockQualityFilters;
        return;
      }
      
      console.warn('Could not load configuration files:', error.message);
      
      // Fallback configuration
      this.channelConfig = {
        trusted_channels: [],
        search_parameters: {
          max_results_per_opening: 3,
          min_duration_seconds: 180,
          max_duration_seconds: 3600,
          min_view_count: 1000
        }
      };
      
      this.qualityFilters = {
        quality_thresholds: {
          min_relevance_score: 0.6,
          trusted_channel_boost: 1.5
        },
        content_filters: {
          title_keywords: {
            required: ['chess', 'opening'],
            exclude: ['blitz', 'bullet', 'live']
          }
        }
      };
    }
  }

  initializeAliases() {
    // Opening alias mapping for better search results
    this.openingAliases = {
      'Ruy Lopez': ['Spanish Opening', 'Spanish Game'],
      'King\'s Indian Defense': ['Kings Indian Defense', 'KID'],
      'Queen\'s Gambit': ['Queens Gambit'],
      'Sicilian Defense': ['Sicilian'],
      'French Defense': ['French'],
      'Caro-Kann Defense': ['Caro-Kann', 'Caro Kann'],
      'English Opening': ['English'],
      'Nimzo-Indian Defense': ['Nimzo-Indian', 'Nimzo Indian']
    };
  }

  isTestEnvironment() {
    return process.env.NODE_ENV === 'test';
  }

  generateSearchQueries(opening) {
    const queries = [];
    const openingName = opening.name;
    
    // Primary query with opening name
    queries.push(`${openingName} chess opening`);
    
    // ECO code query
    if (opening.eco) {
      queries.push(`${opening.eco} chess opening`);
    }
    
    // Clean opening name (remove special characters)
    const cleanName = openingName.replace(/['"]/g, '');
    if (cleanName !== openingName) {
      queries.push(`${cleanName} chess opening`);
    }
    
    // Add alias queries
    const aliases = this.openingAliases[openingName] || [];
    aliases.forEach(alias => {
      queries.push(`${alias} chess`);
    });
    
    // Add theory and guide variants
    queries.push(`${openingName} theory`);
    queries.push(`${openingName} guide`);
    
    return queries;
  }

  async processOpening(opening) {
    console.log(`🔄 Processing: ${opening.name} (${opening.eco})`);
    
    try {
      // Track quota usage for this opening
      const quotaBeforeOpening = this.youtubeService.quotaUsed;
      
      // Check quota availability - more conservative estimate
      // 1 channel search (101 units) + 1 general search (101 units) = 202 units
      if (!this.youtubeService.canMakeRequest(202)) { 
        console.warn('❌ Quota exhausted, skipping opening');
        return [];
      }
      
      // Generate search queries
      const queries = this.generateSearchQueries(opening);
      const allVideos = [];
      
      // HYBRID APPROACH: Always search top 2 priority channels for quality baseline
      const priorityChannels = this.channelConfig.trusted_channels
        .filter(ch => ch.priority <= 2)
        .sort((a, b) => (a.priority || 999) - (b.priority || 999))
        .slice(0, 2); // Top 2 channels
      
      console.log(`🔍 Searching ${priorityChannels.length} priority channels`);
      
      for (const channel of priorityChannels) {
        try {
          const channelVideos = await this.searchInChannel(queries, channel);
          allVideos.push(...channelVideos);
          console.log(`📺 Found ${channelVideos.length} videos from ${channel.name}`);
        } catch (error) {
          console.warn(`⚠️  Search failed for channel ${channel.name}:`, error.message);
        }
      }
      
      // Conditional general search for discovery (only if we have few results)
      const maxResults = this.channelConfig.search_parameters.max_results_per_opening;
      if (allVideos.length < Math.max(1, maxResults / 2)) {
        console.log(`🌍 General search needed (only ${allVideos.length} videos from channels)`);
        try {
          const generalVideos = await this.generalSearch(queries);
          allVideos.push(...generalVideos);
          console.log(`📺 Found ${generalVideos.length} videos from general search`);
        } catch (error) {
          console.warn('⚠️  General search failed:', error.message);
        }
      } else {
        console.log(`⚡ Skipping general search - found ${allVideos.length} videos from priority channels`);
      }
      
      // Filter, rank, and select top videos
      const uniqueVideos = this.removeDuplicates(allVideos);
      const filteredVideos = this.applyQualityFilters(uniqueVideos);
      const rankedVideos = this.rankByRelevance(filteredVideos, opening);
      const selectedVideos = rankedVideos.slice(0, maxResults);
      
      console.log(`✅ Found ${selectedVideos.length} videos for ${opening.name}`);
      
      // Report quota usage for this opening
      const quotaUsedForOpening = this.youtubeService.quotaUsed - quotaBeforeOpening;
      console.log(`📊 Quota used for ${opening.name}: ${quotaUsedForOpening} units`);
      
      return selectedVideos;
      
    } catch (error) {
      console.error(`💥 Error processing opening ${opening.name}:`, error.message);
      return [];
    }
  }

  async searchInChannel(queries, channel) {
    const videos = [];
    
    // Use only the primary query for trusted channels to conserve quota
    // But we'll search ALL trusted channels to maintain coverage
    try {
      const results = await this.youtubeService.searchVideos(queries[0], channel.channel_id);
      videos.push(...results);
    } catch (error) {
      console.warn(`Search failed for primary query in channel ${channel.name}`);
    }
    
    return videos;
  }

  async generalSearch(queries) {
    const videos = [];
    
    // Try first query only for general search to conserve quota
    try {
      const results = await this.youtubeService.searchVideos(queries[0]);
      videos.push(...results);
    } catch (error) {
      console.warn(`General search failed for query "${queries[0]}"`);
    }
    
    return videos;
  }

  removeDuplicates(videos) {
    const seen = new Set();
    return videos.filter(video => {
      const identifier = video.url || `${video.title}-${video.channel}`;
      if (seen.has(identifier)) {
        return false;
      }
      seen.add(identifier);
      return true;
    });
  }

  applyQualityFilters(videos) {
    const minRelevanceScore = this.qualityFilters.quality_thresholds.min_relevance_score;
    const excludeKeywords = this.qualityFilters.content_filters.title_keywords.exclude;
    
    return videos.filter(video => {
      // Filter by relevance score
      if (video.relevance_score < minRelevanceScore) {
        return false;
      }
      
      // Filter by blacklisted keywords
      const title = video.title.toLowerCase();
      const hasExcludedKeywords = excludeKeywords.some(keyword => title.includes(keyword));
      if (hasExcludedKeywords) {
        return false;
      }
      
      // Filter by view count
      const minViewCount = this.channelConfig.search_parameters.min_view_count;
      if (video.view_count < minViewCount) {
        return false;
      }
      
      return true;
    });
  }

  rankByRelevance(videos, opening) {
    const trustedChannelBoost = this.qualityFilters.quality_thresholds.trusted_channel_boost;
    
    return videos.sort((a, b) => {
      let scoreA = a.relevance_score;
      let scoreB = b.relevance_score;
      
      // Apply trusted channel boost
      if (a.is_allowlisted) {
        scoreA *= trustedChannelBoost;
      }
      if (b.is_allowlisted) {
        scoreB *= trustedChannelBoost;
      }
      
      return scoreB - scoreA; // Higher scores first
    });
  }

  async updateAnalysisJson(opening, videos) {
    try {
      // NEW APPROACH: Save videos to external FEN-based files
      if (videos && videos.length > 0) {
        const metadata = {
          name: opening.name,
          eco: opening.eco
        };
        
        await this.videoAccessService.saveVideosForPosition(opening.fen, metadata, videos);
        console.log(`📹 Saved ${videos.length} videos to external file for ${opening.name}`);
      }

      // OPTIONAL: Keep analysis_json clean (no embedded videos)
      // Parse existing analysis but remove any embedded videos
      let existingAnalysis = {};
      
      if (opening.analysis_json) {
        if (typeof opening.analysis_json === 'string') {
          try {
            existingAnalysis = JSON.parse(opening.analysis_json);
          } catch (parseError) {
            console.warn(`⚠️  Failed to parse existing analysis_json for ${opening.name}, starting fresh:`, parseError.message);
            existingAnalysis = {};
          }
        } else if (typeof opening.analysis_json === 'object') {
          existingAnalysis = opening.analysis_json;
        }
      }

      // Remove video-related fields to keep analysis_json clean
      const cleanAnalysis = { ...existingAnalysis };
      delete cleanAnalysis.videos;
      delete cleanAnalysis.video_last_updated;

      // Only update database if there are non-video fields in analysis
      if (Object.keys(cleanAnalysis).length > 0) {
        const analysisJsonString = JSON.stringify(cleanAnalysis);
        await this.databaseService.updateAnalysisJson(
          opening.fen,
          analysisJsonString,
          opening.eco,
          opening.name
        );
        console.log(`📝 Updated clean analysis_json for ${opening.name}`);
      }
      
    } catch (error) {
      console.error(`💥 Failed to update analysis for ${opening.name}:`, error.message);
      throw error;
    }
  }

  validateAnalysisStructure(analysis) {
    // NEW: Videos are stored externally, so we don't validate them here
    // Only validate non-video analysis fields if they exist
    
    if (analysis.description && typeof analysis.description !== 'string') {
      throw new Error('Analysis description must be a string');
    }
    
    if (analysis.style_tags && !Array.isArray(analysis.style_tags)) {
      throw new Error('Style tags must be an array');
    }
    
    if (analysis.strategic_themes && !Array.isArray(analysis.strategic_themes)) {
      throw new Error('Strategic themes must be an array');
    }
    
    // Note: videos and video_last_updated are no longer part of analysis_json
  }

  // Utility methods for processing pipeline
  async processBatch(openings, options = {}) {
    const results = {
      processed: 0,
      errors: 0,
      videosAdded: 0,
      skipped: 0
    };

    for (const opening of openings) {
      try {
        const videos = await this.processOpening(opening);
        
        if (videos.length > 0) {
          await this.updateAnalysisJson(opening, videos);
          results.videosAdded += videos.length;
        } else {
          results.skipped++;
        }
        
        results.processed++;
        
        // Respect rate limits in production
        if (!this.isTestEnvironment()) {
          await this.delay(1000); // 1 second delay between openings
        }
        
      } catch (error) {
        console.error(`Error processing ${opening.name}:`, error.message);
        results.errors++;
      }
    }

    return results;
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Process individual video data for enrichment
   * @param {Object} videoData - Video data from channel index
   * @param {Object} opening - Opening information
   * @returns {Object} Processed video data
   */
  async processVideo(videoData, opening) {
    try {
      // Create enriched video object with opening context
      const processedVideo = {
        id: videoData.id,
        title: videoData.title,
        channel_id: videoData.channel_id,
        channel_title: videoData.channel_title,
        published_at: videoData.published_at,
        duration: videoData.duration,
        view_count: videoData.view_count,
        description: videoData.description,
        thumbnail_url: videoData.thumbnail_url,
        
        // Opening context
        opening_eco: opening.eco,
        opening_name: opening.name,
        opening_fen: opening.fen,
        
        // Quality metrics
        relevance_score: this.calculateRelevanceScore(videoData, opening),
        is_trusted_channel: this.isTrustedChannel(videoData.channel_id),
        
        // Additional metadata if available
        analysis: videoData.analysis || null,
        metadata: videoData.metadata || {},
        
        // Processing timestamp
        processed_at: new Date().toISOString()
      };
      
      return processedVideo;
      
    } catch (error) {
      console.error(`Error processing video ${videoData.id}:`, error.message);
      return null;
    }
  }

  /**
   * Calculate relevance score for a video based on opening
   */
  calculateRelevanceScore(video, opening) {
    let score = 0.5; // Base score
    
    const title = video.title.toLowerCase();
    const openingName = opening.name.toLowerCase();
    const eco = opening.eco;
    
    // Title matching
    if (title.includes(openingName)) {
      score += 0.3;
    }
    
    // ECO code matching
    if (eco && title.includes(eco.toLowerCase())) {
      score += 0.2;
    }
    
    // Trusted channel boost
    if (this.isTrustedChannel(video.channel_id)) {
      score += 0.2;
    }
    
    // View count factor (normalized)
    const viewCount = parseInt(video.view_count) || 0;
    if (viewCount > 10000) {
      score += 0.1;
    }
    
    return Math.min(1.0, score);
  }

  /**
   * Check if channel is in trusted list
   */
  isTrustedChannel(channelId) {
    return this.channelConfig.trusted_channels.some(ch => ch.channel_id === channelId);
  }

  // Statistics and reporting
  getProcessingStats() {
    return {
      quotaUsed: this.youtubeService.getQuotaUsage(),
      trustedChannels: this.channelConfig.trusted_channels.length,
      qualityThresholds: this.qualityFilters.quality_thresholds
    };
  }
}

module.exports = VideoProcessor;
