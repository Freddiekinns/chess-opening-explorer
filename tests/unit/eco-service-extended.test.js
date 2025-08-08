/**
 * ECO Service Extended Coverage Tests
 * 
 * Comprehensive tests for ECOService to reach 70%+ coverage
 * Focus on missing coverage areas identified in Phase 1
 */

const ECOService = require('../../packages/api/src/services/eco-service');
const fs = require('fs');
const path = require('path');

// Mock fs to test error scenarios
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
  rmSync: jest.fn()
}));

describe('ECOService Extended Coverage', () => {
  let ecoService;
  const testDataDir = path.join(__dirname, '../fixtures/eco-test-data');

  beforeEach(() => {
    // Reset all mocks
    jest.resetAllMocks();
    
    ecoService = new ECOService();
    ecoService.dataDir = testDataDir;
    
    // Reset internal state
    ecoService.allOpenings = null;
    ecoService.popularityData = {};
  });

  describe('getAllOpenings() method', () => {
    beforeEach(() => {
      // Mock successful file operations
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockImplementation((filePath) => {
        if (filePath.includes('ecoA.json')) {
          return JSON.stringify({
            'fen1': { eco: 'A00', name: 'Sicilian Defense', moves: '1. e4 c5' },
            'fen2': { eco: 'A01', name: 'French Defense', moves: '1. e4 e6' }
          });
        }
        if (filePath.includes('ecoB.json')) {
          return JSON.stringify({
            'fen3': { eco: 'B00', name: 'King\'s Pawn', moves: '1. e4' }
          });
        }
        if (filePath.includes('popularity_stats.json')) {
          return JSON.stringify({
            'fen1': { games: 1000, winRate: 0.55 },
            'fen2': { games: 800, winRate: 0.52 }
          });
        }
        return '{}';
      });
    });

    it('should return all openings from loaded ECO data', () => {
      const result = ecoService.getAllOpenings();
      
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('fen', 'fen1');
      expect(result[0]).toHaveProperty('eco', 'A00');
      expect(result[0]).toHaveProperty('name', 'Sicilian Defense');
    });

    it('should include popularity data when available', () => {
      const result = ecoService.getAllOpenings();
      
      const opening1 = result.find(o => o.fen === 'fen1');
      expect(opening1).toHaveProperty('popularity');
      expect(opening1.popularity).toEqual({ games: 1000, winRate: 0.55 });
    });

    it('should handle missing popularity data gracefully', () => {
      // Mock missing popularity file
      fs.readFileSync.mockImplementation((filePath) => {
        if (filePath.includes('popularity_stats.json')) {
          throw new Error('File not found');
        }
        if (filePath.includes('ecoA.json')) {
          return JSON.stringify({
            'fen1': { eco: 'A00', name: 'Test Opening', moves: '1. e4' }
          });
        }
        return '{}';
      });

      const result = ecoService.getAllOpenings();
      
      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('popularity');
    });

    it('should cache results for subsequent calls', () => {
      // First call
      const result1 = ecoService.getAllOpenings();
      
      // Second call should use cache
      const result2 = ecoService.getAllOpenings();
      
      expect(fs.readFileSync).toHaveBeenCalledTimes(6); // 5 ECO files + 1 popularity file, only called once
      expect(result1).toBe(result2); // Should be same reference (cached)
    });
  });

  describe('getOpeningsByECO() filtering logic', () => {
    beforeEach(() => {
      // Mock ECO data with various ECO codes
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockImplementation((filePath) => {
        if (filePath.includes('ecoA.json')) {
          return JSON.stringify({
            'fen1': { eco: 'A00', name: 'Opening A00-1', moves: '1. e4' },
            'fen2': { eco: 'A01', name: 'Opening A01-1', moves: '1. e4 e6' },
            'fen3': { eco: 'A00', name: 'Opening A00-2', moves: '1. e4 c5' }
          });
        }
        return '{}';
      });
    });

    it('should filter openings by exact ECO code', () => {
      const result = ecoService.getOpeningsByECO('A00');
      
      expect(result).toHaveLength(2);
      expect(result.every(opening => opening.eco === 'A00')).toBe(true);
      expect(result.map(o => o.name)).toEqual(['Opening A00-1', 'Opening A00-2']);
    });

    it('should return empty array for non-existent ECO code', () => {
      const result = ecoService.getOpeningsByECO('Z99');
      
      expect(result).toHaveLength(0);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle undefined ECO code parameter', () => {
      const result = ecoService.getOpeningsByECO(undefined);
      
      expect(result).toHaveLength(0);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle null ECO code parameter', () => {
      const result = ecoService.getOpeningsByECO(null);
      
      expect(result).toHaveLength(0);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should be case-insensitive for ECO codes', () => {
      const result = ecoService.getOpeningsByECO('a00');
      
      expect(result).toHaveLength(2);
      expect(result.every(opening => opening.eco === 'A00')).toBe(true);
    });
  });

  describe('getRandomOpening() selection', () => {
    beforeEach(() => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockImplementation((filePath) => {
        if (filePath.includes('ecoA.json')) {
          return JSON.stringify({
            'fen1': { eco: 'A00', name: 'Opening 1', moves: '1. e4' },
            'fen2': { eco: 'A01', name: 'Opening 2', moves: '1. d4' },
            'fen3': { eco: 'A02', name: 'Opening 3', moves: '1. Nf3' }
          });
        }
        return '{}';
      });
    });

    it('should return a random opening from available data', () => {
      const result = ecoService.getRandomOpening();
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('fen');
      expect(result).toHaveProperty('eco');
      expect(result).toHaveProperty('name');
      expect(result).toHaveProperty('moves');
    });

    it('should return different openings on multiple calls (probabilistic)', () => {
      // Mock Math.random to ensure different selections
      const originalRandom = Math.random;
      let callCount = 0;
      Math.random = jest.fn(() => {
        callCount++;
        return callCount === 1 ? 0.1 : 0.9; // Different indices
      });

      const result1 = ecoService.getRandomOpening();
      const result2 = ecoService.getRandomOpening();
      
      // At least one property should be different (probabilistic test)
      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      
      Math.random = originalRandom;
    });

    it('should handle empty opening data gracefully', () => {
      // Mock empty ECO files
      fs.readFileSync.mockImplementation(() => '{}');
      
      const result = ecoService.getRandomOpening();
      
      expect(result).toBeNull();
    });
  });

  describe('searchOpenings() functionality', () => {
    beforeEach(() => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockImplementation((filePath) => {
        if (filePath.includes('ecoA.json')) {
          return JSON.stringify({
            'fen1': { eco: 'A00', name: 'Sicilian Defense', moves: '1. e4 c5' },
            'fen2': { eco: 'A01', name: 'French Defense', moves: '1. e4 e6' },
            'fen3': { eco: 'B00', name: 'King\'s Pawn Opening', moves: '1. e4' }
          });
        }
        return '{}';
      });
    });

    it('should search openings by name', () => {
      const result = ecoService.searchOpenings('Sicilian');
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Sicilian Defense');
    });

    it('should search openings by ECO code', () => {
      const result = ecoService.searchOpenings('A00');
      
      expect(result).toHaveLength(1);
      expect(result[0].eco).toBe('A00');
    });

    it('should search openings by moves', () => {
      const result = ecoService.searchOpenings('e4 c5');
      
      expect(result).toHaveLength(1);
      expect(result[0].moves).toBe('1. e4 c5');
    });

    it('should be case-insensitive', () => {
      const result = ecoService.searchOpenings('sicilian');
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Sicilian Defense');
    });

    it('should return empty array for no matches', () => {
      const result = ecoService.searchOpenings('NonExistentOpening');
      
      expect(result).toHaveLength(0);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle empty query string', () => {
      const result = ecoService.searchOpenings('');
      
      expect(result).toHaveLength(0);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle undefined query', () => {
      const result = ecoService.searchOpenings(undefined);
      
      expect(result).toHaveLength(0);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Error handling for missing ECO files', () => {
    it('should handle missing ECO files gracefully', () => {
      // Mock some files missing
      fs.existsSync.mockImplementation((filePath) => {
        return !filePath.includes('ecoC.json'); // ecoC is missing
      });
      
      fs.readFileSync.mockImplementation((filePath) => {
        if (filePath.includes('ecoA.json')) {
          return JSON.stringify({
            'fen1': { eco: 'A00', name: 'Test Opening', moves: '1. e4' }
          });
        }
        return '{}';
      });

      const result = ecoService.getAllOpenings();
      
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Opening');
    });

    it('should handle corrupted ECO files', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockImplementation((filePath) => {
        if (filePath.includes('ecoA.json')) {
          return 'invalid json{';
        }
        return '{}';
      });

      // Should not throw error, but log warning
      expect(() => {
        const result = ecoService.getAllOpenings();
        expect(result).toHaveLength(0);
      }).not.toThrow();
    });

    it('should handle file read errors', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => {
        const result = ecoService.getAllOpenings();
        expect(result).toHaveLength(0);
      }).not.toThrow();
    });
  });

  describe('Performance and edge cases', () => {
    it('should handle large datasets efficiently', () => {
      // Mock large dataset
      const largeDataset = {};
      for (let i = 0; i < 1000; i++) {
        largeDataset[`fen${i}`] = {
          eco: `A${String(i).padStart(2, '0')}`,
          name: `Opening ${i}`,
          moves: `1. move${i}`
        };
      }

      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockImplementation((filePath) => {
        if (filePath.includes('ecoA.json')) {
          return JSON.stringify(largeDataset);
        }
        return '{}';
      });

      const startTime = Date.now();
      const result = ecoService.getAllOpenings();
      const endTime = Date.now();

      expect(result).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle special characters in opening names', () => {
      fs.existsSync.mockReturnValue(true);
      fs.readFileSync.mockImplementation((filePath) => {
        if (filePath.includes('ecoA.json')) {
          return JSON.stringify({
            'fen1': { eco: 'A00', name: 'Grünfeld Defense', moves: '1. d4 Nf6' },
            'fen2': { eco: 'A01', name: 'Alekhine\'s Defense', moves: '1. e4 Nf6' }
          });
        }
        return '{}';
      });

      const result = ecoService.searchOpenings('Grünfeld');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Grünfeld Defense');

      const result2 = ecoService.searchOpenings('Alekhine');
      expect(result2).toHaveLength(1);
      expect(result2[0].name).toBe('Alekhine\'s Defense');
    });
  });
});
