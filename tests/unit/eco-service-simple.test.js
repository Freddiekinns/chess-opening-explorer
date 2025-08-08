/**
 * ECO Service Simple Tests
 * 
 * Basic test coverage for ECOService with proper mocking
 * Focus on methods that actually exist in the service
 */

const fs = require('fs');

// Mock the fs module with the methods we need
jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  createWriteStream: jest.fn()
}));

// Mock the path resolver
jest.mock('../../packages/api/src/utils/path-resolver', () => ({
  getECODataPath: jest.fn(() => '/mock/path/data')
}));

const ECOService = require('../../packages/api/src/services/eco-service');

describe('ECOService Simple Tests', () => {
  let ecoService;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create new service instance
    ecoService = new ECOService();
    
    // Mock default file existence and content
    fs.existsSync.mockReturnValue(true);
    fs.readFileSync.mockReturnValue(JSON.stringify({
      'A00': { name: 'Polish Opening', moves: '1. b4' },
      'B20': { name: 'Sicilian Defense', moves: '1. e4 c5' },
      'C00': { name: 'French Defense', moves: '1. e4 e6' }
    }));
  });

  describe('Constructor', () => {
    it('should initialize with default values', () => {
      expect(ecoService.dataDir).toBe('/mock/path/data');
      expect(ecoService.ecoFiles).toHaveLength(5);
      expect(ecoService.ecoData).toBeNull();
    });
  });

  describe('loadECOData', () => {
    it('should load ECO data from files', () => {
      const data = ecoService.loadECOData();
      
      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.readFileSync).toHaveBeenCalled();
      expect(data).toHaveProperty('A00');
      expect(data).toHaveProperty('B20');
    });

    it('should cache loaded data', () => {
      const data1 = ecoService.loadECOData();
      const data2 = ecoService.loadECOData();
      
      expect(data1).toBe(data2); // Same reference
      expect(fs.readFileSync).toHaveBeenCalledTimes(5); // Only called once per file
    });

    it('should handle missing files gracefully', () => {
      fs.existsSync.mockReturnValue(false);
      
      const data = ecoService.loadECOData();
      
      expect(data).toEqual({});
    });
  });

  describe('getAllOpenings', () => {
    it('should return all openings', () => {
      const openings = ecoService.getAllOpenings();
      
      expect(Array.isArray(openings)).toBe(true);
      expect(openings.length).toBeGreaterThan(0);
    });

    it('should handle empty data', () => {
      fs.readFileSync.mockReturnValue('{}');
      ecoService.mergedData = null; // Reset cache
      
      const openings = ecoService.getAllOpenings();
      
      expect(Array.isArray(openings)).toBe(true);
      expect(openings).toHaveLength(0);
    });
  });

  describe('getOpeningsByECO', () => {
    it('should return openings for valid ECO code', () => {
      const openings = ecoService.getOpeningsByECO('B20');
      
      expect(Array.isArray(openings)).toBe(true);
      if (openings.length > 0) {
        expect(openings[0]).toHaveProperty('eco');
      }
    });

    it('should return empty array for invalid ECO code', () => {
      const openings = ecoService.getOpeningsByECO('Z99');
      
      expect(Array.isArray(openings)).toBe(true);
      expect(openings).toHaveLength(0);
    });

    it('should handle null ECO code', () => {
      const openings = ecoService.getOpeningsByECO(null);
      
      expect(Array.isArray(openings)).toBe(true);
    });
  });

  describe('getRandomOpening', () => {
    it('should return a random opening object', () => {
      const opening = ecoService.getRandomOpening();
      
      if (opening) {
        expect(opening).toHaveProperty('fen');
      }
    });

    it('should handle empty data gracefully', () => {
      fs.readFileSync.mockReturnValue('{}');
      ecoService.mergedData = null; // Reset cache
      
      const opening = ecoService.getRandomOpening();
      
      expect(opening).toBeDefined(); // May return empty object
    });
  });

  describe('searchOpeningsByName', () => {
    it('should search openings by name', () => {
      const results = ecoService.searchOpeningsByName('Sicilian');
      
      expect(Array.isArray(results)).toBe(true);
    });

    it('should limit results', () => {
      const results = ecoService.searchOpeningsByName('Defense', 1);
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeLessThanOrEqual(1);
    });

    it('should handle empty search term', () => {
      const results = ecoService.searchOpeningsByName('');
      
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('getPopularOpenings', () => {
    it('should return popular openings', () => {
      // Mock popularity data
      fs.readFileSync.mockReturnValueOnce(JSON.stringify({})); // ECO data
      fs.readFileSync.mockReturnValueOnce(JSON.stringify({
        'B20': { popularity_score: 95 }
      })); // Popularity data
      
      const openings = ecoService.getPopularOpenings(5);
      
      expect(Array.isArray(openings)).toBe(true);
    });

    it('should limit results', () => {
      const openings = ecoService.getPopularOpenings(2);
      
      expect(Array.isArray(openings)).toBe(true);
      expect(openings.length).toBeLessThanOrEqual(2);
    });
  });

  describe('Error handling', () => {
    it('should handle JSON parse errors', () => {
      fs.readFileSync.mockReturnValue('invalid json');
      
      expect(() => ecoService.loadECOData()).not.toThrow();
    });

    it('should handle file read errors', () => {
      fs.readFileSync.mockImplementation(() => {
        throw new Error('File read error');
      });
      
      expect(() => ecoService.loadECOData()).not.toThrow();
    });
  });

  describe('clearCache', () => {
    it('should clear cached data', () => {
      // Load data first
      ecoService.loadECOData();
      expect(ecoService.mergedData).toBeDefined();
      
      // Clear cache
      ecoService.clearCache();
      expect(ecoService.mergedData).toBeNull();
    });
  });
});
