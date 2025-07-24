const axios = require('axios');
const fs = require('fs');
const path = require('path');

class YouTubeService {
  constructor(config) {
    this.config = config;
    this.apiKey = config.apiKey || process.env.YOUTUBE_API_KEY;
    this.quotaLimit = config.quotaLimit || 10000;
    this.quotaUsed = 0;
    this.requestsPerSecond = config.requestsPerSecond || 1;
    this.maxResults = config.maxResults || 2; // Reduced from 3 to 2 for quota optimization
    
    // Load trusted channels configuration
    this.loadTrustedChannels();
    
    // Initialize rate limiter
    this.lastRequestTime = 0;
    this.rateLimitDelay = 1000 / this.requestsPerSecond;
  }

  loadTrustedChannels() {
    try {
      const configPath = path.join(__dirname, '../../../../config/youtube_channels.json');
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      this.trustedChannels = new Set(configData.trusted_channels.map(channel => channel.channel_id));
    } catch (error) {
      // In test environment, create a minimal set of trusted channels
      if (this.isTestEnvironment()) {
        this.trustedChannels = new Set(['UCM-ONC2bCHytG2mYtKDmIeA']);
      } else {
        console.warn('Could not load trusted channels config:', error.message);
        this.trustedChannels = new Set();
      }
    }
  }

  isTestEnvironment() {
    return process.env.NODE_ENV === 'test';
  }

