const ChannelFirstIndexer = require('../../src/services/channel-first-indexer');

describe('ChannelFirstIndexer', () => {
  let indexer;
  let mockYouTubeService;
  let mockFileSystem;

  beforeEach(() => {
    mockYouTubeService = {
      getChannelPlaylistItems: jest.fn(),
      batchFetchVideoDetails: jest.fn(),
      quotaUsed: 0
    };
    
    mockFileSystem = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      existsSync: jest.fn(),
      mkdir: jest.fn()
    };
    
    indexer = new ChannelFirstIndexer({
      youtubeService: mockYouTubeService,
      fileSystem: mockFileSystem
    });
    
    // Clear any existing cache
    indexer._enrichmentCache = null;
  });

  describe('buildLocalIndex', () => {
    it('should fetch all videos from trusted channels and build local index', async () => {
      // Mock channel configuration
      const trustedChannels = [
        { name: 'Saint Louis Chess Club', channel_id: 'UCM-ONC2bCHytG2mYtKDmIeA' },
        { name: 'Hanging Pawns', channel_id: 'UCkJdvwRC-oGPhRHW_XPNokg' }
      ];
      
      // Mock playlist items response
      mockYouTubeService.getChannelPlaylistItems.mockResolvedValueOnce([
        { 
          id: 'video1', 
          title: 'Sicilian Defense Complete Guide',
          description: 'Learn the Sicilian Defense opening in chess'
        },
        { 
          id: 'video2', 
          title: 'French Defense Theory',
          description: 'Complete guide to French Defense theory and practice'
        }
      ]);
      
      mockYouTubeService.getChannelPlaylistItems.mockResolvedValueOnce([
        { 
          id: 'video3', 
          title: 'Caro-Kann Defense Explained',
          description: 'Understanding the Caro-Kann Defense opening'
        },
        { 
          id: 'video4', 
          title: 'Queen\'s Gambit Declined',
          description: 'Master the Queen\'s Gambit Declined opening'
        }
      ]);

      // Mock batch fetch video details for both channels
      mockYouTubeService.batchFetchVideoDetails.mockResolvedValueOnce([
        { id: 'video1', statistics: { viewCount: '1000', likeCount: '100', commentCount: '50' }, tags: [] },
        { id: 'video2', statistics: { viewCount: '2000', likeCount: '200', commentCount: '100' }, tags: [] }
      ]);
      
      mockYouTubeService.batchFetchVideoDetails.mockResolvedValueOnce([
        { id: 'video3', statistics: { viewCount: '1500', likeCount: '150', commentCount: '75' }, tags: [] },
        { id: 'video4', statistics: { viewCount: '2500', likeCount: '250', commentCount: '125' }, tags: [] }
      ]);
      
      mockFileSystem.writeFile.mockResolvedValue();
      
      const result = await indexer.buildLocalIndex(trustedChannels);
      
      expect(mockYouTubeService.getChannelPlaylistItems).toHaveBeenCalledTimes(2);
      expect(mockYouTubeService.getChannelPlaylistItems).toHaveBeenCalledWith('UCM-ONC2bCHytG2mYtKDmIeA', {
        maxResults: 'all',
        order: 'date',
        publishedAfter: expect.any(String)
      });
      expect(mockYouTubeService.getChannelPlaylistItems).toHaveBeenCalledWith('UCkJdvwRC-oGPhRHW_XPNokg', {
        maxResults: 'all',
        order: 'date',
        publishedAfter: expect.any(String)
      });
      
      // Verify results
      expect(result).toEqual({
        totalVideos: 4,
        channelsCovered: 2,
        errors: []
      });
      
      // Verify local index was populated
      expect(indexer.localIndex.size).toBe(2);
      expect(indexer.localIndex.get('UCM-ONC2bCHytG2mYtKDmIeA')).toHaveLength(2);
      expect(indexer.localIndex.get('UCkJdvwRC-oGPhRHW_XPNokg')).toHaveLength(2);
    });

    it('should handle API errors gracefully', async () => {
      const trustedChannels = [
        { name: 'Saint Louis Chess Club', channel_id: 'UCM-ONC2bCHytG2mYtKDmIeA' }
      ];
      
      mockYouTubeService.getChannelPlaylistItems.mockRejectedValue(
        new Error('API rate limit exceeded')
      );
      
      await expect(indexer.buildLocalIndex(trustedChannels)).rejects.toThrow('API rate limit exceeded');
    });
  });

  describe('matchOpeningsToVideos', () => {
    beforeEach(() => {
      // Populate the local index with mock data
      indexer.localIndex.set('UCM-ONC2bCHytG2mYtKDmIeA', [
        { 
          id: 'video1', 
          title: 'Sicilian Defense Complete Guide', 
          description: 'Learn the Sicilian Defense opening in chess',
          channel: 'Saint Louis Chess Club' 
        },
        { 
          id: 'video3', 
          title: 'Caro-Kann Defense Explained', 
          description: 'Understanding the Caro-Kann Defense opening',
          channel: 'Saint Louis Chess Club' 
        }
      ]);
      
      indexer.localIndex.set('UCkJdvwRC-oGPhRHW_XPNokg', [
        { 
          id: 'video2', 
          title: 'French Defense Theory', 
          description: 'Complete guide to French Defense theory and practice',
          channel: 'Hanging Pawns' 
        },
        { 
          id: 'video4', 
          title: 'Queen\'s Gambit Declined', 
          description: 'Master the Queen\'s Gambit Declined opening',
          channel: 'Hanging Pawns' 
        }
      ]);
    });

    it('should match openings to videos using fuzzy string matching', async () => {
      const openings = [
        { fen: 'fen1', name: 'Sicilian Defense', eco: 'B20' },
        { fen: 'fen2', name: 'French Defense', eco: 'C00' },
        { fen: 'fen3', name: 'English Opening', eco: 'A10' }
      ];
      
      const matches = await indexer.matchOpeningsToVideos(openings);
      
      expect(matches).toHaveLength(2); // Sicilian and French should match
      
      // Verify Sicilian Defense match (should be first with highest score)
      expect(matches[0].opening).toEqual({ fen: 'fen1', name: 'Sicilian Defense', eco: 'B20' });
      expect(matches[0].videos.length).toBeGreaterThan(0);
      expect(matches[0].videos[0]).toMatchObject({
        id: 'video1',
        title: 'Sicilian Defense Complete Guide',
        channel: 'Saint Louis Chess Club',
        description: 'Learn the Sicilian Defense opening in chess',
        matchScore: expect.any(Number)
      });
      
      // Verify French Defense match  
      expect(matches[1].opening).toEqual({ fen: 'fen2', name: 'French Defense', eco: 'C00' });
      expect(matches[1].videos.length).toBeGreaterThan(0);
      expect(matches[1].videos[0]).toMatchObject({
        id: 'video2',
        title: 'French Defense Theory',
        channel: 'Hanging Pawns',
        description: 'Complete guide to French Defense theory and practice',
        matchScore: expect.any(Number)
      });
    });

    it('should handle aliases for opening names', async () => {
      // Clear existing index and add specific test data
      indexer.localIndex.clear();
      indexer.localIndex.set('UCM-ONC2bCHytG2mYtKDmIeA', [
        { 
          id: 'video1', 
          title: 'Center Counter Defense Guide', 
          description: 'Learn the Center Counter Defense opening',
          channel: 'Saint Louis Chess Club' 
        }
      ]);
      
      const openings = [
        { fen: 'fen1', name: 'Scandinavian Defense', eco: 'B01', aliases: ['Center Counter Defense'] }
      ];
      
      const matches = await indexer.matchOpeningsToVideos(openings);
      
      expect(matches).toHaveLength(1);
      expect(matches[0].videos[0].title).toBe('Center Counter Defense Guide');
    });

    it('should return empty array when no matches found', async () => {
      const openings = [
        { fen: 'fen1', name: 'Obscure Opening', eco: 'A00' }
      ];
      
      const matches = await indexer.matchOpeningsToVideos(openings);
      
      expect(matches).toHaveLength(0);
    });
  });

  describe('enrichWithVideoDetails', () => {
    it('should enrich videos using existing data without API calls', async () => {
      const matches = [
        {
          opening: { fen: 'fen1', name: 'Sicilian Defense', eco: 'B20' },
          videos: [{
            id: 'video1',
            title: 'Sicilian Defense Guide',
            description: 'Learn the basics of the Sicilian Defense',
            publishedAt: '2023-01-01T00:00:00Z',
            channelId: 'UCM-ONC2bCHytG2mYtKDmIeA',
            channelTitle: 'Saint Louis Chess Club',
            thumbnails: { medium: { url: 'http://example.com/thumb.jpg' } }
          }]
        }
      ];
      
      // Mock file system for cache operations - return empty cache
      mockFileSystem.existsSync.mockReturnValue(false);
      mockFileSystem.readFile.mockRejectedValue(new Error('No cache file'));
      mockFileSystem.writeFile.mockResolvedValue();
      mockFileSystem.mkdir.mockResolvedValue();
      
      const enrichedMatches = await indexer.enrichWithVideoDetails(matches, {
        progressCallback: null // Disable progress callback for testing
      });
      
      // Should NOT call batchFetchVideoDetails (we use existing data)
      expect(mockYouTubeService.batchFetchVideoDetails).not.toHaveBeenCalled();
      
      expect(enrichedMatches[0].videos[0]).toEqual({
        id: 'video1',
        title: 'Sicilian Defense Guide',
        description: 'Learn the basics of the Sicilian Defense',
        publishedAt: '2023-01-01T00:00:00Z',
        channelId: 'UCM-ONC2bCHytG2mYtKDmIeA',
        channelTitle: 'Saint Louis Chess Club',
        thumbnails: { medium: { url: 'http://example.com/thumb.jpg' } },
        url: 'https://www.youtube.com/watch?v=video1',
        analysis: {
          relevanceScore: 0,
          difficultyLevel: 'intermediate',
          contentType: 'general',
          instructorQuality: 'medium'
        },
        metadata: {
          indexedAt: expect.any(String),
          source: 'channel-first-indexer',
          version: '1.0.0',
          cached: false
        }
      });
    });

    it('should handle cache errors gracefully and still enrich videos', async () => {
      const matches = [
        {
          opening: { fen: 'fen1', name: 'Sicilian Defense', eco: 'B20' },
          videos: [{
            id: 'video1',
            title: 'Sicilian Defense Guide',
            description: 'Learn the basics',
            publishedAt: '2023-01-01T00:00:00Z',
            channelId: 'UCM-ONC2bCHytG2mYtKDmIeA',
            channelTitle: 'Saint Louis Chess Club',
            thumbnails: { medium: { url: 'http://example.com/thumb.jpg' } }
          }]
        }
      ];
      
      // Mock file system for cache operations - return empty cache but fail on write
      mockFileSystem.existsSync.mockReturnValue(false);
      mockFileSystem.readFile.mockRejectedValue(new Error('No cache file'));
      mockFileSystem.writeFile.mockRejectedValue(new Error('Write failed'));
      // Mock mkdir as undefined to trigger the error we see in the logs
      mockFileSystem.mkdir = undefined;
      
      // The method should handle cache errors gracefully and still enrich videos
      const enrichedMatches = await indexer.enrichWithVideoDetails(matches, {
        progressCallback: null // Disable progress callback for testing
      });
      
      // Should still enrich videos even if cache fails
      expect(enrichedMatches[0].videos[0]).toEqual({
        id: 'video1',
        title: 'Sicilian Defense Guide',
        description: 'Learn the basics',
        publishedAt: '2023-01-01T00:00:00Z',
        channelId: 'UCM-ONC2bCHytG2mYtKDmIeA',
        channelTitle: 'Saint Louis Chess Club',
        thumbnails: { medium: { url: 'http://example.com/thumb.jpg' } },
        url: 'https://www.youtube.com/watch?v=video1',
        analysis: {
          relevanceScore: 0,
          difficultyLevel: 'intermediate',
          contentType: 'general',
          instructorQuality: 'medium'
        },
        metadata: {
          indexedAt: expect.any(String),
          source: 'channel-first-indexer',
          version: '1.0.0',
          cached: false
        }
      });
    });
  });

  describe('updateFromRSSFeeds', () => {
    it('should be implemented for daily updates', () => {
      // This test ensures the method exists - implementation will come later
      expect(typeof indexer.updateFromRSSFeeds).toBe('function');
    });
  });
});
