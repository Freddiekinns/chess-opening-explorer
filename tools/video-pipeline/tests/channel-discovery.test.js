/**
 * Test Suite: Channel Discovery
 * Tests for the full-catalogue YouTube API discovery module
 */

const ChannelDiscovery = require('../lib/channel-discovery');

// Mock axios
jest.mock('axios', () => ({
  get: jest.fn(),
}));

const axios = require('axios');

describe('ChannelDiscovery', () => {
  let discovery;

  beforeEach(() => {
    discovery = new ChannelDiscovery('test-api-key', {
      requestDelay: 0, // No delay in tests
      configPath: '/fake/path.json',
    });
    jest.clearAllMocks();
  });

  describe('channelToPlaylistId', () => {
    it('should convert UC prefix to UU prefix', () => {
      expect(discovery.channelToPlaylistId('UCabcdef123')).toBe('UUabcdef123');
    });

    it('should return unchanged if not UC prefix', () => {
      expect(discovery.channelToPlaylistId('PLsomething')).toBe('PLsomething');
    });
  });

  describe('fetchChannelVideos', () => {
    it('should fetch videos from a single page', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          items: [
            {
              snippet: {
                resourceId: { videoId: 'vid1' },
                title: 'Test Video 1',
                publishedAt: '2024-01-01T00:00:00Z',
                channelTitle: 'Test Channel',
              },
            },
            {
              snippet: {
                resourceId: { videoId: 'vid2' },
                title: 'Test Video 2',
                publishedAt: '2024-01-02T00:00:00Z',
                channelTitle: 'Test Channel',
              },
            },
          ],
          nextPageToken: undefined,
        },
      });

      const videos = await discovery.fetchChannelVideos('UCtest123', 'premium');

      expect(videos).toHaveLength(2);
      expect(videos[0]).toEqual({
        id: 'vid1',
        title: 'Test Video 1',
        publishedAt: '2024-01-01T00:00:00Z',
        channelTitle: 'Test Channel',
        channelId: 'UCtest123',
        qualityTier: 'premium',
      });

      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining('playlistItems'),
        expect.objectContaining({
          params: expect.objectContaining({
            playlistId: 'UUtest123',
            key: 'test-api-key',
          }),
        })
      );
    });

    it('should handle pagination across multiple pages', async () => {
      // Page 1
      axios.get.mockResolvedValueOnce({
        data: {
          items: [
            {
              snippet: {
                resourceId: { videoId: 'vid1' },
                title: 'Video 1',
                publishedAt: '2024-01-01T00:00:00Z',
                channelTitle: 'Channel',
              },
            },
          ],
          nextPageToken: 'page2token',
        },
      });

      // Page 2
      axios.get.mockResolvedValueOnce({
        data: {
          items: [
            {
              snippet: {
                resourceId: { videoId: 'vid2' },
                title: 'Video 2',
                publishedAt: '2024-01-02T00:00:00Z',
                channelTitle: 'Channel',
              },
            },
          ],
          nextPageToken: undefined,
        },
      });

      const videos = await discovery.fetchChannelVideos('UCtest', 'standard');

      expect(videos).toHaveLength(2);
      expect(axios.get).toHaveBeenCalledTimes(2);

      // Verify second call includes pageToken
      expect(axios.get.mock.calls[1][1].params.pageToken).toBe('page2token');
    });

    it('should respect rate limiting delay', async () => {
      const delayDiscovery = new ChannelDiscovery('key', { requestDelay: 50 });

      // Page 1 with next page
      axios.get.mockResolvedValueOnce({
        data: {
          items: [
            {
              snippet: {
                resourceId: { videoId: 'v1' },
                title: 'V1',
                publishedAt: '2024-01-01T00:00:00Z',
                channelTitle: 'C',
              },
            },
          ],
          nextPageToken: 'next',
        },
      });

      // Page 2
      axios.get.mockResolvedValueOnce({
        data: {
          items: [],
          nextPageToken: undefined,
        },
      });

      const start = Date.now();
      await delayDiscovery.fetchChannelVideos('UCtest', 'standard');
      const elapsed = Date.now() - start;

      // Should have waited at least 50ms between requests
      expect(elapsed).toBeGreaterThanOrEqual(40); // Allow small timing variance
    });

    it('should handle API errors', async () => {
      axios.get.mockRejectedValueOnce(new Error('API quota exceeded'));

      await expect(discovery.fetchChannelVideos('UCtest', 'standard')).rejects.toThrow(
        'API quota exceeded'
      );
    });

    it('should skip items with missing videoId', async () => {
      axios.get.mockResolvedValueOnce({
        data: {
          items: [
            { snippet: { title: 'No Resource ID' } },
            {
              snippet: {
                resourceId: { videoId: 'valid' },
                title: 'Valid',
                publishedAt: '2024-01-01T00:00:00Z',
                channelTitle: 'C',
              },
            },
          ],
        },
      });

      const videos = await discovery.fetchChannelVideos('UCtest', 'standard');
      expect(videos).toHaveLength(1);
      expect(videos[0].id).toBe('valid');
    });
  });

  describe('discoverAllVideos', () => {
    it('should discover videos from multiple channels', async () => {
      const channels = [
        { name: 'Channel A', channel_id: 'UCA', quality_tier: 'premium' },
        { name: 'Channel B', channel_id: 'UCB', quality_tier: 'standard' },
      ];

      // Channel A
      axios.get.mockResolvedValueOnce({
        data: {
          items: [
            {
              snippet: {
                resourceId: { videoId: 'a1' },
                title: 'A1',
                publishedAt: '2024-01-01T00:00:00Z',
                channelTitle: 'Channel A',
              },
            },
          ],
        },
      });

      // Channel B
      axios.get.mockResolvedValueOnce({
        data: {
          items: [
            {
              snippet: {
                resourceId: { videoId: 'b1' },
                title: 'B1',
                publishedAt: '2024-01-02T00:00:00Z',
                channelTitle: 'Channel B',
              },
            },
          ],
        },
      });

      const result = await discovery.discoverAllVideos(channels);

      expect(result.totalVideos).toBe(2);
      expect(result.channelsCovered).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(result.videos).toHaveLength(2);
    });

    it('should handle errors for individual channels gracefully', async () => {
      const channels = [
        { name: 'Good Channel', channel_id: 'UCgood', quality_tier: 'standard' },
        { name: 'Bad Channel', channel_id: 'UCbad', quality_tier: 'standard' },
      ];

      // Good channel
      axios.get.mockResolvedValueOnce({
        data: {
          items: [
            {
              snippet: {
                resourceId: { videoId: 'g1' },
                title: 'G1',
                publishedAt: '2024-01-01T00:00:00Z',
                channelTitle: 'Good',
              },
            },
          ],
        },
      });

      // Bad channel
      axios.get.mockRejectedValueOnce(new Error('Channel not found'));

      const result = await discovery.discoverAllVideos(channels);

      expect(result.totalVideos).toBe(1);
      expect(result.channelsCovered).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].channelId).toBe('UCbad');
    });

    it('should return output shape matching RSS discovery', async () => {
      const channels = [];
      const result = await discovery.discoverAllVideos(channels);

      expect(result).toHaveProperty('videos');
      expect(result).toHaveProperty('totalVideos');
      expect(result).toHaveProperty('channelsCovered');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.videos)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });
});
