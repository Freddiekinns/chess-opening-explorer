/**
 * ECO code search.
 *
 * `eco` is not one of FUSE_OPTIONS.keys, so before this branch existed a code
 * fell through to fuzzy matching on name/moves/style_tags/description and
 * returned nothing at all — `B90` gave 0 results against 31 Najdorf lines that
 * carry the code. Every search surface told the user to "try an ECO code", and
 * the two that had no local index of their own were pointing at a guaranteed
 * dead end.
 */

const searchService = require('../../packages/api/src/services/search-service');

jest.mock('../../packages/api/src/services/opening-data-service', () => ({
  getOpenings: jest.fn(),
}));

jest.mock('fuse.js', () =>
  jest.fn().mockImplementation(() => ({
    search: jest.fn(() => []),
  }))
);

const { getOpenings } = require('../../packages/api/src/services/opening-data-service');

const OPENINGS = [
  { fen: 'fen-1', eco: 'B90', name: 'Sicilian Najdorf', moves: '1. e4 c5', games_analyzed: 500 },
  {
    fen: 'fen-2',
    eco: 'B90',
    name: 'Sicilian Najdorf: English Attack',
    moves: '1. e4 c5',
    games_analyzed: 9000,
  },
  // Trailing whitespace occurs in the real ECO data.
  { fen: 'fen-3', eco: 'B90 ', name: 'Najdorf 6.Be3 e5', moves: '1. e4 c5', games_analyzed: 100 },
  { fen: 'fen-4', eco: 'B91', name: 'Najdorf: Zagreb', moves: '1. e4 c5', games_analyzed: 8000 },
];

describe('searchService — ECO codes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getOpenings.mockResolvedValue(OPENINGS);
    searchService.initialized = false;
    searchService.openings = null;
  });

  it('returns every opening carrying the code, and only those', async () => {
    const result = await searchService.search('B90');

    expect(result.searchType).toBe('eco_search');
    expect(result.totalResults).toBe(3);
    expect(result.results.map((o) => o.fen)).not.toContain('fen-4');
  });

  it('is case-insensitive, the way people type', async () => {
    const upper = await searchService.search('B90');
    const lower = await searchService.search('b90');

    expect(lower.results.map((o) => o.fen)).toEqual(upper.results.map((o) => o.fen));
  });

  it('orders by popularity, since a code makes every match equally good', async () => {
    const result = await searchService.search('B90');

    expect(result.results.map((o) => o.fen)).toEqual(['fen-2', 'fen-1', 'fen-3']);
  });

  it('scores the matches flat, so the caller can see they are ties', async () => {
    const result = await searchService.search('B90');

    expect(result.results.every((o) => o.searchScore === 1)).toBe(true);
  });

  it('leaves a partial code to the ordinary search path', async () => {
    const result = await searchService.search('B9');

    expect(result.searchType).not.toBe('eco_search');
  });
});
