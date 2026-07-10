const request = require('supertest');
const express = require('express');

// Mock fs/path dependencies used inside the service bootstraps (same pattern
// as openings-page-endpoint.test.js)
jest.mock('fs');
jest.mock('path');
jest.mock('../../packages/api/src/utils/path-resolver', () => ({
  getECODataPath: jest.fn(() => '/mock/data/eco'),
  getPopularityStatsPath: jest.fn(() => '/mock/data/popularity_stats.json'),
  getVideosDataPath: jest.fn(() => '/mock/data/videos'),
  getAPIDataPath: jest.fn((file) => `/mock/api/${file || ''}`),
  getVideoIndexPath: jest.fn(() => '/mock/data/video-index.json'),
  getDataPath: jest.fn((file) => `/mock/api/${file || ''}`),
}));

const { sanitizeFenKey } = jest.requireActual('../../packages/api/src/utils/fen-sanitizer');

let fs;
let path;

// Family root: has exact videos. Variation: has exact videos (one specific,
// one generic). Empty: no exact videos → family fallback.
const ROOT_FEN = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2';
const VAR_FEN = 'rnbqkbnr/pp2pppp/3p4/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3';
const EMPTY_FEN = 'rnbqkbnr/1p1ppppp/p7/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3';

const videoEntry = (id, title, score, views = 1000) => ({
  id,
  title,
  channel: 'Chess Channel',
  duration: 900,
  views,
  published: '2025-06-01T00:00:00Z',
  thumbnail: `https://img/${id}.jpg`,
  url: `https://youtube.com/watch?v=${id}`,
  score,
});

const VIDEO_INDEX = {
  version: 1,
  totalPositions: 2,
  positions: {
    [sanitizeFenKey(ROOT_FEN)]: {
      opening: { id: ROOT_FEN, name: 'Sicilian Defense', eco: 'B20' },
      videos: [videoEntry('root-1', 'Sicilian Defense crash course', 150, 90000)],
    },
    [sanitizeFenKey(VAR_FEN)]: {
      opening: { id: VAR_FEN, name: 'Sicilian Defense: Najdorf Variation', eco: 'B90' },
      videos: [
        videoEntry('var-specific', 'Beat the Najdorf move by move', 140),
        videoEntry('var-generic', 'Sicilian Defense ideas for club players', 120),
      ],
    },
  },
};

const ECO_DATA = {
  [ROOT_FEN]: {
    name: 'Sicilian Defense',
    eco: 'B20',
    moves: '1.e4 c5',
    family_id: 'sicilian',
    isEcoRoot: true,
  },
  [VAR_FEN]: {
    name: 'Sicilian Defense: Najdorf Variation',
    eco: 'B90',
    moves: '1.e4 c5 2.Nf3 d6',
    family_id: 'sicilian',
  },
  [EMPTY_FEN]: {
    name: 'Sicilian Defense: O`Kelly Variation',
    eco: 'B28',
    moves: '1.e4 c5 2.Nf3 a6',
    family_id: 'sicilian',
  },
};

const FAMILIES = {
  sicilian: { id: 'sicilian', display_name: 'Sicilian Defense' },
};

const STUDY = {
  study_title: 'Sicilian structures',
  chapter_title: 'Pawn breaks',
  study_url: 'https://lichess.org/study/abc',
  chapter_url: 'https://lichess.org/study/abc/ch1',
  platform: 'Lichess',
  likes: 500,
  chapters_matched: 3,
  match: { score: 80, depth: 2, reason: 'covers-position' },
};

// Same study anchored on two pages with different scores, plus a lower-score
// but far more liked study — match score must outrank likes, and the study
// must appear once (best copy) in the family shelf.
const STUDY_LOW_SCORE_HIGH_LIKES = {
  study_title: 'Big popular study',
  chapter_title: 'Intro',
  study_url: 'https://lichess.org/study/bbb',
  chapter_url: 'https://lichess.org/study/bbb/ch1',
  platform: 'Lichess',
  likes: 99999,
  chapters_matched: 1,
  match: { score: 40, depth: 1, reason: 'line-context' },
};

const STUDY_DUPLICATE_LOWER = {
  ...STUDY,
  chapter_url: 'https://lichess.org/study/abc/ch2',
  match: { score: 60, depth: 1, reason: 'line-context' },
};

