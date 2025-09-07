const request = require('supertest');
const express = require('express');

// System under test: openings routes
const openingsRoutes = require('../../packages/api/src/routes/openings.routes');
const ECOService = require('../../packages/api/src/services/eco-service');

// Mock fs/path dependencies used inside ECOService bootstrap
jest.mock('fs');
jest.mock('path');
jest.mock('../../packages/api/src/utils/path-resolver', () => ({
  getECODataPath: jest.fn(() => '/mock/data/eco'),
  getPopularityStatsPath: jest.fn(() => '/mock/data/popularity_stats.json'),
  getVideosDataPath: jest.fn(() => '/mock/data/videos'),
  getAPIDataPath: jest.fn((file) => `/mock/api/${file || ''}`)
}));

const fs = require('fs');
const path = require('path');

/**
 * Helper to build an express app with just the openings routes mounted.
 */
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/openings', openingsRoutes);
  return app;
}

describe('GET /api/openings/fen/:fen/related', () => {
  let app;
  const MAINLINE_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const VAR_FEN = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2';
  const OTHER_VAR_FEN = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mocks for fs layer used during ECOService initialization
    fs.readdirSync = jest.fn(() => ['ecoA.json']);
    fs.existsSync = jest.fn(() => true);
    fs.readFileSync = jest.fn((p) => {
      if (p.includes('ecoA.json')) {
        return JSON.stringify({
          [MAINLINE_FEN]: { name: 'Example Opening', eco: 'A00', moves: '', isEcoRoot: true, games_analyzed: 5000 },
          [VAR_FEN]: { name: 'Example Opening Variation', eco: 'A00', moves: '1.e4 c5', games_analyzed: 1200 },
          [OTHER_VAR_FEN]: { name: 'Second Variation', eco: 'A00', moves: '1.e4 e5', games_analyzed: 800 }
        });
      }
      if (p.includes('popularity_stats.json')) {
        return JSON.stringify({ positions: {} });
      }
      return '{}';
    });

    // path.join simple passthrough for predictability
    path.join = jest.fn((...parts) => parts.join('/'));

    // Force fresh instance of ECOService used inside route module by clearing its cache if any
    // (Route module already imported, but internal ECOService instantiation reads fs each test due to mocks)

    app = buildApp();
  });

  it('returns siblings and mainline when current is a variation', async () => {
    const encoded = encodeURIComponent(VAR_FEN);
    const res = await request(app).get(`/api/openings/fen/${encoded}/related`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const data = res.body.data;
    expect(data.current.fen).toBe(VAR_FEN);
    expect(data.mainline).toBeDefined();
    expect(data.mainline.isEcoRoot).toBe(true);
    expect(Array.isArray(data.siblings)).toBe(true);
    // VAR_FEN excluded; OTHER_VAR_FEN present
    const fens = data.siblings.map(s => s.fen);
    expect(fens).toContain(OTHER_VAR_FEN);
    expect(fens).not.toContain(VAR_FEN);
  });

  it('returns only variations when current is mainline', async () => {
    const encoded = encodeURIComponent(MAINLINE_FEN);
    const res = await request(app).get(`/api/openings/fen/${encoded}/related`);
    expect(res.status).toBe(200);
    const data = res.body.data;
    expect(data.current.isEcoRoot).toBe(true);
    // mainline is still returned in payload
    expect(data.mainline).not.toBeNull();
    expect(data.siblings.find(s => s.fen === MAINLINE_FEN)).toBeUndefined();
  });


  it('404 for unknown FEN', async () => {
    const unknown = encodeURIComponent('8/8/8/8/8/8/8/8 w - - 0 1');
    const res = await request(app).get(`/api/openings/fen/${unknown}/related`);
    expect(res.status).toBe(404);
  });
});
