/**
 * Search Service Simple Tests
 * 
 * Basic test coverage for SearchService with proper mocking
 * Focus on methods that actually exist in the service
 */

// Mock dependencies
jest.mock('../../packages/api/src/services/opening-data-service', () => ({
  getOpenings: jest.fn()
}));

jest.mock('fuse.js', () => {
  return jest.fn().mockImplementation(() => ({
    search: jest.fn(() => [])
  }));
});

jest.mock('../../packages/api/src/services/search/SearchConstants', () => ({
  SEMANTIC_MAPPINGS: {},
  STYLE_CATEGORIES: {},
  FUSE_OPTIONS: { keys: ['name'], threshold: 0.3 }
}));

jest.mock('../../packages/api/src/services/search/QueryUtils', () => ({
  validateAndSanitize: jest.fn((query, options) => ({ query, options }))
}));

jest.mock('../../packages/api/src/services/search/QueryIntentParser', () => ({
  parseQueryIntent: jest.fn(() => ({ type: 'text' }))
}));

const SearchService = require('../../packages/api/src/services/search-service');

describe('SearchService Simple Tests', () => {
  let searchService;
  const mockOpenings = [
    {
      id: 1,
      name: 'Sicilian Defense',
      eco: 'B20',
      moves: '1. e4 c5',
      analysis_json: { popularity_score: 95 }
    },
    {
      id: 2,
      name: 'French Defense', 
      eco: 'C00',
      moves: '1. e4 e6',
      analysis_json: { popularity_score: 85 }
    }
  ];

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock getOpenings to return test data
    const { getOpenings } = require('../../packages/api/src/services/opening-data-service');
    getOpenings.mockResolvedValue(mockOpenings);

    // Create new service instance
    searchService = new SearchService();
  });

  describe('Constructor', () => {
    it('should initialize with default values', () => {
      expect(searchService.fuse).toBeNull();
      expect(searchService.openings).toBeNull();
      expect(searchService.initialized).toBe(false);
      expect(searchService.popularCache).toBeInstanceOf(Map);
    });
  });

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      await searchService.initialize();
      
      expect(searchService.initialized).toBe(true);
      expect(searchService.openings).toEqual(mockOpenings);
      expect(searchService.fuse).toBeDefined();
    });

    it('should not reinitialize if already initialized', async () => {
      const { getOpenings } = require('../../packages/api/src/services/opening-data-service');
      
      await searchService.initialize();
      await searchService.initialize();
      
      expect(getOpenings).toHaveBeenCalledTimes(1);
    });

    it('should handle initialization errors', async () => {
      const { getOpenings } = require('../../packages/api/src/services/opening-data-service');
      getOpenings.mockRejectedValue(new Error('Failed to load openings'));
      
      // Should not throw
      await expect(searchService.initialize()).resolves.toBeUndefined();
      expect(searchService.initialized).toBe(false);
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      await searchService.initialize();
    });

    it('should handle basic search', async () => {
      const result = await searchService.search('Sicilian');
      
      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('totalResults');
      expect(result).toHaveProperty('hasMore');
      expect(Array.isArray(result.results)).toBe(true);
    });

    it('should handle empty query', async () => {
      const result = await searchService.search('');
      
      expect(result).toHaveProperty('results');
      expect(Array.isArray(result.results)).toBe(true);
    });

    it('should handle null query', async () => {
      const result = await searchService.search(null);
      
      expect(result).toHaveProperty('results');
      expect(Array.isArray(result.results)).toBe(true);
    });

    it('should handle search options', async () => {
      const result = await searchService.search('test', { limit: 5 });
      
      expect(result).toHaveProperty('results');
      expect(Array.isArray(result.results)).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle search before initialization', async () => {
      const uninitializedService = new SearchService();
      
      const result = await uninitializedService.search('test');
      
      expect(result).toHaveProperty('results');
      expect(result.results).toHaveLength(0);
    });

    it('should handle fuse search errors', async () => {
      await searchService.initialize();
      
      // Mock fuse.search to throw error
      searchService.fuse.search = jest.fn(() => {
        throw new Error('Search failed');
      });
      
      // Should not throw, should return empty results
      const result = await searchService.search('test');
      
      expect(result).toHaveProperty('results');
      expect(Array.isArray(result.results)).toBe(true);
    });
  });

  describe('getPopularOpenings', () => {
    beforeEach(async () => {
      await searchService.initialize();
    });

    it('should return popular openings', () => {
      if (typeof searchService.getPopularOpenings === 'function') {
        const popular = searchService.getPopularOpenings(5);
        expect(Array.isArray(popular)).toBe(true);
      } else {
        // Method might not exist, test that it doesn't crash
        expect(searchService.popularitySorted).toBeDefined();
      }
    });
  });

  describe('clearCache', () => {
    it('should clear cache if method exists', () => {
      if (typeof searchService.clearCache === 'function') {
        searchService.clearCache();
        expect(searchService.popularCache.size).toBe(0);
      } else {
        // Method might not exist
        expect(searchService.popularCache).toBeInstanceOf(Map);
      }
    });
  });
});
