const {
  getVariationWords,
  titleMentionsVariation,
} = require('../../packages/api/src/utils/variation-words');

describe('variation-words', () => {
  describe('getVariationWords', () => {
    it('returns [] for family-root names (no colon)', () => {
      expect(getVariationWords('Sicilian Defense')).toEqual([]);
      expect(getVariationWords('')).toEqual([]);
      expect(getVariationWords(undefined)).toEqual([]);
    });

    it('extracts distinguishing variation words after the colon', () => {
      expect(getVariationWords('Sicilian Defense: Najdorf Variation')).toEqual(['najdorf']);
    });

    it('drops stop words, short words and move numbers', () => {
      // "Attack", "6.Be3" and "e5" all filtered; only real names remain
      expect(getVariationWords('Sicilian: Najdorf, English Attack, 6.Be3 e5')).toEqual([
        'najdorf',
        'english',
      ]);
    });
  });

  describe('titleMentionsVariation', () => {
    const words = getVariationWords('Sicilian Defense: Najdorf Variation');

    it('matches case-insensitively anywhere in the title', () => {
      expect(titleMentionsVariation('Crush the NAJDORF in 20 minutes', words)).toBe(true);
    });

    it('is false when no variation word appears', () => {
      expect(titleMentionsVariation('Sicilian Defense for beginners', words)).toBe(false);
      expect(titleMentionsVariation(undefined, words)).toBe(false);
    });
  });
});
