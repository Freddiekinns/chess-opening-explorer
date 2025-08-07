/**
 * Test Suite for Refactored Search Service
 * Demonstrates improved testability through modular design
 */

const QueryIntentParser = require('../packages/api/src/services/search/QueryIntentParser');
const OpeningFilters = require('../packages/api/src/services/search/OpeningFilters');
const SearchScorer = require('../packages/api/src/services/search/SearchScorer');
const SemanticSearchEngine = require('../packages/api/src/services/search/SemanticSearchEngine');

// Mock opening data for testing
const MOCK_OPENINGS = [
  {
    name: 'Sicilian Defense',
    eco: 'B20',
    moves: '1. e4 c5',
    analysis_json: {
      style_tags: ['aggressive', 'tactical'],
      complexity: 'Intermediate',
      popularity_score: 95
    }
  },
  {
    name: 'Queen\'s Gambit',
    eco: 'D06',
    moves: '1. d4 d5 2. c4',
    analysis_json: {
      style_tags: ['positional', 'classical'],
      complexity: 'Beginner',
      popularity_score: 85
    }
  },
  {
    name: 'Caro-Kann Defense',
    eco: 'B10',
    moves: '1. e4 c6',
    analysis_json: {
      style_tags: ['solid', 'defensive'],
      complexity: 'Intermediate',
      popularity_score: 70
    }
  }
];

describe('QueryIntentParser', () => {
  test('should parse style-based opening queries', () => {
    const intent = QueryIntentParser.parseIntent('aggressive openings');
    
    expect(intent.type).toBe('style_search');
    expect(intent.style).toEqual(['aggressive']);
  });

  test('should parse response queries', () => {
    const intent = QueryIntentParser.parseIntent('solid response to e4');
    
    expect(intent.type).toBe('response_search');
    expect(intent.targetMoves).toContain('e4');
  });

  test('should parse color-specific queries', () => {
    const intent = QueryIntentParser.parseIntent('attacking options for black');
    
    expect(intent.type).toBe('color_specific');
    expect(intent.color).toBe('black');
    expect(intent.style).toContain('attacking');
  });

  test('should extract chess moves correctly', () => {
    const moves = QueryIntentParser.extractMoves('response to d4');
    expect(moves).toContain('d4');
    
    const namedMoves = QueryIntentParser.extractMoves('king\'s pawn opening');
    expect(namedMoves).toContain('e4');
  });
});

describe('OpeningFilters', () => {
  test('should filter by semantic style', () => {
    const results = OpeningFilters.filterBySemanticStyle(MOCK_OPENINGS, ['aggressive']);
    
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Sicilian Defense');
  });

  test('should filter by complexity', () => {
    const results = OpeningFilters.filterByComplexity(MOCK_OPENINGS, 'beginner');
    
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Queen\'s Gambit');
  });

  test('should filter by response to moves', () => {
    const results = OpeningFilters.filterByResponseToMoves(MOCK_OPENINGS, ['e4']);
    
    // Should include Sicilian (1. e4 c5) and Caro-Kann (1. e4 c6) but not Queen's Gambit
    expect(results).toHaveLength(2);
    expect(results.map(r => r.name)).toEqual(['Sicilian Defense', 'Caro-Kann Defense']);
  });

  test('should handle empty filter inputs gracefully', () => {
    expect(OpeningFilters.filterBySemanticStyle(MOCK_OPENINGS, [])).toEqual(MOCK_OPENINGS);
    expect(OpeningFilters.filterByComplexity(MOCK_OPENINGS, null)).toEqual(MOCK_OPENINGS);
  });
});

describe('SearchScorer', () => {
  test('should score semantic results correctly', () => {
    const queryIntent = {
      type: 'style_search',
      style: ['aggressive'],
      complexity: null,
      targetMoves: [],
      openingName: null
    };
    
    const results = SearchScorer.scoreSemanticResults(MOCK_OPENINGS, queryIntent);
    
    // Sicilian Defense should score highest due to aggressive tag
    expect(results[0].name).toBe('Sicilian Defense');
    expect(results[0].searchScore).toBeGreaterThan(results[1].searchScore);
  });

  test('should convert fuzzy scores to positive scores', () => {
    const fuzzyResults = [
      { item: MOCK_OPENINGS[0], score: 0.3 },
      { item: MOCK_OPENINGS[1], score: 0.7 }
    ];
    
    const converted = SearchScorer.convertFuzzyScores(fuzzyResults);
    
    expect(converted[0].searchScore).toBe(0.7); // 1 - 0.3
    expect(converted[1].searchScore).toBe(0.3); // 1 - 0.7
  });

  test('should boost popularity correctly', () => {
    const queryIntent = { type: 'style_search', style: [] };
    const results = SearchScorer.scoreSemanticResults(MOCK_OPENINGS, queryIntent);
    
    // Higher popularity should result in higher scores when other factors are equal
    const sicilianScore = results.find(r => r.name === 'Sicilian Defense').searchScore;
    const caroKannScore = results.find(r => r.name === 'Caro-Kann Defense').searchScore;
    
    expect(sicilianScore).toBeGreaterThan(caroKannScore);
  });
});

describe('SemanticSearchEngine', () => {
  test('should handle style searches', async () => {
    const results = await SemanticSearchEngine.search('aggressive openings', MOCK_OPENINGS);
    
    expect(results.searchType).toBe('semantic_style_search');
    expect(results.results).toHaveLength(1);
    expect(results.results[0].name).toBe('Sicilian Defense');
  });

  test('should handle unknown queries gracefully', async () => {
    const results = await SemanticSearchEngine.search('unknown chess term', MOCK_OPENINGS);
    
    expect(results.searchType).toBe('no_semantic_match');
    expect(results.results).toHaveLength(0);
  });

  test('should apply pagination correctly', async () => {
    const results = await SemanticSearchEngine.search('openings', MOCK_OPENINGS, { limit: 2, offset: 1 });
    
    expect(results.results).toHaveLength(2);
    expect(results.hasMore).toBe(false);
    expect(results.totalResults).toBe(3);
  });
});

// Integration tests
describe('Search Integration', () => {
  test('should handle complex multi-intent queries', async () => {
    // Test: "aggressive response to e4"
    const results = await SemanticSearchEngine.search('aggressive response to e4', MOCK_OPENINGS);
    
    expect(results.searchType).toBe('semantic_response_search');
    expect(results.queryIntent.type).toBe('response_search');
    expect(results.queryIntent.targetMoves).toContain('e4');
  });

  test('should maintain performance with large datasets', () => {
    // Generate larger test dataset
    const largeDataset = Array(1000).fill(null).map((_, index) => ({
      ...MOCK_OPENINGS[index % 3],
      name: `${MOCK_OPENINGS[index % 3].name} Variation ${index}`,
      eco: `${MOCK_OPENINGS[index % 3].eco}${index}`
    }));

    const startTime = Date.now();
    const results = OpeningFilters.filterBySemanticStyle(largeDataset, ['aggressive']);
    const endTime = Date.now();

    // Should complete within reasonable time (< 100ms for 1000 items)
    expect(endTime - startTime).toBeLessThan(100);
    expect(results.length).toBeGreaterThan(0);
  });
});

module.exports = {
  MOCK_OPENINGS,
  // Export for use in other test files
  QueryIntentParser,
  OpeningFilters,
  SearchScorer,
  SemanticSearchEngine
};
