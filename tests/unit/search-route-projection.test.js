/**
 * Every search route projects through `toSearchResult`.
 *
 * The services hand back whole opening records. Twenty of those was 55 KB of
 * JSON — mostly `analysis_json` descriptions nothing rendered — to draw twenty
 * lines of name and ECO code, on every keystroke, mostly on phones. The
 * projection took it to 4.4 KB.
 *
 * `/semantic-search` is the one search route left. `/search` (projected late,
 * and why this test exists) went in #181 and `/search-by-category` on
 * 2026-10-10: nothing called either.
 */
const request = require('supertest');
const express = require('express');

jest.mock('fs');
jest.mock('path');
jest.mock('../../packages/api/src/services/search-service', () => ({
  search: jest.fn(),
}));
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

  test('GET /semantic-search drops the fields nothing renders', async () => {
    const searchService = require('../../packages/api/src/services/search-service');
    searchService.search.mockResolvedValue({
      results: [
        {
          fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
          ...OPENING,
          searchScore: 3.6,
        },
      ],
      totalResults: 1,
      hasMore: false,
    });

    const res = await request(app).get('/api/openings/semantic-search?q=sicilian');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    for (const row of res.body.data) {
      expect(row).toMatchObject({ name: 'Sicilian Defense', eco: 'B20', searchScore: 3.6 });
      expect(Object.keys(row).sort()).toEqual([...PROJECTED].sort());
      FAT_FIELDS.forEach((field) => expect(row).not.toHaveProperty(field));
    }
  });

  test('GET /semantic-search keeps what tells apart openings that share a name', async () => {
    const searchService = require('../../packages/api/src/services/search-service');
    searchService.search.mockResolvedValue({
      results: [{ fen: 'b94', ...OPENING, name_qualifier: '6.Bg5', searchScore: 3.6 }],
      totalResults: 1,
      hasMore: false,
    });

    const res = await request(app).get('/api/openings/semantic-search?q=sicilian');

    expect(res.body.data[0].name_qualifier).toBe('6.Bg5');
  });
});
