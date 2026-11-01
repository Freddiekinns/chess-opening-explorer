/**
 * Search ranked by your level (#205).
 *
 * A band swaps the popularity term for that band's games and nothing else:
 * relevance still decides the band a result sits in, so a level can reorder
 * equals but never lift a weaker match over a stronger one.
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

// At 1400–1800 the Dragon outplays the Najdorf; "Najdorf Variation" itself is
// a phrase match and must stay first for that query whatever the band says.
const BAND_GAMES = {
  najdorf: { 1400: { g: 1000, w: 400, d: 100, b: 500 } },
  dragon: { 1400: { g: 90000, w: 40000, d: 10000, b: 40000 } },
  english: { 1400: null },
  e4c5: { 1400: { g: 5000, w: 2000, d: 500, b: 2500 } },
  e4e5: { 1400: { g: 7000, w: 3000, d: 700, b: 3300 } },
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
    fen: 'najdorf',
    eco: 'B90',
    name: 'Sicilian Defense: Najdorf Variation',
    moves: '1. e4 c5 2. Nf3 d6',
    games_analyzed: 24000000,
  },
  {
    fen: 'dragon',
    eco: 'B70',
    name: 'Sicilian Defense: Dragon Variation',
    moves: '1. e4 c5 2. Nf3 d6',
    games_analyzed: 6000000,
  },
  {
    fen: 'english',
    eco: 'B90',
    name: 'Sicilian Defense: Najdorf Variation, English Attack',
    moves: '1. e4 c5 2. Nf3 d6',
    // More played than the Najdorf overall, too thin to count at 1400–1800.
    games_analyzed: 30000000,
  },
  { fen: 'e4c5', eco: 'B20', name: 'Sicilian Defense', moves: '1. e4 c5', games_analyzed: 9e8 },
  { fen: 'e4e5', eco: 'C20', name: "King's Pawn Game", moves: '1. e4 e5', games_analyzed: 8e8 },
];

const names = (result) => result.results.map((opening) => opening.name);

describe('searchService — ranked by a band', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getOpenings.mockResolvedValue(OPENINGS);
    searchService.initialized = false;
    searchService.openings = null;
  });

  it('band changes the order inside a relevance band only', async () => {
    const all = await searchService.search('sicilian defense');
    const atBand = await searchService.search('sicilian defense', { band: '1400' });

    // The exact phrase leads either way; below it, the band reorders.
    expect(names(all)).toEqual([
      'Sicilian Defense',
      'Sicilian Defense: Najdorf Variation, English Attack',
      'Sicilian Defense: Najdorf Variation',
      'Sicilian Defense: Dragon Variation',
    ]);
    expect(names(atBand)).toEqual([
      'Sicilian Defense',
      'Sicilian Defense: Dragon Variation',
      'Sicilian Defense: Najdorf Variation',
      'Sicilian Defense: Najdorf Variation, English Attack',
    ]);
  });

  it('a band too thin to count sorts last within its relevance band', async () => {
    const result = await searchService.search('najdorf', { band: '1400' });
    expect(names(result)).toEqual([
      'Sicilian Defense: Najdorf Variation',
      'Sicilian Defense: Najdorf Variation, English Attack',
    ]);
  });

  it('orders a move search by the band', async () => {
    const result = await searchService.search('e4', { band: '1400' });
    // Every line here starts 1.e4, so one move band and the band's games order it.
    expect(names(result)).toEqual([
      'Sicilian Defense: Dragon Variation',
      "King's Pawn Game",
      'Sicilian Defense',
      'Sicilian Defense: Najdorf Variation',
      'Sicilian Defense: Najdorf Variation, English Attack',
    ]);
  });

  it('orders an ECO code by the band', async () => {
    const all = await searchService.search('B90');
    const atBand = await searchService.search('B90', { band: '1400' });
    expect(names(all)[0]).toBe('Sicilian Defense: Najdorf Variation, English Attack');
    expect(names(atBand)[0]).toBe('Sicilian Defense: Najdorf Variation');
  });

  it('ignores a band it does not have data for', async () => {
    const all = await searchService.search('sicilian defense');
    const masters = await searchService.search('sicilian defense', { band: 'masters' });
    expect(names(masters)).toEqual(names(all));
  });
});
