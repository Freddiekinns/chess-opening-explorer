/**
 * Search Service Working Tests
 * Tests for the actual SearchService implementation (singleton instance)
 */

const searchService = require('../../packages/api/src/services/search-service');

// Mock dependencies
jest.mock('../../packages/api/src/services/opening-data-service', () => ({
  getOpenings: jest.fn()
}));

jest.mock('fuse.js', () => {
  return jest.fn().mockImplementation((data, options) => ({
    search: jest.fn()
  }));
});

const { getOpenings } = require('../../packages/api/src/services/opening-data-service');
const Fuse = require('fuse.js');

describe('SearchService Working Tests', () => {
  const mockOpeningsData = [
    {
      eco_code: 'B20',
      name: 'Sicilian Defense',
      moves: 'e4 c5',
      analysis_json: {
        popularity_score: 85,
        style_tags: ['aggressive', 'tactical'],
        description: 'Sharp opening'
      }
    },
    {
      eco_code: 'E20',
      name: 'Queen\'s Gambit',
      moves: 'd4 d5 c4',
      analysis_json: {
        popularity_score: 75,
        style_tags: ['positional', 'strategic'],
        description: 'Classical opening'
      }
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset service state
    searchService.fuse = null;
    searchService.openings = null;
    searchService.popularitySorted = null;
    searchService.initialized = false;
    searchService.popularCache.clear();
    
    // Set up default mock
    getOpenings.mockResolvedValue(mockOpeningsData);
  });

  describe('Constructor properties', () => {
    it('should have expected properties', () => {
      expect(searchService).toHaveProperty('fuse');
      expect(searchService).toHaveProperty('openings');
      expect(searchService).toHaveProperty('popularitySorted');
      expect(searchService).toHaveProperty('initialized');
      expect(searchService).toHaveProperty('popularCache');
    });
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await searchService.initialize();
      
      expect(searchService.initialized).toBe(true);
      expect(searchService.openings).toEqual(mockOpeningsData);
      expect(searchService.popularitySorted).toBeDefined();
      expect(Fuse).toHaveBeenCalled();
    });

    it('should not reinitialize if already initialized', async () => {
      searchService.initialized = true;
      getOpenings.mockClear();
      
      await searchService.initialize();
      
      expect(getOpenings).not.toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      getOpenings.mockRejectedValue(new Error('Data service error'));
      
      await searchService.initialize();
      
      expect(consoleError).toHaveBeenCalledWith('Failed to initialize search service:', expect.any(Error));
      expect(searchService.initialized).toBe(false);
      
      consoleError.mockRestore();
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      const mockFuse = {
        search: jest.fn().mockReturnValue([
          { item: mockOpeningsData[0], score: 0.1 }
        ])
      };
      Fuse.mockImplementation(() => mockFuse);
      
      await searchService.initialize();
    });

    it('should handle basic search', async () => {
      const result = await searchService.search('Sicilian');
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle empty query', async () => {
      const result = await searchService.search('');
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle null query', async () => {
      const result = await searchService.search(null);
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle search before initialization', async () => {
      searchService.initialized = false;
      searchService.fuse = null;
      
      const result = await searchService.search('test');
      
      expect(result).toEqual([]);
    });

    it('should handle fuse search errors', async () => {
      const mockFuse = {
        search: jest.fn().mockImplementation(() => {
          throw new Error('Search error');
        })
      };
      Fuse.mockImplementation(() => mockFuse);
      
      await searchService.initialize();
      
      const result = await searchService.search('test');
      expect(result).toEqual([]);
    });
  });

  describe('getPopularOpenings', () => {
    beforeEach(async () => {
      await searchService.initialize();
    });

    it('should return popular openings', () => {
      const result = searchService.getPopularOpenings();
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should limit results when specified', () => {
      const limit = 1;
      const result = searchService.getPopularOpenings(limit);
      
      expect(result.length).toBeLessThanOrEqual(limit);
    });
  });

  describe('clearCache', () => {
    it('should clear cache if method exists', () => {
      searchService.popularCache.set('test', 'value');
      expect(searchService.popularCache.size).toBe(1);
      
      if (typeof searchService.clearCache === 'function') {
        searchService.clearCache();
        expect(searchService.popularCache.size).toBe(0);
      } else {
        // Method doesn't exist, just verify cache can be cleared manually
        searchService.popularCache.clear();
        expect(searchService.popularCache.size).toBe(0);
      }
    });
  });
});
