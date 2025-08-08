/**
 * ECO Service Basic Tests
 * 
 * Comprehensive test coverage for ECOService to reach 70%+ coverage
 * Focus on core chess opening logic and error handling
 */

const fs = require('fs');

// Mock the fs module
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn()
}));

const ECOService = require('../../packages/api/src/services/eco-service');

describe('ECOService Basic Tests', () => {
  const mockECOData = [
    {
      eco: 'B20',
      name: 'Sicilian Defense',
      moves: '1. e4 c5',
      analysis: { popularity: 95, difficulty: 'intermediate' }
    },
    {
      eco: 'C00',
      name: 'French Defense',
      moves: '1. e4 e6',
      analysis: { popularity: 85, difficulty: 'beginner' }
    },
    {
      eco: 'D20',
      name: "Queen's Gambit",
      moves: '1. d4 d5 2. c4',
      analysis: { popularity: 90, difficulty: 'intermediate' }
    }
  ];

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock file system operations
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify(mockECOData));
  });

  describe('getAllOpenings', () => {
    it('should return all openings when data is loaded', () => {
      const service = new ECOService();
      const openings = service.getAllOpenings();
      
      expect(openings).toHaveLength(3);
      expect(openings[0]).toHaveProperty('eco');
      expect(openings[0]).toHaveProperty('name');
      expect(openings[0]).toHaveProperty('moves');
    });

    it('should handle empty data file', () => {
      fs.readFileSync.mockReturnValue('[]');
      
      const service = new ECOService();
      const openings = service.getAllOpenings();
      
      expect(openings).toHaveLength(0);
    });

    it('should handle missing data file', () => {
      fs.existsSync.mockReturnValue(false);
      
      const service = new ECOService();
      const openings = service.getAllOpenings();
      
      expect(openings).toEqual([]);
    });

    it('should handle corrupted JSON data', () => {
      fs.readFileSync.mockReturnValue('invalid json');
      
      const service = new ECOService();
      expect(() => service.getAllOpenings()).not.toThrow();
    });
  });

  describe('getOpeningsByECO', () => {
    it('should return opening by exact ECO code', () => {
      const service = new ECOService();
      const opening = service.getOpeningsByECO('B20');
      
      expect(opening).toBeDefined();
      expect(opening.eco).toBe('B20');
      expect(opening.name).toBe('Sicilian Defense');
    });

    it('should return null for non-existent ECO code', () => {
      const service = new ECOService();
      const opening = service.getOpeningsByECO('Z99');
      
      expect(opening).toBeNull();
    });

    it('should handle case-insensitive ECO code search', () => {
      const service = new ECOService();
      const opening = service.getOpeningsByECO('b20');
      
      expect(opening).toBeDefined();
      expect(opening.eco).toBe('B20');
    });

    it('should handle null ECO code input', () => {
      const service = new ECOService();
      const opening = service.getOpeningsByECO(null);
      
      expect(opening).toBeNull();
    });

    it('should handle undefined ECO code input', () => {
      const service = new ECOService();
      const opening = service.getOpeningsByECO(undefined);
      
      expect(opening).toBeNull();
    });

    it('should handle empty string ECO code', () => {
      const service = new ECOService();
      const opening = service.getOpeningsByECO('');
      
      expect(opening).toBeNull();
    });
  });

  describe('getRandomOpening', () => {
    it('should return a random opening from the data', () => {
      const service = new ECOService();
      const opening = service.getRandomOpening();
      
      expect(opening).toBeDefined();
      expect(opening).toHaveProperty('eco');
      expect(opening).toHaveProperty('name');
      expect(opening).toHaveProperty('moves');
    });

    it('should return different openings on multiple calls', () => {
      const service = new ECOService();
      const openings = [];
      
      // Get 10 random openings
      for (let i = 0; i < 10; i++) {
        openings.push(service.getRandomOpening());
      }
      
      // Should have at least some variation (not all the same)
      const uniqueEcos = new Set(openings.map(o => o.eco));
      expect(uniqueEcos.size).toBeGreaterThan(1);
    });

    it('should handle empty data gracefully', () => {
      fs.readFileSync.mockReturnValue('[]');
      
      const service = new ECOService();
      const opening = service.getRandomOpening();
      
      expect(opening).toBeNull();
    });
  });

  describe('searchOpenings', () => {
    it('should search by opening name', () => {
      const service = new ECOService();
      const results = service.searchOpenings('Sicilian');
      
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Sicilian Defense');
    });

    it('should search by ECO code', () => {
      const service = new ECOService();
      const results = service.searchOpenings('C00');
      
      expect(results).toHaveLength(1);
      expect(results[0].eco).toBe('C00');
    });

    it('should search by moves', () => {
      const service = new ECOService();
      const results = service.searchOpenings('e4 c5');
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].moves).toContain('e4 c5');
    });

    it('should handle case-insensitive search', () => {
      const service = new ECOService();
      const results = service.searchOpenings('SICILIAN');
      
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Sicilian Defense');
    });

    it('should return empty array for no matches', () => {
      const service = new ECOService();
      const results = service.searchOpenings('nonexistent');
      
      expect(results).toHaveLength(0);
    });

    it('should handle empty search query', () => {
      const service = new ECOService();
      const results = service.searchOpenings('');
      
      expect(results).toHaveLength(3); // Should return all openings
    });

    it('should handle null search query', () => {
      const service = new ECOService();
      const results = service.searchOpenings(null);
      
      expect(results).toHaveLength(0);
    });

    it('should handle partial matches', () => {
      const service = new ECOService();
      const results = service.searchOpenings('Defense');
      
      expect(results.length).toBeGreaterThan(1);
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle file read errors gracefully', () => {
      fs.readFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });
      
      const service = new ECOService();
      expect(() => service.getAllOpenings()).not.toThrow();
    });

    it('should handle JSON parse errors gracefully', () => {
      fs.readFileSync.mockReturnValue('{ invalid json }');
      
      const service = new ECOService();
      expect(() => service.getAllOpenings()).not.toThrow();
    });

    it('should handle corrupted data structure', () => {
      fs.readFileSync.mockReturnValue(JSON.stringify([
        { eco: null, name: undefined, moves: 123 }
      ]));
      
      const service = new ECOService();
      const openings = service.getAllOpenings();
      
      expect(openings).toHaveLength(1);
    });

    it('should handle very large datasets', () => {
      const largeDataset = [];
      for (let i = 0; i < 1000; i++) {
        largeDataset.push({
          eco: `A${i.toString().padStart(2, '0')}`,
          name: `Opening ${i}`,
          moves: `1. move${i}`
        });
      }
      
      fs.readFileSync.mockReturnValue(JSON.stringify(largeDataset));
      
      const service = new ECOService();
      const openings = service.getAllOpenings();
      
      expect(openings).toHaveLength(1000);
    });

    it('should handle special characters in search', () => {
      const service = new ECOService();
      const results = service.searchOpenings('Grünfeld öäü');
      
      expect(results).toHaveLength(0); // No matches but shouldn't crash
    });
  });

  describe('Performance tests', () => {
    it('should perform search within reasonable time', () => {
      const service = new ECOService();
      
      const startTime = Date.now();
      service.searchOpenings('Defense');
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });

    it('should handle multiple concurrent searches', () => {
      const service = new ECOService();
      
      const searches = [
        service.searchOpenings('Sicilian'),
        service.searchOpenings('French'),
        service.searchOpenings('Queen')
      ];
      
      expect(searches).toHaveLength(3);
      searches.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });
    });
  });
});
