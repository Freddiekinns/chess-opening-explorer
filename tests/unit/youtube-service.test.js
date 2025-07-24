// Mock axios for testing
jest.mock('axios');

const YouTubeService = require('../../packages/api/src/services/youtube-service');
const axios = require('axios');

describe('YouTubeService', () => {
  let youtubeService;
  let mockConfig;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set test environment following AD-004
    process.env.NODE_ENV = 'test';
    process.env.YOUTUBE_API_KEY = 'test-api-key';
    
    mockConfig = {
      apiKey: 'test-api-key',
      quotaLimit: 10000,
      requestsPerSecond: 1,
      maxResults: 3
    };
    
    youtubeService = new YouTubeService(mockConfig);
  });

  afterEach(() => {
    // Clean up environment variables following test isolation principles
    delete process.env.YOUTUBE_API_KEY;
  });

  describe('Environment Detection', () => {
    it('should detect test environment and use mocks', () => {
      // Following AD-004: Environment-Specific Behavior
      expect(process.env.NODE_ENV).toBe('test');
      expect(youtubeService.isTestEnvironment()).toBe(true);
    });

    it('should skip rate limiting in test environment', () => {
      // Following CLAUDE.md framework - no artificial delays in tests
      const startTime = Date.now();
      youtubeService.applyRateLimit();
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(10); // Should be nearly instant
    });
  });

  describe('searchVideos', () => {
    it('should return mock data in test environment', async () => {
      // Mock realistic YouTube API response
      const mockResponse = {
        data: {
          items: [
            {
              id: { videoId: 'test-video-1' },
              snippet: {
                title: 'Queens Gambit Chess Opening - Complete Guide',
                channelTitle: 'Saint Louis Chess Club',
                channelId: 'UCM-ONC2bCHytG2mYtKDmIeA',
                description: 'Learn the Queens Gambit opening theory...',
                publishedAt: '2023-06-15T10:30:00Z',
                thumbnails: {
                  high: { url: 'https://i.ytimg.com/vi/test-video-1/hqdefault.jpg' }
                }
              },
              statistics: {
                viewCount: '15000',
                likeCount: '1200',
                dislikeCount: '50'
              },
              contentDetails: {
                duration: 'PT8M30S'
              }
            }
          ]
        }
      };

      axios.get.mockResolvedValue(mockResponse);

      const results = await youtubeService.searchVideos('Queens Gambit chess opening');
      
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        title: expect.stringContaining('Queens Gambit'),
        channel: 'Saint Louis Chess Club',
        channel_id: 'UCM-ONC2bCHytG2mYtKDmIeA',
        url: expect.stringMatching(/youtube\.com\/watch\?v=test-video-1/),
        view_count: 15000,
        duration: 'PT8M30S'
      });
    });

    it('should handle API errors gracefully', async () => {
      // Mock API error
      axios.get.mockRejectedValue(new Error('API quota exceeded'));
      
      await expect(youtubeService.searchVideos('test query')).rejects.toThrow('API quota exceeded');
      
      // Should still track quota usage even on errors
      expect(youtubeService.getQuotaUsage()).toBe(100);
    });

    it('should respect quota limits', async () => {
      // Set low quota limit for testing
      youtubeService.quotaLimit = 150;
      youtubeService.quotaUsed = 100;
      
      await expect(youtubeService.searchVideos('test query')).rejects.toThrow('YouTube API quota exceeded');
    });

    it('should handle rate limiting gracefully', async () => {
      // Mock rate limit error
      const rateLimitError = new Error('Rate limit exceeded');
      rateLimitError.response = { status: 429 };
      
      axios.get.mockRejectedValueOnce(rateLimitError);
      
      await expect(youtubeService.searchVideos('test query')).rejects.toThrow('Rate limit exceeded');
    });

    it('should search within specific channel when channelId provided', async () => {
      const mockResponse = {
        data: {
          items: [
            {
              id: { videoId: 'channel-specific-video' },
              snippet: {
                title: 'Italian Game Opening',
                channelTitle: 'Saint Louis Chess Club',
                channelId: 'UCM-ONC2bCHytG2mYtKDmIeA',
                description: 'Italian Game theory...',
                publishedAt: '2023-06-15T10:30:00Z',
                thumbnails: {
                  high: { url: 'https://i.ytimg.com/vi/channel-specific-video/hqdefault.jpg' }
                }
              },
              statistics: {
                viewCount: '25000',
                likeCount: '2000',
                dislikeCount: '100'
              },
              contentDetails: {
                duration: 'PT12M45S'
              }
            }
          ]
        }
      };

      axios.get.mockResolvedValue(mockResponse);

      const results = await youtubeService.searchVideos('Italian Game', 'UCM-ONC2bCHytG2mYtKDmIeA');
      
      expect(results).toHaveLength(1);
      expect(results[0].channel_id).toBe('UCM-ONC2bCHytG2mYtKDmIeA');
      expect(results[0].is_allowlisted).toBe(true);
      
      // Verify API was called with channelId parameter
      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            channelId: 'UCM-ONC2bCHytG2mYtKDmIeA'
          })
        })
      );
    });
  });

  describe('calculateRelevance', () => {
    it('should calculate relevance score based on multiple factors', () => {
      const videoData = {
        title: 'Queens Gambit Declined Complete Guide',
        description: 'Learn the Queens Gambit Declined opening theory and strategy',
        channel: 'Saint Louis Chess Club',
        channel_id: 'UCM-ONC2bCHytG2mYtKDmIeA',
        view_count: 15000,
        like_count: 1200,
        dislike_count: 50
      };

      const searchQuery = 'Queens Gambit Declined';
      const relevanceScore = youtubeService.calculateRelevance(videoData, searchQuery);

      expect(relevanceScore).toBeGreaterThan(0);
      expect(relevanceScore).toBeLessThanOrEqual(1);
      expect(typeof relevanceScore).toBe('number');
    });

    it('should boost relevance for allowlisted channels', () => {
      const allowlistedVideo = {
        title: 'Sicilian Defense Guide',
        description: 'Sicilian Defense opening theory',
        channel: 'Saint Louis Chess Club',
        channel_id: 'UCM-ONC2bCHytG2mYtKDmIeA',
        view_count: 10000,
        like_count: 800,
        dislike_count: 20
      };

      const externalVideo = {
        title: 'Sicilian Defense Guide',
        description: 'Sicilian Defense opening theory',
        channel: 'Random Chess Channel',
        channel_id: 'UC_random_channel_id',
        view_count: 10000,
        like_count: 800,
        dislike_count: 20
      };

      const searchQuery = 'Sicilian Defense';
      const allowlistedScore = youtubeService.calculateRelevance(allowlistedVideo, searchQuery);
      const externalScore = youtubeService.calculateRelevance(externalVideo, searchQuery);

      expect(allowlistedScore).toBeGreaterThan(externalScore);
    });
  });

  describe('Quota Management', () => {
    it('should track quota usage correctly', () => {
      expect(youtubeService.getQuotaUsage()).toBe(0);
      
      youtubeService.recordQuotaUsage(100);
      expect(youtubeService.getQuotaUsage()).toBe(100);
      
      youtubeService.recordQuotaUsage(50);
      expect(youtubeService.getQuotaUsage()).toBe(150);
    });

    it('should check quota availability before making requests', () => {
      youtubeService.quotaLimit = 200;
      youtubeService.quotaUsed = 150;
      
      expect(youtubeService.canMakeRequest(100)).toBe(false);
      expect(youtubeService.canMakeRequest(50)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle network timeouts', async () => {
      const timeoutError = new Error('Network timeout');
      timeoutError.code = 'ECONNABORTED';
      
      axios.get.mockRejectedValue(timeoutError);
      
      await expect(youtubeService.searchVideos('test query')).rejects.toThrow('Network timeout');
    });

    it('should handle invalid API responses', async () => {
      const invalidResponse = {
        data: {
          items: null // Invalid response structure
        }
      };

      axios.get.mockResolvedValue(invalidResponse);
      
      await expect(youtubeService.searchVideos('test query')).rejects.toThrow('Invalid API response');
    });

    it('should handle API key errors', async () => {
      const authError = new Error('Invalid API key');
      authError.response = { status: 403 };
      
      axios.get.mockRejectedValue(authError);
      
      await expect(youtubeService.searchVideos('test query')).rejects.toThrow('Invalid API key');
    });
  });
});
