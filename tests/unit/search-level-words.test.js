/**
 * A level word in a query ranks by that level (#206 follow-up).
 *
 * "Beginner", "intermediate", "advanced" and "expert" name player levels
 * everywhere on the site: Discover's "Popular with beginners" is the under-1400
 * band. Search read the same words as the LLM difficulty tag, which put 8,879
 * of 12,377 openings under "intermediate". A level word now ranks the rest of
 * the query by that band's games, and filters nothing.
 */

const searchService = require('../../packages/api/src/services/search-service');
const QueryUtils = require('../../packages/api/src/services/search/QueryUtils');

jest.mock('../../packages/api/src/services/opening-data-service', () => ({
  getOpenings: jest.fn(),
}));

jest.mock('fuse.js', () =>
  jest.fn().mockImplementation(() => ({
    search: jest.fn(() => []),
  }))
);

// Beginners play the Italian, advanced players the Najdorf.
const BAND_GAMES = {
  italian: { u1400: { g: 90000 }, 1800: { g: 1000 } },
  najdorf: { u1400: { g: 500 }, 1800: { g: 80000 } },
  dragon: { u1400: { g: 2000 }, 1800: { g: 20000 } },
  trap: { u1400: { g: 10 }, 1800: { g: 10 } },
};

jest.mock('../../packages/api/src/services/band-stats-service', () => ({
  BANDS: ['u1400', '1400', '1800', '2200'],
  isBand: (value) => ['u1400', '1400', '1800', '2200'].includes(value),
  forFen: (fen, band) => (BAND_GAMES[fen] && BAND_GAMES[fen][band]) || null,
  window: () => null,
}));

const { getOpenings } = require('../../packages/api/src/services/opening-data-service');

const OPENINGS = [
  {
    fen: 'italian',
    eco: 'C50',
    name: 'Italian Game',
    moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4',
    games_analyzed: 5e7,
  },
  {
    fen: 'najdorf',
    eco: 'B90',
    name: 'Sicilian Defense: Najdorf Variation',
    moves: '1. e4 c5 2. Nf3 d6',
    games_analyzed: 6e7,
  },
  {
    fen: 'dragon',
    eco: 'B70',
    name: 'Sicilian Defense: Dragon Variation',
    moves: '1. e4 c5 2. Nf3 d6',
    games_analyzed: 1e7,
  },
  {
    fen: 'trap',
    eco: 'A00',
    name: "Kádas Opening: Beginner's Trap",
    moves: '1. h4',
    games_analyzed: 100,
  },
];

const names = (result) => result.results.map((opening) => opening.name);

describe('QueryUtils.levelInQuery', () => {
  test.each([
    ['beginner openings', 'u1400', ''],
    ['beginners', 'u1400', ''],
    ['openings for beginners', 'u1400', ''],
    ['intermediate openings', '1400', ''],
    ['openings for intermediate players', '1400', ''],
    ['advanced sicilian defense', '1800', 'sicilian defense'],
    ['beginner e4 openings', 'u1400', 'e4'],
    ['e4 openings for beginners', 'u1400', 'e4'],
    ['expert openings', '2200', ''],
    ['beginner gambits', 'u1400', 'gambits'],
  ])('%s → %s, "%s"', (query, band, rest) => {
    expect(QueryUtils.levelInQuery(query)).toEqual({ band, rest });
  });

  test.each(['sicilian defense', 'french advance', 'easy openings', 'simple openings'])(
    '%s has no level word',
    (query) => {
      expect(QueryUtils.levelInQuery(query)).toBeNull();
    }
  );
});

describe('searchService — a level word ranks by its band', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getOpenings.mockResolvedValue(OPENINGS);
    searchService.initialized = false;
    searchService.openings = null;
  });

  test('"beginner openings" is every opening, by under-1400 games', async () => {
    const result = await searchService.search('beginner openings');
    expect(result.band).toBe('u1400');
    expect(names(result).slice(0, 3)).toEqual([
      'Italian Game',
      'Sicilian Defense: Dragon Variation',
      'Sicilian Defense: Najdorf Variation',
    ]);
    expect(result.totalResults).toBe(OPENINGS.length);
  });

  test('"advanced sicilian defense" is the Sicilians, by 1800–2200 games', async () => {
    const result = await searchService.search('advanced sicilian defense');
    expect(result.band).toBe('1800');
    expect(names(result)).toEqual([
      'Sicilian Defense: Najdorf Variation',
      'Sicilian Defense: Dragon Variation',
    ]);
  });

  test('the level word overrides the saved level for that query', async () => {
    const result = await searchService.search('openings for beginners', { band: '1800' });
    expect(result.band).toBe('u1400');
    expect(names(result)[0]).toBe('Italian Game');
  });

  test('a name that contains the word still wins', async () => {
    const result = await searchService.search('beginners trap');
    expect(names(result)).toEqual(["Kádas Opening: Beginner's Trap"]);
    expect(result.band).toBeUndefined();
  });
});
