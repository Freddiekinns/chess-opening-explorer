const {
  FamilyResourceService,
  FAMILY_VIDEO_LIMIT,
} = require('../../packages/api/src/services/family-resource-service');

const video = (id, score, views = 0, title = `Video ${id}`) => ({
  id,
  title,
  channel: 'Test Channel',
  duration: 600,
  views,
  published: '2025-01-01T00:00:00Z',
  thumbnail: `https://img/${id}.jpg`,
  url: `https://youtube.com/watch?v=${id}`,
  score,
});

const course = (url, likes, title = url) => ({
  course_title: title,
  source_url: url,
  platform: 'lichess',
  likes,
});

function buildService({ eco, positions, courses }) {
  return new FamilyResourceService({
    ecoService: { loadECOData: () => eco },
    videoAccessService: { getAllPositions: () => positions },
    courseService: { loadCourseData: async () => courses },
  });
}

describe('FamilyResourceService', () => {
  const eco = {
    fenA: { name: 'Sicilian Defense', family_id: 'sicilian' },
    fenB: { name: 'Sicilian Defense: Najdorf', family_id: 'sicilian' },
    fenC: { name: 'French Defense', family_id: 'french' },
    fenNoFamily: { name: 'Odd Opening' },
  };

  describe('getFamilyVideos', () => {
    it('aggregates a family, deduplicates by id keeping the best copy, and ranks by score then views', () => {
      const svc = buildService({
        eco,
        positions: [
          { fen: 'fenA', videos: [video('v1', 100, 500), video('v2', 90)] },
          // v1 appears again with a higher score — that copy must win
          { fen: 'fenB', videos: [video('v1', 120, 500), video('v3', 100, 900)] },
          { fen: 'fenC', videos: [video('v4', 80)] },
          { fen: 'fenNoFamily', videos: [video('v5', 200)] },
        ],
        courses: {},
      });

      const sicilian = svc.getFamilyVideos('sicilian');
      expect(sicilian.map((v) => v.id)).toEqual(['v1', 'v3', 'v2']);
      expect(sicilian[0].score).toBe(120); // deduped to the best-scored copy

      // Other families are isolated; unmapped positions contribute nowhere
      expect(svc.getFamilyVideos('french').map((v) => v.id)).toEqual(['v4']);
      expect(svc.getFamilyVideos('unknown')).toEqual([]);
      expect(svc.getFamilyVideos(null)).toEqual([]);
    });

    it('caps results at the limit', () => {
      const many = Array.from({ length: 20 }, (_, i) => video(`v${i}`, i));
      const svc = buildService({
        eco,
        positions: [{ fen: 'fenA', videos: many }],
        courses: {},
      });
      expect(svc.getFamilyVideos('sicilian')).toHaveLength(FAMILY_VIDEO_LIMIT);
      expect(svc.getFamilyVideos('sicilian', 3)).toHaveLength(3);
    });
  });

  describe('getFamilyCourses', () => {
    it('aggregates, dedupes by source URL and ranks by likes', async () => {
      const svc = buildService({
        eco,
        positions: [],
        courses: {
          fenA: [course('url-1', 100), course('url-2', 900)],
          fenB: [course('url-1', 100)],
          fenC: [course('url-3', 50)],
        },
      });

      const sicilian = await svc.getFamilyCourses('sicilian');
      expect(sicilian.map((c) => c.source_url)).toEqual(['url-2', 'url-1']);
      expect(await svc.getFamilyCourses('unknown')).toEqual([]);
    });
  });

  describe('resilience', () => {
    it('treats a throwing or empty eco service as "no families"', () => {
      const throwing = new FamilyResourceService({
        ecoService: {
          loadECOData: () => {
            throw new Error('boom');
          },
        },
        videoAccessService: { getAllPositions: () => [{ fen: 'fenA', videos: [video('v1', 1)] }] },
        courseService: { loadCourseData: async () => ({}) },
      });
      expect(throwing.getFamilyIdForFen('fenA')).toBeNull();
      expect(throwing.getFamilyVideos('sicilian')).toEqual([]);

      const empty = buildService({ eco: undefined, positions: [], courses: {} });
      expect(empty.getFamilyIdForFen('fenA')).toBeNull();
    });

    it('skips null items and items without a dedupe key', () => {
      const svc = buildService({
        eco,
        positions: [{ fen: 'fenA', videos: [null, video('', 50), video('v1', 10)] }],
        courses: {},
      });
      expect(svc.getFamilyVideos('sicilian').map((v) => v.id)).toEqual(['v1']);
    });

    it('resetCache discards the lazy indices so they rebuild', () => {
      let positions = [{ fen: 'fenA', videos: [video('v1', 10)] }];
      const svc = new FamilyResourceService({
        ecoService: { loadECOData: () => eco },
        videoAccessService: { getAllPositions: () => positions },
        courseService: { loadCourseData: async () => ({}) },
      });

      expect(svc.getFamilyVideos('sicilian').map((v) => v.id)).toEqual(['v1']);

      // Cached: changing the source alone does not change the result
      positions = [{ fen: 'fenA', videos: [video('v2', 10)] }];
      expect(svc.getFamilyVideos('sicilian').map((v) => v.id)).toEqual(['v1']);

      svc.resetCache();
      expect(svc.getFamilyVideos('sicilian').map((v) => v.id)).toEqual(['v2']);
    });
  });

  describe('getFamilyIdForFen / getFamily', () => {
    it('resolves the family for a FEN', () => {
      const svc = buildService({ eco, positions: [], courses: {} });
      expect(svc.getFamilyIdForFen('fenB')).toBe('sicilian');
      expect(svc.getFamilyIdForFen('fenNoFamily')).toBeNull();
      expect(svc.getFamilyIdForFen('missing')).toBeNull();
      expect(svc.getFamilyIdForFen('')).toBeNull();
    });

    it('reads family metadata from families.json (real data file)', () => {
      const svc = buildService({ eco, positions: [], courses: {} });
      const family = svc.getFamily('sicilian');
      expect(family).not.toBeNull();
      expect(family.display_name).toBe('Sicilian Defense');
      expect(svc.getFamily('not-a-family')).toBeNull();
      expect(svc.getFamily(null)).toBeNull();
    });
  });
});
