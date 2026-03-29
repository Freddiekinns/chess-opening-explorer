/**
 * Unit Tests for Stats API Routes
 * Tests the /api/stats/:fen endpoint and its internal data-loading helpers.
 *
 * Each describe block calls jest.resetModules() in beforeAll so that the
 * module-level `popularityStats` cache in stats.routes.js is reset to null,
 * allowing each group to exercise a different loading path.
 */

const request = require('supertest');
const express = require('express');

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

/** Build a fresh Express app around a newly-required stats router. */
function buildApp(statsRouter) {
  const app = express();
  app.use(express.json());
  app.use('/api/stats', statsRouter);
  return app;
}

// ---------------------------------------------------------------------------
// Scenario 1: mock data path (real stats file does not exist)
// ---------------------------------------------------------------------------
describe('Stats Routes – mock data path (existsSync = false)', () => {
  let app;
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

    const statsRouter = require('../../packages/api/src/routes/stats.routes');
    app = buildApp(statsRouter);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('GET /:fen returns 200 with valid stats', async () => {
    const fen = encodeURIComponent('valid-fen w - - 0 1');
    const res = await request(app).get(`/api/stats/${fen}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(VALID_STATS);
  });

  test('GET /:fen returns 404 when FEN not in data', async () => {
    const fen = encodeURIComponent('missing-fen w - - 0 1');
    const res = await request(app).get(`/api/stats/${fen}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/not found/i);
  });

  test('GET /:fen returns 500 when stats structure is invalid', async () => {
    const fen = encodeURIComponent('bad-structure-fen');
    const res = await request(app).get(`/api/stats/${fen}`);
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: real stats available and valid (direct key structure)
// ---------------------------------------------------------------------------
describe('Stats Routes – real stats available (direct key structure)', () => {
  let app;
  let fs;

  beforeAll(() => {
    jest.resetModules();
    fs = require('fs');

    // Real stats file exists and has > 0 keys → used directly
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest
      .spyOn(fs, 'readFileSync')
      .mockReturnValue(JSON.stringify({ 'real-fen w - - 0 1': VALID_STATS }));

    const statsRouter = require('../../packages/api/src/routes/stats.routes');
    app = buildApp(statsRouter);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('GET /:fen returns 200 using real stats', async () => {
    const fen = encodeURIComponent('real-fen w - - 0 1');
    const res = await request(app).get(`/api/stats/${fen}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(VALID_STATS);
  });
});

// ---------------------------------------------------------------------------
// Scenario 3: nested `.positions` data structure (real Lichess-style data)
// ---------------------------------------------------------------------------
describe('Stats Routes – nested positions structure', () => {
  let app;
  let fs;

  beforeAll(() => {
    jest.resetModules();
    fs = require('fs');

    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    jest
      .spyOn(fs, 'readFileSync')
      .mockReturnValue(JSON.stringify({ positions: { 'nested-fen w - - 0 1': VALID_STATS } }));

    const statsRouter = require('../../packages/api/src/routes/stats.routes');
    app = buildApp(statsRouter);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('GET /:fen returns 200 when stats are under positions key', async () => {
    const fen = encodeURIComponent('nested-fen w - - 0 1');
    const res = await request(app).get(`/api/stats/${fen}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(VALID_STATS);
  });
});

// ---------------------------------------------------------------------------
// Scenario 4: real stats file exists but contains invalid JSON → fallback
// ---------------------------------------------------------------------------
describe('Stats Routes – real stats file contains invalid JSON (fallback)', () => {
  let app;
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

    const statsRouter = require('../../packages/api/src/routes/stats.routes');
    app = buildApp(statsRouter);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('GET /:fen returns 200 falling back to mock data', async () => {
    const fen = encodeURIComponent('mock-fen w - - 0 1');
    const res = await request(app).get(`/api/stats/${fen}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Scenario 5: real stats file exists but is an empty object → fallback
// ---------------------------------------------------------------------------
describe('Stats Routes – real stats file is empty object (fallback)', () => {
  let app;
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

    const statsRouter = require('../../packages/api/src/routes/stats.routes');
    app = buildApp(statsRouter);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('GET /:fen returns 200 using mock fallback when real stats empty', async () => {
    const fen = encodeURIComponent('mock-fen w - - 0 1');
    const res = await request(app).get(`/api/stats/${fen}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Scenario 6: all file reads fail → catch block sets popularityStats = {}
// ---------------------------------------------------------------------------
describe('Stats Routes – file read throws (empty stats fallback)', () => {
  let app;
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

    const statsRouter = require('../../packages/api/src/routes/stats.routes');
    app = buildApp(statsRouter);
  });

  afterAll(() => {
    jest.restoreAllMocks();
    consoleErrorSpy.mockRestore();
  });

  test('GET /:fen returns 404 when all reads fail (stats is empty {})', async () => {
    const fen = encodeURIComponent('any-fen w - - 0 1');
    const res = await request(app).get(`/api/stats/${fen}`);
    // popularityStats = {} so FEN not found → 404
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
