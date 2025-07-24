const VideoAccessService = require('../../src/services/video-access-service');
const fs = require('fs');
const path = require('path');

describe('VideoAccessService', () => {
  let videoService;
  let testVideoDir;
  
  beforeEach(() => {
    // Use a test-specific video directory
    testVideoDir = path.join(process.cwd(), 'test_videos');
    videoService = new VideoAccessService();
    videoService.videoDirectory = testVideoDir;
    
    // Ensure test directory exists
    if (!fs.existsSync(testVideoDir)) {
      fs.mkdirSync(testVideoDir, { recursive: true });
    }
  });
  
  afterEach(() => {
    // Clean up test videos
    if (fs.existsSync(testVideoDir)) {
      fs.rmSync(testVideoDir, { recursive: true });
    }
    videoService.clearCache();
  });

  describe('sanitizeFEN', () => {
    it('should sanitize FEN strings for use as filenames', () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const sanitized = videoService.sanitizeFEN(fen);
      
      expect(sanitized).toBe('rnbqkbnr_pppppppp_8_8_8_8_PPPPPPPP_RNBQKBNR_w_KQkq_dash_0_1');
    });
  });

  describe('getVideosForPosition', () => {
    it('should return empty array for position without videos', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const videos = await videoService.getVideosForPosition(fen);
      
      expect(videos).toEqual([]);
    });

    it('should return videos for position with videos', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
      const testVideos = [
        {
          title: 'Test Opening Video',
          url: 'https://youtube.com/watch?v=test123',
          channel: 'Test Channel'
        }
      ];

      // Save test videos first
      await videoService.saveVideosForPosition(fen, { name: 'Test Opening' }, testVideos);
      
      // Retrieve videos
      const videos = await videoService.getVideosForPosition(fen);
      
      expect(videos).toHaveLength(1);
      expect(videos[0].title).toBe('Test Opening Video');
    });

    it('should cache results', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1';
      
      // First call
      await videoService.getVideosForPosition(fen);
      
      // Second call should use cache
      const videos = await videoService.getVideosForPosition(fen);
      expect(videos).toEqual([]);
      
      // Verify cache was used (no file system access on second call)
      const stats = videoService.getCacheStats();
      expect(stats.cachedPositions).toBe(1);
    });
  });

  describe('hasExistingVideos', () => {
    it('should return false for position without videos', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const hasVideos = await videoService.hasExistingVideos(fen);
      
      expect(hasVideos).toBe(false);
    });

    it('should return true for position with videos', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
      const testVideos = [
        {
          title: 'Test Opening Video',
          url: 'https://youtube.com/watch?v=test123',
          channel: 'Test Channel'
        }
      ];

      await videoService.saveVideosForPosition(fen, { name: 'Test Opening' }, testVideos);
      const hasVideos = await videoService.hasExistingVideos(fen);
      
      expect(hasVideos).toBe(true);
    });
  });

  describe('saveVideosForPosition', () => {
    it('should save videos to FEN-based file', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
      const metadata = { name: 'Kings Pawn Opening', eco: 'B00' };
      const videos = [
        {
          title: 'Kings Pawn Basics',
          url: 'https://youtube.com/watch?v=test456',
          channel: 'Chess Education'
        }
      ];

      await videoService.saveVideosForPosition(fen, metadata, videos);
      
      // Verify file was created
      const sanitizedFEN = videoService.sanitizeFEN(fen);
      const filePath = path.join(testVideoDir, `${sanitizedFEN}.json`);
      expect(fs.existsSync(filePath)).toBe(true);
      
      // Verify file contents
      const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      expect(fileData.fen).toBe(fen);
      expect(fileData.name).toBe('Kings Pawn Opening');
      expect(fileData.videos).toHaveLength(1);
      expect(fileData.videos[0].title).toBe('Kings Pawn Basics');
    });

    it('should not save empty video arrays', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      
      await videoService.saveVideosForPosition(fen, { name: 'Test' }, []);
      
      const sanitizedFEN = videoService.sanitizeFEN(fen);
      const filePath = path.join(testVideoDir, `${sanitizedFEN}.json`);
      expect(fs.existsSync(filePath)).toBe(false);
    });
  });

  describe('getPositionsWithVideos', () => {
    it('should return empty array when no videos exist', async () => {
      const positions = await videoService.getPositionsWithVideos();
      expect(positions).toEqual([]);
    });

    it('should return FENs for positions with videos', async () => {
      const fen1 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
      const fen2 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
      
      await videoService.saveVideosForPosition(fen1, { name: 'Opening 1' }, [{ title: 'Video 1', url: 'url1', channel: 'Channel' }]);
      await videoService.saveVideosForPosition(fen2, { name: 'Opening 2' }, [{ title: 'Video 2', url: 'url2', channel: 'Channel' }]);
      
      const positions = await videoService.getPositionsWithVideos();
      
      expect(positions).toHaveLength(2);
      expect(positions).toContain(fen1);
      expect(positions).toContain(fen2);
    });
  });

  describe('clearCache', () => {
    it('should clear the video cache', async () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      
      // Populate cache
      await videoService.getVideosForPosition(fen);
      expect(videoService.getCacheStats().cachedPositions).toBe(1);
      
      // Clear cache
      videoService.clearCache();
      expect(videoService.getCacheStats().cachedPositions).toBe(0);
    });
  });
});
