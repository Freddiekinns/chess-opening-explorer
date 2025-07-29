/**
 * Test Suite: Database Migration Scripts
 * Phase 2 of Pipeline Overhaul - Database Migration
 * 
 * Tests migration of existing JSON data (116MB) to normalized SQLite database (~5MB).
 * Includes data validation, integrity checks, and rollback capabilities.
 * 
 * Components:
 * - JSON to SQLite data migration
 * - ECO code mapping migration
 * - Video data standardization  
 * - Opening-video relationship creation
 * - Data integrity validation
 * - Migration rollback support
 */

const DataMigrator = require('../../tools/database/data-migrator');
const path = require('path');
const fs = require('fs').promises;

// Mock dependencies
jest.mock('sqlite3');
jest.mock('../../tools/database/schema-manager');
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    access: jest.fn(),
    mkdir: jest.fn(),
    stat: jest.fn(),
    readdir: jest.fn(),
    copyFile: jest.fn()
  }
}));

describe('DataMigrator', () => {
  let migrator;
  let mockSchema;
  let mockFs;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock DatabaseSchema
    mockSchema = {
      initializeSchema: jest.fn().mockResolvedValue(),
      insertOpening: jest.fn().mockResolvedValue(),
      insertVideo: jest.fn().mockResolvedValue(), 
      insertOpeningVideo: jest.fn().mockResolvedValue(),
      prepareMigration: jest.fn().mockResolvedValue(),
      finalizeMigration: jest.fn().mockResolvedValue(),
      validateDataIntegrity: jest.fn().mockResolvedValue({ valid: true }),
      getDatabaseStats: jest.fn().mockResolvedValue({ openings: 0, videos: 0, relationships: 0 }),
      close: jest.fn().mockResolvedValue()
    };

    // Mock fs operations
    mockFs = require('fs').promises;
    
    migrator = new DataMigrator({
      sourceDataPath: '/test/data',
      databasePath: '/test/videos.sqlite',
      schema: mockSchema  // Always provide mock schema
    });
  });

  describe('migration initialization', () => {
    it('should initialize with correct configuration', () => {
      expect(migrator.sourceDataPath).toBe('/test/data');
      expect(migrator.databasePath).toBe('/test/videos.sqlite');
      expect(migrator.migrationSteps).toBeDefined();
    });

    it('should verify source data files exist before migration', async () => {
      mockFs.access.mockResolvedValue(); // Files exist
      
      const verification = await migrator.verifySourceData();
      
      expect(mockFs.access).toHaveBeenCalledWith(
        expect.stringContaining('ecoA.json')
      );
      expect(mockFs.access).toHaveBeenCalledWith(
        expect.stringContaining('videos')
      );
      expect(verification.valid).toBe(true);
    });

    it('should handle missing source data gracefully', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT: no such file'));
      
      const verification = await migrator.verifySourceData();
      
      expect(verification.valid).toBe(false);
      expect(verification.missingFiles).toContain('eco/ecoA.json');
    });

    it('should calculate expected migration data volume', async () => {
      mockFs.stat.mockResolvedValue({ size: 25000000 }); // 25MB per file
      
      const estimate = await migrator.estimateMigrationSize();
      
      expect(estimate.sourceSize).toBeGreaterThan(100000000); // >100MB
      expect(estimate.targetSize).toBeLessThan(10000000); // <10MB
      expect(estimate.compressionRatio).toBeGreaterThan(0.9); // >90% reduction
    });
  });

  describe('ECO data migration', () => {
    const mockEcoData = {
      A00: {
        name: "Uncommon Opening",
        fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        moves: "",
        aliases: ["Polish Opening", "Sokolsky Opening"]
      },
      A07: {
        name: "King's Indian Attack",
        fen: "rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1",
        moves: "Nf3",
        aliases: ["KIA", "Réti Opening"]
      }
    };

    beforeEach(() => {
      mockFs.readFile.mockImplementation((filePath) => {
        if (filePath.includes('ecoA.json')) {
          return Promise.resolve(JSON.stringify(mockEcoData));
        }
        return Promise.resolve('{}');
      });
    });

    it('should migrate ECO data to openings table', async () => {
      await migrator.migrateEcoData();
      
      expect(mockSchema.insertOpening).toHaveBeenCalledWith({
        fen: mockEcoData.A00.fen,
        name: mockEcoData.A00.name,
        eco: 'A00',
        aliases: mockEcoData.A00.aliases
      });
      
      expect(mockSchema.insertOpening).toHaveBeenCalledWith({
        fen: mockEcoData.A07.fen,
        name: mockEcoData.A07.name,
        eco: 'A07',
        aliases: mockEcoData.A07.aliases
      });
    });

    it('should handle duplicate ECO codes gracefully', async () => {
      // First call succeeds, second fails with constraint error
      mockSchema.insertOpening
        .mockResolvedValueOnce() // First opening succeeds
        .mockRejectedValueOnce(new Error('UNIQUE constraint failed')); // Second opening fails
      
      const result = await migrator.migrateEcoData();
      
      expect(result.skipped).toBe(1);
      expect(result.migrated).toBe(1);
      // Don't expect errors array to have specific length as it's handled as skipped, not error
    });

    it('should normalize ECO data format during migration', async () => {
      const malformedEcoData = {
        A10: {
          name: "English Opening",
          // Missing FEN - should generate standard starting position
          moves: "c4",
          aliases: "English Opening"  // String instead of array
        }
      };
      
      mockFs.readFile.mockResolvedValue(JSON.stringify(malformedEcoData));
      
      await migrator.migrateEcoData();
      
      expect(mockSchema.insertOpening).toHaveBeenCalledWith({
        fen: expect.stringContaining('rnbqkbnr'), // Standard starting position
        name: "English Opening",
        eco: 'A10',
        aliases: ["English Opening"] // Normalized to array
      });
    });

    it('should migrate all ECO files (A-E)', async () => {
      await migrator.migrateAllEcoFiles();
      
      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringMatching(/eco[/\\]ecoA\.json$/),
        'utf8'
      );
      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringMatching(/eco[/\\]ecoB\.json$/),
        'utf8'
      );
      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringMatching(/eco[/\\]ecoE\.json$/),
        'utf8'
      );
    });
  });

  describe('video data migration', () => {
    const mockVideoData = {
      "rnbqkbnr_pppppppp_8_8_4P3_8_PPPP1PPP_RNBQKBNR_w_KQkq_dash_0_2": [
        {
          id: "abc123",
          title: "King's Pawn Opening Guide",
          channelId: "UC123456789",
          channelTitle: "Chess Master",
          duration: 900,
          viewCount: 50000,
          publishedAt: "2024-01-15T10:30:00Z",
          thumbnailUrl: "https://img.youtube.com/vi/abc123/default.jpg",
          score: 0.85
        },
        {
          id: "xyz789",
          title: "1.e4 Opening Principles",
          channelId: "UC987654321", 
          channelTitle: "Chess Channel",
          duration: 1200,
          viewCount: 75000,
          publishedAt: "2024-01-10T14:20:00Z",
          thumbnailUrl: "https://img.youtube.com/vi/xyz789/default.jpg",
          score: 0.92
        }
      ]
    };

    beforeEach(() => {
      mockFs.readFile.mockImplementation((filePath) => {
        if (filePath.includes('.json')) {
          return Promise.resolve(JSON.stringify(mockVideoData));
        }
        return Promise.resolve('{}');
      });
      
      mockFs.readdir.mockResolvedValue(['test_video.json']);
    });

    it('should migrate video data with proper field mapping', async () => {
      await migrator.migrateVideoData();
      
      const expectedVideo = mockVideoData["rnbqkbnr_pppppppp_8_8_4P3_8_PPPP1PPP_RNBQKBNR_w_KQkq_dash_0_2"][0];
      
      expect(mockSchema.insertVideo).toHaveBeenCalledWith({
        id: expectedVideo.id,
        title: expectedVideo.title,
        channelId: expectedVideo.channelId,
        channelTitle: expectedVideo.channelTitle,
        duration: expectedVideo.duration,
        viewCount: expectedVideo.viewCount,
        publishedAt: expectedVideo.publishedAt,
        thumbnailUrl: expectedVideo.thumbnailUrl
      });
    });

    it('should create opening-video relationships with match scores', async () => {
      // Mock specific file that matches our test data
      mockFs.readdir.mockResolvedValue(['rnbqkbnr_pppppppp_8_8_4P3_8_PPPP1PPP_RNBQKBNR_w_KQkq_dash_0_2.json']);
      
      await migrator.migrateVideoData();
      
      const expectedVideo = mockVideoData["rnbqkbnr_pppppppp_8_8_4P3_8_PPPP1PPP_RNBQKBNR_w_KQkq_dash_0_2"][0];
      const openingFen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";
      
      expect(mockSchema.insertOpeningVideo).toHaveBeenCalledWith({
        openingId: openingFen,
        videoId: expectedVideo.id,
        matchScore: expectedVideo.score
      });
    });

    it('should handle video data validation errors', async () => {
      const invalidVideoData = {
        "test_fen": [
          {
            id: "",  // Invalid empty ID
            title: "Test Video",
            duration: -1,  // Invalid negative duration
            viewCount: "invalid"  // Invalid view count type
          }
        ]
      };
      
      mockFs.readFile.mockResolvedValue(JSON.stringify(invalidVideoData));
      
      const result = await migrator.migrateVideoData();
      
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Invalid video data');
    });

    it('should convert filename format to FEN correctly', () => {
      const filename = "rnbqkbnr_pppppppp_8_8_4P3_8_PPPP1PPP_RNBQKBNR_w_KQkq_dash_0_2";
      const expectedFen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2";
      
      const result = migrator.convertFilenameToFen(filename);
      
      expect(result).toBe(expectedFen);
    });

    it('should batch process video files for memory efficiency', async () => {
      // Mock 100 video files
      jest.spyOn(migrator, 'getVideoFiles').mockResolvedValue(
        Array.from({ length: 100 }, (_, i) => `video_${i}.json`)
      );
      
      await migrator.migrateVideoData({ batchSize: 10 });
      
      // Should process in batches to avoid memory issues
      expect(mockFs.readFile).toHaveBeenCalledTimes(100);
    });
  });

  describe('migration orchestration', () => {
    it('should execute migration steps in correct order', async () => {
      const stepOrder = [];
      
      mockSchema.initializeSchema.mockImplementation(() => {
        stepOrder.push('initializeSchema');
        return Promise.resolve();
      });
      
      jest.spyOn(migrator, 'migrateEcoData').mockImplementation(() => {
        stepOrder.push('migrateEcoData');
        return Promise.resolve({ migrated: 5, errors: [] });
      });
      
      jest.spyOn(migrator, 'migrateVideoData').mockImplementation(() => {
        stepOrder.push('migrateVideoData');
        return Promise.resolve({ migrated: 1000, errors: [] });
      });
      
      await migrator.runFullMigration();
      
      expect(stepOrder).toEqual([
        'initializeSchema',
        'migrateEcoData',
        'migrateVideoData'
      ]);
    });

    it('should track migration progress with detailed reporting', async () => {
      jest.spyOn(migrator, 'migrateEcoData').mockResolvedValue({
        migrated: 2700,
        skipped: 0,
        errors: []
      });
      
      jest.spyOn(migrator, 'migrateVideoData').mockResolvedValue({
        migrated: 5000,
        skipped: 10,
        errors: []
      });
      
      const progress = await migrator.runFullMigration();
      
      expect(progress.totalOpenings).toBe(2700);
      expect(progress.totalVideos).toBe(5000);
      expect(progress.totalRelationships).toBe(5000);
      expect(progress.storageReduction).toBeGreaterThan(0.9);
    });

    it('should handle migration rollback on failure', async () => {
      jest.spyOn(migrator, 'migrateVideoData').mockRejectedValue(
        new Error('Migration failed')
      );
      
      jest.spyOn(migrator, 'rollbackMigration').mockResolvedValue();
      
      await expect(migrator.runFullMigration()).rejects.toThrow('Migration failed');
      expect(migrator.rollbackMigration).toHaveBeenCalled();
    });

    it('should validate data integrity after migration', async () => {
      jest.spyOn(migrator, 'migrateEcoData').mockResolvedValue({
        migrated: 100,
        errors: []
      });
      
      jest.spyOn(migrator, 'migrateVideoData').mockResolvedValue({
        migrated: 1000,
        errors: []
      });
      
      await migrator.runFullMigration();
      
      expect(mockSchema.validateDataIntegrity).toHaveBeenCalled();
    });
  });

  describe('migration utilities', () => {
    it('should create backup before migration', async () => {
      const backupPath = '/test/backup-2024-01-15.sqlite';
      
      jest.spyOn(migrator, 'createBackup').mockResolvedValue(backupPath);
      
      await migrator.runFullMigration({ createBackup: true });
      
      expect(migrator.createBackup).toHaveBeenCalled();
    });

    it('should dry-run migration without making changes', async () => {
      // Setup mock for readdir to return video files
      mockFs.readdir.mockResolvedValue(['video1.json', 'video2.json']);
      
      // Setup mock for readFile to return video data
      mockFs.readFile.mockImplementation((filePath) => {
        if (filePath.includes('eco')) {
          return Promise.resolve(JSON.stringify({ A00: { name: "Test" }, A01: { name: "Test2" } }));
        } else {
          return Promise.resolve(JSON.stringify({ "test_fen": [{ id: "vid1" }, { id: "vid2" }] }));
        }
      });
      
      const dryRunResult = await migrator.runDryRun();
      
      expect(dryRunResult.wouldMigrate.openings).toBeGreaterThan(0);
      expect(dryRunResult.wouldMigrate.videos).toBeGreaterThan(0);
      expect(mockSchema.insertOpening).not.toHaveBeenCalled();
      expect(mockSchema.insertVideo).not.toHaveBeenCalled();
    });

    it('should generate migration report with statistics', async () => {
      // Set up migration state with expected values
      migrator.migrationState.statistics = {
        openingsMigrated: 2700,
        videosMigrated: 5000,
        relationshipsCreated: 5000,
        errorsEncountered: 0
      };
      
      const report = await migrator.generateMigrationReport();
      
      expect(report).toEqual({
        timestamp: expect.any(String),
        sourceDataSize: expect.any(Number),
        targetDatabaseSize: expect.any(Number),
        compressionRatio: expect.any(Number),
        openingsMigrated: 2700,
        videosMigrated: 5000,
        relationshipsCreated: 5000,
        errorsEncountered: 0,
        migrationDuration: expect.any(Number)
      });
    });

    it('should support partial migration by component', async () => {
      jest.spyOn(migrator, 'migrateEcoData').mockResolvedValue({ migrated: 10 });
      jest.spyOn(migrator, 'migrateVideoData').mockResolvedValue({ migrated: 100 });
      
      await migrator.migrateComponent('eco-data');
      
      expect(migrator.migrateEcoData).toHaveBeenCalled();
      expect(migrator.migrateVideoData).not.toHaveBeenCalled();
    });

    it('should clean up temporary files after migration', async () => {
      jest.spyOn(migrator, 'cleanupTempFiles').mockResolvedValue();
      
      await migrator.runFullMigration();
      
      expect(migrator.cleanupTempFiles).toHaveBeenCalled();
    });
  });
});
