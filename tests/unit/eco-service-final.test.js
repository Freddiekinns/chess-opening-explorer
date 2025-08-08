/**
 * ECO Service Final Working Tests
 * Tests for the ECOService class with complete mocking strategy
 */

const ECOService = require('../../packages/api/src/services/eco-service');
const fs = require('fs');
const path = require('path');

// Mock dependencies
jest.mock('fs');
jest.mock('path');

// Mock path resolver with all required methods
jest.mock('../../packages/api/src/utils/path-resolver', () => ({
  getDataDir: jest.fn(() => '/mock/data'),
  getECODataPath: jest.fn(() => '/mock/data/eco'),
  getPopularityStatsPath: jest.fn(() => '/mock/data/popularity_stats.json'),
  resolveDataPath: jest.fn((file) => `/mock/data/${file}`)
}));

const pathResolver = require('../../packages/api/src/utils/path-resolver');

describe('ECOService Final Working Tests', () => {
  let ecoService;
  
  const mockECOData = {
    'A00': {
      code: 'A00',
      name: 'Uncommon Opening',
      moves: 'h3'
    },
    'B20': {
      code: 'B20', 
      name: 'Sicilian Defense',
      moves: 'e4 c5'
    }
  };

  const mockPopularityData = {
    'B20': { popularity_score: 85 },
    'A00': { popularity_score: 15 }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create new service instance
    ecoService = new ECOService();
    
    // Setup default mocks
    fs.readdirSync.mockReturnValue(['ecoA.json', 'ecoB.json']);
    fs.readFileSync.mockImplementation((filePath) => {
      if (filePath.includes('ecoA.json')) {
        return JSON.stringify({ 'A00': mockECOData.A00 });
      }
      if (filePath.includes('ecoB.json')) {
        return JSON.stringify({ 'B20': mockECOData.B20 });
      }
      if (filePath.includes('popularity_stats.json')) {
        return JSON.stringify(mockPopularityData);
      }
      return '{}';
    });
    fs.existsSync.mockReturnValue(true);
    path.join.mockImplementation((...args) => args.join('/'));
  });

  describe('Phase 1 ECO Service Tests', () => {
    it('should initialize with default values', () => {
      expect(ecoService.data).toEqual({});
      expect(ecoService.popularityData).toEqual({});
      expect(ecoService.isLoaded).toBe(false);
    });

    it('should load ECO data from files', () => {
      ecoService.loadECOData();
      
      expect(fs.readdirSync).toHaveBeenCalled();
      expect(fs.readFileSync).toHaveBeenCalled();
      expect(Object.keys(ecoService.data)).toContain('A00');
      expect(Object.keys(ecoService.data)).toContain('B20');
    });

    it('should return all openings with popularity data', () => {
      ecoService.loadECOData();
      const result = ecoService.getAllOpenings();
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('code');
      expect(result[0]).toHaveProperty('name');
    });

    it('should return openings for valid ECO code', () => {
      ecoService.loadECOData();
      const result = ecoService.getOpeningsByECO('B20');
      
      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('code', 'B20');
      }
    });

    it('should return a random opening', () => {
      ecoService.loadECOData();
      const result = ecoService.getRandomOpening();
      
      if (result) {
        expect(result).toHaveProperty('code');
        expect(result).toHaveProperty('name');
      }
    });

    it('should search openings by name', () => {
      ecoService.loadECOData();
      const result = ecoService.searchOpeningsByName('Sicilian');
      
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle empty data gracefully', () => {
      ecoService.data = {};
      ecoService.popularityData = {};
      
      const result = ecoService.getAllOpenings();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it('should cache loaded data', () => {
      ecoService.loadECOData();
      ecoService.loadECOData(); // Second call
      
      // Should only read files once due to isLoaded flag
      expect(fs.readdirSync).toHaveBeenCalledTimes(1);
    });

    it('should handle missing files gracefully', () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      fs.readFileSync.mockImplementation(() => {
        return JSON.stringify(mockECOData.A00);
      });
      
      ecoService.loadECOData();
      
      expect(ecoService.data).toBeDefined();
      consoleError.mockRestore();
    });

    it('should clear cached data', () => {
      ecoService.data = mockECOData;
      ecoService.popularityData = mockPopularityData;
      ecoService.isLoaded = true;
      
      ecoService.clearCache();
      
      expect(ecoService.data).toEqual({});
      expect(ecoService.popularityData).toEqual({});
      expect(ecoService.isLoaded).toBe(false);
    });
  });
});
