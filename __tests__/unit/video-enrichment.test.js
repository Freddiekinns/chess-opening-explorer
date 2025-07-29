/**
 * Test Suite: Video Enrichment Service
 * Phase 1 of Pipeline Overhaul - Quality Issues Fix
 * 
 * Efficiently enriches pre-filtered candidates with YouTube API data
 * using batch requests and intelligent caching.
 */

const VideoEnrichment = require('../../tools/video-pipeline/3-enrich-videos');

// Mock YouTube API
jest.mock('googleapis', () => ({
  google: {
    youtube: jest.fn(() => ({
      videos: {
        list: jest.fn()
      }
    }))
  }
}));

describe('VideoEnrichment', () => {
  let enrichment;
  let mockYouTube;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup YouTube API mock
    const { google } = require('googleapis');
    mockYouTube = {
      videos: {
        list: jest.fn()
      }
    };
    google.youtube.mockReturnValue(mockYouTube);
    
    enrichment = new VideoEnrichment('test-api-key', { enableCache: false });
  });

  describe('enrichVideo', () => {
    const baseCandidateVideo = {
      id: 'test123',
      title: 'Sicilian Defense Guide',
      channelTitle: 'Saint Louis Chess Club',
      publishedAt: '2024-01-15T10:30:00Z'
    };

    it('should enrich video with YouTube API data', async () => {
      const mockApiResponse = {
        data: {
          items: [{
            id: 'test123',
            snippet: {
              title: 'Sicilian Defense: Complete Guide',
              description: 'Learn the Sicilian Defense with detailed analysis of key variations.',
              channelTitle: 'Saint Louis Chess Club',
              publishedAt: '2024-01-15T10:30:00Z',
              tags: ['chess', 'opening', 'sicilian', 'defense'],
              categoryId: '22'
            },
            contentDetails: {
              duration: 'PT15M30S'
            },
            statistics: {
              viewCount: '25000',
              likeCount: '890',
              commentCount: '145'
            }
          }]
        }
      };
      
      mockYouTube.videos.list.mockResolvedValue(mockApiResponse);

      const result = await enrichment.enrichVideo(baseCandidateVideo);

      expect(result).toEqual({
        id: 'test123',
        title: 'Sicilian Defense: Complete Guide',
        description: 'Learn the Sicilian Defense with detailed analysis of key variations.',
        channelTitle: 'Saint Louis Chess Club',
        publishedAt: '2024-01-15T10:30:00Z',
        duration: 'PT15M30S',
        tags: ['chess', 'opening', 'sicilian', 'defense'],
        categoryId: '22',
        viewCount: 25000,
        likeCount: 890,
        commentCount: 145,
        enrichedAt: expect.any(String)
      });
    });

    it('should handle API errors gracefully', async () => {
      mockYouTube.videos.list.mockRejectedValue(new Error('API Quota Exceeded'));

      const result = await enrichment.enrichVideo(baseCandidateVideo);

      expect(result).toEqual({
        ...baseCandidateVideo,
        enrichmentError: 'API Quota Exceeded',
        enrichedAt: expect.any(String)
      });
    });

    it('should handle videos not found in API', async () => {
      mockYouTube.videos.list.mockResolvedValue({ data: { items: [] } });

      const result = await enrichment.enrichVideo(baseCandidateVideo);

      expect(result).toEqual({
        ...baseCandidateVideo,
        enrichmentError: 'Video not found in YouTube API',
        enrichedAt: expect.any(String)
      });
    });

    it('should parse numeric statistics correctly', async () => {
      const responseWithStringStats = {
        data: {
          items: [{
            id: 'test123',
            snippet: {
              title: 'Test Video',
              channelTitle: 'Test Channel',
              publishedAt: '2024-01-15T10:30:00Z'
            },
            contentDetails: { duration: 'PT10M' },
            statistics: {
              viewCount: '1000000',
              likeCount: '50000',
              commentCount: '2500'
            }
          }]
        }
      };

      mockYouTube.videos.list.mockResolvedValue(responseWithStringStats);

      const result = await enrichment.enrichVideo(baseCandidateVideo);

      expect(result.viewCount).toBe(1000000);
      expect(result.likeCount).toBe(50000);
      expect(result.commentCount).toBe(2500);
    });

    it('should handle missing statistics gracefully', async () => {
      const responseWithMissingStats = {
        data: {
          items: [{
            id: 'test123',
            snippet: {
              title: 'Test Video',
              channelTitle: 'Test Channel',
              publishedAt: '2024-01-15T10:30:00Z'
            },
            contentDetails: { duration: 'PT10M' },
            statistics: {}
          }]
        }
      };

      mockYouTube.videos.list.mockResolvedValue(responseWithMissingStats);

      const result = await enrichment.enrichVideo(baseCandidateVideo);

      expect(result.viewCount).toBe(0);
      expect(result.likeCount).toBe(0);
      expect(result.commentCount).toBe(0);
    });
  });

  describe('batchEnrichVideos', () => {
    const candidateVideos = [
      { id: 'vid1', title: 'Sicilian Defense' },
      { id: 'vid2', title: 'French Defense' },
      { id: 'vid3', title: 'King\'s Indian Defense' }
    ];

    const mockBatchResponse = {
      data: {
        items: [
          {
            id: 'vid1',
            snippet: { title: 'Sicilian Defense Guide', channelTitle: 'Chess Channel', publishedAt: '2024-01-15T10:30:00Z' },
            contentDetails: { duration: 'PT15M' },
            statistics: { viewCount: '10000', likeCount: '200', commentCount: '50' }
          },
          {
            id: 'vid2',
            snippet: { title: 'French Defense Masterclass', channelTitle: 'Chess Channel', publishedAt: '2024-01-15T10:30:00Z' },
            contentDetails: { duration: 'PT20M' },
            statistics: { viewCount: '15000', likeCount: '300', commentCount: '75' }
          }
        ]
      }
    };

    it('should enrich multiple videos in batch', async () => {
      mockYouTube.videos.list.mockResolvedValue(mockBatchResponse);

      const result = await enrichment.batchEnrichVideos(candidateVideos);

      expect(mockYouTube.videos.list).toHaveBeenCalledWith({
        part: ['snippet', 'contentDetails', 'statistics'],
        id: ['vid1', 'vid2', 'vid3']
      });

      expect(result).toHaveLength(3);
      expect(result[0].title).toBe('Sicilian Defense Guide');
      expect(result[1].title).toBe('French Defense Masterclass');
      expect(result[2].enrichmentError).toBe('Video not found in YouTube API');
    });

    it('should handle large batches by chunking requests', async () => {
      const manyVideos = Array.from({ length: 75 }, (_, i) => ({ id: `vid${i}` }));
      
      mockYouTube.videos.list.mockResolvedValue({ data: { items: [] } });

      await enrichment.batchEnrichVideos(manyVideos);

      // Should make 2 calls: 50 + 25
      expect(mockYouTube.videos.list).toHaveBeenCalledTimes(2);
    });

    it('should return statistics about enrichment process', async () => {
      mockYouTube.videos.list.mockResolvedValue(mockBatchResponse);

      const result = await enrichment.batchEnrichVideos(candidateVideos);

      const stats = enrichment.getLastEnrichmentStats();
      expect(stats).toEqual({
        totalInput: 3,
        totalEnriched: 2,
        totalErrors: 1,
        apiCallsUsed: 1,
        successRate: expect.closeTo(66.67, 0.1),
        duration: expect.any(Number)
      });
    });
  });

  describe('caching functionality', () => {
    const testVideo = { id: 'cached123', title: 'Test Video' };
    const cachedData = {
      id: 'cached123',
      title: 'Cached Video Data',
      enrichedAt: new Date().toISOString()
    };

  describe('caching functionality', () => {
    const testVideo = { id: 'cached123', title: 'Test Video' };

    it('should use cached data when available and fresh', async () => {
      // Create enrichment with caching enabled and mock file system
      const fs = require('fs');
      const originalExistsSync = fs.existsSync;
      const originalReadFileSync = fs.readFileSync;
      
      const freshCacheData = {
        cached123: {
          id: 'cached123',
          title: 'Cached Video Data',
          enrichedAt: new Date().toISOString()
        }
      };
      
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockReturnValue(JSON.stringify(freshCacheData));
      
      const enrichmentWithCache = new VideoEnrichment('test-key', { enableCache: true });
      const result = await enrichmentWithCache.enrichVideo(testVideo);

      expect(result.title).toBe('Cached Video Data');
      expect(mockYouTube.videos.list).not.toHaveBeenCalled();
      
      // Restore original functions
      fs.existsSync = originalExistsSync;
      fs.readFileSync = originalReadFileSync;
    });

    it('should bypass cache for stale data', async () => {
      const fs = require('fs');
      const originalExistsSync = fs.existsSync;
      const originalReadFileSync = fs.readFileSync;
      const originalWriteFileSync = fs.writeFileSync;
      
      const staleCacheData = {
        cached123: {
          id: 'cached123',
          title: 'Stale Cached Data',
          enrichedAt: '2023-01-01T00:00:00Z' // Stale cache
        }
      };
      
      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.readFileSync = jest.fn().mockReturnValue(JSON.stringify(staleCacheData));
      fs.writeFileSync = jest.fn();

      mockYouTube.videos.list.mockResolvedValue({
        data: {
          items: [{
            id: testVideo.id,
            snippet: { title: 'Fresh API Data', channelTitle: 'Test', publishedAt: '2024-01-15T10:30:00Z' },
            contentDetails: { duration: 'PT10M' },
            statistics: { viewCount: '1000', likeCount: '100', commentCount: '10' }
          }]
        }
      });

      const enrichmentWithStaleCache = new VideoEnrichment('test-key', { enableCache: true });
      const result = await enrichmentWithStaleCache.enrichVideo(testVideo);

      expect(result.title).toBe('Fresh API Data');
      expect(mockYouTube.videos.list).toHaveBeenCalled();
      
      // Restore original functions
      fs.existsSync = originalExistsSync;
      fs.readFileSync = originalReadFileSync;
      fs.writeFileSync = originalWriteFileSync;
    });
  });
  });

  describe('performance requirements', () => {
    it('should enrich 50 videos in under 5 seconds', async () => {
      const manyVideos = Array.from({ length: 50 }, (_, i) => ({ id: `perf${i}` }));
      
      mockYouTube.videos.list.mockResolvedValue({ data: { items: [] } });

      const startTime = Date.now();
      await enrichment.batchEnrichVideos(manyVideos);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000);
    });

    it('should handle API rate limiting gracefully', async () => {
      const videos = [{ id: 'rate1' }, { id: 'rate2' }];
      
      mockYouTube.videos.list
        .mockRejectedValueOnce(new Error('quotaExceeded'))
        .mockResolvedValueOnce({ data: { items: [] } });

      const result = await enrichment.batchEnrichVideos(videos);

      expect(result).toHaveLength(2);
      expect(result.some(v => v.enrichmentError)).toBe(true);
    });
  });

  describe('quality validation', () => {
    it('should validate enriched video data structure', async () => {
      const mockResponse = {
        data: {
          items: [{
            id: 'valid123',
            snippet: {
              title: 'Valid Video',
              channelTitle: 'Valid Channel',
              publishedAt: '2024-01-15T10:30:00Z',
              description: 'Valid description'
            },
            contentDetails: { duration: 'PT10M' },
            statistics: { viewCount: '1000' }
          }]
        }
      };

      mockYouTube.videos.list.mockResolvedValue(mockResponse);

      const result = await enrichment.enrichVideo({ id: 'valid123' });

      expect(result).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        channelTitle: expect.any(String),
        publishedAt: expect.any(String),
        duration: expect.any(String),
        viewCount: expect.any(Number),
        enrichedAt: expect.any(String)
      });
    });

    it('should handle malformed API responses', async () => {
      mockYouTube.videos.list.mockResolvedValue({ data: null });

      const result = await enrichment.enrichVideo({ id: 'malformed123' });

      expect(result.enrichmentError).toContain('Invalid API response structure');
    });
  });
});
