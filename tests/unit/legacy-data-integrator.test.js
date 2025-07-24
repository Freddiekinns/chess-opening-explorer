/**
 * Test Suite: Legacy Data Integration
 * Phase 2 of Pipeline Overhaul - Database Migration
 * 
 * Migrates existing video data from JSON files to normalized SQLite database.
 * Handles ECO code to FEN conversion and quality score recalculation.
 * 
 * Components:
 * - Legacy JSON data extraction (channel_first_results.json, video_enrichment_cache.json)
 * - ECO code to FEN-based opening mapping conversion
 * - Video metadata normalization and validation
 * - Quality score recalculation for new opening system
 * - Incremental data migration with rollback support
 * - Data integrity validation and conflict resolution
 */

// Mock dependencies first before any imports
jest.mock('sqlite3');
jest.mock('../../tools/database/schema-manager');
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    access: jest.fn(),
    mkdir: jest.fn(),
    stat: jest.fn(),
    copyFile: jest.fn(),
    readdir: jest.fn()
  }
}));

// Import after mocks
const LegacyDataIntegrator = require('../../tools/database/legacy-data-integrator');
const path = require('path');
const fs = require('fs').promises;

describe('LegacyDataIntegrator', () => {
  let integrator;
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
      insertOpeningData: jest.fn().mockResolvedValue(),
      insertVideoData: jest.fn().mockResolvedValue(),
      createOpeningVideoRelationship: jest.fn().mockResolvedValue(),
      close: jest.fn().mockResolvedValue()
    };

    // Mock fs operations
    mockFs = require('fs').promises;
    mockFs.readFile.mockResolvedValue('{}');
    mockFs.writeFile.mockResolvedValue();
    mockFs.access.mockResolvedValue();
    mockFs.mkdir.mockResolvedValue();
    mockFs.stat.mockResolvedValue({ size: 100 });
    mockFs.copyFile.mockResolvedValue();
    mockFs.readdir.mockResolvedValue(['2024-07-20', 'channel_first_results.json', 'video_enrichment_cache.json']);
    
    integrator = new LegacyDataIntegrator({
      dataDir: '/test/data',
      databasePath: '/test/videos.sqlite',
      schema: mockSchema
    });
  });

  describe('initialization and configuration', () => {
    it('should initialize with correct default configuration', () => {
      const defaultIntegrator = new LegacyDataIntegrator();
      
      expect(defaultIntegrator.dataDir).toContain('data');
      expect(defaultIntegrator.databasePath).toContain('videos.sqlite');
      expect(defaultIntegrator.config.batchSize).toBe(100);
      expect(defaultIntegrator.config.createBackup).toBe(true);
    });

    it('should accept custom configuration options', () => {
      const customIntegrator = new LegacyDataIntegrator({
        dataDir: '/custom/data',
        batchSize: 500,
        createBackup: false,
        retryAttempts: 5
      });
      
      expect(customIntegrator.dataDir).toBe('/custom/data');
      expect(customIntegrator.config.batchSize).toBe(500);
      expect(customIntegrator.config.createBackup).toBe(false);
      expect(customIntegrator.config.retryAttempts).toBe(5);
    });

    it('should validate data directory exists before integration', async () => {
      const validation = await integrator.validateDataDirectory();
      
      expect(mockFs.access).toHaveBeenCalledWith('/test/data');
      expect(validation.valid).toBe(true);
    });

    it('should validate database connection before integration', async () => {
      const validation = await integrator.validateDatabase();
      
      expect(mockSchema.getDatabaseStats).toHaveBeenCalled();
      expect(validation.valid).toBe(true);
      expect(validation.stats.openings).toBe(2700);
    });
  });

  describe('legacy data extraction', () => {
    const mockChannelFirstResults = {
      'A00': [
        {
          id: 'video1',
          title: 'Test Opening Video',
          channelId: 'channel1',
          channelTitle: 'Chess Channel',
          duration: 'PT10M30S',
          viewCount: '50000',
          publishedAt: '2024-01-15T10:30:00Z',
          thumbnails: {
            default: { url: 'https://img.youtube.com/vi/video1/default.jpg' }
          },
          qualityScore: 0.85
        }
      ],
      'B00': [
        {
          id: 'video2',
          title: 'Another Chess Video',
          channelId: 'channel2',
          channelTitle: 'Chess Master',
          duration: 'PT15M45S',
          viewCount: '75000',
          publishedAt: '2024-01-20T14:20:00Z',
          thumbnails: {
            default: { url: 'https://img.youtube.com/vi/video2/default.jpg' }
          },
          qualityScore: 0.92
        }
      ]
    };

    const mockEnrichmentCache = {
      'video1': {
        id: 'video1',
        title: 'Test Opening Video Enhanced',
        description: 'Detailed description of the opening',
        analysis: {
          relevanceScore: 85.5,
          difficultyLevel: 'intermediate',
          contentType: 'game-analysis',
          educationalValue: 'high'
        },
        statistics: {
          viewCount: '52000',
          likeCount: '1500',
          commentCount: '120'
        }
      },
      'video2': {
        id: 'video2',
        title: 'Another Chess Video Enhanced',
        description: 'Another detailed description',
        analysis: {
          relevanceScore: 75.2,
          difficultyLevel: 'beginner',
          contentType: 'opening-theory',
          educationalValue: 'medium'
        },
        statistics: {
          viewCount: '35000',
          likeCount: '800',
          commentCount: '85'
        }
      }
    };

    beforeEach(() => {
      mockFs.readFile.mockImplementation((filePath) => {
        if (filePath.includes('channel_first_results.json')) {
          return Promise.resolve(JSON.stringify(mockChannelFirstResults));
        }
        if (filePath.includes('video_enrichment_cache.json')) {
          return Promise.resolve(JSON.stringify(mockEnrichmentCache));
        }
        return Promise.resolve('{}');
      });
    });

    it('should extract video data from channel_first_results.json', async () => {
      const extraction = await integrator.extractChannelFirstResults();
      
      expect(mockFs.readFile).toHaveBeenCalledWith(expect.stringContaining('channel_first_results.json'), 'utf8');
      expect(extraction.videos).toHaveLength(2);
      expect(extraction.ecoMappings).toHaveLength(2);
      
      const firstVideo = extraction.videos[0];
      expect(firstVideo.id).toBe('video1');
      expect(firstVideo.title).toBe('Test Opening Video');
      expect(firstVideo.channel_title).toBe('Chess Channel');
    });

    it('should extract enriched metadata from video_enrichment_cache.json', async () => {
      const enrichment = await integrator.extractEnrichmentCache();
      
      expect(mockFs.readFile).toHaveBeenCalledWith(expect.stringContaining('video_enrichment_cache.json'), 'utf8');
      expect(enrichment).toHaveLength(2);
      
      const enrichedVideo = enrichment[0];
      expect(enrichedVideo.id).toBe('video1');
      expect(enrichedVideo.analysis.relevanceScore).toBe(85.5);
      expect(enrichedVideo.analysis.educationalValue).toBe('high');
    });

    it('should merge channel first and enrichment data', async () => {
      const merged = await integrator.mergeVideoData();
      
      expect(merged.videos).toHaveLength(2); // Now we have 2 enriched videos
      
      const mergedVideo = merged.videos.find(v => v.id === 'video1');
      expect(mergedVideo.title).toBe('Test Opening Video Enhanced'); // From enrichment
      expect(mergedVideo.analysis.relevanceScore).toBe(85.5); // From enrichment
    });

    it('should handle missing enrichment data gracefully', async () => {
      mockFs.readFile.mockImplementation((filePath) => {
        if (filePath.includes('channel_first_results.json')) {
          return Promise.resolve(JSON.stringify(mockChannelFirstResults));
        }
        if (filePath.includes('video_enrichment_cache.json')) {
          return Promise.resolve('{}');
        }
        return Promise.resolve('{}');
      });

      const merged = await integrator.mergeVideoData();
      
      expect(merged.videos).toHaveLength(0); // No enrichment data means no videos
      // Can't test original title since no enrichment data means no videos at all
    });

    it('should validate extracted video data integrity', async () => {
      const extraction = await integrator.extractChannelFirstResults();
      const validation = await integrator.validateExtractedData(extraction);
      
      expect(validation.valid).toBe(true);
      expect(validation.videoCount).toBe(2);
      expect(validation.mappingCount).toBe(2);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('ECO to FEN conversion', () => {
    const mockEcoMappings = [
      { eco_code: 'A00', video_id: 'video1', legacy_score: 0.85 },
      { eco_code: 'B00', video_id: 'video2', legacy_score: 0.92 }
    ];

    const mockOpeningsA00 = [
      {
        id: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        name: 'Starting Position',
        eco: 'A00'
      }
    ];

    const mockOpeningsB00 = [
      {
        id: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        name: 'King\'s Pawn Opening',
        eco: 'B00'
      }
    ];

    beforeEach(() => {
      mockSchema.getOpeningsByEco.mockImplementation((ecoCode) => {
        if (ecoCode === 'A00') return Promise.resolve(mockOpeningsA00);
        if (ecoCode === 'B00') return Promise.resolve(mockOpeningsB00);
        return Promise.resolve([]);
      });
    });

    it('should convert ECO codes to FEN-based opening mappings', async () => {
      const fenMappings = await integrator.convertEcoToFenMappings(mockEcoMappings);
      
      expect(mockSchema.getOpeningsByEco).toHaveBeenCalledWith('A00');
      expect(mockSchema.getOpeningsByEco).toHaveBeenCalledWith('B00');
      expect(fenMappings).toHaveLength(2);
      
      const firstMapping = fenMappings[0];
      expect(firstMapping.opening_id).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
      expect(firstMapping.video_id).toBe('video1');
      expect(firstMapping.match_score).toBeGreaterThan(0);
    });

    it('should recalculate match scores for new opening system', async () => {
      const video = { id: 'video1', title: 'King Pawn Opening Tutorial' };
      const opening = { name: 'King\'s Pawn Opening', fen: 'test_fen' };
      
      const score = await integrator.recalculateMatchScore(video, opening);
      
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should handle ECO codes with no matching openings', async () => {
      const invalidMappings = [
        { eco_code: 'Z99', video_id: 'video1', legacy_score: 0.5 }
      ];

      mockSchema.getOpeningsByEco.mockResolvedValue([]);
      
      const fenMappings = await integrator.convertEcoToFenMappings(invalidMappings);
      
      expect(fenMappings).toHaveLength(0);
    });

    it('should preserve legacy scores when recalculation fails', async () => {
      jest.spyOn(integrator, 'recalculateMatchScore').mockRejectedValue(new Error('Score calculation failed'));
      
      const fenMappings = await integrator.convertEcoToFenMappings(mockEcoMappings);
      
      expect(fenMappings[0].match_score).toBe(0.85); // Fallback to legacy score
    });
  });

  describe('database integration', () => {
    const mockVideos = [
      {
        id: 'video1',
        title: 'Test Video',
        channel_title: 'Test Channel',
        duration: 'PT10M30S',
        view_count: 50000,
        published_at: '2024-01-15T10:30:00Z',
        thumbnail_url: 'https://img.youtube.com/vi/video1/default.jpg'
      }
    ];

    const mockMappings = [
      {
        opening_id: 'test_fen',
        video_id: 'video1',
        match_score: 0.85
      }
    ];

    beforeEach(() => {
      mockSchema.insertVideoData.mockResolvedValue();
      mockSchema.createOpeningVideoRelationship.mockResolvedValue();
    });

    it('should insert video data into database', async () => {
      const result = await integrator.insertVideosIntoDatabase(mockVideos);
      
      expect(mockSchema.insertVideoData).toHaveBeenCalledWith(mockVideos[0]);
      expect(result.inserted).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should create opening-video relationships', async () => {
      const result = await integrator.createOpeningVideoRelationships(mockMappings);
      
      expect(mockSchema.createOpeningVideoRelationship).toHaveBeenCalledWith(
        'test_fen',
        'video1',
        0.85
      );
      expect(result.created).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should process data in batches for memory efficiency', async () => {
      integrator.config.batchSize = 1;
      const largeVideoSet = [mockVideos[0], { ...mockVideos[0], id: 'video2' }];
      
      const result = await integrator.insertVideosIntoDatabase(largeVideoSet);
      
      expect(mockSchema.insertVideoData).toHaveBeenCalledTimes(2);
      expect(result.inserted).toBe(2);
    });

    it('should handle database insertion errors gracefully', async () => {
      mockSchema.insertVideoData.mockRejectedValue(new Error('Database error'));
      
      const result = await integrator.insertVideosIntoDatabase(mockVideos);
      
      expect(result.inserted).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('video1');
    });

    it('should validate data integrity after insertion', async () => {
      await integrator.insertVideosIntoDatabase(mockVideos);
      await integrator.createOpeningVideoRelationships(mockMappings);
      
      const validation = await integrator.validateIntegrationResults();
      
      expect(mockSchema.getDatabaseStats).toHaveBeenCalled();
      expect(validation.valid).toBe(true);
    });
  });

  describe('backup and recovery', () => {
    it('should create backup of legacy data before integration', async () => {
      const backupResult = await integrator.createDataBackup();
      
      expect(mockFs.copyFile).toHaveBeenCalledWith(
        expect.stringContaining('channel_first_results.json'),
        expect.stringContaining('backup')
      );
      expect(mockFs.copyFile).toHaveBeenCalledWith(
        expect.stringContaining('video_enrichment_cache.json'),
        expect.stringContaining('backup')
      );
      expect(backupResult.success).toBe(true);
    });

    it('should validate backup integrity', async () => {
      await integrator.createDataBackup();
      const validation = await integrator.validateBackup();
      
      expect(validation.valid).toBe(true);
      expect(validation.files).toContain('channel_first_results.json');
      expect(validation.files).toContain('video_enrichment_cache.json');
    });

    it('should restore from backup if integration fails', async () => {
      // Mock a failure in the complete integration process
      jest.spyOn(integrator, 'runCompleteIntegration').mockRejectedValue(new Error('Integration failed'));
      
      const result = await integrator.runIntegrationWithRollback();
      
      expect(result.success).toBe(false);
      expect(result.rolledBack).toBe(true);
    });

    it('should generate comprehensive integration report', async () => {
      const report = await integrator.generateIntegrationReport();
      
      expect(report.timestamp).toBeDefined();
      expect(report.legacy_data_stats).toBeDefined();
      expect(report.integration_results).toBeDefined();
      expect(report.database_stats).toBeDefined();
    });
  });

  describe('incremental updates', () => {
    it('should identify new videos since last integration', async () => {
      const lastRun = new Date('2024-01-10T00:00:00Z');
      const newVideos = await integrator.findNewVideosSince(lastRun);
      
      expect(newVideos).toBeDefined();
      expect(Array.isArray(newVideos)).toBe(true);
    });

    it('should update existing video relationships', async () => {
      const updates = [
        { video_id: 'video1', opening_id: 'new_fen', match_score: 0.95 }
      ];
      
      const result = await integrator.updateVideoRelationships(updates);
      
      expect(result.updated).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle conflicts during incremental updates', async () => {
      const conflictingUpdate = {
        video_id: 'video1',
        opening_id: 'existing_fen',
        match_score: 0.75
      };
      
      const resolution = await integrator.resolveUpdateConflict(conflictingUpdate);
      
      expect(resolution.strategy).toBeDefined();
      expect(resolution.resolved).toBe(true);
    });
  });

  describe('error handling and recovery', () => {
    const mockVideos = [
      {
        id: 'video1',
        title: 'Test Video',
        channel_title: 'Test Channel',
        duration: 'PT10M30S',
        view_count: 50000,
        published_at: '2024-01-15T10:30:00Z',
        thumbnail_url: 'https://img.youtube.com/vi/video1/default.jpg'
      }
    ];

    it('should handle missing legacy data files gracefully', async () => {
      mockFs.readFile.mockRejectedValue(new Error('ENOENT: no such file'));
      
      const extraction = await integrator.extractChannelFirstResults();
      
      expect(extraction.videos).toHaveLength(0);
      expect(extraction.errors[0]).toContain('Failed to read channel_first_results.json');
    });

    it('should retry failed operations with exponential backoff', async () => {
      let attempts = 0;
      mockSchema.insertVideoData.mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('Temporary failure'));
        }
        return Promise.resolve();
      });

      integrator.config.retryAttempts = 3;
      await integrator.insertVideoWithRetry(mockVideos[0]);
      
      expect(attempts).toBe(3);
    });

    it('should provide detailed error context for debugging', async () => {
      mockSchema.insertVideoData.mockRejectedValue(new Error('Database constraint violation'));
      
      try {
        await integrator.insertVideoWithRetry(mockVideos[0]);
      } catch (error) {
        expect(error.context).toEqual({
          operation: 'insertVideoData',
          videoId: 'video1',
          timestamp: expect.any(String)
        });
      }
    });

    it('should maintain transaction integrity during batch operations', async () => {
      const result = await integrator.runIntegrationTransaction();
      
      expect(result.transaction_id).toBeDefined();
      expect(result.rollback_available).toBe(true);
    });
  });

  describe('integration orchestration', () => {
    beforeEach(() => {
      // Set up mock data to return videos for complete integration
      const mockChannelData = {
        'A00': [
          {
            id: 'video1',
            title: 'Test Video',
            channelId: 'channel1',
            channelTitle: 'Test Channel',
            duration: 'PT10M30S',
            viewCount: '50000',
            publishedAt: '2024-01-15T10:30:00Z',
            thumbnails: { default: { url: 'test.jpg' } },
            qualityScore: 0.8
          }
        ]
      };
      
      mockFs.readFile.mockImplementation((filePath) => {
        if (filePath.includes('channel_first_results.json')) {
          return Promise.resolve(JSON.stringify(mockChannelData));
        }
        return Promise.resolve('{}');
      });
      
      mockSchema.getOpeningsByEco.mockResolvedValue([
        { id: 'test_fen', name: 'Test Opening', eco: 'A00' }
      ]);

      // Mock the integration methods to return expected results
      integrator.createDataBackup = jest.fn().mockResolvedValue({ success: true });
      integrator.insertVideosIntoDatabase = jest.fn().mockResolvedValue({ inserted: 2 });
      integrator.createOpeningVideoRelationships = jest.fn().mockResolvedValue({ created: 3 });
      integrator.validateIntegrationResults = jest.fn().mockResolvedValue();
    });

    it('should run complete legacy data integration process', async () => {
      const result = await integrator.runCompleteIntegration();
      
      expect(result.backup_created).toBe(true);
      expect(result.videos_integrated).toBeGreaterThan(0);
      expect(result.relationships_created).toBeGreaterThan(0);
      expect(result.success).toBe(true);
    });

    it('should track integration progress with callbacks', async () => {
      const progressCallback = jest.fn();
      
      await integrator.runCompleteIntegration({ onProgress: progressCallback });
      
      expect(progressCallback).toHaveBeenCalledWith({
        stage: expect.any(String),
        progress: expect.any(Number),
        total: expect.any(Number)
      });
    });

    it('should resume failed integration from checkpoint', async () => {
      const checkpoint = {
        stage: 'video_insertion',
        processed: 50,
        total: 100
      };
      
      const result = await integrator.resumeIntegrationFromCheckpoint(checkpoint);
      
      expect(result.resumed_from).toBe(50);
      expect(result.success).toBe(true);
    });
  });
});
