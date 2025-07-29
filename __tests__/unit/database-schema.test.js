/**
 * Test Suite: Database Schema Manager
 * Phase 2 of Pipeline Overhaul - Database Migration
 * 
 * Creates and manages SQLite database schema for normalized video storage.
 * Replaces 116MB JSON files with ~5MB SQLite for 96% storage reduction.
 */

const DatabaseSchema = require('../../tools/database/schema-manager');
const path = require('path');
const fs = require('fs');

// Mock SQLite3 for testing
jest.mock('sqlite3', () => ({
  Database: jest.fn().mockImplementation(() => ({
    run: jest.fn(),
    get: jest.fn(),
    all: jest.fn(),
    close: jest.fn(),
    serialize: jest.fn(callback => callback())
  }))
}));

describe('DatabaseSchema', () => {
  let schemaManager;
  let mockDb;

  beforeEach(() => {
    // Clear mocks
    jest.clearAllMocks();
    
    // Setup SQLite mock
    const sqlite3 = require('sqlite3');
    mockDb = {
      run: jest.fn((sql, params, callback) => {
        if (typeof params === 'function') {
          params(null); // Success callback
        } else if (callback) {
          callback(null);
        }
      }),
      get: jest.fn((sql, params, callback) => {
        // Support both callback and mockResolvedValue patterns
        if (mockDb.get.mockResolvedValue) {
          // If using mockResolvedValue pattern, handle async
          return Promise.resolve({ count: 5 });
        }
        if (typeof params === 'function') {
          params(null, { count: 5 }); // Default count result
        } else if (callback) {
          callback(null, { count: 5 });
        }
      }),
      all: jest.fn((sql, params, callback) => {
        // Support both callback and mockResolvedValue patterns  
        if (mockDb.all.mockResolvedValue) {
          // If using mockResolvedValue pattern, handle async
          return Promise.resolve([
            { name: 'openings', type: 'table' },
            { name: 'videos', type: 'table' },
            { name: 'opening_videos', type: 'table' }
          ]);
        }
        if (typeof params === 'function') {
          params(null, [
            { name: 'openings', type: 'table' },
            { name: 'videos', type: 'table' },
            { name: 'opening_videos', type: 'table' }
          ]);
        } else if (callback) {
          callback(null, [
            { name: 'openings', type: 'table' },
            { name: 'videos', type: 'table' },
            { name: 'opening_videos', type: 'table' }
          ]);
        }
      }),
      close: jest.fn(callback => callback && callback()),
      serialize: jest.fn(callback => callback())
    };
    sqlite3.Database.mockReturnValue(mockDb);

    schemaManager = new DatabaseSchema(':memory:');
  });

  describe('schema creation', () => {
    it('should create all required tables with correct schema', async () => {
      await schemaManager.initializeSchema();

      // Verify that all table creation SQL was called
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS openings'),
        expect.any(Function)
      );
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS videos'),
        expect.any(Function)
      );
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS opening_videos'),
        expect.any(Function)
      );
    });

    it('should create performance indexes after schema creation', async () => {
      await schemaManager.initializeSchema();

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_opening_videos_score'),
        expect.any(Function)
      );
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('CREATE INDEX IF NOT EXISTS idx_videos_published'),
        expect.any(Function)
      );
    });

    it('should handle database creation errors gracefully', async () => {
      mockDb.run.mockImplementation((sql, callback) => {
        callback(new Error('Database locked'));
      });

      await expect(schemaManager.initializeSchema()).rejects.toThrow('Database locked');
    });

    it('should verify schema integrity after creation', async () => {
      mockDb.all.mockImplementation((sql, callback) => {
        callback(null, [
          { name: 'openings', type: 'table' },
          { name: 'videos', type: 'table' },
          { name: 'opening_videos', type: 'table' }
        ]);
      });

      const integrity = await schemaManager.verifySchema();

      expect(integrity.valid).toBe(true);
      expect(integrity.tables).toEqual(['openings', 'videos', 'opening_videos']);
    });
  });

  describe('data insertion operations', () => {
    beforeEach(() => {
      // Mock successful initialization
      mockDb.run.mockImplementation((sql, params, callback) => {
        if (typeof params === 'function') {
          params(null);
        } else if (callback) {
          callback(null);
        }
      });
    });

    it('should insert opening data with FEN as primary key', async () => {
      const opening = {
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        name: 'King\'s Indian Attack',
        eco: 'A07',
        aliases: ['KIA', 'King\'s Indian Setup']
      };

      await schemaManager.insertOpening(opening);

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR IGNORE INTO openings'),
        [opening.fen, opening.name, opening.eco, JSON.stringify(opening.aliases)],
        expect.any(Function)
      );
    });

    it('should insert video data with proper field mapping', async () => {
      const video = {
        id: 'test123',
        title: 'King\'s Indian Attack Complete Guide',
        channelId: 'UC1234567890',
        channelTitle: 'Chess Channel',
        duration: 900,
        viewCount: 25000,
        publishedAt: '2024-01-15T10:30:00Z',
        thumbnailUrl: 'https://img.youtube.com/vi/test123/default.jpg'
      };

      await schemaManager.insertVideo(video);

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO videos'),
        [
          video.id,
          video.title,
          video.channelId,
          video.channelTitle,
          video.duration,
          video.viewCount,
          video.publishedAt,
          video.thumbnailUrl
        ],
        expect.any(Function)
      );
    });

    it('should create opening-video relationships with match scores', async () => {
      const relationship = {
        openingId: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
        videoId: 'test123',
        matchScore: 0.85
      };

      await schemaManager.insertOpeningVideo(relationship);

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO opening_videos'),
        [relationship.openingId, relationship.videoId, relationship.matchScore],
        expect.any(Function)
      );
    });

    it('should handle duplicate insertions gracefully', async () => {
      mockDb.run.mockImplementation((sql, params, callback) => {
        const error = new Error('UNIQUE constraint failed');
        error.code = 'SQLITE_CONSTRAINT';
        callback(error);
      });

      const opening = {
        fen: 'test_fen',
        name: 'Test Opening',
        eco: 'A00'
      };

      await expect(schemaManager.insertOpening(opening)).rejects.toThrow('UNIQUE constraint failed');
    });
  });

  describe('query operations', () => {
    it('should retrieve openings by ECO code', async () => {
      const mockOpenings = [
        { id: 'fen1', name: 'French Defense', eco: 'C00' },
        { id: 'fen2', name: 'French Defense Advance', eco: 'C02' }
      ];
      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, mockOpenings);
      });

      const result = await schemaManager.getOpeningsByEco('C0%');

      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM openings WHERE eco LIKE ?'),
        ['C0%'],
        expect.any(Function)
      );
      expect(result).toEqual(mockOpenings);
    });

    it('should retrieve top videos for specific opening', async () => {
      const mockVideos = [
        {
          id: 'vid1',
          title: 'French Defense Guide',
          match_score: 0.95,
          view_count: 50000
        },
        {
          id: 'vid2',
          title: 'French Defense Tactics',
          match_score: 0.88,
          view_count: 30000
        }
      ];
      mockDb.all.mockImplementation((sql, params, callback) => {
        callback(null, mockVideos);
      });

      const openingFen = 'test_fen';
      const result = await schemaManager.getTopVideosForOpening(openingFen, 10);

      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining('JOIN opening_videos ov ON v.id = ov.video_id'),
        [openingFen, 10],
        expect.any(Function)
      );
      expect(result).toEqual(mockVideos);
    });

    it('should get database statistics', async () => {
      let callCount = 0;
      mockDb.get.mockImplementation((sql, callback) => {
        callCount++;
        if (callCount === 1) {
          callback(null, { count: 2700 }); // openings count
        } else if (callCount === 2) {
          callback(null, { count: 5000 }); // videos count  
        } else {
          callback(null, { count: 12000 }); // relationships count
        }
      });

      const stats = await schemaManager.getDatabaseStats();

      expect(stats).toEqual({
        openings: 2700,
        videos: 5000,
        relationships: 12000,
        storageReduction: expect.any(Number)
      });
    });
  });

  describe('database maintenance', () => {
    it('should vacuum database to reclaim space', async () => {
      await schemaManager.vacuum();

      expect(mockDb.run).toHaveBeenCalledWith(
        'VACUUM',
        expect.any(Function)
      );
    });

    it('should backup database to specified location', async () => {
      const backupPath = '/tmp/test-backup.sqlite';
      
      // Mock file operations
      const fs = require('fs');
      jest.spyOn(fs, 'copyFileSync').mockImplementation();

      await schemaManager.backup(backupPath);

      // Verify backup was attempted
      expect(fs.copyFileSync).toHaveBeenCalledWith(
        expect.any(String),
        backupPath
      );
    });

    it('should close database connection properly', async () => {
      await schemaManager.close();

      expect(mockDb.close).toHaveBeenCalled();
    });
  });

  describe('performance optimization', () => {
    it('should analyze query performance', async () => {
      mockDb.all.mockImplementation((sql, callback) => {
        callback(null, [
          { detail: 'SCAN TABLE videos' },
          { detail: 'USE INDEX idx_opening_videos_score' }
        ]);
      });

      const analysis = await schemaManager.analyzeQueryPerformance(
        'SELECT * FROM videos v JOIN opening_videos ov ON v.id = ov.video_id WHERE ov.opening_id = ?'
      );

      expect(analysis).toContain('SCAN TABLE videos');
      expect(analysis.some(detail => detail.includes('USE INDEX'))).toBe(true);
    });

    it('should validate all indexes exist', async () => {
      mockDb.all.mockImplementation((sql, callback) => {
        callback(null, [
          { name: 'idx_opening_videos_score' },
          { name: 'idx_videos_published' },
          { name: 'idx_videos_channel' }
        ]);
      });

      const indexes = await schemaManager.validateIndexes();

      expect(indexes.valid).toBe(true);
      expect(indexes.missing).toEqual([]);
    });
  });

  describe('migration support', () => {
    it('should prepare database for migration from JSON', async () => {
      await schemaManager.prepareMigration();

      // Should disable foreign key constraints during migration
      expect(mockDb.run).toHaveBeenCalledWith(
        'PRAGMA foreign_keys = OFF',
        expect.any(Function)
      );
    });

    it('should finalize migration and re-enable constraints', async () => {
      await schemaManager.finalizeMigration();

      expect(mockDb.run).toHaveBeenCalledWith(
        'PRAGMA foreign_keys = ON',
        expect.any(Function)
      );
    });

    it('should validate data integrity after migration', async () => {
      let callCount = 0;
      mockDb.get.mockImplementation((sql, callback) => {
        callCount++;
        if (callCount === 1) {
          callback(null, { count: 0 }); // orphaned videos
        } else if (callCount === 2) {
          callback(null, { count: 0 }); // orphaned relationships
        } else {
          callback(null, { count: 0 }); // invalid scores
        }
      });

      const integrity = await schemaManager.validateDataIntegrity();

      expect(integrity.orphanedVideos).toBe(0);
      expect(integrity.orphanedRelationships).toBe(0);
      expect(integrity.invalidScores).toBe(0);
      expect(integrity.valid).toBe(true);
    });
  });
});
