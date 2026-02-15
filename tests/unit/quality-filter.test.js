/**
 * Unit tests for quality-filter.js
 * Tests two-stage filtering for course discovery pipeline
 */

const {
  filterStudy,
  filterChapter,
  calculateStudyScore,
  calculateChapterScore,
  hasBlacklistedTerms,
  hasOpeningKeywords,
  calculateFreshnessScore,
  countKeywordMatches,
  DEFAULT_THRESHOLDS,
} = require('../../tools/course-discovery/lib/quality-filter');

// Test date helpers to reduce duplication
const TEST_DATES = {
  now: () => new Date().toISOString(),
  daysAgo: (days) => new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
  thirtyDaysAgo: () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  oneYearAgo: () => new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
  twoYearsAgo: () => new Date(Date.now() - 730 * 24 * 60 * 60 * 1000).toISOString(),
  threeYearsAgo: () => new Date(Date.now() - 1095 * 24 * 60 * 60 * 1000).toISOString(),
  fiveYearsAgo: () => new Date(Date.now() - 1825 * 24 * 60 * 60 * 1000).toISOString(),
};

// Test fixture factories
const createStudy = (overrides = {}) => ({
  name: 'Test Study',
  updatedAt: TEST_DATES.now(),
  ...overrides,
});

const createChapter = (overrides = {}) => ({
  chapterName: 'Test Chapter',
  moves: 10,
  ...overrides,
});