function buildApp() {
  const openingsRoutes = require('../../packages/api/src/routes/openings.routes');
  const app = express();
  app.use(express.json());
  app.use('/api/openings', openingsRoutes);
  return app;
}

describe('family fallback for videos and studies (review V1/V2)', () => {
  let app;
  let consoleSpies;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    fs = require('fs');
    path = require('path');
    consoleSpies = ['warn', 'log', 'error'].map((level) =>
      jest.spyOn(console, level).mockImplementation(() => {})
    );

    fs.readdirSync = jest.fn(() => ['ecoB.json']);
    fs.existsSync = jest.fn(() => true);
    fs.readFileSync = jest.fn((p) => {
      if (p.includes('ecoB.json')) return JSON.stringify(ECO_DATA);
      if (p.includes('video-index.json')) return JSON.stringify(VIDEO_INDEX);
      if (p.includes('families.json')) return JSON.stringify(FAMILIES);
      if (p.includes('courses.json'))
        return JSON.stringify({
          [ROOT_FEN]: [STUDY, STUDY_LOW_SCORE_HIGH_LIKES],
          [VAR_FEN]: [STUDY_DUPLICATE_LOWER],
        });
      return '{}';
    });
    path.join = jest.fn((...parts) => parts.join('/'));
    path.resolve = jest.fn((...parts) => parts.join('/'));

    app = buildApp();
  });

  afterEach(() => {
    consoleSpies.forEach((spy) => spy.mockRestore());
  });

  describe('GET /api/openings/videos/:fen', () => {
    it('serves exact-position videos with source "position"', async () => {
      const res = await request(app).get(`/api/openings/videos/${encodeURIComponent(ROOT_FEN)}`);
      expect(res.status).toBe(200);
      expect(res.body.source).toBe('position');
      expect(res.body.family).toBeNull();
      expect(res.body.data.map((v) => v.id)).toEqual(['root-1']);
      // Family-root page: no variation to cover, so no badges
      expect(res.body.data[0].matchReason).toBeUndefined();
    });

    it('annotates match reasons on sub-variation pages (V2)', async () => {
      const res = await request(app).get(`/api/openings/videos/${encodeURIComponent(VAR_FEN)}`);
      expect(res.status).toBe(200);
      expect(res.body.source).toBe('position');
      const reasons = Object.fromEntries(res.body.data.map((v) => [v.id, v.matchReason]));
      expect(reasons['var-specific']).toBe('variation');
      expect(reasons['var-generic']).toBe('family');
    });

    it('falls back to the family shelf when the position has no videos (V1)', async () => {
      const res = await request(app).get(`/api/openings/videos/${encodeURIComponent(EMPTY_FEN)}`);
      expect(res.status).toBe(200);
      expect(res.body.source).toBe('family');
      expect(res.body.family).toEqual({ id: 'sicilian', name: 'Sicilian Defense' });
      // Family's videos, deduped and ranked by score
      expect(res.body.data.map((v) => v.id)).toEqual(['root-1', 'var-specific', 'var-generic']);
      expect(res.body.data.every((v) => v.matchReason === 'family')).toBe(true);
    });
  });

  describe('GET /api/openings/page/:fen', () => {
    it('carries videoContext and course fallback in the aggregate payload', async () => {
      const res = await request(app).get(`/api/openings/page/${encodeURIComponent(EMPTY_FEN)}`);
      expect(res.status).toBe(200);

      const { videos, videoContext, courses } = res.body.data;
      expect(videoContext.source).toBe('family');
      expect(videoContext.family.name).toBe('Sicilian Defense');
      expect(videos.length).toBeGreaterThan(0);

      // Studies fall back the same way — deduped by study_url (best-scored
      // copy of /abc wins) and ranked by match score before likes.
      expect(courses.source).toBe('family');
      expect(courses.family.name).toBe('Sicilian Defense');
      expect(courses.courses.map((c) => c.study_url)).toEqual([
        STUDY.study_url,
        STUDY_LOW_SCORE_HIGH_LIKES.study_url,
      ]);
      expect(courses.courses[0].match.score).toBe(80);
    });

    it('keeps source "position" when exact resources exist', async () => {
      const res = await request(app).get(`/api/openings/page/${encodeURIComponent(ROOT_FEN)}`);
      expect(res.status).toBe(200);
      expect(res.body.data.videoContext.source).toBe('position');
      expect(res.body.data.courses.source).toBe('position');
    });
  });
});
