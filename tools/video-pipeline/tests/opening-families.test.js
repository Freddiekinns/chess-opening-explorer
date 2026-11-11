/**
 * Test Suite: Opening family detection and move-prefix compatibility
 */

const {
  getFamilyFromEco,
  getFamilyFromTitle,
  getFamiliesFromTitle,
  isFamilyName,
  compareFamilies,
  FAMILY_MOVE_PREFIXES,
  ECO_FAMILY_RANGES,
} = require('../lib/opening-families');

describe('opening-families', () => {
  describe('getFamilyFromEco', () => {
    it('should resolve sub-ranges that the old map lumped together', () => {
      expect(getFamilyFromEco('B01')).toBe('scandinavian');
      expect(getFamilyFromEco('B03')).toBe('alekhine');
      expect(getFamilyFromEco('B08')).toBe('pirc');
      expect(getFamilyFromEco('C41')).toBe('philidor');
      expect(getFamilyFromEco('C42')).toBe('petrov');
      expect(getFamilyFromEco('C45')).toBe('scotch');
      expect(getFamilyFromEco('C47')).toBe('four_knights');
      expect(getFamilyFromEco('C27')).toBe('vienna');
    });

    it('should handle invalid codes', () => {
      expect(getFamilyFromEco('')).toBeNull();
      expect(getFamilyFromEco(null)).toBeNull();
      expect(getFamilyFromEco('X99')).toBeNull();
    });

    it('should map every family in the ECO ranges to a move prefix', () => {
      for (const [, , family] of ECO_FAMILY_RANGES) {
        expect(FAMILY_MOVE_PREFIXES[family]).toBeDefined();
      }
    });
  });

  describe('getFamilyFromTitle', () => {
    it('should detect compound names before their components', () => {
      expect(getFamilyFromTitle('The Reversed Sicilian: 1.c4 e5 · English Opening Theory')).toBe(
        'english'
      );
      expect(getFamilyFromTitle('Four Knights Game: Scotch Variation | Theory')).toBe(
        'four_knights'
      );
      expect(getFamilyFromTitle('Semi-Slav Defense: Complete Guide')).toBe('semi_slav');
      expect(getFamilyFromTitle("Queen's Gambit Declined, Tartakower variation")).toBe(
        'queens_gambit_declined'
      );
    });

    it('should use word boundaries', () => {
      expect(getFamilyFromTitle('no kidding, great opening')).toBeNull();
      expect(getFamilyFromTitle('KID structures explained')).toBe('kings_indian');
    });

    it('should return null for titles naming no family', () => {
      expect(getFamilyFromTitle('Top 10 opening traps for beginners')).toBeNull();
    });

    it('should detect the London under both common names', () => {
      expect(getFamilyFromTitle('Crush with the London System')).toBe('london');
      expect(getFamilyFromTitle('Deep Preparation in the London Opening')).toBe('london');
    });
  });

  describe('compareFamilies', () => {
    it('should reject across the 1.e4 / 1.d4 divide', () => {
      expect(compareFamilies('caro_kann', 'queens_gambit_declined')).toBe('conflict');
      expect(compareFamilies('french', 'scotch')).toBe('conflict');
      expect(compareFamilies('sicilian', 'french')).toBe('conflict');
      expect(compareFamilies('english', 'sicilian')).toBe('conflict');
    });

    it('should reject siblings that diverge after a shared start', () => {
      expect(compareFamilies('italian', 'spanish')).toBe('conflict');
      expect(compareFamilies('slav', 'queens_gambit_declined')).toBe('conflict');
      expect(compareFamilies('petrov', 'scotch')).toBe('conflict');
    });

    it('should keep prefix-related lines compatible', () => {
      expect(compareFamilies('queens_gambit', 'queens_gambit_declined')).toBe('compatible');
      expect(compareFamilies('kings_pawn_games', 'spanish')).toBe('compatible');
      expect(compareFamilies('london', 'queens_gambit_declined')).toBe('compatible');
      expect(compareFamilies('semi_slav', 'slav')).toBe('compatible');
    });

    it('should treat unknown/irregular families as compatible', () => {
      expect(compareFamilies('irregular', 'sicilian')).toBe('compatible');
      expect(compareFamilies(null, 'sicilian')).toBe('compatible');
    });

    it('should report identical families as same', () => {
      expect(compareFamilies('sicilian', 'sicilian')).toBe('same');
    });
  });

  // The title's family now also admits a video to a page (the positive family
  // path), so a family word that is really another opening's name has to stop
  // reading as that family.
  describe('family words that name something else', () => {
    it("should not read the King's Indian Attack as the King's Indian Defense", () => {
      expect(getFamiliesFromTitle("King's Indian Attack - Standard chess #27")).toEqual([
        'kings_indian_attack',
      ]);
      expect(getFamiliesFromTitle('How to play the KIA')).toEqual(['kings_indian_attack']);
      expect(compareFamilies('kings_indian_attack', 'kings_indian')).toBe('compatible');
    });

    it('should not read "<Family> Variation" as that family', () => {
      expect(getFamiliesFromTitle("Queen's Gambit Declined: Vienna Variation")).toEqual([
        'queens_gambit_declined',
      ]);
      expect(getFamiliesFromTitle('Four Knights Game: Scotch Variation')).toEqual(['four_knights']);
    });

    it('does not read the Stonewall Attack as the Dutch', () => {
      expect(getFamiliesFromTitle('Stonewall Attack for white')).not.toContain('dutch');
      expect(getFamiliesFromTitle('The Stonewall | Dutch Defense Theory')).toEqual(['dutch']);
      expect(getFamiliesFromTitle('Stonewall Dutch explained')).toEqual(['dutch']);
    });

    it('should still read the family beside a named variation', () => {
      expect(getFamiliesFromTitle('French Defense: Advance Variation')).toEqual(['french']);
      expect(getFamiliesFromTitle('Leningrad Variation | Dutch Defense')).toEqual(['dutch']);
    });
  });

  describe('isFamilyName', () => {
    it('should recognise a family named with or without its classifier', () => {
      expect(isFamilyName("King's Indian Defense", 'kings_indian')).toBe(true);
      expect(isFamilyName('caro-kann', 'caro_kann')).toBe(true);
      expect(isFamilyName('Sicilian', 'sicilian')).toBe(true);
    });

    it('should not recognise a variation, another family or nothing', () => {
      expect(isFamilyName("King's Indian Defense: Sämisch", 'kings_indian')).toBe(false);
      expect(isFamilyName('Tarrasch Defense', 'queens_gambit_declined')).toBe(false);
      expect(isFamilyName('French Defense', 'sicilian')).toBe(false);
      expect(isFamilyName('', 'sicilian')).toBe(false);
      expect(isFamilyName('Sicilian Defense', null)).toBe(false);
    });
  });
});
