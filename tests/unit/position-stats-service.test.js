jest.mock('fs');
jest.mock('../../packages/api/src/utils/path-resolver', () => ({
  getDataPath: jest.fn((f) => `/mock/${f}`),
}));

const FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

const detail = {
  g: 1000,
  w: 500,
  d: 100,
  b: 400,
  avg_rating: 1612,
  moves: [
    { san: 'c5', g: 600, w: 300, d: 60, b: 240 },
    { san: 'e5', g: 400, w: 200, d: 40, b: 160 },
  ],
};

let fs;
let positionStats;

beforeEach(() => {
  jest.resetModules();
  fs = require('fs');
  fs.existsSync = jest.fn(() => true);
  fs.readFileSync = jest.fn(() =>
    JSON.stringify({
      window: { since: '2026-07', until: '2026-09' },
      positions: {
        [FEN]: { bands: { all: detail, u1400: null, 1400: detail, 1800: null, 2200: null } },
      },
    })
  );
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  positionStats = require('../../packages/api/src/services/position-stats-service');
});

describe('position-stats-service', () => {
  test('shards by the djb2 hash middleware.ts uses, 256 ways', () => {
    // Golden values from combine_window.shard_for_fen, which wrote the files.
    expect(positionStats.shardFor('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')).toBe(
      235
    );
    expect(positionStats.shardFor(FEN)).toBe(150);
    positionStats.bandsFor(FEN);
    expect(fs.readFileSync).toHaveBeenCalledWith('/mock/position-stats/150.json', 'utf8');
  });

  test('page response carries all bands with moves, in the explorer result shape', () => {
    const bands = positionStats.bandsFor(FEN);
    expect(Object.keys(bands).sort()).toEqual(['1400', '1800', '2200', 'all', 'u1400']);
    expect(bands.all).toEqual({
      totalGames: 1000,
      white: 500,
      draws: 100,
      black: 400,
      averageRating: 1612,
      topGames: [],
      moves: [
        { san: 'c5', games: 600, whitePct: 50, drawPct: 10, blackPct: 40 },
        { san: 'e5', games: 400, whitePct: 50, drawPct: 10, blackPct: 40 },
      ],
    });
  });

  test('missing band is null', () => {
    expect(positionStats.bandsFor(FEN).u1400).toBeNull();
  });

  test('a FEN the shard lacks has every band null', () => {
    const bands = positionStats.bandsFor('8/8/8/8/8/8/8/8 w - - 0 1');
    expect(Object.values(bands).every((band) => band === null)).toBe(true);
  });

  test('shard read once per instance', () => {
    positionStats.bandsFor(FEN);
    positionStats.bandsFor(FEN);
    expect(fs.readFileSync).toHaveBeenCalledTimes(1);
  });

  test('an unreadable shard is null, so the page falls back to its snapshot', () => {
    fs.readFileSync = jest.fn(() => {
      throw new Error('EACCES');
    });
    expect(positionStats.bandsFor(FEN)).toBeNull();
  });
});
