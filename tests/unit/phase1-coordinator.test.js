/**
 * Test Suite: Phase 1 Pipeline Coordinator
 * Pipeline Overhaul - Quality Issues Fix
 * 
 * Orchestrates RSS Discovery → Pre-Filter → Video Enrichment
 * for 88% API quota reduction and zero irrelevant matches.
 */

const Phase1Pipeline = require('../../tools/video-pipeline/phase1-coordinator');

// Mock all dependencies
jest.mock('../../tools/video-pipeline/1-discover-videos-rss');
jest.mock('../../tools/video-pipeline/2-prefilter-candidates');
jest.mock('../../tools/video-pipeline/3-enrich-videos');

describe('Phase1Pipeline', () => {
  let pipeline;
  let mockRssDiscovery;
  let mockPreFilter;
  let mockEnrichment;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mocks
    const RssDiscovery = require('../../tools/video-pipeline/1-discover-videos-rss');
    const PreFilter = require('../../tools/video-pipeline/2-prefilter-candidates');
    const VideoEnrichment = require('../../tools/video-pipeline/3-enrich-videos');

    mockRssDiscovery = {
      discoverVideos: jest.fn()
    };
    mockPreFilter = {
      filterCandidates: jest.fn()
    };
    mockEnrichment = {
      batchEnrichVideos: jest.fn(),
      getLastEnrichmentStats: jest.fn()
    };

    RssDiscovery.mockImplementation(() => mockRssDiscovery);
    PreFilter.mockImplementation(() => mockPreFilter);
    VideoEnrichment.mockImplementation(() => mockEnrichment);

    pipeline = new Phase1Pipeline();
  });

  describe('processAllChannels', () => {
    const mockRssVideos = [
      { id: 'rss1', title: 'Sicilian Defense Guide', channelTitle: 'Chess Channel' },
      { id: 'rss2', title: 'LIVE Tournament', channelTitle: 'Chess Channel' },
      { id: 'rss3', title: 'French Defense Analysis', channelTitle: 'Chess Channel' },
      { id: 'rss4', title: 'NFL Game Highlights', channelTitle: 'Sports Channel' }
    ];

    const mockFilteredCandidates = [
      { id: 'rss1', title: 'Sicilian Defense Guide' },
      { id: 'rss3', title: 'French Defense Analysis' }
    ];

    const mockEnrichedVideos = [
      {
        id: 'rss1',
        title: 'Sicilian Defense: Complete Guide',
        description: 'Learn the Sicilian Defense',
        viewCount: 25000,
        duration: 'PT15M30S'
      },
      {
        id: 'rss3',
        title: 'French Defense: Master Class',
        description: 'Master the French Defense',
        viewCount: 18000,
        duration: 'PT12M45S'
      }
    ];

    beforeEach(() => {
      mockRssDiscovery.discoverVideos.mockResolvedValue(mockRssVideos);
      mockPreFilter.filterCandidates.mockReturnValue({
        candidates: mockFilteredCandidates,
        totalInput: 4,
        totalCandidates: 2,
        rejectedCount: 2,
        reductionPercentage: 50
      });
      mockEnrichment.batchEnrichVideos.mockResolvedValue(mockEnrichedVideos);
      mockEnrichment.getLastEnrichmentStats.mockReturnValue({
        totalInput: 2,
        totalEnriched: 2,
        totalErrors: 0,
        apiCallsUsed: 1,
        successRate: 100
      });
    });

    it('should orchestrate the complete Phase 1 pipeline', async () => {
      const result = await pipeline.processAllChannels();

      expect(mockRssDiscovery.discoverVideos).toHaveBeenCalled();
      expect(mockPreFilter.filterCandidates).toHaveBeenCalledWith(mockRssVideos);
      expect(mockEnrichment.batchEnrichVideos).toHaveBeenCalledWith(mockFilteredCandidates);

      expect(result).toEqual({
        videos: mockEnrichedVideos,
        stats: {
          rssDiscovery: {
            totalVideosFound: 4
          },
          preFilter: {
            candidates: mockFilteredCandidates,
            totalInput: 4,
            totalCandidates: 2,
            rejectedCount: 2,
            reductionPercentage: 50
          },
          enrichment: {
            totalInput: 2,
            totalEnriched: 2,
            totalErrors: 0,
            apiCallsUsed: 1,
            successRate: 100
          },
          overall: {
            inputVideos: 4,
            finalVideos: 2,
            overallReduction: 50,
            apiQuotaSaved: expect.any(Number),
            oldSystemCost: expect.any(Number),
            newSystemCost: expect.any(Number),
            quotaEfficiency: expect.any(Number)
          }
        },
        success: true,
        timestamp: expect.any(String)
      });
    });

    it('should handle RSS discovery errors gracefully', async () => {
      mockRssDiscovery.discoverVideos.mockRejectedValue(new Error('RSS fetch failed'));

      const result = await pipeline.processAllChannels();

      expect(result.error).toBe('RSS Discovery failed: RSS fetch failed');
      expect(result.videos).toEqual([]);
    });

    it('should handle empty RSS results', async () => {
      mockRssDiscovery.discoverVideos.mockResolvedValue([]);
      mockPreFilter.filterCandidates.mockReturnValue({
        candidates: [],
        totalInput: 0,
        totalCandidates: 0,
        rejectedCount: 0,
        reductionPercentage: 0
      });

      const result = await pipeline.processAllChannels();

      expect(result.videos).toEqual([]);
      expect(result.stats.overall.inputVideos).toBe(0);
    });

    it('should handle pre-filter rejecting all videos', async () => {
      mockPreFilter.filterCandidates.mockReturnValue({
        candidates: [],
        totalInput: 4,
        totalCandidates: 0,
        rejectedCount: 4,
        reductionPercentage: 100
      });
      mockEnrichment.batchEnrichVideos.mockResolvedValue([]);

      const result = await pipeline.processAllChannels();

      expect(result.videos).toEqual([]);
      expect(result.stats.preFilter.reductionPercentage).toBe(100);
    });

    it('should handle enrichment failures gracefully', async () => {
      mockEnrichment.batchEnrichVideos.mockRejectedValue(new Error('API quota exceeded'));

      const result = await pipeline.processAllChannels();

      expect(result.error).toBe('Video Enrichment failed: API quota exceeded');
      expect(result.stats.preFilter).toBeDefined(); // Should still have pre-filter stats
    });
  });

  describe('performance targets', () => {
    it('should meet API quota reduction targets', async () => {
      // Simulate realistic scenario: 100 RSS videos -> 20 candidates -> 18 enriched
      const manyRssVideos = Array.from({ length: 100 }, (_, i) => ({
        id: `vid${i}`,
        title: i % 5 === 0 ? 'Chess Opening Guide' : 'LIVE Stream'
      }));

      const filteredCandidates = manyRssVideos.slice(0, 20); // 80% reduction

      mockRssDiscovery.discoverVideos.mockResolvedValue(manyRssVideos);
      mockPreFilter.filterCandidates.mockReturnValue({
        candidates: filteredCandidates,
        totalInput: 100,
        totalCandidates: 20,
        rejectedCount: 80,
        reductionPercentage: 80
      });
      mockEnrichment.batchEnrichVideos.mockResolvedValue(filteredCandidates.slice(0, 18));
      mockEnrichment.getLastEnrichmentStats.mockReturnValue({
        totalInput: 20,
        totalEnriched: 18,
        totalErrors: 2,
        apiCallsUsed: 1,
        successRate: 90
      });

      const result = await pipeline.processAllChannels();

      expect(result.stats.preFilter.reductionPercentage).toBeGreaterThanOrEqual(70);
      expect(result.stats.overall.apiQuotaSaved).toBeGreaterThan(0);
    });

    it('should process pipeline in under 30 seconds', async () => {
      mockRssDiscovery.discoverVideos.mockResolvedValue([
        { id: 'perf1', title: 'Chess Opening' }
      ]);
      mockPreFilter.filterCandidates.mockReturnValue({
        candidates: [{ id: 'perf1', title: 'Chess Opening' }],
        totalInput: 1,
        totalCandidates: 1,
        rejectedCount: 0,
        reductionPercentage: 0
      });
      mockEnrichment.batchEnrichVideos.mockResolvedValue([
        { id: 'perf1', title: 'Chess Opening: Complete' }
      ]);
      mockEnrichment.getLastEnrichmentStats.mockReturnValue({
        totalInput: 1,
        totalEnriched: 1,
        totalErrors: 0,
        apiCallsUsed: 1,
        successRate: 100
      });

      const startTime = Date.now();
      await pipeline.processAllChannels();
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(30000);
    });
  });

  describe('statistics and reporting', () => {
    it('should provide comprehensive pipeline statistics', async () => {
      mockRssDiscovery.discoverVideos.mockResolvedValue([
        { id: 'stat1', title: 'Chess Guide' },
        { id: 'stat2', title: 'LIVE Stream' }
      ]);
      mockPreFilter.filterCandidates.mockReturnValue({
        candidates: [{ id: 'stat1', title: 'Chess Guide' }],
        totalInput: 2,
        totalCandidates: 1,
        rejectedCount: 1,
        reductionPercentage: 50
      });
      mockEnrichment.batchEnrichVideos.mockResolvedValue([
        { id: 'stat1', title: 'Chess Guide: Enriched' }
      ]);
      mockEnrichment.getLastEnrichmentStats.mockReturnValue({
        totalInput: 1,
        totalEnriched: 1,
        totalErrors: 0,
        apiCallsUsed: 1,
        successRate: 100
      });

      const result = await pipeline.processAllChannels();

      expect(result.stats).toMatchObject({
        rssDiscovery: expect.objectContaining({
          totalVideosFound: expect.any(Number)
        }),
        preFilter: expect.objectContaining({
          reductionPercentage: expect.any(Number)
        }),
        enrichment: expect.objectContaining({
          successRate: expect.any(Number)
        }),
        overall: expect.objectContaining({
          overallReduction: expect.any(Number),
          apiQuotaSaved: expect.any(Number)
        })
      });
    });

    it('should calculate API quota savings correctly', async () => {
      // Old system would use 100 search API calls (100 units each) = 10,000 units
      // New system uses 1 enrichment call (1 unit per video) = 20 units
      const heavyLoad = Array.from({ length: 100 }, (_, i) => ({ id: `heavy${i}` }));
      const lightCandidates = heavyLoad.slice(0, 20);

      mockRssDiscovery.discoverVideos.mockResolvedValue(heavyLoad);
      mockPreFilter.filterCandidates.mockReturnValue({
        candidates: lightCandidates,
        totalInput: 100,
        totalCandidates: 20,
        rejectedCount: 80,
        reductionPercentage: 80
      });
      mockEnrichment.batchEnrichVideos.mockResolvedValue(lightCandidates);
      mockEnrichment.getLastEnrichmentStats.mockReturnValue({
        apiCallsUsed: 1,
        totalInput: 20,
        totalEnriched: 18,
        totalErrors: 2,
        successRate: 90
      });

      const result = await pipeline.processAllChannels();

      // Should save significant API quota: 100 videos * 100 units vs 1 API call = 9999 units saved
      expect(result.stats.overall.apiQuotaSaved).toBeGreaterThan(7000); // 80%+ savings
    });
  });

  describe('error handling and resilience', () => {
    it('should handle partial failures gracefully', async () => {
      mockRssDiscovery.discoverVideos.mockResolvedValue([
        { id: 'partial1', title: 'Good Video' },
        { id: 'partial2', title: 'Bad Video' }
      ]);
      mockPreFilter.filterCandidates.mockReturnValue({
        candidates: [{ id: 'partial1', title: 'Good Video' }],
        totalInput: 2,
        totalCandidates: 1,
        rejectedCount: 1,
        reductionPercentage: 50
      });
      mockEnrichment.batchEnrichVideos.mockResolvedValue([
        { id: 'partial1', title: 'Good Video: Enriched', enrichmentError: undefined },
        { id: 'partial2', enrichmentError: 'Failed to enrich' }
      ]);
      mockEnrichment.getLastEnrichmentStats.mockReturnValue({
        totalInput: 1,
        totalEnriched: 1,
        totalErrors: 0,
        successRate: 100
      });

      const result = await pipeline.processAllChannels();

      expect(result.videos).toHaveLength(2);
      expect(result.error).toBeUndefined();
    });

    it('should provide detailed error context', async () => {
      mockRssDiscovery.discoverVideos.mockRejectedValue(new Error('RSS fetch timeout'));

      const result = await pipeline.processAllChannels();

      expect(result.error).toContain('RSS Discovery failed');
      expect(result.error).toContain('RSS fetch timeout');
    });
  });
});
