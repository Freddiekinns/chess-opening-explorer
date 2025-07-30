const VideoAccessService = require('../src/services/video-access-service');
const fs = require('fs');
const path = require('path');

describe('VideoAccessService', () => {
  let service;
  const mockVideoData = {
    fen: "test-fen",
    videos: [
      {
        id: "test-video-1",
        title: "Test Video",
        channel: "Test Channel",
        duration: 300,
        views: 1000,
        published: "2023-01-01T00:00:00Z",
        thumbnail: "https://example.com/thumb.jpg",
        url: "https://youtube.com/watch?v=test",
        score: 100
      }
    ]
  };

  beforeEach(() => {
    service = new VideoAccessService();
    service.clearCache();
  });

  describe('sanitizeFEN', () => {
    it('should sanitize FEN string correctly', () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const result = service.sanitizeFEN(fen);
      expect(result).toBe('rnbqkbnr_pppppppp_8_8_8_8_pppppppp_rnbqkbnr-w-kqkq---0-1');
    });

    it('should throw error for invalid input', () => {
      expect(() => service.sanitizeFEN('')).toThrow('FEN must be a non-empty string');
      expect(() => service.sanitizeFEN(null)).toThrow('FEN must be a non-empty string');
    });
  });

  describe('getVideosForPosition', () => {
    beforeEach(() => {
      // Mock file system
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockVideoData));
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return videos for existing position', async () => {
      const videos = await service.getVideosForPosition('test-fen');
      expect(videos).toHaveLength(1);
      expect(videos[0]).toMatchObject({
        id: 'test-video-1',
        title: 'Test Video'
      });
    });

    it('should return empty array for non-existent position', async () => {
      fs.existsSync.mockReturnValue(false);
      const videos = await service.getVideosForPosition('non-existent-fen');
      expect(videos).toHaveLength(0);
    });

    it('should cache results', async () => {
      await service.getVideosForPosition('test-fen');
      await service.getVideosForPosition('test-fen');
      
      // Should only read file once due to caching
      expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid JSON gracefully', async () => {
      fs.readFileSync.mockReturnValue('invalid json');
      const videos = await service.getVideosForPosition('test-fen');
      expect(videos).toHaveLength(0);
    });
  });

  describe('cache management', () => {
    it('should manage cache size', async () => {
      service.maxCacheSize = 2;
      
      // Mock different files
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockVideoData));
      
      // Fill cache beyond limit
      await service.getVideosForPosition('fen1');
      await service.getVideosForPosition('fen2');
      await service.getVideosForPosition('fen3'); // Should trigger cleanup
      
      expect(service.videoCache.size).toBeLessThanOrEqual(2);
    });
  });
});