  async applyRateLimit() {
    if (this.isTestEnvironment()) {
      // Skip rate limiting in test environment following AD-004
      return;
    }

    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  canMakeRequest(quotaCost = 100) {
    return this.quotaUsed + quotaCost <= this.quotaLimit;
  }

  recordQuotaUsage(quotaCost = 100) {
    this.quotaUsed += quotaCost;
  }

  getQuotaUsage() {
    return this.quotaUsed;
  }

  async searchVideos(query, channelId = null) {
    // Check quota availability
    if (!this.canMakeRequest(100)) {
      throw new Error('YouTube API quota exceeded');
    }

    // Apply rate limiting
    await this.applyRateLimit();

    try {
      const searchParams = {
        part: 'snippet',
        type: 'video',
        q: query,
        maxResults: this.maxResults,
        key: this.apiKey,
        order: 'relevance',
        videoDuration: 'medium', // 4-20 minutes
        videoDefinition: 'high',
        regionCode: 'US',
        relevanceLanguage: 'en'
      };

      if (channelId) {
        searchParams.channelId = channelId;
      }

      const searchResponse = await axios.get(
        'https://www.googleapis.com/youtube/v3/search',
        { params: searchParams }
      );

      if (!searchResponse.data || !searchResponse.data.items) {
        throw new Error('Invalid API response');
      }

      const videoIds = searchResponse.data.items.map(item => item.id.videoId);
      
      // Get additional video details
      const detailsResponse = await axios.get(
        'https://www.googleapis.com/youtube/v3/videos',
        {
          params: {
            part: 'contentDetails,statistics',
            id: videoIds.join(','),
            key: this.apiKey
          }
        }
      );

      // Record quota usage (search: 100 units, videos: 1 unit)
      this.recordQuotaUsage(101);

      // Format results
      const results = this.formatSearchResults(
        searchResponse.data.items,
        detailsResponse.data.items,
        query
      );

      return results;

    } catch (error) {
      // Still record quota usage even on errors
      this.recordQuotaUsage(100);
      
      if (error.response && error.response.status === 429) {
        throw new Error('Rate limit exceeded');
      } else if (error.response && error.response.status === 403) {
        throw new Error('Invalid API key');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Network timeout');
      } else {
        throw error;
      }
    }
  }

  formatSearchResults(searchItems, detailItems, query) {
    return searchItems.map((item, index) => {
      const details = detailItems[index] || {};
      const statistics = details.statistics || {};
      
      const viewCount = parseInt(statistics.viewCount) || 0;
      const likeCount = parseInt(statistics.likeCount) || 0;
      const dislikeCount = parseInt(statistics.dislikeCount) || 0;
      
      const videoData = {
        title: item.snippet.title,
        url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        channel: item.snippet.channelTitle,
        channel_id: item.snippet.channelId,
        description_snippet: item.snippet.description,
        published_at: item.snippet.publishedAt,
        thumbnail_url: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
        duration: details.contentDetails?.duration || 'unknown',
        view_count: viewCount,
        like_count: likeCount,
        dislike_count: dislikeCount,
        is_allowlisted: this.trustedChannels.has(item.snippet.channelId),
        search_query: query,
        fetched_at: new Date().toISOString()
      };

      // Calculate relevance score
      videoData.relevance_score = this.calculateRelevance(videoData, query);

      return videoData;
    });
  }

  async searchChannels(query) {
    // Check quota availability (channel search costs 100 units)
    if (!this.canMakeRequest(100)) {
      throw new Error('YouTube API quota exceeded');
    }

    // Apply rate limiting
    await this.applyRateLimit();

    try {
      const searchParams = {
        part: 'snippet',
        type: 'channel',
        q: query,
        maxResults: 10,
        key: this.apiKey,
        order: 'relevance'
      };

      const response = await axios.get(
        'https://www.googleapis.com/youtube/v3/search',
        { params: searchParams }
      );

      if (!response.data || !response.data.items) {
        throw new Error('Invalid API response');
      }

      this.quotaUsed += 100; // Channel search costs 100 quota units

      return response.data.items.map(item => ({
        id: item.id,
        snippet: item.snippet
      }));

    } catch (error) {
      if (error.response) {
        const statusCode = error.response.status;
        const errorData = error.response.data;
        
        if (statusCode === 403) {
          throw new Error('YouTube API quota exceeded or invalid API key');
        } else if (statusCode === 400) {
          throw new Error(`Invalid request: ${errorData.error?.message || 'Unknown error'}`);
        }
      }
      
      throw new Error(`YouTube API error: ${error.message}`);
    }
  }

  calculateRelevance(videoData, searchQuery) {
    let score = 0;
    const queryTerms = searchQuery.toLowerCase().split(/\s+/);
    
    // Title relevance (40% weight)
    const titleWords = videoData.title.toLowerCase().split(/\s+/);
    let titleMatches = 0;
    queryTerms.forEach(term => {
      if (titleWords.some(word => word.includes(term))) {
        titleMatches++;
      }
    });
    score += (titleMatches / queryTerms.length) * 0.4;

    // Description relevance (30% weight)
    const descriptionText = videoData.description_snippet || videoData.description || '';
    const descriptionWords = descriptionText.toLowerCase().split(/\s+/);
    let descriptionMatches = 0;
    queryTerms.forEach(term => {
      if (descriptionWords.some(word => word.includes(term))) {
        descriptionMatches++;
      }
    });
    score += (descriptionMatches / queryTerms.length) * 0.3;

    // Check if channel is allowlisted
    const isAllowlisted = videoData.is_allowlisted !== undefined 
      ? videoData.is_allowlisted 
      : this.trustedChannels.has(videoData.channel_id);

    // Channel trust (20% weight)
    if (isAllowlisted) {
      score += 0.2;
    }

    // Engagement (10% weight)
    const totalEngagement = videoData.like_count + videoData.dislike_count;
    if (totalEngagement > 0) {
      const likeRatio = videoData.like_count / totalEngagement;
      score += likeRatio * 0.1;
    }

    // Apply allowlisted channel boost
    if (isAllowlisted) {
      score *= 1.2; // 20% boost for trusted channels
    }

    return Math.min(score, 1.0); // Cap at 1.0
  }

  /**
   * Get all videos from a channel's uploads playlist
   */
  async getChannelPlaylistItems(channelId, options = {}) {
    try {
      await this.applyRateLimit();

      if (!this.canMakeRequest()) {
        throw new Error('Quota limit exceeded');
      }

      // First, get the channel's upload playlist ID
      const channelResponse = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
        params: {
          part: 'contentDetails',
          id: channelId,
          key: this.apiKey
        }
      });

      this.recordQuotaUsage(1);

      if (!channelResponse.data.items || channelResponse.data.items.length === 0) {
        return [];
      }

      const uploadsPlaylistId = channelResponse.data.items[0].contentDetails.relatedPlaylists.uploads;

      // Get videos from the uploads playlist with pagination for historical coverage
      const allVideos = [];
      let pageToken = null;
      const totalDesired = options.maxResults === 'all' ? Infinity : (options.maxResults || 50);
      const maxResults = Math.min(totalDesired === Infinity ? 50 : totalDesired, 50); // API limit is 50 per request
      
      do {
        const playlistParams = {
          part: 'snippet',
          playlistId: uploadsPlaylistId,
          maxResults: Math.min(maxResults, totalDesired === Infinity ? 50 : totalDesired - allVideos.length),
          key: this.apiKey
        };
        
        if (pageToken) {
          playlistParams.pageToken = pageToken;
        }

        const playlistResponse = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
          params: playlistParams
        });

