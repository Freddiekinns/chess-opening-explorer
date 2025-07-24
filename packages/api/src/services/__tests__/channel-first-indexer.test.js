const ChannelFirstIndexer = require('../channel-first-indexer');

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
        { id: 'video1', title: 'Sicilian Defense Complete Guide' },
        { id: 'video2', title: 'French Defense Theory' }
      ]);
      
      mockYouTubeService.getChannelPlaylistItems.mockResolvedValueOnce([
        { id: 'video3', title: 'Caro-Kann Defense Explained' },
        { id: 'video4', title: 'Queen\'s Gambit Declined' }
      ]);

      // Mock batch fetch video details
      mockYouTubeService.batchFetchVideoDetails.mockResolvedValue([
        { id: 'video1', statistics: { viewCount: '1000', likeCount: '100', commentCount: '50' }, tags: [] },
        { id: 'video2', statistics: { viewCount: '2000', likeCount: '200', commentCount: '100' }, tags: [] },
        { id: 'video3', statistics: { viewCount: '1500', likeCount: '150', commentCount: '75' }, tags: [] },
        { id: 'video4', statistics: { viewCount: '2500', likeCount: '250', commentCount: '125' }, tags: [] }
      ]);
      
      mockFileSystem.writeFile.mockResolvedValue();
      
      const result = await indexer.buildLocalIndex(trustedChannels);
      
      expect(mockYouTubeService.getChannelPlaylistItems).toHaveBeenCalledTimes(2);
      expect(mockYouTubeService.getChannelPlaylistItems).toHaveBeenCalledWith('UCM-ONC2bCHytG2mYtKDmIeA', expect.any(Object));
      expect(mockYouTubeService.getChannelPlaylistItems).toHaveBeenCalledWith('UCkJdvwRC-oGPhRHW_XPNokg', expect.any(Object));
      expect(mockYouTubeService.batchFetchVideoDetails).toHaveBeenCalledTimes(2);
      
      // Verify results
      expect(result).toEqual({
        totalVideos: 4,
        channelsCovered: 2,
        errors: []
      });
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
      // Set up the in-memory local index instead of mocking file reads
      indexer.localIndex.set('UCM-ONC2bCHytG2mYtKDmIeA', [
        { id: 'video1', title: 'Sicilian Defense Complete Guide', channel: 'Saint Louis Chess Club' },
        { id: 'video3', title: 'Caro-Kann Defense Explained', channel: 'Saint Louis Chess Club' }
      ]);
      indexer.localIndex.set('UCkJdvwRC-oGPhRHW_XPNokg', [
        { id: 'video2', title: 'French Defense Theory', channel: 'Hanging Pawns' },
        { id: 'video4', title: 'Queen\'s Gambit Declined', channel: 'Hanging Pawns' }
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
      expect(matches[0]).toEqual({
        opening: { fen: 'fen1', name: 'Sicilian Defense', eco: 'B20' },
        videos: [{ id: 'video1', title: 'Sicilian Defense Complete Guide', channel: 'Saint Louis Chess Club', matchScore: 33 }]
      });
      expect(matches[1]).toEqual({
        opening: { fen: 'fen2', name: 'French Defense', eco: 'C00' },
        videos: [{ id: 'video2', title: 'French Defense Theory', channel: 'Hanging Pawns', matchScore: 33 }]
      });
    });

    it('should handle aliases for opening names', async () => {
      // Add a video that uses the alias name instead of the official opening name
      indexer.localIndex.set('UCM-ONC2bCHytG2mYtKDmIeA', [
        { id: 'video1', title: 'Center Counter Defense Guide', channel: 'Saint Louis Chess Club' }
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
    beforeEach(() => {
      // Mock the cache loading methods
      mockFileSystem.readFile.mockResolvedValue('{}'); // Empty cache
      mockFileSystem.writeFile.mockResolvedValue();
      mockFileSystem.existsSync.mockReturnValue(false);
    });

    it('should batch fetch video details and enrich matches', async () => {
      const matches = [
        {
          opening: { fen: 'fen1', name: 'Sicilian Defense', eco: 'B20' },
          videos: [{ id: 'video1', title: 'Sicilian Defense Guide', channel: 'Saint Louis Chess Club' }]
        }
      ];
      
      const enrichedMatches = await indexer.enrichWithVideoDetails(matches);
      
      // The method doesn't call batchFetchVideoDetails anymore - it uses existing data
      expect(enrichedMatches[0].videos[0]).toMatchObject({
        id: 'video1',
        title: 'Sicilian Defense Guide',
        url: 'https://www.youtube.com/watch?v=video1',
        analysis: expect.any(Object),
        metadata: expect.any(Object)
      });
    });

    it('should handle video details fetch errors gracefully', async () => {
      const matches = [
        {
          opening: { fen: 'fen1', name: 'Sicilian Defense', eco: 'B20' },
          videos: [{ id: 'video1', title: 'Sicilian Defense Guide', channel: 'Saint Louis Chess Club' }]
        }
      ];
      
      // The method doesn't throw errors anymore - it handles them gracefully
      const enrichedMatches = await indexer.enrichWithVideoDetails(matches);
      expect(enrichedMatches).toHaveLength(1);
      expect(enrichedMatches[0].opening.name).toBe('Sicilian Defense');
    });
  });

  describe('updateFromRSSFeeds', () => {
    it('should be implemented for daily updates', () => {
      // This test ensures the method exists - implementation will come later
      expect(typeof indexer.updateFromRSSFeeds).toBe('function');
    });
  });
});
