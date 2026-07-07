const request = require('supertest');
const express = require('express');

// Mock fs/path dependencies used inside the service bootstraps
jest.mock('fs');
jest.mock('path');
jest.mock('../../packages/api/src/utils/path-resolver', () => ({
  getECODataPath: jest.fn(() => '/mock/data/eco'),
  getPopularityStatsPath: jest.fn(() => '/mock/data/popularity_stats.json'),
  getVideosDataPath: jest.fn(() => '/mock/data/videos'),
  getAPIDataPath: jest.fn((file) => `/mock/api/${file || ''}`),
  getVideoIndexPath: jest.fn(() => '/mock/data/video-index.json'),
}));

let fs;
let path;

const MAINLINE_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const VAR_FEN = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2';

const STATS = {
  popularity_score: 9.1,
  frequency_count: 1200,
  games_analyzed: 50000,
  confidence_score: 0.9,
  analysis_date: '2025-07-15',
};

function buildApp() {
  const openingsRoutes = require('../../packages/api/src/routes/openings.routes');
  const app = express();
  app.use(express.json());
  app.use('/api/openings', openingsRoutes);
  return app;
}

describe('GET /api/openings/page/:fen (aggregate detail-page payload)', () => {
  let app;
  let consoleWarnSpy;
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    fs = require('fs');
    path = require('path');
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    fs.readdirSync = jest.fn(() => ['ecoA.json']);
    fs.existsSync = jest.fn(() => true);
    fs.readFileSync = jest.fn((p) => {
      if (p.includes('ecoA.json')) {
        return JSON.stringify({
          [MAINLINE_FEN]: {
            name: 'Example Opening',
            eco: 'A00',
            moves: '',
            isEcoRoot: true,
            games_analyzed: 5000,
          },
          [VAR_FEN]: {
            name: 'Example Opening Variation',
            eco: 'A00',
            moves: '1.e4 c5',
            games_analyzed: 1200,
          },
        });
      }
      if (p.includes('popularity_stats.json')) {
        return JSON.stringify({ positions: { [VAR_FEN]: STATS } });
      }
      // courses.json, video-index.json, etc.
      return '{}';
    });
    path.join = jest.fn((...parts) => parts.join('/'));

    app = buildApp();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('returns opening, stats, videos, courses and tree in one payload', async () => {
    const res = await request(app).get(`/api/openings/page/${encodeURIComponent(VAR_FEN)}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { opening, stats, videos, courses, tree } = res.body.data;
    expect(opening.name).toBe('Example Opening Variation');
    expect(opening.fen).toBe(VAR_FEN);
    expect(stats).toEqual(STATS);
    expect(Array.isArray(videos)).toBe(true);
    expect(courses).toHaveProperty('courses');
    expect(courses).toHaveProperty('searchLinks');
    // Tree context resolves for a known position
    expect(tree === null || typeof tree === 'object').toBe(true);
  });

  it('returns null stats when no popularity data exists for the FEN', async () => {
    const res = await request(app).get(`/api/openings/page/${encodeURIComponent(MAINLINE_FEN)}`);
    expect(res.status).toBe(200);
    expect(res.body.data.stats).toBeNull();
  });

  it('404s for an unknown position', async () => {
    const unknown = encodeURIComponent('8/8/8/8/8/8/8/8 w - - 0 1');
    const res = await request(app).get(`/api/openings/page/${unknown}`);
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
