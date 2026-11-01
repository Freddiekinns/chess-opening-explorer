/**
 * Route-level tests for the live `/api/openings` handlers that nothing else
 * calls through HTTP (#182): `/search-index`, `/fen/:fen/tree`,
 * `/fen/:fen/tree/children`, `/random`, and `/semantic-search`'s status codes
 * and envelope (its projection is pinned in search-route-projection.test.js).
 *
 * The services have their own tests; these pin what the client reads — status
 * codes, the response envelope, and how much a request can pull. None of these
 * routes sets Cache-Control: `vercel.json` owns their headers.
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

// A small book: 1.e4, two replies to it, and one move deeper on the Sicilian.
const E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const SICILIAN = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
const FRENCH = 'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
const SICILIAN_NF3 = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2';
const UNPLAYED = 'rnbqkbnr/pppppppp/8/8/8/7P/PPPPPPP1/RNBQKBNR b KQkq - 0 1';

const ECO_DATA = {
  [E4]: {
    name: "King's Pawn Game",
    eco: 'B00',
    moves: '1. e4',
    family_id: 'kings-pawn',
    isEcoRoot: true,
    analysis_json: { description: 'x'.repeat(2000) },
  },
  [SICILIAN]: {
    name: 'Sicilian Defense',
    eco: 'B20',
    moves: '1. e4 c5',
    family_id: 'sicilian',
    isEcoRoot: true,
    analysis_json: { description: 'x'.repeat(2000) },
  },
  [FRENCH]: {
    name: 'French Defense',
    eco: 'C00',
    moves: '1. e4 e6',
    family_id: 'french',
    isEcoRoot: true,
  },
  [SICILIAN_NF3]: {
    name: 'Sicilian Defense: Nf3',
    eco: 'B27',
    moves: '1. e4 c5 2. Nf3',
    family_id: 'sicilian',
  },
  [UNPLAYED]: {
    name: 'Clemenz Opening',
    eco: 'A00',
    moves: '1. h3',
    family_id: 'irregular',
  },
};

const POPULARITY = {
  positions: {
    [E4]: { games_analyzed: 1000000 },
    [SICILIAN]: { games_analyzed: 500000 },
    [FRENCH]: { games_analyzed: 200000 },
    [SICILIAN_NF3]: {
      games_analyzed: 100000,
      white_win_rate: 0.5,
      draw_rate: 0.1,
      black_win_rate: 0.4,
    },
  },
};

const TREE_NODE_FIELDS = [
  'fen',
  'name',
  'eco',
  'move',
  'moves',
  'descendantCount',
  'gamesPlayed',
  'stats',
  'hasChildren',
];

const SEARCH_INDEX_FIELDS = ['fen', 'name', 'eco', 'moves', 'games_analyzed', 'family_id'];

describe('/api/openings routes', () => {
  let app;
  let searchService;
  let spies;

  beforeEach(() => {
    jest.clearAllMocks();
    // Fresh modules each test: the routes hold a module-level search-index
    // cache and the services share a global cache.
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
      if (String(p).includes('popularity_stats.json')) return JSON.stringify(POPULARITY);
      return JSON.stringify(ECO_DATA);
    });
    path.join = jest.fn((...parts) => parts.join('/'));

    searchService = require('../../packages/api/src/services/search-service');
    const openingsRoutes = require('../../packages/api/src/routes/openings.routes');
    app = express();
    app.use(express.json());
    app.use('/api/openings', openingsRoutes);
  });

  afterEach(() => spies.forEach((s) => s.mockRestore()));

  describe('GET /fen/:fen/tree', () => {
    // The client sends the FEN through encodeURIComponent, slashes and all.
    const treeUrl = (fen) => `/api/openings/fen/${encodeURIComponent(fen)}/tree`;

    test('returns the current node with its ancestors, siblings and children', async () => {
      const res = await request(app).get(treeUrl(SICILIAN));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { current, ancestors, siblings, children } = res.body.data;
      expect(Object.keys(current).sort()).toEqual([...TREE_NODE_FIELDS].sort());
      expect(current).toMatchObject({
        fen: SICILIAN,
        name: 'Sicilian Defense',
        eco: 'B20',
        move: '1...c5',
        descendantCount: 1,
        gamesPlayed: 500000,
        // Games but no win rates: no bar rather than a bar of zeros.
        stats: null,
        hasChildren: true,
      });

      expect(ancestors.map((node) => node.fen)).toEqual([E4]);
      expect(siblings.map((node) => node.fen)).toEqual([FRENCH]);
      expect(children.map((node) => node.fen)).toEqual([SICILIAN_NF3]);
      expect(children[0]).toMatchObject({
        move: '2. Nf3',
        hasChildren: false,
        stats: { games: 100000, whitePct: 50, drawPct: 10, blackPct: 40 },
      });
    });

    test('404s a FEN that is not in the book', async () => {
      const res = await request(app).get(
        treeUrl('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
      );

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        success: false,
        error: 'Opening not found for this position',
      });
    });

    test('404s a string that is not a FEN at all', async () => {
      const res = await request(app).get(treeUrl('not-a-fen'));

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /fen/:fen/tree/children', () => {
    const childrenUrl = (fen) => `/api/openings/fen/${encodeURIComponent(fen)}/tree/children`;

    test('returns the direct children only, as tree nodes', async () => {
      const res = await request(app).get(childrenUrl(E4));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const { children } = res.body.data;
      expect(children.map((node) => node.fen).sort()).toEqual([FRENCH, SICILIAN].sort());
      children.forEach((node) =>
        expect(Object.keys(node).sort()).toEqual([...TREE_NODE_FIELDS].sort())
      );
    });

    test('returns an empty list for a leaf, not a 404', async () => {
      const res = await request(app).get(childrenUrl(SICILIAN_NF3));

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual({ children: [] });
    });

    test('404s a FEN that is not in the book', async () => {
      const res = await request(app).get(childrenUrl('not-a-fen'));

      expect(res.status).toBe(404);
      expect(res.body).toEqual({
        success: false,
        error: 'Opening not found for this position',
      });
    });
  });

  describe('GET /random', () => {
    test('returns an opening from the book, with the FEN the client navigates to', async () => {
      const res = await request(app).get('/api/openings/random');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Object.keys(ECO_DATA)).toContain(res.body.data.fen);
      expect(res.body.data.name).toBe(ECO_DATA[res.body.data.fen].name);
    });

    test('reaches every opening, not just the first', async () => {
      const random = jest.spyOn(Math, 'random').mockReturnValue(0.999);
      try {
        const res = await request(app).get('/api/openings/random');
        expect(res.body.data.fen).toBe(UNPLAYED);
      } finally {
        random.mockRestore();
      }
    });
  });

  describe('GET /search-index', () => {
    test('the full index carries every opening, cut to the search fields', async () => {
      const res = await request(app).get('/api/openings/search-index');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        count: 5,
        total_available: 5,
        cached: false,
      });
      expect(res.body.data).toHaveLength(5);
      for (const row of res.body.data) {
        // games_analyzed is left out for an unplayed opening, so a subset.
        Object.keys(row).forEach((key) => expect(SEARCH_INDEX_FIELDS).toContain(key));
        expect(row).not.toHaveProperty('analysis_json');
      }
      const unplayed = res.body.data.find((row) => row.fen === UNPLAYED);
      expect(unplayed).not.toHaveProperty('games_analyzed');
    });

    test('openings that share a name carry what tells them apart', async () => {
      const fs = require('fs');
      fs.readFileSync = jest.fn((p) => {
        if (String(p).includes('popularity_stats.json')) return JSON.stringify(POPULARITY);
        return JSON.stringify({
          ...ECO_DATA,
          [UNPLAYED]: { ...ECO_DATA[SICILIAN], moves: '1. e4 c5 2. Nc3' },
        });
      });

      const res = await request(app).get('/api/openings/search-index');
      const byFen = Object.fromEntries(res.body.data.map((row) => [row.fen, row]));

      expect(byFen[SICILIAN].name_qualifier).toBe('1...c5');
      expect(byFen[UNPLAYED].name_qualifier).toBe('2.Nc3');
      expect(byFen[FRENCH]).not.toHaveProperty('name_qualifier');
    });

    test('?limit=N returns the N most-played openings', async () => {
      const res = await request(app).get('/api/openings/search-index?limit=2');

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
      expect(res.body.total_available).toBe(5);
      expect(res.body.data.map((row) => row.fen)).toEqual([E4, SICILIAN]);
      expect(res.body.data[0]).toMatchObject({
        name: "King's Pawn Game",
        eco: 'B00',
        moves: '1. e4',
        games_analyzed: 1000000,
        family_id: 'kings-pawn',
      });
    });

    test('a limit above the corpus returns the corpus', async () => {
      const res = await request(app).get('/api/openings/search-index?limit=100000');

      expect(res.body.count).toBe(5);
    });

    test('?fields=lookup is FEN, name and ECO only', async () => {
      const res = await request(app).get('/api/openings/search-index?fields=lookup');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(5);
      res.body.data.forEach((row) =>
        expect(Object.keys(row).sort()).toEqual(['eco', 'fen', 'name'])
      );
    });

    test('serves a repeat from cache without the variants colliding', async () => {
      await request(app).get('/api/openings/search-index?limit=2');
      const lookup = await request(app).get('/api/openings/search-index?limit=2&fields=lookup');
      const repeat = await request(app).get('/api/openings/search-index?limit=2');

      expect(Object.keys(lookup.body.data[0]).sort()).toEqual(['eco', 'fen', 'name']);
      expect(repeat.body.cached).toBe(true);
      expect(repeat.body.data[0]).toHaveProperty('moves');
    });

    // `?limit=-5` sliced to `slice(0, -5)` — all but five openings, ~3 MB in
    // production — and `0` or `lots` fell through to the whole index.
    test.each([
      ['negative', '-5'],
      ['zero', '0'],
      ['non-numeric', 'lots'],
    ])('400s a %s limit rather than guessing a size', async (_label, limit) => {
      const res = await request(app).get(`/api/openings/search-index?limit=${limit}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    // The cache was keyed on the raw `?limit` string and never evicted, so
    // every distinct value held its own copy of the index in memory.
    test('builds the index once and slices it for every limit', async () => {
      const ECOService = require('../../packages/api/src/services/eco-service');
      const build = jest.spyOn(ECOService.prototype, 'getAllOpenings');

      for (const limit of [1, 2, 3, 4]) {
        await request(app).get(`/api/openings/search-index?limit=${limit}`);
      }
      await request(app).get('/api/openings/search-index?fields=lookup');

      expect(build).toHaveBeenCalledTimes(1);
    });

    // One timestamp was shared by every key, and each new key's write reset
    // it, so older entries were served past their five minutes.
    test('expires the index on one clock', async () => {
      const BASE = 1_000_000_000;
      const now = jest.spyOn(Date, 'now');
      try {
        now.mockReturnValue(BASE);
        await request(app).get('/api/openings/search-index');
        now.mockReturnValue(BASE + 4 * 60 * 1000);
        await request(app).get('/api/openings/search-index?limit=2');
        now.mockReturnValue(BASE + 6 * 60 * 1000);
        const res = await request(app).get('/api/openings/search-index');

        expect(res.body.cached).toBe(false);
      } finally {
        now.mockRestore();
      }
    });
  });

  describe('GET /semantic-search', () => {
    const RESULT = {
      results: [{ fen: SICILIAN, ...ECO_DATA[SICILIAN], games_analyzed: 500000, searchScore: 3 }],
      totalResults: 1,
      hasMore: false,
      queryIntent: { type: 'name' },
    };

    test.each([
      ['no query', ''],
      ['a one-character query', '?q=s'],
    ])('400s %s without calling the search service', async (_label, query) => {
      const res = await request(app).get(`/api/openings/semantic-search${query}`);

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        success: false,
        error: 'Search query must be at least 2 characters long',
      });
      expect(searchService.search).not.toHaveBeenCalled();
    });

    test('returns the envelope the client reads', async () => {
      searchService.search.mockResolvedValue(RESULT);

      const res = await request(app).get('/api/openings/semantic-search?q=sicilian');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        count: 1,
        totalResults: 1,
        hasMore: false,
        searchType: 'semantic',
        queryIntent: { type: 'name' },
        query: 'sicilian',
      });
      expect(res.body.data[0]).toMatchObject({ fen: SICILIAN, name: 'Sicilian Defense' });
    });

    test.each([
      ['defaults to 20 from the start', '', { limit: 20, offset: 0 }],
      ['caps the limit at 50', '&limit=500', { limit: 50, offset: 0 }],
      ['passes a valid page through', '&limit=10&offset=30', { limit: 10, offset: 30 }],
      ['floors a negative offset at 0', '&offset=-5', { limit: 20, offset: 0 }],
      ['ignores a non-numeric limit', '&limit=lots', { limit: 20, offset: 0 }],
    ])('%s', async (_label, params, expected) => {
      searchService.search.mockResolvedValue(RESULT);

      await request(app).get(`/api/openings/semantic-search?q=sicilian${params}`);

      expect(searchService.search).toHaveBeenCalledWith('sicilian', expected);
    });

    test('500s when the search service throws', async () => {
      searchService.search.mockRejectedValue(new Error('index unavailable'));

      const res = await request(app).get('/api/openings/semantic-search?q=sicilian');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });
});
