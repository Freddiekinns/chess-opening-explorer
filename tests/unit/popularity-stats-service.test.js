/**
 * Unit Tests for the popularity stats service
 * Tests getStatsForFen's data-loading paths and validatePopularityStats. The
 * aggregate page endpoint reads both in-process; until #181 these ran through
 * the uncalled /api/stats/:fen route.
 *
 * Each describe block calls jest.resetModules() in beforeAll so that the
 * module-level `popularityStats` cache is reset to null, allowing each group
 * to exercise a different loading path.
 */

// Mock path-resolver so no real filesystem paths are used.
jest.mock('../../packages/api/src/utils/path-resolver', () => ({
  getPopularityStatsPath: jest.fn().mockReturnValue('/fake/real-stats.json'),
  getAPIDataPath: jest.fn().mockReturnValue('/fake/mock-stats.json'),
}));

const VALID_STATS = {
  popularity_score: 0.85,
  frequency_count: 1200,
  games_analyzed: 60000,
  confidence_score: 0.92,
  analysis_date: '2024-06-01',
};

const SERVICE = '../../packages/api/src/services/popularity-stats-service';

// ---------------------------------------------------------------------------
// Scenario 1: mock data path (real stats file does not exist)
// ---------------------------------------------------------------------------
describe('popularity stats – mock data path (existsSync = false)', () => {
  let service;
  let fs;

  beforeAll(() => {
    jest.resetModules();
    fs = require('fs');

    // Real stats file absent → falls through to mock stats path
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);

    // Mock stats data contains: one valid entry, one invalid-structure entry
    jest.spyOn(fs, 'readFileSync').mockReturnValue(
      JSON.stringify({
        'valid-fen w - - 0 1': VALID_STATS,
        'bad-structure-fen': { only: 'bad' },
      })
    );

    service = require(SERVICE);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('returns valid stats for a known FEN', () => {
    const stats = service.getStatsForFen('valid-fen w - - 0 1');
    expect(stats).toEqual(VALID_STATS);
    expect(service.validatePopularityStats(stats)).toBe(true);
  });

  test('returns null when FEN not in data', () => {
    expect(service.getStatsForFen('missing-fen w - - 0 1')).toBeNull();
  });

  test('rejects an entry with an invalid structure', () => {
    const stats = service.getStatsForFen('bad-structure-fen');
    expect(stats).toEqual({ only: 'bad' });
    expect(service.validatePopularityStats(stats)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: real stats available and valid (direct key structure)
// ---------------------------------------------------------------------------
describe('popularity stats – real stats available (direct key structure)', () => {
  let service;
  let fs;

  beforeAll(() => {
    jest.resetModules();
    fs = require('fs');

    // Real stats file exists and has > 0 keys → used directly
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest
      .spyOn(fs, 'readFileSync')
      .mockReturnValue(JSON.stringify({ 'real-fen w - - 0 1': VALID_STATS }));

    service = require(SERVICE);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('returns stats from the real file', () => {
    expect(service.getStatsForFen('real-fen w - - 0 1')).toEqual(VALID_STATS);
  });
});

// ---------------------------------------------------------------------------
// Scenario 3: nested `.positions` data structure (real Lichess-style data)
// ---------------------------------------------------------------------------
describe('popularity stats – nested positions structure', () => {
  let service;
  let fs;

  beforeAll(() => {
    jest.resetModules();
    fs = require('fs');

    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest
      .spyOn(fs, 'readFileSync')
      .mockReturnValue(JSON.stringify({ positions: { 'nested-fen w - - 0 1': VALID_STATS } }));

    service = require(SERVICE);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('returns stats stored under the positions key', () => {
    expect(service.getStatsForFen('nested-fen w - - 0 1')).toEqual(VALID_STATS);
  });
});

// ---------------------------------------------------------------------------
// Scenario 4: real stats file exists but contains invalid JSON → fallback
// ---------------------------------------------------------------------------
describe('popularity stats – real stats file contains invalid JSON (fallback)', () => {
  let service;
  let fs;

  beforeAll(() => {
    jest.resetModules();
    fs = require('fs');

    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    // First readFileSync call (validate real stats): invalid JSON → parse throws
    // Second call (load mock path): valid JSON
    jest
      .spyOn(fs, 'readFileSync')
      .mockReturnValueOnce('NOT VALID JSON }{')
      .mockReturnValue(JSON.stringify({ 'mock-fen w - - 0 1': VALID_STATS }));

    service = require(SERVICE);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('falls back to the mock data', () => {
    expect(service.getStatsForFen('mock-fen w - - 0 1')).toEqual(VALID_STATS);
  });
});

// ---------------------------------------------------------------------------
// Scenario 5: real stats file exists but is an empty object → fallback
// ---------------------------------------------------------------------------
describe('popularity stats – real stats file is empty object (fallback)', () => {
  let service;
  let fs;

  beforeAll(() => {
    jest.resetModules();
    fs = require('fs');

    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    // First read: empty object (0 keys) → falls back to mock
    // Second read: mock path with valid data
    jest
      .spyOn(fs, 'readFileSync')
      .mockReturnValueOnce(JSON.stringify({}))
      .mockReturnValue(JSON.stringify({ 'mock-fen w - - 0 1': VALID_STATS }));

    service = require(SERVICE);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('falls back to the mock data when real stats are empty', () => {
    expect(service.getStatsForFen('mock-fen w - - 0 1')).toEqual(VALID_STATS);
  });
});

// ---------------------------------------------------------------------------
// Scenario 6: all file reads fail → catch block sets popularityStats = {}
// ---------------------------------------------------------------------------
describe('popularity stats – file read throws (empty stats fallback)', () => {
  let service;
  let fs;
  let consoleErrorSpy;

  beforeAll(() => {
    jest.resetModules();
    fs = require('fs');
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
      throw new Error('ENOENT: file not found');
    });

    service = require(SERVICE);
  });

  afterAll(() => {
    jest.restoreAllMocks();
    consoleErrorSpy.mockRestore();
  });

  test('returns null for any FEN when all reads fail (stats is empty {})', () => {
    expect(service.getStatsForFen('any-fen w - - 0 1')).toBeNull();
  });
});
