const request = require('supertest');
const express = require('express');

// The play-through prototype asks for every position along a line in one
// request. Only the position-stats lookup matters here, so it is mocked; the
// other services bootstrap against an empty mocked filesystem.
jest.mock('fs');
jest.mock('path');
jest.mock('../../packages/api/src/utils/path-resolver', () => ({
  getECODataPath: jest.fn(() => '/mock/data/eco'),
  getPopularityStatsPath: jest.fn(() => '/mock/data/popularity_stats.json'),
  getVideosDataPath: jest.fn(() => '/mock/data/videos'),
  getAPIDataPath: jest.fn((file) => `/mock/api/${file || ''}`),
  getDataPath: jest.fn((file) => `/mock/data/${file || ''}`),
  getVideoIndexPath: jest.fn(() => '/mock/data/video-index.json'),
}));
jest.mock('../../packages/api/src/services/position-stats-service', () => ({
  shardFor: jest.fn(),
  bandsFor: jest.fn(),
}));

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';

const band = (n) => ({
  totalGames: 1000,
  white: 500,
  draws: 50,
  black: 450,
  averageRating: 1600,
  topGames: [],
  moves: Array.from({ length: n }, (_, i) => ({
    san: `m${i}`,
    games: 100 - i,
    whitePct: 50,
    drawPct: 5,
    blackPct: 45,
  })),
});

function buildApp() {
  const routes = require('../../packages/api/src/routes/openings.routes');
  const app = express();
  app.use('/api/openings', routes);
  return app;
}

describe('GET /api/openings/line-bands', () => {
  let app;
  let positionStats;
  let spies;

  beforeEach(() => {
    jest.resetModules();
    const fs = require('fs');
    const path = require('path');
    fs.readdirSync = jest.fn(() => []);
    fs.existsSync = jest.fn(() => false);
    fs.readFileSync = jest.fn(() => '{}');
    path.join = jest.fn((...parts) => parts.join('/'));
    spies = ['warn', 'log', 'error'].map((m) =>
      jest.spyOn(console, m).mockImplementation(() => {})
    );
    positionStats = require('../../packages/api/src/services/position-stats-service');
    positionStats.bandsFor.mockImplementation((fen) =>
      fen === START ? { all: band(9), u1400: band(2), 1400: band(8), 1800: null, 2200: null } : null
    );
    app = buildApp();
  });

  afterEach(() => spies.forEach((s) => s.mockRestore()));

  it('returns bands for each FEN in order, top six moves per band', async () => {
    const res = await request(app)
      .get('/api/openings/line-bands')
      .query({ fens: [START, AFTER_E4].join('|') });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const [first, second] = res.body.data;
    expect(first.fen).toBe(START);
    expect(first.bands['1400'].moves).toHaveLength(6);
    expect(first.bands.u1400.moves).toHaveLength(2);
    expect(first.bands['1800']).toBeNull();
    expect(first.bands.all.totalGames).toBe(1000);
    expect(second).toEqual({ fen: AFTER_E4, bands: null });
    expect(res.headers['cache-control']).toMatch(/s-maxage=86400/);
  });

  it('rejects a missing list and one longer than 40 positions', async () => {
    expect((await request(app).get('/api/openings/line-bands')).status).toBe(400);
    const many = Array(41).fill(START).join('|');
    expect((await request(app).get('/api/openings/line-bands').query({ fens: many })).status).toBe(
      400
    );
    expect(positionStats.bandsFor).not.toHaveBeenCalled();
  });
});
