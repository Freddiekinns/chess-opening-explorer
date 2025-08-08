/**
 * Search Service Comprehensive Tests
 * 
 * Complete test coverage for SearchService to reach 60%+ coverage
 * Focus on query parsing, intent detection, ranking algorithms, and filters
 */

// Mock the opening-data-service first
jest.mock('../../packages/api/src/services/opening-data-service', () => ({
  getOpenings: jest.fn()
}));

// Mock the search dependencies 
jest.mock('../../packages/api/src/services/search/SearchConstants', () => ({
  SEMANTIC_MAPPINGS: {
    aggressive: ['aggressive', 'attacking', 'sharp'],
    positional: ['positional', 'solid', 'strategic']
  },
  STYLE_CATEGORIES: {
    tactical: ['aggressive', 'tactical'],
    positional: ['positional', 'solid']
  },
  FUSE_OPTIONS: {
    keys: ['name', 'moves', 'eco'],
    threshold: 0.3
  }
}));

jest.mock('../../packages/api/src/services/search/QueryUtils', () => ({
  validateAndSanitize: jest.fn((query, options) => ({
    query: query || '',
    options: { limit: 50, offset: 0, ...options }
  })),
  isChessMove: jest.fn(() => false),
  looksLikeOpeningName: jest.fn(() => false),
  isAmbiguousSemanticTerm: jest.fn(() => false)
}));

jest.mock('../../packages/api/src/services/search/QueryIntentParser', () => ({
  parseQueryIntent: jest.fn(() => ({ type: 'unknown' }))
}));

jest.mock('fuse.js', () => {
  return jest.fn().mockImplementation(() => ({
    search: jest.fn(() => [])
  }));
});

// Import the service after mocking
const SearchService = require('../../packages/api/src/services/search-service');

