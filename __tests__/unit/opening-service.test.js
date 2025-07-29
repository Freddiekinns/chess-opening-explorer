/**
 * Opening Service Unit Tests
 * 
 * Tests the opening service following TDD principles:
 * - Mock external dependencies (database, APIs)
 * - Test business logic and edge cases
 * - Fast, isolated tests
 */

const OpeningService = require('../../packages/api/src/services/opening-service');

// Mock external dependencies
jest.mock('../../packages/api/src/models/database');
jest.mock('fs');

describe('OpeningService', () => {
  let openingService;
  let mockDb;

  beforeEach(() => {
    // Setup fresh service instance and mocks
    openingService = new OpeningService();
    mockDb = {
      get: jest.fn(),
      all: jest.fn(),
      run: jest.fn()
    };
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('validateEcoCode', () => {
    test('should accept valid ECO codes', () => {
      const validCodes = ['A00', 'B20', 'C42', 'D85', 'E99'];
      
      validCodes.forEach(code => {
        expect(openingService.validateEcoCode(code)).toBe(true);
      });
    });

    test('should reject invalid ECO codes', () => {
      const invalidCodes = ['F00', 'A100', 'Z99', '', null, undefined, 123];
      
      invalidCodes.forEach(code => {
        expect(openingService.validateEcoCode(code)).toBe(false);
      });
    });

    test('should handle edge cases', () => {
      expect(openingService.validateEcoCode('A00')).toBe(true);  // Lower bound
      expect(openingService.validateEcoCode('E99')).toBe(true);  // Upper bound
      expect(openingService.validateEcoCode('a20')).toBe(false); // Wrong case
      expect(openingService.validateEcoCode(' B20 ')).toBe(false); // Whitespace
    });
  });

  describe('getOpeningByEco', () => {
    test('should return opening data for valid ECO code', async () => {
      const mockOpening = {
        eco: 'B20',
        name: 'Sicilian Defense',
        moves: '1. e4 c5',
        fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2'
      };

      mockDb.get.mockResolvedValueOnce(mockOpening);
      openingService.db = mockDb;

      const result = await openingService.getOpeningByEco('B20');

      expect(result).toEqual(mockOpening);
      expect(mockDb.get).toHaveBeenCalledWith(
        'SELECT * FROM openings WHERE eco = ?',
        ['B20']
      );
    });

    test('should return null for non-existent ECO code', async () => {
      mockDb.get.mockResolvedValueOnce(null);
      openingService.db = mockDb;

      const result = await openingService.getOpeningByEco('Z99');

      expect(result).toBeNull();
    });

    test('should throw error for invalid ECO code format', async () => {
      await expect(openingService.getOpeningByEco('invalid'))
        .rejects.toThrow('Invalid ECO code format');
        
      // Should not make database call for invalid input
      expect(mockDb.get).not.toHaveBeenCalled();
    });

    test('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockDb.get.mockRejectedValueOnce(dbError);
      openingService.db = mockDb;

      await expect(openingService.getOpeningByEco('B20'))
        .rejects.toThrow('Database connection failed');
    });
  });

  describe('searchOpenings', () => {
    test('should search openings by name', async () => {
      const mockResults = [
        { eco: 'B20', name: 'Sicilian Defense' },
        { eco: 'B21', name: 'Sicilian Defense: Grand Prix Attack' }
      ];

      mockDb.all.mockResolvedValueOnce(mockResults);
      openingService.db = mockDb;

      const results = await openingService.searchOpenings('Sicilian');

      expect(results).toEqual(mockResults);
      expect(mockDb.all).toHaveBeenCalledWith(
        'SELECT * FROM openings WHERE name LIKE ? ORDER BY name',
        ['%Sicilian%']
      );
    });

    test('should sanitize search input', async () => {
      mockDb.all.mockResolvedValueOnce([]);
      openingService.db = mockDb;

      await openingService.searchOpenings("'; DROP TABLE openings; --");

      // Should escape the malicious input
      expect(mockDb.all).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([expect.stringContaining("'; DROP TABLE openings; --")])
      );
    });

    test('should handle empty search terms', async () => {
      const emptySearches = ['', '   ', null, undefined];

      for (const search of emptySearches) {
        await expect(openingService.searchOpenings(search))
          .rejects.toThrow('Search term cannot be empty');
      }
    });

    test('should limit search results', async () => {
      const manyResults = Array.from({ length: 150 }, (_, i) => ({
        eco: `B${i.toString().padStart(2, '0')}`,
        name: `Opening ${i}`
      }));

      mockDb.all.mockResolvedValueOnce(manyResults);
      openingService.db = mockDb;

      const results = await openingService.searchOpenings('Opening');

      expect(results).toHaveLength(100); // Should be limited to 100 results
    });
  });

  describe('addOpening', () => {
    test('should add new opening with valid data', async () => {
      const newOpening = {
        eco: 'B25',
        name: 'Sicilian Defense: Closed Variation',
        moves: '1. e4 c5 2. Nc3',
        fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/2N5/PPPP1PPP/R1BQKBNR b KQkq - 1 2'
      };

      mockDb.run.mockResolvedValueOnce({ lastID: 123 });
      openingService.db = mockDb;

      const result = await openingService.addOpening(newOpening);

      expect(result.id).toBe(123);
      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO openings'),
        expect.arrayContaining([newOpening.eco, newOpening.name, newOpening.moves, newOpening.fen])
      );
    });

    test('should reject duplicate ECO codes', async () => {
      const duplicateOpening = {
        eco: 'B20', // Assume this already exists
        name: 'Duplicate Opening',
        moves: '1. e4 c5',
        fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2'
      };

      const dbError = new Error('UNIQUE constraint failed: openings.eco');
      mockDb.run.mockRejectedValueOnce(dbError);
      openingService.db = mockDb;

      await expect(openingService.addOpening(duplicateOpening))
        .rejects.toThrow('Opening with ECO code B20 already exists');
    });

    test('should validate required fields', async () => {
      const invalidOpenings = [
        { eco: '', name: 'Test', moves: '1. e4', fen: 'valid-fen' },
        { eco: 'B20', name: '', moves: '1. e4', fen: 'valid-fen' },
        { eco: 'B20', name: 'Test', moves: '', fen: 'valid-fen' },
        { eco: 'B20', name: 'Test', moves: '1. e4', fen: '' }
      ];

      for (const opening of invalidOpenings) {
        await expect(openingService.addOpening(opening))
          .rejects.toThrow('Missing required fields');
      }

      // Should not make any database calls
      expect(mockDb.run).not.toHaveBeenCalled();
    });
  });
});