describe('quality-filter', () => {
  describe('filterStudy', () => {
    test('should pass opening-focused studies with recent updates', () => {
      const study = createStudy({
        name: 'Sicilian Defense Repertoire',
        updatedAt: TEST_DATES.thirtyDaysAgo(),
      });

      const result = filterStudy(study);
      expect(result.pass).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(DEFAULT_THRESHOLDS.minStudyScore);
      expect(result.reason).toBe('passed');
    });

    test('should fail studies with blacklisted terms (Q&A)', () => {
      const study = createStudy({
        name: 'Weekly Q&A Session',
      });

      const result = filterStudy(study);
      expect(result.pass).toBe(false);
      expect(result.reason).toBe('blacklisted_term');
      expect(result.score).toBe(0);
    });

    test('should fail studies with blacklisted terms (puzzle)', () => {
      const study = createStudy({
        name: 'Chess Puzzle Collection',
      });

      const result = filterStudy(study);
      expect(result.pass).toBe(false);
      expect(result.reason).toBe('blacklisted_term');
    });

    test('should fail studies with blacklisted terms (endgame)', () => {
      const study = createStudy({
        name: 'Rook Endgame Masterclass',
      });

      const result = filterStudy(study);
      expect(result.pass).toBe(false);
      expect(result.reason).toBe('blacklisted_term');
    });

    test('should fail studies with no opening keywords', () => {
      const study = createStudy({
        name: 'Random Study',
        updatedAt: TEST_DATES.fiveYearsAgo(),
      });

      const result = filterStudy(study);
      expect(result.pass).toBe(false);
      expect(result.reason).toBe('no_opening_keywords');
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    test('should score recent studies higher than old ones', () => {
      const recentStudy = createStudy({
        name: 'French Defense',
        updatedAt: TEST_DATES.thirtyDaysAgo(),
      });
      const oldStudy = createStudy({
        name: 'French Defense',
        updatedAt: TEST_DATES.daysAgo(1000),
      });

      const recentScore = calculateStudyScore(recentStudy);
      const oldScore = calculateStudyScore(oldStudy);

      expect(recentScore).toBeGreaterThan(oldScore);
    });

    test('should handle missing updatedAt gracefully', () => {
      const study = {
        name: 'Kings Gambit Opening Theory',
      };

      const result = filterStudy(study);
      // Should still pass if name has strong keywords, even without freshness bonus
      expect(result.pass).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(DEFAULT_THRESHOLDS.minStudyScore);
    });

    test('should return pass=false and reason for failing studies', () => {
      const study = createStudy({
        name: 'Random Chess Study',
        updatedAt: TEST_DATES.daysAgo(2000),
      });

      const result = filterStudy(study);
      expect(result.pass).toBe(false);
      expect(result.reason).toBe('no_opening_keywords');
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    test('should handle null study', () => {
      const result = filterStudy(null);
      expect(result.pass).toBe(false);
      expect(result.reason).toBe('missing_study_data');
    });

    test('should handle study without name', () => {
      const study = { updatedAt: TEST_DATES.now() };
      const result = filterStudy(study);
      expect(result.pass).toBe(false);
      expect(result.reason).toBe('missing_study_data');
    });

    test('should respect custom thresholds', () => {
      const study = createStudy({
        name: 'Opening Theory',
      });

      const strictThresholds = { minStudyScore: 90, minChapterScore: 90, minMoveDepth: 10 };
      const result = filterStudy(study, strictThresholds);
      expect(result.pass).toBe(false); // High threshold should fail
    });
  });

  describe('filterChapter', () => {
    const study = createStudy({
      name: 'Opening Repertoire',
    });

    test('should pass chapters with 8+ moves and opening keywords', () => {
      const chapter = createChapter({
        chapterName: 'Sicilian Dragon Variation',
      });

      const result = filterChapter(chapter, study);
      expect(result.pass).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(DEFAULT_THRESHOLDS.minChapterScore);
      expect(result.reason).toBe('passed');
    });

    test('should fail chapters with <8 moves', () => {
      const chapter = createChapter({
        chapterName: 'Italian Game',
        moves: 5,
      });

      const result = filterChapter(chapter, study);
      expect(result.pass).toBe(false);
      expect(result.reason).toBe('insufficient_moves');
    });

    test('should fail chapters with blacklisted terms', () => {
      const chapter = createChapter({
        chapterName: 'Puzzle #1',
      });

      const result = filterChapter(chapter, study);
      expect(result.pass).toBe(false);
      expect(result.reason).toBe('blacklisted_chapter');
    });

    test('should pass deep theoretical chapters (16+ moves)', () => {
      const chapter = createChapter({
        chapterName: 'Main Line Theory',
        moves: 20,
      });

      const result = filterChapter(chapter, study);
      expect(result.pass).toBe(true);
      expect(result.score).toBeGreaterThan(DEFAULT_THRESHOLDS.minChapterScore);
    });

    test('should handle missing moves field', () => {
      const chapter = createChapter({
        chapterName: 'Kings Indian Defense',
        moves: undefined,
      });

      const result = filterChapter(chapter, study);
      // Without move count, should pass/fail based on score alone
      expect(result).toHaveProperty('pass');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('reason');
    });

    test('should handle null chapter', () => {
      const result = filterChapter(null, study);
      expect(result.pass).toBe(false);
      expect(result.reason).toBe('missing_chapter_data');
    });

    test('should handle chapter without name', () => {
      const chapter = { moves: 10 };
      const result = filterChapter(chapter, study);
      expect(result.pass).toBe(false);
      expect(result.reason).toBe('missing_chapter_data');
    });

    test('should respect custom move depth threshold', () => {
      const chapter = createChapter({
        chapterName: 'Opening Line',
        moves: 9,
      });

      const strictThresholds = { minStudyScore: 40, minChapterScore: 50, minMoveDepth: 12 };
      const result = filterChapter(chapter, study, strictThresholds);
      expect(result.pass).toBe(false);
      expect(result.reason).toBe('insufficient_moves');
    });

    test('should combine study and chapter signals', () => {
      const oldStudy = createStudy({
        name: 'Old Study',
        updatedAt: TEST_DATES.daysAgo(1500),
      });

      const chapter = createChapter({
        chapterName: 'French Defense',
      });

      const score = calculateChapterScore(chapter, oldStudy);
      expect(score).toBeGreaterThan(0);
      // Should have some score from keywords even if study is old
    });
  });

  describe('calculateStudyScore', () => {
    test('should award freshness points (0-20)', () => {
      const recentStudy = createStudy({
        name: 'Test',
        updatedAt: TEST_DATES.thirtyDaysAgo(),
      });
      const oldStudy = createStudy({
        name: 'Test',
        updatedAt: TEST_DATES.daysAgo(1000),
      });

      const recentScore = calculateStudyScore(recentStudy);
      const oldScore = calculateStudyScore(oldStudy);

      expect(recentScore).toBeGreaterThan(oldScore);
      expect(recentScore - oldScore).toBeLessThanOrEqual(20);
    });

    test('should award keyword match points (0-15)', () => {
      const studyWithKeywords = createStudy({
        name: 'Opening Defense Gambit',
      });
      const studyWithoutKeywords = createStudy({
        name: 'Random Study',
      });

      const withKeywordsScore = calculateStudyScore(studyWithKeywords);
      const withoutKeywordsScore = calculateStudyScore(studyWithoutKeywords);

      expect(withKeywordsScore).toBeGreaterThan(withoutKeywordsScore);
      expect(withKeywordsScore - withoutKeywordsScore).toBeLessThanOrEqual(15);
    });

    test('should produce scores in 0-100 range', () => {
      const studies = [
        createStudy({ name: 'A' }),
        createStudy({ name: 'Opening Defense Gambit' }),
        createStudy({ name: 'Old', updatedAt: TEST_DATES.daysAgo(2000) }),
      ];

      for (const study of studies) {
        const score = calculateStudyScore(study);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    });

    test('should handle very old studies (5+ years)', () => {
      const veryOldStudy = createStudy({
        name: 'Ancient Opening Study',
        updatedAt: TEST_DATES.daysAgo(2000),
      });

      const score = calculateStudyScore(veryOldStudy);
      expect(score).toBeGreaterThan(0); // Should still have baseline + keyword points
      expect(score).toBeLessThan(70); // But no freshness bonus
    });

    test('should return 0 for null study', () => {
      expect(calculateStudyScore(null)).toBe(0);
    });

    test('should return 0 for study without name', () => {
      expect(calculateStudyScore({ updatedAt: TEST_DATES.now() })).toBe(0);
    });
  });

  describe('calculateChapterScore', () => {
    const study = createStudy();

    test('should award move depth points (0-20)', () => {
      const shallowChapter = createChapter({ chapterName: 'Test', moves: 8 });
      const deepChapter = createChapter({ chapterName: 'Test', moves: 20 });

      const shallowScore = calculateChapterScore(shallowChapter, study);
      const deepScore = calculateChapterScore(deepChapter, study);

      expect(deepScore).toBeGreaterThan(shallowScore);
    });

    test('should penalize shallow content (<8 moves)', () => {
      const shallowChapter = createChapter({ chapterName: 'Opening', moves: 4 });
      const deepChapter = createChapter({ chapterName: 'Opening', moves: 10 });

      const shallowScore = calculateChapterScore(shallowChapter, study);
      const deepScore = calculateChapterScore(deepChapter, study);

      expect(shallowScore).toBeLessThan(deepScore);
      expect(shallowScore).toBeLessThan(50); // Should be below baseline due to penalty
    });

    test('should combine study and chapter signals', () => {
      const recentStudy = createStudy({
        name: 'Recent Study',
        updatedAt: TEST_DATES.thirtyDaysAgo(),
      });
      const oldStudy = createStudy({
        name: 'Old Study',
        updatedAt: TEST_DATES.daysAgo(2000),
      });

      const chapter = createChapter({ chapterName: 'Defense' });

      const scoreWithRecentStudy = calculateChapterScore(chapter, recentStudy);
      const scoreWithOldStudy = calculateChapterScore(chapter, oldStudy);

      expect(scoreWithRecentStudy).toBeGreaterThan(scoreWithOldStudy);
    });

    test('should return 0 for null chapter', () => {
      expect(calculateChapterScore(null, study)).toBe(0);
    });

    test('should handle chapter without study', () => {
      const chapter = createChapter();
      const score = calculateChapterScore(chapter, null);
      expect(score).toBeGreaterThan(0); // Should still have baseline + chapter points
    });

    test('should handle missing moves field', () => {
      const chapter = createChapter({ chapterName: 'Opening Defense', moves: undefined });
      const score = calculateChapterScore(chapter, study);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('hasBlacklistedTerms', () => {
    test('should detect blacklisted terms case-insensitively', () => {
      expect(hasBlacklistedTerms('Weekly Q&A Session')).toBe(true);
      expect(hasBlacklistedTerms('weekly q&a session')).toBe(true);
      expect(hasBlacklistedTerms('WEEKLY Q&A SESSION')).toBe(true);
    });

    test('should detect partial matches', () => {
      expect(hasBlacklistedTerms('My Q&A Study')).toBe(true);
      expect(hasBlacklistedTerms('Puzzle Collection')).toBe(true);
      expect(hasBlacklistedTerms('Endgame Masterclass')).toBe(true);
      expect(hasBlacklistedTerms('Game of the Week')).toBe(true);
    });

    test('should return false for clean study names', () => {
      expect(hasBlacklistedTerms('Sicilian Defense')).toBe(false);
      expect(hasBlacklistedTerms('Opening Repertoire')).toBe(false);
      expect(hasBlacklistedTerms('Kings Gambit Theory')).toBe(false);
    });

    test('should handle null/undefined text', () => {
      expect(hasBlacklistedTerms(null)).toBe(false);
      expect(hasBlacklistedTerms(undefined)).toBe(false);
    });

    test('should handle empty string', () => {
      expect(hasBlacklistedTerms('')).toBe(false);
    });

    test('should accept custom blacklist', () => {
      const customBlacklist = ['test', 'demo'];
      expect(hasBlacklistedTerms('Test Study', customBlacklist)).toBe(true);
      expect(hasBlacklistedTerms('Demo Course', customBlacklist)).toBe(true);
      expect(hasBlacklistedTerms('Real Course', customBlacklist)).toBe(false);
    });
  });

  describe('hasOpeningKeywords', () => {
    test('should detect opening keywords case-insensitively', () => {
      expect(hasOpeningKeywords('Sicilian Defense')).toBe(true);
      expect(hasOpeningKeywords('sicilian defense')).toBe(true);
      expect(hasOpeningKeywords('SICILIAN DEFENSE')).toBe(true);
    });

    test('should return true if at least one keyword found', () => {
      expect(hasOpeningKeywords('French Defense')).toBe(true);
      expect(hasOpeningKeywords('Italian Game Opening')).toBe(true);
      expect(hasOpeningKeywords('Kings Gambit')).toBe(true);
      expect(hasOpeningKeywords('My Repertoire')).toBe(true);
    });

    test('should return false if no keywords found', () => {
      expect(hasOpeningKeywords('Random Study')).toBe(false);
      expect(hasOpeningKeywords('Chess Stuff')).toBe(false);
      expect(hasOpeningKeywords('Game Analysis')).toBe(false);
    });

    test('should handle null/undefined text', () => {
      expect(hasOpeningKeywords(null)).toBe(false);
      expect(hasOpeningKeywords(undefined)).toBe(false);
    });

    test('should handle empty string', () => {
      expect(hasOpeningKeywords('')).toBe(false);
    });

    test('should accept custom keywords', () => {
      const customKeywords = ['advanced', 'masterclass'];
      expect(hasOpeningKeywords('Advanced Course', customKeywords)).toBe(true);
      expect(hasOpeningKeywords('Masterclass Series', customKeywords)).toBe(true);
      expect(hasOpeningKeywords('Basic Course', customKeywords)).toBe(false);
    });
  });

  describe('calculateFreshnessScore', () => {
    test('should return 20 for recent updates (<1 year)', () => {
      const recent = TEST_DATES.daysAgo(180); // 6 months
      expect(calculateFreshnessScore(recent)).toBe(20);
    });

    test('should return 10 for updates 1-2 years old', () => {
      const oneYear = TEST_DATES.daysAgo(500);
      expect(calculateFreshnessScore(oneYear)).toBe(10);
    });

    test('should return 5 for updates 2-3 years old', () => {
      const twoYears = TEST_DATES.daysAgo(800);
      expect(calculateFreshnessScore(twoYears)).toBe(5);
    });

    test('should return 0 for very old updates (3+ years)', () => {
      const veryOld = TEST_DATES.daysAgo(1500);
      expect(calculateFreshnessScore(veryOld)).toBe(0);
    });

    test('should handle Date objects', () => {
      const recent = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      expect(calculateFreshnessScore(recent)).toBe(20);
    });

    test('should handle Unix timestamps', () => {
      const recent = Date.now() - 30 * 24 * 60 * 60 * 1000;
      expect(calculateFreshnessScore(recent)).toBe(20);
    });

    test('should handle null/undefined', () => {
      expect(calculateFreshnessScore(null)).toBe(0);
      expect(calculateFreshnessScore(undefined)).toBe(0);
    });

    test('should handle invalid date strings', () => {
      expect(calculateFreshnessScore('invalid')).toBe(0);
    });
  });

  describe('countKeywordMatches', () => {
    test('should count multiple keyword matches', () => {
      expect(countKeywordMatches('Opening Defense Gambit')).toBe(3);
      expect(countKeywordMatches('Repertoire Theory')).toBe(2);
      expect(countKeywordMatches('Defense')).toBe(1);
    });

    test('should be case-insensitive', () => {
      expect(countKeywordMatches('OPENING DEFENSE')).toBe(2);
      expect(countKeywordMatches('opening defense')).toBe(2);
    });

    test('should return 0 for no matches', () => {
      expect(countKeywordMatches('Random Study')).toBe(0);
    });

    test('should handle null/undefined text', () => {
      expect(countKeywordMatches(null)).toBe(0);
      expect(countKeywordMatches(undefined)).toBe(0);
    });

    test('should accept custom keywords', () => {
      const customKeywords = ['advanced', 'beginner', 'intermediate'];
      expect(countKeywordMatches('Advanced Beginner Course', customKeywords)).toBe(2);
    });
  });

  describe('edge cases', () => {
    test('should handle empty study name', () => {
      const study = createStudy({ name: '' });
      const score = calculateStudyScore(study);
      expect(score).toBe(0); // Empty name is treated as invalid
    });

    test('should handle single-character study name', () => {
      const study = createStudy({ name: 'A' });
      const score = calculateStudyScore(study);
      expect(score).toBeGreaterThan(0);
    });

    test('should handle very long study names', () => {
      const study = createStudy({
        name: 'Opening '.repeat(100) + 'Defense',
      });
      const score = calculateStudyScore(study);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    test('should handle chapters with 0 moves', () => {
      const chapter = createChapter({ chapterName: 'Test', moves: 0 });
      const study = createStudy({ name: 'Test' });
      const result = filterChapter(chapter, study);
      expect(result.pass).toBe(false);
      expect(result.reason).toBe('insufficient_moves');
    });

    test('should handle negative move counts gracefully', () => {
      const chapter = createChapter({ chapterName: 'Test', moves: -5 });
      const study = createStudy({ name: 'Test' });
      const result = filterChapter(chapter, study);
      expect(result.pass).toBe(false);
    });

    test('should handle special characters in names', () => {
      const study = createStudy({ name: 'Opening: Defense & Attack!' });
      const score = calculateStudyScore(study);
      expect(score).toBeGreaterThan(0);
    });

    test('should handle Unicode characters in names', () => {
      const study = createStudy({ name: '♔ Opening ♕ Defense' });
      const score = calculateStudyScore(study);
      expect(score).toBeGreaterThan(0);
    });

    test('should handle study with both opening keywords AND blacklist terms (blacklist wins)', () => {
      const study = createStudy({
        name: 'Sicilian Defense Q&A Session', // Has both "defense" AND "q&a"
      });

      const result = filterStudy(study);
      expect(result.pass).toBe(false);
      expect(result.reason).toBe('blacklisted_term');
    });

    test('should handle multiple blacklist terms in single study name', () => {
      const study = createStudy({
        name: 'Weekly Q&A Puzzle Tournament', // Has 3 blacklist terms
      });

      const result = filterStudy(study);
      expect(result.pass).toBe(false);
      expect(result.reason).toBe('blacklisted_term');
    });

    test('should handle study score at exact threshold boundary', () => {
      // Create a study that scores exactly minStudyScore (40)
      // baseline(50) + freshness(0) + keywords(0) = 50
      const study = createStudy({
        name: 'Test', // No keywords, no blacklist
        updatedAt: TEST_DATES.daysAgo(2000), // 5+ years
      });

      const score = calculateStudyScore(study);
      expect(score).toBe(50); // Baseline only

      // With current threshold (40), this should pass
      const result = filterStudy(study, {
        minStudyScore: 50,
        minChapterScore: 50,
        minMoveDepth: 8,
      });
      expect(result.pass).toBe(false); // Fails keyword check first
      expect(result.reason).toBe('no_opening_keywords');
    });

    test('should handle chapter score at exact threshold boundary', () => {
      const study = createStudy({
        name: 'Opening',
        updatedAt: TEST_DATES.daysAgo(2000),
      });
      const chapter = createChapter({
        chapterName: 'Theory',
        moves: 8, // Minimum moves
      });

      const score = calculateChapterScore(chapter, study);
      // baseline(50) + freshness(0) + keywords(5) + move_depth(10) = 65

      const result = filterChapter(chapter, study, {
        minStudyScore: 40,
        minChapterScore: 65,
        minMoveDepth: 8,
      });
      expect(result.pass).toBe(true); // Score equals threshold
    });

    test('should handle keyword matching with whitespace variations', () => {
      // Verify that "defensetheory" (no space) matches both "defense" and "theory"
      const withoutSpace = createStudy({ name: 'mydefensetheory' });
      const withSpace = createStudy({ name: 'my defense theory' });

      const score1 = calculateStudyScore(withoutSpace);
      const score2 = calculateStudyScore(withSpace);

      // Both should match (includes() is substring match)
      expect(score1).toBeGreaterThan(50); // Has "defense" and "theory" substrings
      expect(score2).toBeGreaterThan(50); // Has "defense" and "theory" as separate words
      // Both contain the same keywords, so scores should be equal
      expect(score1).toBe(score2);
    });
  });
});