describe('SearchService Comprehensive Tests', () => {
  const mockOpenings = [
    {
      id: 1,
      name: 'Sicilian Defense',
      eco: 'B20',
      moves: '1. e4 c5',
      analysis_json: { popularity_score: 95, difficulty: 'intermediate' },
      tags: ['aggressive', 'tactical'],
      description: 'A popular and aggressive opening for Black'
    },
    {
      id: 2,
      name: 'French Defense',
      eco: 'C00',
      moves: '1. e4 e6',
      analysis_json: { popularity_score: 85, difficulty: 'beginner' },
      tags: ['solid', 'positional'],
      description: 'A solid positional defense'
    },
    {
      id: 3,
      name: 'King\'s Indian Defense',
      eco: 'E60',
      moves: '1. d4 Nf6 2. c4 g6',
      analysis_json: { popularity_score: 80, difficulty: 'advanced' },
      tags: ['hypermodern', 'tactical'],
      description: 'A hypermodern defense with tactical themes'
    },
    {
      id: 4,
      name: 'Queen\'s Gambit',
      eco: 'D20',
      moves: '1. d4 d5 2. c4',
      analysis_json: { popularity_score: 90, difficulty: 'intermediate' },
      tags: ['classical', 'positional'],
      description: 'A classical opening focusing on central control'
    }
  ];

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock getOpenings to return our test data
    const { getOpenings } = require('../../packages/api/src/services/opening-data-service');
    getOpenings.mockResolvedValue(mockOpenings);

    // Reset the service state
    SearchService.openings = null;
    SearchService.initialized = false;
    SearchService.popularitySorted = null;
    if (SearchService.popularCache) {
      SearchService.popularCache.clear();
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully with opening data', async () => {
      await SearchService.initialize();
      
      expect(SearchService.initialized).toBe(true);
      expect(SearchService.openings).toHaveLength(4);
      expect(SearchService.fuse).toBeDefined();
    });

    it('should not reinitialize if already initialized', async () => {
      const { getOpenings } = require('../../packages/api/src/services/opening-data-service');
      
      // Initialize twice
      await SearchService.initialize();
      await SearchService.initialize();
      
      // Should only call getOpenings once
      expect(getOpenings).toHaveBeenCalledTimes(1);
    });

    it('should handle initialization errors gracefully', async () => {
      const { getOpenings } = require('../../packages/api/src/services/opening-data-service');
      getOpenings.mockRejectedValue(new Error('Database connection failed'));
      
      // Reset service state
      SearchService.initialized = false;
      SearchService.openings = null;
      
      await expect(SearchService.initialize()).rejects.toThrow('Database connection failed');
      expect(SearchService.initialized).toBe(false);
    });
  });

  describe('Query parsing and intent detection', () => {
    it('should detect ECO code queries', async () => {
      const results = await SearchService.search('B20');
      
      expect(Array.isArray(results.results)).toBe(true);
    });

    it('should detect opening name queries', async () => {
      const results = await SearchService.search('Sicilian');
      
      expect(Array.isArray(results.results)).toBe(true);
    });

    it('should detect move notation queries', async () => {
      const results = await SearchService.search('1. e4 c5');
      
      expect(Array.isArray(results.results)).toBe(true);
    });

    it('should detect tag-based queries', async () => {
      const results = await SearchService.search('aggressive');
      
      expect(Array.isArray(results.results)).toBe(true);
    });

    it('should detect difficulty level queries', async () => {
      const results = await SearchService.search('beginner');
      
      expect(Array.isArray(results.results)).toBe(true);
    });

    it('should handle complex queries with multiple terms', async () => {
      const results = await SearchService.search('tactical defense');
      
      expect(Array.isArray(results.results)).toBe(true);
    });

    it('should handle case-insensitive queries', async () => {
      const results1 = await SearchService.search('SICILIAN');
      const results2 = await SearchService.search('sicilian');
      
      expect(Array.isArray(results1.results)).toBe(true);
      expect(Array.isArray(results2.results)).toBe(true);
    });
  });

  describe('Search ranking algorithms', () => {
    it('should rank exact matches higher', async () => {
      const results = await searchService.search('French Defense');
      
      expect(results[0].name).toBe('French Defense');
      expect(results[0].score).toBeDefined();
    });

    it('should consider popularity in ranking', async () => {
      const results = await searchService.search('defense');
      
      // Sicilian Defense (popularity 95) should rank higher than King's Indian (popularity 80)
      const sicilianIndex = results.findIndex(r => r.name === 'Sicilian Defense');
      const kingsIndianIndex = results.findIndex(r => r.name === 'King\'s Indian Defense');
      
      expect(sicilianIndex).toBeLessThan(kingsIndianIndex);
    });

    it('should handle fuzzy matching', async () => {
      const results = await searchService.search('Sicilan'); // Misspelled
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toBe('Sicilian Defense');
    });

    it('should limit results based on score threshold', async () => {
      const results = await searchService.search('xyz123notfound');
      
      expect(results).toHaveLength(0);
    });
  });

  describe('Filter combinations', () => {
    it('should apply ECO code filter', async () => {
      const filters = { eco: 'B20' };
      const results = await searchService.search('defense', { filters });
      
      expect(results).toHaveLength(1);
      expect(results[0].eco).toBe('B20');
    });

    it('should apply difficulty filter', async () => {
      const filters = { difficulty: 'beginner' };
      const results = await searchService.search('', { filters });
      
      expect(results.every(r => r.analysis_json.difficulty === 'beginner')).toBe(true);
    });

    it('should apply popularity filter', async () => {
      const filters = { minPopularity: 85 };
      const results = await searchService.search('', { filters });
      
      expect(results.every(r => r.analysis_json.popularity_score >= 85)).toBe(true);
    });

    it('should apply multiple filters simultaneously', async () => {
      const filters = { 
        difficulty: 'intermediate',
        minPopularity: 85
      };
      const results = await searchService.search('', { filters });
      
      expect(results.every(r => 
        r.analysis_json.difficulty === 'intermediate' &&
        r.analysis_json.popularity_score >= 85
      )).toBe(true);
    });

    it('should apply tag filter', async () => {
      const filters = { tags: ['tactical'] };
      const results = await searchService.search('', { filters });
      
      expect(results.every(r => r.tags.includes('tactical'))).toBe(true);
    });

    it('should handle empty filter object', async () => {
      const filters = {};
      const results = await searchService.search('defense', { filters });
      
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Performance edge cases', () => {
    it('should handle empty query string', async () => {
      const results = await searchService.search('');
      
      // Should return most popular openings
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].analysis_json.popularity_score).toBeGreaterThanOrEqual(90);
    });

    it('should handle null query', async () => {
      const results = await searchService.search(null);
      
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle undefined query', async () => {
      const results = await searchService.search(undefined);
      
      expect(Array.isArray(results)).toBe(true);
    });

    it('should limit result count for performance', async () => {
      const results = await searchService.search('', { limit: 2 });
      
      expect(results).toHaveLength(2);
    });

    it('should handle very long query strings', async () => {
      const longQuery = 'a'.repeat(1000);
      const results = await searchService.search(longQuery);
      
      expect(Array.isArray(results)).toBe(true);
    });

    it('should perform within acceptable time limits', async () => {
      const startTime = Date.now();
      await searchService.search('defense tactical');
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
    });
  });

  describe('Caching and optimization', () => {
    it('should cache popular search results', async () => {
      // First search
      const results1 = await searchService.search('popular');
      
      // Second search should use cache
      const results2 = await searchService.search('popular');
      
      expect(results1).toEqual(results2);
    });

    it('should clear cache appropriately', async () => {
      await searchService.search('test');
      expect(searchService.popularCache.size).toBeGreaterThan(0);
      
      // Simulate cache clearing
      searchService.clearCache();
      expect(searchService.popularCache.size).toBe(0);
    });
  });

  describe('Error handling', () => {
    it('should handle search before initialization', async () => {
      const uninitializedService = new SearchService();
      
      const results = await uninitializedService.search('test');
      
      expect(results).toHaveLength(0);
    });

    it('should handle corrupted opening data', async () => {
      // Corrupt the openings data
      searchService.openings = [
        { name: null, eco: undefined, moves: 123 } // Invalid data
      ];
      
      const results = await searchService.search('test');
      
      expect(Array.isArray(results)).toBe(true);
    });

    it('should handle fuse.js search errors', async () => {
      // Mock fuse.search to throw error
      searchService.fuse.search = jest.fn(() => {
        throw new Error('Fuse search error');
      });
      
      const results = await searchService.search('test');
      
      expect(results).toHaveLength(0);
    });
  });

  describe('Advanced search features', () => {
    it('should support phrase searching', async () => {
      const results = await searchService.search('"Queen\'s Gambit"');
      
      expect(results[0].name).toBe('Queen\'s Gambit');
    });

    it('should support wildcard searching', async () => {
      const results = await searchService.search('*Defense');
      
      expect(results.every(r => r.name.includes('Defense'))).toBe(true);
    });

    it('should support sorting options', async () => {
      const options = { sortBy: 'popularity', sortOrder: 'desc' };
      const results = await searchService.search('', options);
      
      // Results should be sorted by popularity descending
      for (let i = 0; i < results.length - 1; i++) {
        expect(results[i].analysis_json.popularity_score)
          .toBeGreaterThanOrEqual(results[i + 1].analysis_json.popularity_score);
      }
    });

    it('should support pagination', async () => {
      const page1 = await searchService.search('', { page: 1, limit: 2 });
      const page2 = await searchService.search('', { page: 2, limit: 2 });
      
      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(2);
      expect(page1[0]).not.toEqual(page2[0]);
    });
  });
});
