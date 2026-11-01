jest.mock('fs');
jest.mock('../../packages/api/src/utils/path-resolver', () => ({
  getDataPath: jest.fn((f) => `/mock/${f}`),
}));

const BANDS_FIXTURE = {
  window: { since: '2026-07', until: '2026-09' },
  positions: {
    'fen-1': {
      u1400: { g: 40, w: 20, d: 4, b: 16 },
      1400: null,
      1800: { g: 100, w: 50, d: 10, b: 40 },
      2200: null,
    },
  },
};

let fs;
let bandStats;

beforeEach(() => {
  jest.resetModules();
  fs = require('fs');
  fs.existsSync = jest.fn(() => true);
  fs.readFileSync = jest.fn(() => JSON.stringify(BANDS_FIXTURE));
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  bandStats = require('../../packages/api/src/services/band-stats-service');
});

describe('band-stats-service', () => {
  test("returns a band's counts for a FEN", () => {
    expect(bandStats.forFen('fen-1', '1800')).toEqual({ g: 100, w: 50, d: 10, b: 40 });
  });

  test('a thin band is null, never zeroes', () => {
    expect(bandStats.forFen('fen-1', '1400')).toBeNull();
  });

  test('an unknown FEN or band is null', () => {
    expect(bandStats.forFen('fen-2', '1800')).toBeNull();
    expect(bandStats.forFen('fen-1', 'masters')).toBeNull();
  });

  test('exposes the window the counts cover', () => {
    expect(bandStats.window()).toEqual({ since: '2026-07', until: '2026-09' });
  });

  test('reads the file once', () => {
    bandStats.forFen('fen-1', '1800');
    bandStats.forFen('fen-1', 'u1400');
    bandStats.window();
    expect(fs.readFileSync).toHaveBeenCalledTimes(1);
  });

  test('a missing file gives nulls, not a crash', () => {
    fs.existsSync = jest.fn(() => false);
    expect(bandStats.forFen('fen-1', '1800')).toBeNull();
    expect(bandStats.window()).toBeNull();
  });

  test('isBand accepts only the four Lichess bands', () => {
    expect(['u1400', '1400', '1800', '2200'].every(bandStats.isBand)).toBe(true);
    expect(['all', 'masters', '', undefined, 'constructor'].some(bandStats.isBand)).toBe(false);
  });
});
