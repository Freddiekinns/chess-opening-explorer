/**
 * Every search route projects through `toSearchResult`.
 *
 * The services hand back whole opening records. Twenty of those was 55 KB of
 * JSON — mostly `analysis_json` descriptions nothing rendered — to draw twenty
 * lines of name and ECO code, on every keystroke, mostly on phones. The
 * projection took it to 4.4 KB.
 *
 * `/semantic-search` was projected when that was fixed; `/search` and
 * `/search-by-category` were not, and this test is why they are now.
 */
const request = require('supertest');
const express = require('express');

jest.mock('fs');
jest.mock('path');
jest.mock('../../packages/api/src/utils/path-resolver', () => ({
  getECODataPath: jest.fn(() => '/mock/data/eco'),
  getPopularityStatsPath: jest.fn(() => '/mock/data/popularity_stats.json'),
  getVideosDataPath: jest.fn(() => '/mock/data/videos'),
  getAPIDataPath: jest.fn((file) => `/mock/api/${file || ''}`),
}));

const PROJECTED = ['fen', 'name', 'eco', 'moves', 'games_analyzed', 'searchScore'];

// The projection's whole point is dropping these.
const FAT_FIELDS = ['analysis_json', 'aliases', 'scid_name', 'isEcoRoot', 'src'];

const OPENING = {
  name: 'Sicilian Defense',
  eco: 'B20',
  moves: '1. e4 c5',
  games_analyzed: 1000000,
  analysis_json: { description: 'x'.repeat(2000), style_tags: ['Aggressive'] },
  aliases: { 1: 'Sicilian' },
  scid_name: 'Sicilian',
  isEcoRoot: true,
  src: 'eco_tsv',
};

describe('search routes return the projected shape', () => {
  let app;
  let spies;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    spies = [
      jest.spyOn(console, 'warn').mockImplementation(() => {}),
      jest.spyOn(console, 'log').mockImplementation(() => {}),
      jest.spyOn(console, 'error').mockImplementation(() => {}),
    ];

    const fs = require('fs');
    const path = require('path');
    fs.readdirSync = jest.fn(() => ['ecoB.json']);
    fs.existsSync = jest.fn(() => true);
    fs.readFileSync = jest.fn((p) => {
      if (String(p).includes('popularity_stats.json')) return JSON.stringify({ positions: {} });
      return JSON.stringify({
        'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2': OPENING,
      });
    });
    path.join = jest.fn((...parts) => parts.join('/'));

    const openingsRoutes = require('../../packages/api/src/routes/openings.routes');
    app = express();
    app.use(express.json());
    app.use('/api/openings', openingsRoutes);
  });

  afterEach(() => spies.forEach((s) => s.mockRestore()));

  test('GET /search drops the fields nothing renders', async () => {
    const res = await request(app).get('/api/openings/search?q=sicilian');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const row of res.body.data) {
      // `searchScore` is absent here rather than extra: only the semantic path
      // scores, and JSON drops the undefined key. Every key present must still
      // be one the projection allows.
      expect(row).toMatchObject({ name: 'Sicilian Defense', eco: 'B20' });
      expect(Object.keys(row).every((k) => PROJECTED.includes(k))).toBe(true);
      FAT_FIELDS.forEach((field) => expect(row).not.toHaveProperty(field));
    }
  });

  test('GET /search returns the same shape from cache as fresh', async () => {
    const fresh = await request(app).get('/api/openings/search?q=sicilian');
    const cached = await request(app).get('/api/openings/search?q=sicilian');

    expect(cached.body.cached).toBe(true);
    expect(Object.keys(cached.body.data[0]).sort()).toEqual(Object.keys(fresh.body.data[0]).sort());
  });
});
