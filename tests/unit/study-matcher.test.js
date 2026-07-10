/**
 * Tests for the study → opening multi-anchor matcher (study matching v2).
 */

const { loadMatchConfig, scoreMatch } = require('../../tools/course-discovery/lib/study-matcher');

describe('study-matcher config', () => {
  test('loadMatchConfig loads defaults from config/study_matching.json', () => {
    const config = loadMatchConfig();
    expect(config.min_match_score).toBeGreaterThan(0);
    expect(config.max_studies_per_page).toBeGreaterThan(0);
    expect(config.covers_position_ratio).toBeGreaterThan(0);
    expect(config.weights.specificity_scale).toBeGreaterThan(0);
  });
});

describe('scoreMatch', () => {
  const weights = {
    line_context_base: 10,
    specificity_scale: 60,
    family_same: 20,
    family_compatible: 5,
    likes_per_magnitude: 6,
    per_extra_chapter: 2,
  };

  test('full-ratio same-family match outscores shallow compatible match', () => {
    const exact = scoreMatch(
      { ratio: 1, familyRelation: 'same', likes: 100, chaptersMatched: 1 },
      weights
    );
    const shallow = scoreMatch(
      { ratio: 0.2, familyRelation: 'compatible', likes: 100, chaptersMatched: 1 },
      weights
    );
    expect(exact).toBeGreaterThan(shallow);
  });

  test('likes are log-scaled and capped: 40k likes adds at most 5 magnitudes', () => {
    const base = scoreMatch(
      { ratio: 1, familyRelation: 'same', likes: 0, chaptersMatched: 1 },
      weights
    );
    const liked = scoreMatch(
      { ratio: 1, familyRelation: 'same', likes: 40000, chaptersMatched: 1 },
      weights
    );
    expect(liked - base).toBeLessThanOrEqual(5 * weights.likes_per_magnitude);
    expect(liked).toBeGreaterThan(base);
  });

  test('exact low-likes match beats popular drive-by match (specificity dominates likes)', () => {
    const exactUnpopular = scoreMatch(
      { ratio: 1, familyRelation: 'same', likes: 20, chaptersMatched: 1 },
      weights
    );
    const popularDriveBy = scoreMatch(
      { ratio: 0.15, familyRelation: 'compatible', likes: 41000, chaptersMatched: 5 },
      weights
    );
    expect(exactUnpopular).toBeGreaterThan(popularDriveBy);
  });

  test('chapter count bonus caps at 5 chapters', () => {
    const five = scoreMatch(
      { ratio: 1, familyRelation: 'same', likes: 0, chaptersMatched: 5 },
      weights
    );
    const fifty = scoreMatch(
      { ratio: 1, familyRelation: 'same', likes: 0, chaptersMatched: 50 },
      weights
    );
    expect(five).toBe(fifty);
  });

  test('returns an integer', () => {
    const s = scoreMatch(
      { ratio: 0.33, familyRelation: 'unknown', likes: 7, chaptersMatched: 2 },
      weights
    );
    expect(Number.isInteger(s)).toBe(true);
  });
});
