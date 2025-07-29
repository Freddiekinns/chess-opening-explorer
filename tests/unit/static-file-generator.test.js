/**
 * Test Suite: Static File Generator
 * Phase 2 of Pipeline Overhaul - Database Migration  
 * 
 * Pre-computes API responses from SQLite database to static JSON files.
 * Enables blazing-fast frontend queries without database overhead.
 * 
 * Components:
 * - Opening-specific API file generation (public/api/openings/{id}.json)
 * - Video data optimization and caching
 * - Incremental static file updates
 * - Static file validation and integrity checks
 * - Compression and performance optimization
 * - Error handling and recovery
 */

// Mock dependencies first before any imports
jest.mock('sqlite3');
jest.mock('../../tools/database/schema-manager');
jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(),
    readFile: jest.fn(),
    mkdir: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn(),
    unlink: jest.fn(),
    access: jest.fn()
  }
}));

// Import after mocks
const StaticFileGenerator = require('../../tools/database/static-file-generator');
const path = require('path');
const fs = require('fs').promises;

describe('StaticFileGenerator', () => {
  let generator;
  let mockSchema;
  let mockFs;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock DatabaseSchema
    mockSchema = {
      getDatabaseStats: jest.fn().mockResolvedValue({
        openings: 2700,
        videos: 5000,
        relationships: 12000
      }),
      getOpeningsByEco: jest.fn().mockResolvedValue([]),
      getTopVideosForOpening: jest.fn().mockResolvedValue([]),
      close: jest.fn().mockResolvedValue()
    };

    // Mock fs operations
    mockFs = require('fs').promises;
    mockFs.writeFile.mockResolvedValue();
    mockFs.readFile.mockResolvedValue('{}');
    mockFs.mkdir.mockResolvedValue();
    mockFs.readdir.mockResolvedValue([]);
    mockFs.stat.mockResolvedValue({ size: 100 });
    mockFs.unlink.mockResolvedValue();
    mockFs.access.mockResolvedValue();
    
    generator = new StaticFileGenerator({
      outputDir: '/test/public/api/openings',
      databasePath: '/test/videos.sqlite',
      schema: mockSchema,
      minMatchScore: 0.5 // Lower threshold for tests
    });
  });

  describe('initialization and configuration', () => {
    it('should initialize with correct default configuration', () => {
      const defaultGenerator = new StaticFileGenerator();
      
      expect(defaultGenerator.outputDir).toContain('public/api/openings');
      expect(defaultGenerator.databasePath).toContain('videos.sqlite');
      expect(defaultGenerator.config.format).toBe('json');
      expect(defaultGenerator.config.compression).toBe(false);
    });

    it('should accept custom configuration options', () => {
      const customGenerator = new StaticFileGenerator({
        outputDir: '/custom/path',
        format: 'json',
        compression: true,
        maxVideosPerOpening: 20
      });
      
      expect(customGenerator.outputDir).toBe('/custom/path');
      expect(customGenerator.config.compression).toBe(true);
      expect(customGenerator.config.maxVideosPerOpening).toBe(20);
    });

    it('should validate output directory exists or create it', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT'));
      mockFs.mkdir.mockResolvedValue();
      
      await generator.ensureOutputDirectory();
      
      expect(mockFs.mkdir).toHaveBeenCalledWith('/test/public/api/openings', { recursive: true });
    });

    it('should validate database connection before generation', async () => {
      const validation = await generator.validateDatabase();
      
      expect(mockSchema.getDatabaseStats).toHaveBeenCalled();
      expect(validation.valid).toBe(true);
      expect(validation.stats.openings).toBe(2700);
    });
  });

  describe('opening data retrieval', () => {
    const mockOpenings = [
      {
        id: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        name: 'King\'s Pawn Opening',
        eco: 'B00',
        aliases: ['1.e4']
      },
      {
        id: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
        name: 'King\'s Pawn Game',
        eco: 'C20',
        aliases: ['Open Game']
      }
    ];

    const mockVideos = [
      {
        id: 'video1',
        title: 'King\'s Pawn Opening Guide',
        channel_title: 'Chess Master',
        duration: 900,
        view_count: 50000,
        published_at: '2024-01-15T10:30:00Z',
        thumbnail_url: 'https://img.youtube.com/vi/video1/default.jpg',
        match_score: 0.95
      },
      {
        id: 'video2',
        title: 'Advanced King\'s Pawn Tactics',
        channel_title: 'Chess Channel',
        duration: 1200,
        view_count: 35000,
        published_at: '2024-01-10T14:20:00Z',
        thumbnail_url: 'https://img.youtube.com/vi/video2/default.jpg',
        match_score: 0.88
      }
    ];

    beforeEach(() => {
      mockSchema.getOpeningsByEco.mockResolvedValue(mockOpenings);
      mockSchema.getTopVideosForOpening.mockResolvedValue(mockVideos);
    });

    it('should retrieve all openings from database', async () => {
      const openings = await generator.getAllOpenings();
      
      expect(mockSchema.getOpeningsByEco).toHaveBeenCalledWith('%'); // Get all ECO codes
      expect(openings).toEqual(mockOpenings);
    });

    it('should retrieve top videos for specific opening', async () => {
      const openingId = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
      
      const videos = await generator.getVideosForOpening(openingId);
      
      expect(mockSchema.getTopVideosForOpening).toHaveBeenCalledWith(openingId, 10); // Default limit
      expect(videos).toEqual(mockVideos);
    });

    it('should handle custom video limit per opening', async () => {
      generator.config.maxVideosPerOpening = 25;
      const openingId = 'test_fen';
      
      await generator.getVideosForOpening(openingId);
      
      expect(mockSchema.getTopVideosForOpening).toHaveBeenCalledWith(openingId, 25);
    });

    it('should filter out videos with low match scores', async () => {
      const mixedQualityVideos = [
        { ...mockVideos[0], match_score: 0.95 }, // High quality
        { ...mockVideos[1], match_score: 0.45 }, // Low quality
        { id: 'video3', match_score: 0.75 }      // Medium quality
      ];
      
      mockSchema.getTopVideosForOpening.mockResolvedValue(mixedQualityVideos);
      
      const filteredVideos = await generator.getVideosForOpening('test_fen', { minScore: 0.6 });
      
      expect(filteredVideos).toHaveLength(2); // Only high and medium quality
      expect(filteredVideos.every(v => v.match_score >= 0.6)).toBe(true);
    });
  });

  describe('API response generation', () => {
    const mockOpening = {
      id: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      name: 'King\'s Pawn Opening',
      eco: 'B00',
      aliases: ['1.e4']
    };

    const mockVideos = [
      {
        id: 'video1',
        title: 'King\'s Pawn Opening Guide',
        channel_title: 'Chess Master',
        duration: 900,
        view_count: 50000,
        published_at: '2024-01-15T10:30:00Z',
        thumbnail_url: 'https://img.youtube.com/vi/video1/default.jpg',
        match_score: 0.95
      }
    ];

    it('should generate API response in correct format', async () => {
      const apiResponse = await generator.generateApiResponse(mockOpening, mockVideos);
      
      expect(apiResponse).toEqual({
        opening: {
          id: mockOpening.id,
          name: mockOpening.name,
          eco: mockOpening.eco,
          aliases: mockOpening.aliases
        },
        videos: [{
          id: 'video1',
          title: 'King\'s Pawn Opening Guide',
          channel: 'Chess Master',
          duration: 900,
          views: 50000,
          published: '2024-01-15T10:30:00Z',
          thumbnail: 'https://img.youtube.com/vi/video1/default.jpg',
          url: 'https://youtube.com/watch?v=video1',
          score: 0.95
        }],
        metadata: {
          total_videos: 1,
          generated_at: expect.any(String),
          cache_version: expect.any(String)
        }
      });
    });

    it('should optimize video data for frontend consumption', async () => {
      const apiResponse = await generator.generateApiResponse(mockOpening, mockVideos);
      const video = apiResponse.videos[0];
      
      // Should use simplified field names
      expect(video.channel).toBe('Chess Master');     // not channel_title
      expect(video.views).toBe(50000);                // not view_count
      expect(video.published).toBeDefined();          // not published_at
      expect(video.thumbnail).toBeDefined();          // not thumbnail_url
      expect(video.score).toBe(0.95);                 // not match_score
    });

    it('should include cache metadata for frontend optimization', async () => {
      const apiResponse = await generator.generateApiResponse(mockOpening, mockVideos);
      
      expect(apiResponse.metadata.total_videos).toBe(1);
      expect(apiResponse.metadata.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO format
      expect(apiResponse.metadata.cache_version).toBeDefined();
    });

    it('should handle openings with no videos gracefully', async () => {
      const apiResponse = await generator.generateApiResponse(mockOpening, []);
      
      expect(apiResponse.videos).toEqual([]);
      expect(apiResponse.metadata.total_videos).toBe(0);
    });
  });

  describe('static file operations', () => {
    const mockOpening = {
      id: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      name: 'King\'s Pawn Opening',
      eco: 'B00'
    };

    it('should write static file with correct filename', async () => {
      const apiResponse = { opening: mockOpening, videos: [], metadata: {} };
      
      await generator.writeStaticFile(mockOpening.id, apiResponse);
      
      const expectedFilename = generator.getStaticFilename(mockOpening.id);
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expectedFilename,
        JSON.stringify(apiResponse, null, 2),
        'utf8'
      );
    });

    it('should generate safe filenames for FEN strings', () => {
      const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1';
      const filename = generator.getStaticFilename(fen);
      const basename = path.basename(filename);
      
      // Should replace special characters with safe alternatives
      expect(basename).not.toContain('/');
      expect(basename).not.toContain(' ');
      expect(basename).toMatch(/\.json$/);
      expect(filename).toContain(generator.outputDir);
    });

    it('should compress JSON output when compression is enabled', async () => {
      generator.config.compression = true;
      const apiResponse = { large: 'data'.repeat(1000) };
      
      await generator.writeStaticFile('test_id', apiResponse);
      
      // Should write minified JSON (no spaces)
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        JSON.stringify(apiResponse), // No null, 2 formatting
        'utf8'
      );
    });

    it('should handle file write errors gracefully', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('Permission denied'));
      
      await expect(
        generator.writeStaticFile('test_id', {})
      ).rejects.toThrow('Permission denied');
    });

    it('should validate written files can be read back', async () => {
      const apiResponse = { test: 'data' };
      mockFs.readFile.mockResolvedValue(JSON.stringify(apiResponse));
      
      const validation = await generator.validateStaticFile('test_id');
      
      expect(validation.valid).toBe(true);
      expect(validation.content).toEqual(apiResponse);
    });
  });

  describe('batch generation', () => {
    const mockOpenings = [
      { id: 'opening1', name: 'Test Opening 1', eco: 'A00' },
      { id: 'opening2', name: 'Test Opening 2', eco: 'A01' },
      { id: 'opening3', name: 'Test Opening 3', eco: 'A02' }
    ];

    const mockVideos = [
      { id: 'video1', title: 'Test Video 1', match_score: 0.8 },
      { id: 'video2', title: 'Test Video 2', match_score: 0.9 }
    ];

    beforeEach(() => {
      mockSchema.getOpeningsByEco.mockResolvedValue(mockOpenings);
      mockSchema.getTopVideosForOpening.mockResolvedValue(mockVideos);
    });

    it('should generate static files for all openings', async () => {
      const result = await generator.generateAllStaticFiles();
      
      expect(result.generated).toBe(3);
      expect(result.errors).toHaveLength(0);
      expect(mockFs.writeFile).toHaveBeenCalledTimes(3);
    });

    it('should process openings in batches for memory efficiency', async () => {
      generator.config.batchSize = 2;
      
      const processSpy = jest.spyOn(generator, 'processBatch');
      
      await generator.generateAllStaticFiles();
      
      expect(processSpy).toHaveBeenCalledTimes(2); // 3 openings / 2 batch size = 2 batches
    });

    it('should track progress during batch generation', async () => {
      const progressCallback = jest.fn();
      
      await generator.generateAllStaticFiles({ onProgress: progressCallback });
      
      expect(progressCallback).toHaveBeenCalledWith({
        processed: 3,
        total: 3,
        percentage: 100,
        currentOpening: expect.any(String)
      });
    });

    it('should handle individual file generation errors gracefully', async () => {
      mockFs.writeFile
        .mockResolvedValueOnce()     // First file succeeds
        .mockRejectedValueOnce(new Error('Write failed'))  // Second file fails
        .mockResolvedValueOnce();    // Third file succeeds
      
      const result = await generator.generateAllStaticFiles();
      
      expect(result.generated).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('opening2');
    });

    it('should support incremental updates for specific openings', async () => {
      const specificOpenings = ['opening1', 'opening3'];
      
      const result = await generator.updateStaticFiles(specificOpenings);
      
      expect(result.updated).toBe(2);
      expect(mockSchema.getTopVideosForOpening).toHaveBeenCalledTimes(2);
    });
  });

  describe('cleanup and maintenance', () => {
    it('should clean up orphaned static files', async () => {
      // Mock existing files
      mockFs.readdir.mockResolvedValue(['opening1.json', 'opening2.json', 'orphaned.json']);
      
      // Mock current openings (opening3 is missing, orphaned exists)
      mockSchema.getOpeningsByEco.mockResolvedValue([
        { id: 'opening1' },
        { id: 'opening3' } // opening2 and orphaned should be cleaned up
      ]);
      
      const result = await generator.cleanupOrphanedFiles();
      
      expect(result.deleted).toBe(2);
      expect(mockFs.unlink).toHaveBeenCalledWith(
        expect.stringContaining('opening2.json')
      );
      expect(mockFs.unlink).toHaveBeenCalledWith(
        expect.stringContaining('orphaned.json')
      );
    });

    it('should validate all static files integrity', async () => {
      mockFs.readdir.mockResolvedValue(['opening1.json', 'opening2.json']);
      mockFs.readFile
        .mockResolvedValueOnce('{"valid": "json"}')
        .mockResolvedValueOnce('invalid json');
      
      const validation = await generator.validateAllStaticFiles();
      
      expect(validation.total).toBe(2);
      expect(validation.valid).toBe(1);
      expect(validation.invalid).toBe(1);
      expect(validation.errors).toHaveLength(1);
    });

    it('should generate comprehensive generation report', async () => {
      mockSchema.getOpeningsByEco.mockResolvedValue([
        { id: 'opening1' }, { id: 'opening2' }
      ]);
      
      const report = await generator.generateReport();
      
      expect(report).toEqual({
        timestamp: expect.any(String),
        database_stats: { openings: 2700, videos: 5000, relationships: 12000 },
        static_files: {
          total_generated: expect.any(Number),
          output_directory: '/test/public/api/openings',
          compression_enabled: false,
          max_videos_per_opening: 10
        },
        performance: {
          generation_duration_ms: expect.any(Number),
          average_file_size_bytes: expect.any(Number),
          total_disk_usage_bytes: expect.any(Number)
        }
      });
    });
  });

  describe('error handling and recovery', () => {
    it('should handle database connection failures gracefully', async () => {
      mockSchema.getDatabaseStats.mockRejectedValue(new Error('Database unavailable'));
      
      await expect(generator.validateDatabase()).resolves.toEqual({
        valid: false,
        error: 'Database unavailable'
      });
    });

    it('should retry failed file operations with exponential backoff', async () => {
      mockFs.writeFile
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce(); // Third attempt succeeds
      
      generator.config.retryAttempts = 3;
      
      await generator.writeStaticFileWithRetry('test_id', {});
      
      expect(mockFs.writeFile).toHaveBeenCalledTimes(3);
    });

    it('should provide detailed error context for debugging', async () => {
      mockFs.writeFile.mockRejectedValue(new Error('ENOSPC: no space left'));
      
      try {
        await generator.writeStaticFile('test_id', {});
      } catch (error) {
        expect(error.context).toEqual({
          operation: 'writeStaticFile',
          openingId: 'test_id',
          outputPath: expect.any(String),
          timestamp: expect.any(String)
        });
      }
    });

    it('should support partial recovery from failed batch generation', async () => {
      const partialResult = {
        generated: 5,
        errors: ['opening6_error', 'opening7_error'],
        total: 10
      };
      
      const resumeResult = await generator.resumeFailedGeneration(partialResult);
      
      expect(resumeResult.resumed_from).toBe(5);
      expect(resumeResult.total_generated).toBeGreaterThanOrEqual(5); // At least the original count
      expect(resumeResult.new_errors).toEqual([]);
      expect(resumeResult.total_errors).toEqual(['opening6_error', 'opening7_error']);
    });
  });
});
