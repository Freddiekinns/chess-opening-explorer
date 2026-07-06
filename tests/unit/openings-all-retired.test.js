const request = require('supertest');
const express = require('express');

// Mock fs/path dependencies used inside ECOService bootstrap
jest.mock('fs');
jest.mock('path');
jest.mock('../../packages/api/src/utils/path-resolver', () => ({
  getECODataPath: jest.fn(() => '/mock/data/eco'),
  getPopularityStatsPath: jest.fn(() => '/mock/data/popularity_stats.json'),
  getVideosDataPath: jest.fn(() => '/mock/data/videos'),
  getAPIDataPath: jest.fn((file) => `/mock/api/${file || ''}`),
}));

let fs;
let path;

function buildApp() {
  const openingsRoutes = require('../../packages/api/src/routes/openings.routes');
  const app = express();
  app.use(express.json());
  app.use('/api/openings', openingsRoutes);
  return app;
}

describe('GET /api/openings/all (retired endpoint)', () => {
  let app;
  let consoleWarnSpy;
  let consoleLogSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    fs = require('fs');
    path = require('path');
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    fs.readdirSync = jest.fn(() => ['ecoA.json']);
    fs.existsSync = jest.fn(() => true);
    fs.readFileSync = jest.fn((p) => {
      if (p.includes('popularity_stats.json')) {
        return JSON.stringify({ positions: {} });
      }
      return '{}';
    });
    path.join = jest.fn((...parts) => parts.join('/'));

    app = buildApp();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  it('returns 410 Gone and never serves the dataset', async () => {
    const res = await request(app).get('/api/openings/all');
    expect(res.status).toBe(410);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toMatch(/search-index/);
    expect(res.body.data).toBeUndefined();
  });

  it('is cacheable so the CDN absorbs crawler traffic', async () => {
    const res = await request(app).get('/api/openings/all');
    expect(res.headers['cache-control']).toContain('max-age=86400');
  });
});
