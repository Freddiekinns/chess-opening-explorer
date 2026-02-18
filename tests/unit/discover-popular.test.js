const {
  classifyStudy,
  loadExistingIds,
  formatForCuratedFile,
  SEARCH_TERMS,
  EXCLUDE_TITLE_PATTERNS,
  INCLUDE_TITLE_PATTERNS,
} = require('../../tools/course-discovery/discover-popular');

describe('discover-popular', () => {
  describe('classifyStudy', () => {
    describe('includes opening-related studies', () => {
      const openingStudies = [
        { name: 'Sicilian Defense', topics: [], likes: 1000 },
        { name: '♦ All about the Sicilian Defense ♦', topics: [], likes: 5000 },
        { name: 'The London System', topics: [], likes: 2000 },
        { name: 'Italian Game (50 Lessons)', topics: [], likes: 3000 },
        { name: "King's Indian: Fantastic Opening", topics: [], likes: 1500 },
        { name: 'Ruy Lopez full guide', topics: [], likes: 800 },
        { name: 'Opening Traps', topics: [], likes: 40000 },
        { name: 'Caro-Kann Defense', topics: ['Defenses'], likes: 1000 },
        { name: "Queen's Gambit Declined", topics: [], likes: 700 },
        { name: 'Najdorf Variation Guide', topics: [], likes: 600 },
        { name: 'Crush the Sicilian!', topics: [], likes: 1500 },
        { name: 'Anti-London for Black', topics: [], likes: 500 },
        { name: 'Dragon Variation Explained', topics: [], likes: 800 },
        { name: 'e4 e5 Repertoire', topics: [], likes: 600 },
        { name: 'Complete d4 Repertoire', topics: [], likes: 700 },
        { name: 'French Defense Course', topics: [], likes: 900 },
        { name: 'Beat 1.d4 with the Budapest Gambit', topics: [], likes: 500 },
        { name: 'Grünfeld for Club Players', topics: [], likes: 600 },
        { name: 'Réti Opening Guide', topics: [], likes: 500 },
        { name: 'How to refute the London', topics: [], likes: 700 },
        {
          name: 'Advanced Pawn Structures in Openings',
          topics: ['Openings'],
          likes: 600,
        },
      ];

      openingStudies.forEach((study) => {
        it(`includes "${study.name}"`, () => {
          const result = classifyStudy(study);
          expect(result.included).toBe(true);
        });
      });
    });

    describe('excludes non-opening studies', () => {
      const nonOpeningStudies = [
        { name: 'Basic Chess Endgames', topics: [], likes: 3000 },
        { name: 'Mate in Two puzzles', topics: [], likes: 2000 },
        { name: '10 MUST-KNOW Checkmate Patterns', topics: [], likes: 2000 },
        { name: 'Improve Your Chess in 4 Steps', topics: [], likes: 1500 },
        { name: 'Chess Tips Part 1', topics: [], likes: 5000 },
        { name: 'How to analyze a chess game', topics: [], likes: 2000 },
        { name: 'Common Mistakes in Chess', topics: [], likes: 4000 },
        { name: 'Endgame Mastery', topics: ['Endgames'], likes: 1000 },
        { name: 'Atomic Chess Guide', topics: [], likes: 800 },
        { name: 'Fischer Random 960 Strategies', topics: [], likes: 600 },
        { name: 'Crazyhouse for Beginners', topics: [], likes: 700 },
      ];

      nonOpeningStudies.forEach((study) => {
        it(`excludes "${study.name}"`, () => {
          const result = classifyStudy(study);
          expect(result.included).toBe(false);
        });
      });
    });

    it('includes study with opening topic even if title is generic', () => {
      const study = {
        name: 'My Chess Course',
        topics: ['Openings'],
        likes: 500,
      };
      const result = classifyStudy(study);
      expect(result.included).toBe(true);
    });
  });

  describe('loadExistingIds', () => {
    const fs = require('fs');
    const os = require('os');
    const path = require('path');

    it('returns empty set for non-existent file', () => {
      const ids = loadExistingIds('/tmp/nonexistent-file-abc123.txt');
      expect(ids.size).toBe(0);
    });

    it('extracts study IDs from file', () => {
      const tmp = path.join(os.tmpdir(), 'test-curated.txt');
      fs.writeFileSync(
        tmp,
        [
          '# Comment',
          'Sicilian Study',
          'https://lichess.org/study/abc123',
          'French Study',
          'https://lichess.org/study/def456',
        ].join('\n')
      );
      const ids = loadExistingIds(tmp);
      expect(ids.size).toBe(2);
      expect(ids.has('abc123')).toBe(true);
      expect(ids.has('def456')).toBe(true);
      fs.unlinkSync(tmp);
    });
  });

  describe('formatForCuratedFile', () => {
    it('formats studies as title/URL pairs', () => {
      const studies = [
        { id: 'abc123', name: 'Test Study', likes: 1000, owner: 'user1' },
        { id: 'def456', name: 'Another Study', likes: 500, owner: 'user2' },
      ];
      const output = formatForCuratedFile(studies);
      expect(output).toContain('Test Study');
      expect(output).toContain('https://lichess.org/study/abc123');
      expect(output).toContain('Another Study');
      expect(output).toContain('https://lichess.org/study/def456');
      expect(output).toContain('Auto-discovered');
    });
  });

  describe('search terms', () => {
    it('has a reasonable number of search terms', () => {
      expect(SEARCH_TERMS.length).toBeGreaterThan(20);
    });

    it('includes broad terms', () => {
      expect(SEARCH_TERMS).toContain('opening');
      expect(SEARCH_TERMS).toContain('defense');
      expect(SEARCH_TERMS).toContain('gambit');
    });

    it('includes specific opening names', () => {
      expect(SEARCH_TERMS).toContain('sicilian');
      expect(SEARCH_TERMS).toContain('caro-kann');
      expect(SEARCH_TERMS).toContain('london system');
    });
  });

  describe('pattern arrays', () => {
    it('has exclusion patterns', () => {
      expect(EXCLUDE_TITLE_PATTERNS.length).toBeGreaterThan(5);
    });

    it('has inclusion patterns', () => {
      expect(INCLUDE_TITLE_PATTERNS.length).toBeGreaterThan(10);
    });
  });
});
