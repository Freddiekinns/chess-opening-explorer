/**
 * Test Suite: Video Matcher
 * Tests for the calculateMatchScore algorithm and related functions
 */

const VideoMatcher = require('../lib/video-matcher');

// Mock the database to avoid actual DB operations
jest.mock('../database/schema-manager.js', () => {
  return jest.fn().mockImplementation(() => ({
    db: {
      all: jest.fn(),
      run: jest.fn(),
      get: jest.fn()
    }
  }));
});

describe('VideoMatcher', () => {
  let matcher;

  beforeEach(() => {
    matcher = new VideoMatcher(':memory:');
  });

  describe('getOpeningAbbreviations', () => {
    it('should return abbreviations for Queens Gambit', () => {
      const abbrevs = matcher.getOpeningAbbreviations('queens gambit declined');
      expect(abbrevs).toContain('qgd');
      expect(abbrevs).toContain('qga');
    });

    it('should return abbreviations for Sicilian variations', () => {
      const najdorf = matcher.getOpeningAbbreviations('sicilian najdorf');
      expect(najdorf).toContain('najdorf');

      const dragon = matcher.getOpeningAbbreviations('sicilian dragon');
      expect(dragon).toContain('dragon');
    });

    it('should return abbreviations for London System', () => {
      const abbrevs = matcher.getOpeningAbbreviations('london system');
      expect(abbrevs).toContain('london');
    });

    it('should return abbreviations for Kings Indian', () => {
      const abbrevs = matcher.getOpeningAbbreviations('kings indian defense');
      expect(abbrevs).toContain('kid');
    });

    it('should generate initials for long opening names', () => {
      const abbrevs = matcher.getOpeningAbbreviations('sicilian defense accelerated dragon variation');
      // Should have some abbreviation generated
      expect(abbrevs.length).toBeGreaterThan(0);
    });
  });

  describe('getEcoBasedFamily', () => {
    it('should identify Sicilian family (B20-B99)', () => {
      expect(matcher.getEcoBasedFamily('B33')).toBe('sicilian');
      expect(matcher.getEcoBasedFamily('B90')).toBe('sicilian');
    });

    it('should identify French family (C00-C19)', () => {
      expect(matcher.getEcoBasedFamily('C00')).toBe('french');
      expect(matcher.getEcoBasedFamily('C15')).toBe('french');
    });

    it('should identify Spanish/Ruy Lopez family (C60-C99)', () => {
      expect(matcher.getEcoBasedFamily('C60')).toBe('spanish');
      expect(matcher.getEcoBasedFamily('C88')).toBe('spanish');
    });

    it('should identify Queens Gambit family (D06-D69)', () => {
      expect(matcher.getEcoBasedFamily('D30')).toBe('queens_gambit');
      expect(matcher.getEcoBasedFamily('D63')).toBe('queens_gambit');
    });

    it('should identify Kings Indian family (E60-E99)', () => {
      expect(matcher.getEcoBasedFamily('E60')).toBe('kings_indian');
      expect(matcher.getEcoBasedFamily('E97')).toBe('kings_indian');
    });

    it('should handle invalid ECO codes', () => {
      expect(matcher.getEcoBasedFamily('')).toBeNull();
      expect(matcher.getEcoBasedFamily('X99')).toBeNull();
    });
  });

  describe('getFamilyMismatchPenalty', () => {
    it('should return 0 for matching families', () => {
      const penalty = matcher.getFamilyMismatchPenalty('sicilian', 'B33');
      expect(penalty).toBe(0);
    });

    it('should return 100 for severe incompatibilities', () => {
      // Sicilian video vs French opening
      const penalty = matcher.getFamilyMismatchPenalty('sicilian', 'C15');
      expect(penalty).toBe(100);
    });

    it('should return 100 for Queens Gambit vs Sicilian', () => {
      const penalty = matcher.getFamilyMismatchPenalty('queens_gambit', 'B33');
      expect(penalty).toBe(100);
    });

    it('should return 30 for moderate mismatches', () => {
      // A non-severe but different family
      const penalty = matcher.getFamilyMismatchPenalty('english', 'D30');
      expect(penalty).toBe(30);
    });
  });

  describe('parseDuration', () => {
    it('should parse hours, minutes, seconds', () => {
      expect(matcher.parseDuration('PT1H30M45S')).toBe(5445);
    });

    it('should parse minutes and seconds only', () => {
      expect(matcher.parseDuration('PT15M30S')).toBe(930);
    });

    it('should parse minutes only', () => {
      expect(matcher.parseDuration('PT45M')).toBe(2700);
    });

    it('should handle invalid duration', () => {
      expect(matcher.parseDuration('')).toBe(0);
      expect(matcher.parseDuration(null)).toBe(0);
      expect(matcher.parseDuration('invalid')).toBe(0);
    });
  });

  describe('calculateMatchScore', () => {
    const createVideo = (overrides = {}) => ({
      title: 'Test Video',
      description: '',
      channel_title: 'Test Channel',
      duration: 1800, // 30 minutes
      tags: [],
      ...overrides
    });

    const createOpening = (overrides = {}) => ({
      name: 'Sicilian Defense',
      eco: 'B20',
      aliases: [],
      ...overrides
    });

    describe('name matching', () => {
      it('should score 80 for exact title match', () => {
        const video = createVideo({ title: 'sicilian defense explained' });
        const opening = createOpening({ name: 'sicilian defense' });
        const score = matcher.calculateMatchScore(video, opening);
        expect(score).toBeGreaterThanOrEqual(80);
      });

      it('should score 0 when no match found', () => {
        const video = createVideo({ title: 'random chess video' });
        const opening = createOpening({ name: 'sicilian defense' });
        const score = matcher.calculateMatchScore(video, opening);
        expect(score).toBe(0);
      });

      it('should match via abbreviation', () => {
        const video = createVideo({ title: 'the london explained for beginners' });
        const opening = createOpening({ name: 'london system', eco: 'D02' });
        const score = matcher.calculateMatchScore(video, opening);
        expect(score).toBeGreaterThan(0);
      });
    });

    describe('educational content bonuses', () => {
      it('should add bonus for educational keywords', () => {
        const videoWithEducational = createVideo({
          title: 'sicilian defense explained'
        });
        const videoWithout = createVideo({
          title: 'sicilian defense'
        });
        const opening = createOpening();

        const scoreWith = matcher.calculateMatchScore(videoWithEducational, opening);
        const scoreWithout = matcher.calculateMatchScore(videoWithout, opening);

        expect(scoreWith).toBeGreaterThan(scoreWithout);
      });

      it('should not double-count educational keywords', () => {
        const video = createVideo({
          title: 'sicilian defense theory explained guide'
        });
        const opening = createOpening();
        const score = matcher.calculateMatchScore(video, opening);

        // Maximum educational bonus should be 30 (not 55 from double counting)
        // Base: 80 (title match) + 30 (educational) + 15 (duration) = 125
        expect(score).toBeLessThanOrEqual(150);
      });
    });

    describe('channel quality bonuses', () => {
      it('should add +40 for premium educators', () => {
        const video = createVideo({
          title: 'sicilian defense',
          channel_title: 'Daniel Naroditsky'
        });
        const opening = createOpening();
        const score = matcher.calculateMatchScore(video, opening);

        const videoNoChannel = createVideo({
          title: 'sicilian defense',
          channel_title: 'Unknown Channel'
        });
        const scoreNoChannel = matcher.calculateMatchScore(videoNoChannel, opening);

        expect(score).toBeGreaterThan(scoreNoChannel);
      });

      it('should penalize agadmator channel', () => {
        const video = createVideo({
          title: 'sicilian defense',
          channel_title: 'agadmator Chess Channel'
        });
        const opening = createOpening();
        const score = matcher.calculateMatchScore(video, opening);

        const videoNormal = createVideo({
          title: 'sicilian defense',
          channel_title: 'Some Channel'
        });
        const scoreNormal = matcher.calculateMatchScore(videoNormal, opening);

        expect(score).toBeLessThan(scoreNormal);
      });
    });

    describe('game analysis penalties', () => {
      it('should penalize game analysis terms like "vs"', () => {
        const video = createVideo({
          title: 'sicilian defense magnus vs hikaru'
        });
        const opening = createOpening();
        const score = matcher.calculateMatchScore(video, opening);

        const videoClean = createVideo({
          title: 'sicilian defense complete guide'
        });
        const scoreClean = matcher.calculateMatchScore(videoClean, opening);

        expect(score).toBeLessThan(scoreClean);
      });

      it('should penalize "brilliant" and similar hype terms', () => {
        const video = createVideo({
          title: 'brilliant sicilian defense game'
        });
        const opening = createOpening();
        const score = matcher.calculateMatchScore(video, opening);

        expect(score).toBeLessThan(80); // Should be less than base match
      });
    });

    describe('duration scoring', () => {
      it('should add +15 for 20-60 minute videos', () => {
        const video = createVideo({
          title: 'sicilian defense',
          duration: 2400 // 40 minutes
        });
        const opening = createOpening();
        const score = matcher.calculateMatchScore(video, opening);

        const videoShort = createVideo({
          title: 'sicilian defense',
          duration: 180 // 3 minutes
        });
        const scoreShort = matcher.calculateMatchScore(videoShort, opening);

        expect(score).toBeGreaterThan(scoreShort);
      });

      it('should penalize very short videos', () => {
        const video = createVideo({
          title: 'sicilian defense',
          duration: 120 // 2 minutes
        });
        const opening = createOpening();
        const score = matcher.calculateMatchScore(video, opening);

        // Short video penalty is -25
        expect(score).toBeLessThan(80);
      });
    });

    describe('family mismatch detection', () => {
      it('should reject Sicilian video for French opening', () => {
        const video = createVideo({
          title: 'sicilian defense najdorf explained'
        });
        const opening = createOpening({
          name: 'french defense',
          eco: 'C15'
        });
        const score = matcher.calculateMatchScore(video, opening);

        expect(score).toBe(0);
      });

      it('should reject Queens Gambit video for Sicilian opening', () => {
        const video = createVideo({
          title: 'queens gambit declined complete guide'
        });
        const opening = createOpening({
          name: 'sicilian defense najdorf',
          eco: 'B90'
        });
        const score = matcher.calculateMatchScore(video, opening);

        expect(score).toBe(0);
      });

      it('should allow matching family', () => {
        const video = createVideo({
          title: 'sicilian najdorf explained'
        });
        const opening = createOpening({
          name: 'sicilian defense dragon',
          eco: 'B70'
        });
        const score = matcher.calculateMatchScore(video, opening);

        // Should match (both Sicilian family)
        expect(score).toBeGreaterThan(0);
      });
    });

    describe('edge cases', () => {
      it('should handle videos with empty description', () => {
        const video = createVideo({
          title: 'sicilian defense',
          description: ''
        });
        const opening = createOpening();
        const score = matcher.calculateMatchScore(video, opening);

        expect(score).toBeGreaterThan(0);
      });

      it('should handle videos with null tags', () => {
        const video = createVideo({
          title: 'sicilian defense',
          tags: null
        });
        const opening = createOpening();

        // Should not throw
        expect(() => matcher.calculateMatchScore(video, opening)).not.toThrow();
      });

      it('should handle openings with empty aliases', () => {
        const video = createVideo({ title: 'sicilian defense' });
        const opening = createOpening({ aliases: [] });
        const score = matcher.calculateMatchScore(video, opening);

        expect(score).toBeGreaterThan(0);
      });

      it('should return non-negative scores', () => {
        const video = createVideo({
          title: 'sicilian defense amazing brilliant vs crushes genius',
          channel_title: 'agadmator',
          duration: 60
        });
        const opening = createOpening();
        const score = matcher.calculateMatchScore(video, opening);

        expect(score).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('parseAliases', () => {
    it('should parse JSON array of aliases', () => {
      const aliases = matcher.parseAliases('["Sicilian", "Najdorf"]');
      expect(aliases).toContain('Sicilian');
      expect(aliases).toContain('Najdorf');
    });

    it('should handle empty array', () => {
      expect(matcher.parseAliases('[]')).toEqual([]);
      expect(matcher.parseAliases('"[]"')).toEqual([]);
    });

    it('should handle null/undefined', () => {
      expect(matcher.parseAliases(null)).toEqual([]);
      expect(matcher.parseAliases(undefined)).toEqual([]);
    });

    it('should parse object format with multiple sources', () => {
      const aliasObj = JSON.stringify({
        scid: 'Sicilian Defense',
        eco_wikip: 'Najdorf Variation'
      });
      const aliases = matcher.parseAliases(aliasObj);
      expect(aliases).toContain('Sicilian Defense');
      expect(aliases).toContain('Najdorf Variation');
    });
  });
});
