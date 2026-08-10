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
      get: jest.fn(),
    },
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
      const abbrevs = matcher.getOpeningAbbreviations(
        'sicilian defense accelerated dragon variation'
      );
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

    it('should identify Queens Gambit families at variation granularity', () => {
      expect(matcher.getEcoBasedFamily('D06')).toBe('queens_gambit');
      expect(matcher.getEcoBasedFamily('D15')).toBe('slav');
      expect(matcher.getEcoBasedFamily('D25')).toBe('queens_gambit_accepted');
      expect(matcher.getEcoBasedFamily('D30')).toBe('queens_gambit_declined');
      expect(matcher.getEcoBasedFamily('D45')).toBe('semi_slav');
      expect(matcher.getEcoBasedFamily('D63')).toBe('queens_gambit_declined');
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

    it('should return 100 when move prefixes diverge (english vs QGD)', () => {
      // 1.c4 vs 1.d4 d5 2.c4 e6 — derived from move prefixes, not a pair list
      const penalty = matcher.getFamilyMismatchPenalty('english', 'D30');
      expect(penalty).toBe(100);
    });

    it('should return 100 for shared variation names across 1.e4/1.d4', () => {
      // "Caro-Kann Exchange" video vs QGD Chigorin Exchange page (D07)
      expect(matcher.getFamilyMismatchPenalty('caro_kann', 'D07')).toBe(100);
      // "French Steinitz" video vs Scotch Steinitz page (C45)
      expect(matcher.getFamilyMismatchPenalty('french', 'C45')).toBe(100);
    });

    it('should return moderate penalty for related but distinct lines', () => {
      // London (1.d4) vs QGD (1.d4 d5 2.c4 e6) — prefix-compatible
      const penalty = matcher.getFamilyMismatchPenalty('london', 'D30');
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
      ...overrides,
    });

    const createOpening = (overrides = {}) => ({
      name: 'Sicilian Defense',
      eco: 'B20',
      aliases: [],
      ...overrides,
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
          title: 'sicilian defense explained',
        });
        const videoWithout = createVideo({
          title: 'sicilian defense',
        });
        const opening = createOpening();

        const scoreWith = matcher.calculateMatchScore(videoWithEducational, opening);
        const scoreWithout = matcher.calculateMatchScore(videoWithout, opening);

        expect(scoreWith).toBeGreaterThan(scoreWithout);
      });

      it('should not double-count educational keywords', () => {
        const video = createVideo({
          title: 'sicilian defense theory explained guide',
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
          channel_title: 'Daniel Naroditsky',
        });
        const opening = createOpening();
        const score = matcher.calculateMatchScore(video, opening);

        const videoNoChannel = createVideo({
          title: 'sicilian defense',
          channel_title: 'Unknown Channel',
        });
        const scoreNoChannel = matcher.calculateMatchScore(videoNoChannel, opening);

        expect(score).toBeGreaterThan(scoreNoChannel);
      });

      it('should give agadmator goodEducator bonus', () => {
        const video = createVideo({
          title: 'sicilian defense',
          channel_title: 'agadmator Chess Channel',
        });
        const opening = createOpening();
        const score = matcher.calculateMatchScore(video, opening);

        const videoNormal = createVideo({
          title: 'sicilian defense',
          channel_title: 'Some Channel',
        });
        const scoreNormal = matcher.calculateMatchScore(videoNormal, opening);

        expect(score).toBeGreaterThan(scoreNormal);
      });

      it('should give chessbrah goodEducator bonus', () => {
        const video = createVideo({
          title: 'sicilian defense explained',
          channel_title: 'Chessbrah',
        });
        const opening = createOpening();
        const score = matcher.calculateMatchScore(video, opening);

        const videoUnknown = createVideo({
          title: 'sicilian defense explained',
          channel_title: 'Unknown Channel',
        });
        const scoreUnknown = matcher.calculateMatchScore(videoUnknown, opening);

        expect(score).toBeGreaterThan(scoreUnknown);
      });

      it('should give ben finegold goodEducator bonus', () => {
        const video = createVideo({
          title: 'sicilian defense explained',
          channel_title: 'Ben Finegold',
        });
        const opening = createOpening();
        const score = matcher.calculateMatchScore(video, opening);

        const videoUnknown = createVideo({
          title: 'sicilian defense explained',
          channel_title: 'Unknown Channel',
        });
        const scoreUnknown = matcher.calculateMatchScore(videoUnknown, opening);

        expect(score).toBeGreaterThan(scoreUnknown);
      });

      it('should give chess24 entertainment penalty, not premium bonus', () => {
        const video = createVideo({
          title: 'sicilian defense',
          channel_title: 'chess24',
        });
        const opening = createOpening();
        const score = matcher.calculateMatchScore(video, opening);

        const videoPremium = createVideo({
          title: 'sicilian defense',
          channel_title: 'Daniel Naroditsky',
        });
        const scorePremium = matcher.calculateMatchScore(videoPremium, opening);

        expect(score).toBeLessThan(scorePremium);
      });
    });

    describe('game analysis penalties', () => {
      it('should penalize player-vs-player titles like "Magnus vs Hikaru"', () => {
        const video = createVideo({
          title: 'Sicilian Defense Magnus vs Hikaru',
        });
        const opening = createOpening();
        const score = matcher.calculateMatchScore(video, opening);

        const videoClean = createVideo({
          title: 'sicilian defense complete guide',
        });
        const scoreClean = matcher.calculateMatchScore(videoClean, opening);

        expect(score).toBeLessThan(scoreClean);
      });

      it('should NOT penalize "Sicilian vs French Defense"', () => {
        const video = createVideo({
          title: 'sicilian vs french defense - which is better?',
        });
        const opening = createOpening();
        const score = matcher.calculateMatchScore(video, opening);

        // Should not get the player-vs-player penalty (lowercase "vs" with lowercase words)
        expect(score).toBeGreaterThan(0);
      });

      it('should NOT penalize "e4 vs d4 - Which is Better?"', () => {
        const video = createVideo({
          title: 'sicilian defense - e4 vs d4 overview',
        });
        const opening = createOpening();
        const score = matcher.calculateMatchScore(video, opening);

        // Lowercase on both sides of vs → no player-vs-player penalty
        expect(score).toBeGreaterThan(0);
      });

      it('should penalize "Magnus vs Hikaru - Sicilian Najdorf"', () => {
        const video = createVideo({
          title: 'Magnus vs Hikaru - Sicilian Najdorf',
        });
        const opening = createOpening({
          name: 'sicilian defense najdorf',
          eco: 'B90',
          aliases: ['najdorf'],
        });
        const score = matcher.calculateMatchScore(video, opening);

        const videoClean = createVideo({
          title: 'Sicilian Najdorf Complete Guide',
        });
        const scoreClean = matcher.calculateMatchScore(videoClean, opening);

        expect(score).toBeLessThan(scoreClean);
      });

      it('should penalize "brilliant" and similar hype terms', () => {
        const video = createVideo({
          title: 'brilliant sicilian defense game',
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
          duration: 2400, // 40 minutes
        });
        const opening = createOpening();
        const score = matcher.calculateMatchScore(video, opening);

        const videoShort = createVideo({
          title: 'sicilian defense',
          duration: 180, // 3 minutes
        });
        const scoreShort = matcher.calculateMatchScore(videoShort, opening);

        expect(score).toBeGreaterThan(scoreShort);
      });

      it('should penalize very short videos', () => {
        const video = createVideo({
          title: 'sicilian defense',
          duration: 120, // 2 minutes
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
          title: 'sicilian defense najdorf explained',
        });
        const opening = createOpening({
          name: 'french defense',
          eco: 'C15',
        });
        const score = matcher.calculateMatchScore(video, opening);

        expect(score).toBe(0);
      });

      it('should reject Queens Gambit video for Sicilian opening', () => {
        const video = createVideo({
          title: 'queens gambit declined complete guide',
        });
        const opening = createOpening({
          name: 'sicilian defense najdorf',
          eco: 'B90',
        });
        const score = matcher.calculateMatchScore(video, opening);

        expect(score).toBe(0);
      });

      it('should allow matching family', () => {
        const video = createVideo({
          title: 'sicilian najdorf explained',
        });
        const opening = createOpening({
          name: 'sicilian defense dragon',
          eco: 'B70',
        });
        const score = matcher.calculateMatchScore(video, opening);

        // Should match (both Sicilian family)
        expect(score).toBeGreaterThan(0);
      });
    });

    describe('intra-family variation guard', () => {
      it('detects distinctive sub-variation names in titles', () => {
        expect(matcher.namesSpecificVariation('the sicilian dragon explained')).toBe(true);
        expect(matcher.namesSpecificVariation('how to play the najdorf')).toBe(true);
        expect(matcher.namesSpecificVariation('mastering the sicilian defense')).toBe(false);
      });

      it('rejects a sibling-variation video on a named sub-variation page', () => {
        // A Dragon lecture must not be stamped onto a Najdorf page just because
        // both are Sicilian (the cross-family guard cannot catch this).
        const dragon = createVideo({
          title: 'Ultra-Aggressive Sicilian Dragon, Yugoslav Attack Explained',
        });
        const najdorfPage = createOpening({
          name: 'Sicilian Defense: Najdorf Variation',
          eco: 'B90',
        });
        expect(matcher.calculateMatchScore(dragon, najdorfPage)).toBe(0);
      });

      it('keeps a variation-specific video on its own page', () => {
        const najdorf = createVideo({ title: 'How to Play the Sicilian Najdorf Explained' });
        const najdorfPage = createOpening({
          name: 'Sicilian Defense: Najdorf Variation',
          eco: 'B90',
        });
        expect(matcher.calculateMatchScore(najdorf, najdorfPage)).toBeGreaterThan(0);
      });

      it('keeps a generic family overview on a sub-variation page', () => {
        const generic = createVideo({ title: 'Mastering the Sicilian Defense Complete Guide' });
        const najdorfPage = createOpening({
          name: 'Sicilian Defense: Najdorf Variation',
          eco: 'B90',
        });
        expect(matcher.calculateMatchScore(generic, najdorfPage)).toBeGreaterThan(0);
      });

      it('matches a named-variation video on a page with a move-notation tail', () => {
        // "Sicilian: Sozin-Najdorf, 7.Bb3" — named tokens drive the match, the
        // move tail (7.Bb3) is ignored.
        const najdorf = createVideo({ title: 'How to Play the Sicilian Najdorf Explained' });
        const page = createOpening({ name: 'Sicilian: Sozin-Najdorf, 7.Bb3', eco: 'B86' });
        expect(matcher.calculateMatchScore(najdorf, page)).toBeGreaterThan(0);
      });

      it('covers a pure move-notation page with a generic family overview', () => {
        const generic = createVideo({ title: 'The Scandinavian Defense Explained' });
        const page = createOpening({ name: 'Scandinavian: 2.exd5', eco: 'B01' });
        expect(matcher.calculateMatchScore(generic, page)).toBeGreaterThan(0);
      });
    });

    describe('edge cases', () => {
      it('should handle videos with empty description', () => {
        const video = createVideo({
          title: 'sicilian defense',
          description: '',
        });
        const opening = createOpening();
        const score = matcher.calculateMatchScore(video, opening);

        expect(score).toBeGreaterThan(0);
      });

      it('should handle videos with null tags', () => {
        const video = createVideo({
          title: 'sicilian defense',
          tags: null,
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
          duration: 60,
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
        eco_wikip: 'Najdorf Variation',
      });
      const aliases = matcher.parseAliases(aliasObj);
      expect(aliases).toContain('Sicilian Defense');
      expect(aliases).toContain('Najdorf Variation');
    });

    it('should NOT produce single-word aliases from comma-separated values', () => {
      const aliasObj = JSON.stringify({
        eco_js: "King's Gambit, Accepted",
      });
      const aliases = matcher.parseAliases(aliasObj);
      expect(aliases).not.toContain('Accepted');
      expect(aliases).toContain("King's Gambit");
    });

    it('should keep multi-word aliases from comma-separated values', () => {
      const aliasObj = JSON.stringify({
        eco_js: "King's Gambit Accepted, Kieseritzky Gambit",
      });
      const aliases = matcher.parseAliases(aliasObj);
      expect(aliases).toContain("King's Gambit Accepted");
      expect(aliases).toContain('Kieseritzky Gambit');
    });
  });

  describe('titleMentionsDifferentOpening', () => {
    it('should detect "The Wade Gambit" against "Latvian Gambit"', () => {
      expect(matcher.titleMentionsDifferentOpening('The Wade Gambit', 'Latvian Gambit')).toBe(true);
    });

    it('should allow "King\'s Gambit Deconstructed" against "King\'s Gambit Accepted: Kieseritzky"', () => {
      expect(
        matcher.titleMentionsDifferentOpening(
          "King's Gambit Deconstructed",
          "King's Gambit Accepted: Kieseritzky"
        )
      ).toBe(false);
    });

    it('should allow generic titles with no opening pattern', () => {
      expect(matcher.titleMentionsDifferentOpening('Speedrun Episode 47', 'Latvian Gambit')).toBe(
        false
      );
    });
  });

  describe('cross-opening and sub-variation scoring', () => {
    const createVideo = (overrides = {}) => ({
      title: 'Test Video',
      description: '',
      channel_title: 'Test Channel',
      duration: 1800,
      tags: [],
      ...overrides,
    });

    const createOpening = (overrides = {}) => ({
      name: 'Sicilian Defense',
      eco: 'B20',
      aliases: [],
      ...overrides,
    });

    it('should score 0 for content-only match where title names a different opening', () => {
      const video = createVideo({
        title: 'The Wade Gambit Explained',
        description: 'In this video we also discuss the latvian gambit and other openings',
      });
      const opening = createOpening({
        name: 'Latvian Gambit',
        eco: 'C40',
      });
      const score = matcher.calculateMatchScore(video, opening);
      expect(score).toBe(0);
    });

    it('should apply sub-variation penalty when variation words absent from title', () => {
      const video = createVideo({
        title: 'sicilian defense overview',
      });
      const opening = createOpening({
        name: 'Sicilian Defense: Najdorf Variation',
        eco: 'B90',
      });
      const scoreSubVar = matcher.calculateMatchScore(video, opening);

      const openingBase = createOpening({
        name: 'Sicilian Defense',
        eco: 'B20',
      });
      const scoreBase = matcher.calculateMatchScore(video, openingBase);

      // Sub-variation should score lower than base opening for generic title
      expect(scoreSubVar).toBeLessThan(scoreBase);
    });

    it('should rank a variation-specific video above a generic family video', () => {
      const opening = createOpening({
        name: 'Sicilian Defense: Najdorf Variation',
        eco: 'B90',
      });

      const specific = createVideo({ title: 'sicilian najdorf theory explained' });
      const generic = createVideo({ title: 'sicilian defense theory explained' });

      const specificScore = matcher.calculateMatchScore(specific, opening);
      const genericScore = matcher.calculateMatchScore(generic, opening);

      // The gap must exceed channel/educational bonuses so a premium generic
      // video can't outrank an unknown-channel variation-specific one
      expect(specificScore - genericScore).toBeGreaterThanOrEqual(45);
    });

    it('should reject "Caro-Kann Exchange" video on a QGD Exchange page', () => {
      const video = createVideo({
        title: 'Caro-Kann, Exchange Variation | Chess Openings Explained',
      });
      const opening = createOpening({
        name: "Queen's Gambit Declined: Chigorin Defense, Exchange Variation",
        eco: 'D07',
        aliases: ['Exchange Variation'],
      });
      expect(matcher.calculateMatchScore(video, opening)).toBe(0);
    });

    it('should reject "Reversed Sicilian (English)" video on a Sicilian page', () => {
      const video = createVideo({
        title: 'The Reversed Sicilian: 1.c4 e5 · English Opening Theory',
      });
      const opening = createOpening({
        name: 'Sicilian Defense: Najdorf Variation',
        eco: 'B90',
      });
      expect(matcher.calculateMatchScore(video, opening)).toBe(0);
    });

    it('should keep "Four Knights: Scotch Variation" video on Four Knights pages', () => {
      const video = createVideo({
        title: 'Four Knights Game: Scotch Variation | Theory Explained',
      });
      const opening = createOpening({
        name: 'Four Knights Game: Scotch Variation, Accepted',
        eco: 'C47',
      });
      expect(matcher.calculateMatchScore(video, opening)).toBeGreaterThan(0);
    });
  });

  describe('move-notation opening names', () => {
    const createVideo = (overrides = {}) => ({
      title: 'Test Video',
      description: '',
      channel_title: 'Test Channel',
      duration: 1800,
      tags: [],
      ...overrides,
    });

    it('should extract family part only for move-notation variations', () => {
      expect(matcher.getFamilyPartName('scandinavian: 2.exd5')).toBe('scandinavian');
      expect(matcher.getFamilyPartName('caro-kann: 2.nf3')).toBe('caro-kann');
      expect(matcher.getFamilyPartName('scandinavian: 2...qxd5 3.nc3')).toBe('scandinavian');
      // Named variations must keep using the normal (stricter) match paths
      expect(matcher.getFamilyPartName('sicilian defense: najdorf variation')).toBeNull();
      expect(matcher.getFamilyPartName('sicilian defense')).toBeNull();
    });

    it('should match "Scandinavian: 2.exd5" via its family part', () => {
      const video = createVideo({
        title: 'The Scandinavian Defense | Complete Theory Guide',
      });
      const opening = {
        name: 'Scandinavian: 2.exd5',
        eco: 'B01',
        aliases: [],
      };
      expect(matcher.calculateMatchScore(video, opening)).toBeGreaterThanOrEqual(60);
    });
  });

  describe('word-boundary matching', () => {
    const createVideo = (overrides = {}) => ({
      title: 'Test Video',
      description: '',
      channel_title: 'Test Channel',
      duration: 1800,
      tags: [],
      ...overrides,
    });

    it('should not match the KID abbreviation inside "kidding"', () => {
      const video = createVideo({ title: 'no kidding, this opening is great' });
      const opening = {
        name: 'kings indian defense',
        eco: 'E60',
        aliases: [],
      };
      expect(matcher.calculateMatchScore(video, opening)).toBe(0);
    });

    it('should not apply the game-analysis penalty to "background"', () => {
      const withBackground = createVideo({
        title: 'sicilian defense theory and background',
      });
      const without = createVideo({ title: 'sicilian defense theory' });
      const opening = { name: 'sicilian defense', eco: 'B20', aliases: [] };

      expect(matcher.calculateMatchScore(withBackground, opening)).toBe(
        matcher.calculateMatchScore(without, opening)
      );
    });
  });

  describe('findPhrase boundary + modifier matching', () => {
    it('does not find a phrase inside a longer word (hyperaccelerated ⊅ accelerated)', () => {
      expect(
        matcher.findPhrase('hyperaccelerated dragon theory', 'accelerated dragon', 'Sicilian')
      ).toBeNull();
    });

    it('flags a hyphen-joined foreign modifier as modified (semi-slav vs slav page)', () => {
      // 'slav defense' does occur on \b boundaries inside "semi-slav defense",
      // but only behind the foreign 'semi' modifier — a sibling, not a match
      expect(matcher.findPhrase('the semi-slav defense', 'slav defense', 'Slav Defense')).toBe(
        'modified'
      );
    });

    it('exposes hyphenated compound parts to their own pages (smith-morra)', () => {
      // 'smith' and 'morra' are not modifiers, so a Smith-Morra title matches
      // Smith-Morra page words split across the hyphen
      expect(
        matcher.findPhrase(
          'smith-morra gambit accepted speedrun',
          'morra',
          'Sicilian Defense: Smith-Morra Gambit Accepted'
        )
      ).toBe('match');
    });

    it('expands the "Acc." title shorthand to accelerated', () => {
      expect(
        matcher.findPhrase(
          "You Can't Handle the Tactics! | Alapin, Glek, Acc. Dragon",
          'accelerated dragon',
          'Sicilian Defense: Accelerated Dragon'
        )
      ).toBe('match');
      // …and the shorthand still marks a sibling on the plain Dragon page
      expect(
        matcher.findPhrase(
          'Chess Openings: How to Play the Acc. Dragon!',
          'dragon',
          'Sicilian Defense: Dragon Variation'
        )
      ).toBe('modified');
    });

    it('tolerates a trailing s/d suffix (advance ≈ advanced)', () => {
      expect(
        matcher.findPhrase(
          'french defense advanced variation lesson',
          'advance',
          'French Defense: Advance Variation'
        )
      ).toBe('match');
    });

    it('flags a modifier-qualified occurrence as modified (accelerated dragon vs dragon page)', () => {
      expect(
        matcher.findPhrase(
          'the accelerated dragon explained',
          'dragon',
          'Sicilian Defense: Dragon Variation'
        )
      ).toBe('modified');
    });

    it('allows a modifier that belongs to the page name itself', () => {
      expect(
        matcher.findPhrase(
          'the accelerated dragon explained',
          'dragon',
          'Sicilian Defense: Accelerated Dragon'
        )
      ).toBe('match');
    });

    it('flags hyphenated modifiers (hyper-accelerated dragon vs accelerated dragon page)', () => {
      expect(
        matcher.findPhrase(
          'the hyper-accelerated dragon explained',
          'dragon',
          'Sicilian Defense: Accelerated Dragon'
        )
      ).toBe('modified');
    });

    it('matches diacritic names against plain-ascii text', () => {
      expect(
        matcher.findPhrase(
          'the maroczy bind explained',
          'maróczy',
          'Sicilian Defense: Accelerated Dragon, Maróczy Bind'
        )
      ).toBe('match');
    });
  });

  describe('modifier-aware sibling variation handling (Dragon complex)', () => {
    const createVideo = (overrides = {}) => ({
      title: 'Test Video',
      description: '',
      channel_title: 'Test Channel',
      duration: 1800,
      tags: [],
      ...overrides,
    });

    const acceleratedPage = {
      name: 'Sicilian Defense: Accelerated Dragon',
      eco: 'B32',
      aliases: ['Accelerated Dragon', 'Sicilian: Accelerated Fianchetto'],
    };
    const dragonPage = {
      name: 'Sicilian Defense: Dragon Variation',
      eco: 'B70',
      aliases: ['Dragon Variation', 'Sicilian: Dragon'],
    };
    const hyperPage = {
      name: 'Sicilian Defense: Hyperaccelerated Dragon',
      eco: 'B27',
      aliases: ['Hyperaccelerated Dragon'],
    };

    it('rejects a Hyperaccelerated Dragon video on the Accelerated Dragon page', () => {
      const hyperVideo = createVideo({
        title: 'Hyperaccelerated Dragon (2...g6) | Sicilian Defense Theory',
      });
      expect(matcher.calculateMatchScore(hyperVideo, acceleratedPage)).toBe(0);
    });

    it('rejects an Accelerated Dragon video on the plain Dragon page', () => {
      const accelVideo = createVideo({
        title: 'The Accelerated Dragon | Sicilian Defense Theory',
      });
      expect(matcher.calculateMatchScore(accelVideo, dragonPage)).toBe(0);
    });

    it('rejects an Accelerated Dragon video on the Hyperaccelerated Dragon page', () => {
      const accelVideo = createVideo({
        title: 'The Accelerated Dragon | Sicilian Defense Theory',
      });
      expect(matcher.calculateMatchScore(accelVideo, hyperPage)).toBe(0);
    });

    it('keeps each video on its own page', () => {
      const accelVideo = createVideo({
        title: 'The Accelerated Dragon | Sicilian Defense Theory',
      });
      const hyperVideo = createVideo({
        title: 'Hyperaccelerated Dragon (2...g6) | Sicilian Defense Theory',
      });
      expect(matcher.calculateMatchScore(accelVideo, acceleratedPage)).toBeGreaterThan(0);
      expect(matcher.calculateMatchScore(hyperVideo, hyperPage)).toBeGreaterThan(0);
    });

    it('ranks the true Accelerated Dragon video above a generic Dragon video on the Accelerated Dragon page', () => {
      const accelVideo = createVideo({
        title: 'The Accelerated Dragon | Sicilian Defense Theory',
      });
      // Description mentions the accelerated dragon (repertoire overviews do),
      // but the title names only the plain Dragon complex
      const dragonVideo = createVideo({
        title:
          'Sicilian Dragon (part 2), Levenfish, Fianchetto, Classical | Sicilian Defense Theory',
        description: 'We also cover accelerated dragon move orders.',
      });
      const accelScore = matcher.calculateMatchScore(accelVideo, acceleratedPage);
      const dragonScore = matcher.calculateMatchScore(dragonVideo, acceleratedPage);
      expect(accelScore).toBeGreaterThan(dragonScore);
    });

    it('rejects a sibling-variation video whose only evidence is a description cross-link', () => {
      // Every episode of a series description-links its siblings ("The
      // Accelerated Dragon: https://youtu.be/…"). That is a cross-reference,
      // not subject matter — and the title names a different variation.
      const alapin = createVideo({
        title: 'The Alapin (c3) ⎸Sicilian Defense Theory',
        description:
          'Sicilian theory playlist. The theory of the Accelerated Dragon: https://youtu.be/rd1eKLJ3DGQ',
      });
      expect(matcher.calculateMatchScore(alapin, acceleratedPage)).toBe(0);
    });

    it('rejects a description cross-link when the title names no variation at all', () => {
      // A chapter list is not a lecture: "ATTACK!!! | Speedrun Episode 66"
      // tells a reader on the Accelerated Dragon page nothing.
      const speedrun = createVideo({
        title: 'ATTACK!!! | Speedrun Episode 66',
        description: '17:23 Attacking with the Sicilian Accelerated Dragon 33:15 Reti Opening',
      });
      expect(matcher.calculateMatchScore(speedrun, acceleratedPage)).toBe(0);
    });

    it('still accepts a description match on a family-level page', () => {
      // The corroboration rule is for variation pages only — a family page has
      // no variation for the title to corroborate.
      const video = createVideo({
        title: 'A Complete Repertoire Explained',
        description: 'This is a full sicilian defense repertoire for club players.',
      });
      const familyPage = { name: 'Sicilian Defense', eco: 'B20', aliases: [] };
      expect(matcher.calculateMatchScore(video, familyPage)).toBeGreaterThan(0);
    });

    it('ranks a video by how much of the variation its title names', () => {
      expect(
        matcher.variationEvidenceRank('The Accelerated Dragon | Sicilian Defense Theory', {
          name: 'Sicilian Defense: Accelerated Dragon',
        })
      ).toBe(2);
      expect(
        matcher.variationEvidenceRank('Sicilian Dragon (part 2), Levenfish | Theory', {
          name: 'Sicilian Defense: Accelerated Dragon',
        })
      ).toBe(1);
      expect(
        matcher.variationEvidenceRank('Mastering the Maróczy Bind | Sicilian Defense', {
          name: 'Sicilian Defense: Accelerated Dragon',
        })
      ).toBe(0);
    });

    it('breaks a score tie on naming the variation, not on view count', () => {
      // Short variation names (Smith-Morra, Prins, O'Kelly) get no specificity
      // swing, so a whole page of candidates ties and the most-viewed generic
      // Sicilian video used to lead a Smith-Morra page.
      const namesIt = {
        match_score: 135,
        variation_rank: 1,
        video: { view_count: 50000, published_at: '2020-01-01' },
      };
      const generic = {
        match_score: 135,
        variation_rank: 0,
        video: { view_count: 237112, published_at: '2021-01-01' },
      };
      expect([generic, namesIt].sort(matcher.compareMatches)[0]).toBe(namesIt);
    });

    it('does not match Semi-Slav titles onto the Slav page', () => {
      const semiSlav = createVideo({ title: 'The Semi-Slav Defense | Complete Guide' });
      const slavPage = { name: 'Slav Defense', eco: 'D10', aliases: ['Slav Defence', 'Slav'] };
      expect(matcher.calculateMatchScore(semiSlav, slavPage)).toBe(0);
    });

    it('applies no specificity swing on short-word variation pages (Lolli, Sozin)', () => {
      // 'lolli' (≤5 chars) is below the bonus granularity — a generic Scotch
      // video must keep its family-level score so niche pages stay covered
      const genericScotch = createVideo({ title: 'A Shot of Scotch: Gambit Lines Explained' });
      // Same ECO for both pages to isolate the variation swing from the
      // (orthogonal) ECO-family moderate penalty
      const lolliPage = { name: 'Scotch Game: Lolli Variation', eco: 'C45', aliases: [] };
      const scotchFamilyPage = { name: 'Scotch Game', eco: 'C45', aliases: [] };
      expect(matcher.calculateMatchScore(genericScotch, lolliPage)).toBe(
        matcher.calculateMatchScore(genericScotch, scotchFamilyPage)
      );
    });

    it('requires the full variation segment for the specificity bonus', () => {
      // 'dragon' alone must not earn the accelerated-dragon bonus
      const dragonOnly = createVideo({ title: 'Sicilian Dragon theory explained' });
      const fullMatch = createVideo({ title: 'Accelerated Dragon theory explained' });
      const dragonOnlyScore = matcher.calculateMatchScore(dragonOnly, acceleratedPage);
      const fullMatchScore = matcher.calculateMatchScore(fullMatch, acceleratedPage);
      // Gap must exceed channel/educational bonuses (see variation_specific rationale)
      expect(fullMatchScore - dragonOnlyScore).toBeGreaterThanOrEqual(45);
    });
  });

  describe('channel tiers from config', () => {
    it('should classify premium and standard channels from youtube_channels.json', () => {
      expect(matcher.getChannelTier({ channel_title: 'Daniel Naroditsky' })).toBe('premium');
      expect(matcher.getChannelTier({ channel_title: 'Hanging Pawns' })).toBe('premium');
      expect(matcher.getChannelTier({ channel_title: 'GothamChess' })).toBe('standard');
      expect(matcher.getChannelTier({ channel_title: 'agadmator Chess Channel' })).toBe('standard');
      expect(matcher.getChannelTier({ channel_title: 'chess24' })).toBe('entertainment');
      expect(matcher.getChannelTier({ channel_title: 'Random Uploader' })).toBeNull();
    });

    it('should match parenthesised config names against real channel titles', () => {
      // Config name is "ChessExplained (Christof Sielecki)"
      expect(matcher.getChannelTier({ channel_title: 'ChessExplained' })).toBe('premium');
    });

    it('should prefer channel_id over name matching', () => {
      expect(
        matcher.getChannelTier({
          channel_id: 'UCHP9CdeguNUI-_nBv_UXBhw',
          channel_title: 'Renamed Channel',
        })
      ).toBe('premium');
    });
  });
});
