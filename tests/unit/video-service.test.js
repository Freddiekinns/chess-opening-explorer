/**
 * Test for VideoAccessService
 */

const VideoAccessService = require('../../packages/api/src/services/video-access-service');

// Mock the file system module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  readdirSync: jest.fn()
}));

const fs = require('fs');

describe('VideoAccessService', () => {
  let service;
  let mockVideoDir;

  beforeEach(() => {
    jest.clearAllMocks();
    mockVideoDir = '/mock/video/dir';
    service = new VideoAccessService(mockVideoDir);
    
    // Mock fs.existsSync with default behavior (can be overridden in individual tests)
    fs.existsSync.mockReturnValue(false);
    
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
    it('should return empty array for position without videos', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      fs.existsSync.mockReturnValue(false);
      
      const videos = await service.getVideosForPosition(fen);
      expect(videos).toEqual([]);
    });

    it('should return videos for position with videos', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
      const mockVideoData = {
        fen: fen,
        name: 'Kings Pawn Opening',
        videos: [{
          title: 'Test Opening Video',
          url: 'https://youtube.com/watch?v=test123',
          channel: 'Test Channel'
        }]
      };
      
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify(mockVideoData));
      
      const videos = await service.getVideosForPosition(fen);
      expect(videos).toHaveLength(1);
      expect(videos[0].title).toBe('Test Opening Video');
    });

    it('should handle file read errors gracefully', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
      
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });
      
      const videos = await service.getVideosForPosition(fen);
      expect(videos).toEqual([]);
    });
  });

  describe('hasExistingVideos', () => {
    it('should return false for position without videos', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      fs.existsSync.mockReturnValue(false);
      
      const hasVideos = await service.hasExistingVideos(fen);
      expect(hasVideos).toBe(false);
    });

    it('should return true for position with videos', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockReturnValue(JSON.stringify({
        videos: [
          { id: 'test-video', title: 'Test Video', channel: 'Test Channel' }
        ]
      }));
      
      const hasVideos = await service.hasExistingVideos(fen);
      expect(hasVideos).toBe(true);
    });
  });

  describe('clearCache', () => {
    it('should clear the video cache', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      fs.existsSync.mockReturnValue(false);
      
      await service.getVideosForPosition(fen);
      expect(service.getCacheStats().cachedPositions).toBe(1);
      
      service.clearCache();
      expect(service.getCacheStats().cachedPositions).toBe(0);
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      const stats = service.getCacheStats();
      expect(stats).toHaveProperty('cachedPositions');
      expect(typeof stats.cachedPositions).toBe('number');
    });
  });
});