        this.recordQuotaUsage(1);

        const videos = playlistResponse.data.items
          .filter(item => {
            // Filter by date if publishedAfter is specified
            if (options.publishedAfter) {
              return new Date(item.snippet.publishedAt) >= new Date(options.publishedAfter);
            }
            return true;
          })
          .map(item => ({
            id: item.snippet.resourceId.videoId,
            title: item.snippet.title,
            description: item.snippet.description,
            publishedAt: item.snippet.publishedAt,
            thumbnails: item.snippet.thumbnails,
            channelId: item.snippet.channelId,
            channelTitle: item.snippet.channelTitle
          }));

        allVideos.push(...videos);
        pageToken = playlistResponse.data.nextPageToken;
        
        // Continue if we have more pages and haven't reached our limit
        // For 'all' videos, continue until no more pages
      } while (pageToken && (totalDesired === Infinity || allVideos.length < totalDesired));

      // Sort by date if requested
      if (options.order === 'date') {
        allVideos.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
      }

      // Return all videos if 'all' was requested, otherwise respect the limit
      return totalDesired === Infinity ? allVideos : allVideos.slice(0, totalDesired);

    } catch (error) {
      console.error('Error fetching channel playlist items:', error.message);
      throw error;
    }
  }

  /**
   * Batch fetch video details for multiple videos
   */
  async batchFetchVideoDetails(videoIds) {
    try {
      await this.applyRateLimit();

      if (!this.canMakeRequest()) {
        throw new Error('Quota limit exceeded');
      }

      // YouTube API allows up to 50 video IDs per request
      const batchSize = 50;
      const allVideoDetails = [];

      for (let i = 0; i < videoIds.length; i += batchSize) {
        const batch = videoIds.slice(i, i + batchSize);
        
        const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
          params: {
            part: 'snippet,statistics,contentDetails,status,topicDetails',
            id: batch.join(','),
            key: this.apiKey
          }
        });

        this.recordQuotaUsage(1);

        const videoDetails = response.data.items.map(item => ({
          id: item.id,
          title: item.snippet.title,
          description: item.snippet.description,
          publishedAt: item.snippet.publishedAt,
          duration: item.contentDetails.duration,
          thumbnails: item.snippet.thumbnails,
          channelId: item.snippet.channelId,
          channelTitle: item.snippet.channelTitle,
          
          // Enhanced metadata at no extra cost
          tags: item.snippet.tags || [],
          categoryId: item.snippet.categoryId,
          defaultLanguage: item.snippet.defaultLanguage,
          liveBroadcastContent: item.snippet.liveBroadcastContent,
          
          statistics: {
            viewCount: item.statistics.viewCount,
            likeCount: item.statistics.likeCount,
            commentCount: item.statistics.commentCount,
            favoriteCount: item.statistics.favoriteCount || "0"
          },
          
          contentDetails: {
            duration: item.contentDetails.duration,
            dimension: item.contentDetails.dimension,
            definition: item.contentDetails.definition,
            caption: item.contentDetails.caption,
            licensedContent: item.contentDetails.licensedContent,
            projection: item.contentDetails.projection
          },
          
          status: item.status ? {
            uploadStatus: item.status.uploadStatus,
            privacyStatus: item.status.privacyStatus,
            license: item.status.license,
            embeddable: item.status.embeddable,
            publicStatsViewable: item.status.publicStatsViewable
          } : null,
          
          topicDetails: item.topicDetails ? {
            topicIds: item.topicDetails.topicIds || [],
            topicCategories: item.topicDetails.topicCategories || []
          } : null
        }));

        allVideoDetails.push(...videoDetails);
      }

      return allVideoDetails;

    } catch (error) {
      console.error('Error batch fetching video details:', error.message);
      throw error;
    }
  }

  /**
   * Get channel RSS feed (placeholder for future implementation)
   */
  async getChannelRSSFeed(channelId) {
    // This would fetch the RSS feed for a channel
    // For now, return empty structure
    return {
      channelId,
      videos: [],
      lastUpdated: new Date().toISOString()
    };
  }
}

module.exports = YouTubeService;
