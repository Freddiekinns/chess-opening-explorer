/**
 * Tests for the study → opening multi-anchor matcher (study matching v2).
 */

const {
  loadMatchConfig,
  scoreMatch,
  collectChapterAnchors,
  inferStudyFamilies,
  cleanChapterTitle,
  matchStudy,
  buildCoursesIndex,
} = require('../../tools/course-discovery/lib/study-matcher');
const {
  generateFENsFromPGN,
  normalizeFEN,
} = require('../../tools/course-discovery/lib/pgn-matcher');

/**
 * Tiny ECO index fixture: B00 (1.e4), B20 (1.e4 c5), B90 Najdorf-depth,
 * D00 (1.d4 d5), B10 (1.e4 c6). Built by replaying real move sequences so
 * the FENs are genuine.
 */
function buildEcoFixture() {
  const lines = [
    { moves: '1. e4', eco: 'B00', name: "King's Pawn Game" },
    { moves: '1. e4 c5', eco: 'B20', name: 'Sicilian Defense' },
    {
      moves: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6',
      eco: 'B90',
      name: 'Sicilian: Najdorf',
    },
    { moves: '1. d4 d5', eco: 'D00', name: "Queen's Pawn Game" },
    { moves: '1. e4 c6', eco: 'B10', name: 'Caro-Kann Defense' },
  ];
  const index = new Map();
  for (const line of lines) {
    const fens = generateFENsFromPGN(line.moves);
    const last = fens[fens.length - 1];
    index.set(normalizeFEN(last), { fen: last, name: line.name, eco: line.eco });
  }
  return index;
}

function chapterPgn(studyId, chapterId, event, moves) {
  return `[Event "${event}"]\n[ChapterURL "https://lichess.org/study/${studyId}/${chapterId}"]\n\n${moves} *`;
}

const TEST_CONFIG = {
  min_match_score: 25,
  max_studies_per_page: 20,
  covers_position_ratio: 0.8,
  weights: {
    line_context_base: 10,
    specificity_scale: 60,
    family_same: 20,
    family_compatible: 5,
    likes_per_magnitude: 6,
    per_extra_chapter: 2,
  },
};

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

describe('collectChapterAnchors', () => {
  test('returns every ECO position along the path with 1-based depth', () => {
    const eco = buildEcoFixture();
    const fens = generateFENsFromPGN('1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6');
    const anchors = collectChapterAnchors(fens, eco);
    expect(anchors.map((a) => a.eco)).toEqual(['B00', 'B20', 'B90']);
    expect(anchors[0].depth).toBe(1); // after 1.e4
    expect(anchors[1].depth).toBe(2); // after 1...c5
    expect(anchors[2].depth).toBe(10); // after 5...a6
  });
});

describe('inferStudyFamilies', () => {
  test('title detectors win when the title names a family', () => {
    expect(inferStudyFamilies('The Complete Najdorf Sicilian', [])).toEqual(['sicilian']);
  });

  test('falls back to majority family of chapter deepest anchors', () => {
    const eco = buildEcoFixture();
    const sicilianAnchors = collectChapterAnchors(generateFENsFromPGN('1. e4 c5'), eco);
    const caroAnchors = collectChapterAnchors(generateFENsFromPGN('1. e4 c6'), eco);
    const families = inferStudyFamilies('My repertoire', [
      sicilianAnchors,
      sicilianAnchors,
      caroAnchors,
    ]);
    expect(families).toEqual(['sicilian']);
  });

  test('returns [] when no title family and no majority', () => {
    const eco = buildEcoFixture();
    const sicilianAnchors = collectChapterAnchors(generateFENsFromPGN('1. e4 c5'), eco);
    const caroAnchors = collectChapterAnchors(generateFENsFromPGN('1. e4 c6'), eco);
    expect(inferStudyFamilies('My repertoire', [sicilianAnchors, caroAnchors])).toEqual([]);
  });
});

describe('cleanChapterTitle', () => {
  test('strips a leading repeat of the study name', () => {
    expect(cleanChapterTitle('Caro-Kann Defense', 'Caro-Kann Defense: Introduction')).toBe(
      'Introduction'
    );
  });
  test('keeps chapter names that do not repeat the study name', () => {
    expect(cleanChapterTitle('Caro-Kann Defense', 'Panov Attack')).toBe('Panov Attack');
  });
  test('falls back to the full name when the strip would leave nothing', () => {
    expect(cleanChapterTitle('Caro-Kann Defense', 'Caro-Kann Defense')).toBe('Caro-Kann Defense');
  });
});

describe('matchStudy', () => {
  test('multi-anchors a Najdorf chapter onto Sicilian ancestor pages with reasons', () => {
    const eco = buildEcoFixture();
    const study = {
      studyId: 'najd01',
      name: 'The Complete Najdorf',
      author: 'gm_test',
      likes: 500,
      pgn: chapterPgn(
        'najd01',
        'ch1',
        'The Complete Najdorf: Main Line',
        '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6'
      ),
    };
    const entries = matchStudy(study, eco, TEST_CONFIG);
    const byDepth = new Map([...entries.values()].map((e) => [e.match.depth, e]));

    // Deepest anchor (B90, depth 10) is covers-position
    const najdorf = byDepth.get(10);
    expect(najdorf).toBeDefined();
    expect(najdorf.match.reason).toBe('covers-position');
    expect(najdorf.study_title).toBe('The Complete Najdorf');
    expect(najdorf.chapter_title).toBe('Main Line');
    expect(najdorf.chapter_url).toBe('https://lichess.org/study/najd01/ch1');
    expect(najdorf.study_url).toBe('https://lichess.org/study/najd01');

    // Ancestor anchor (B20, depth 2) is line-context and scores lower
    const sicilian = byDepth.get(2);
    expect(sicilian).toBeDefined();
    expect(sicilian.match.reason).toBe('line-context');
    expect(sicilian.match.score).toBeLessThan(najdorf.match.score);
  });

  test('family guard drops anchors whose page family conflicts with the study family', () => {
    const eco = buildEcoFixture();
    // A "London System" study whose model game transposes through 1.e4 c6
    // (Caro-Kann page). london prefix is ['d4'], caro_kann is ['e4','c6']
    // -> conflict -> dropped.
    const study = {
      studyId: 'lond01',
      name: 'Ideas in the London System',
      author: 'test',
      likes: 1000,
      pgn: chapterPgn('lond01', 'ch1', 'Ideas in the London System: Traps', '1. e4 c6'),
    };
    const entries = matchStudy(study, eco, TEST_CONFIG);
    expect(entries.size).toBe(0);
  });

  test('aggregates chapters: one entry per page, chapters_matched counted, deepest chapter is the link', () => {
    const eco = buildEcoFixture();
    const pgn = [
      chapterPgn('sic01', 'chA', 'Sicilian Repertoire: Intro', '1. e4 c5'),
      chapterPgn(
        'sic01',
        'chB',
        'Sicilian Repertoire: Najdorf',
        '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6'
      ),
    ].join('\n\n');
    const study = { studyId: 'sic01', name: 'Sicilian Repertoire', author: 't', likes: 10, pgn };
    const entries = matchStudy(study, eco, TEST_CONFIG);
    const b20 = [...entries.values()].find((e) => e.match.depth === 2);
    expect(b20.chapters_matched).toBe(2);
    // chA anchors B20 at ratio 2/2 = 1; chB anchors B20 at ratio 2/10 -> chA wins the link
    expect(b20.chapter_url).toBe('https://lichess.org/study/sic01/chA');
    expect(b20.match.reason).toBe('covers-position');
  });

  test('drops entries below min_match_score', () => {
    const eco = buildEcoFixture();
    // Zero-likes study anchoring 1.e4 at ratio 1/10 -> score below 25
    const study = {
      studyId: 'low01',
      name: 'Untitled analysis',
      author: 't',
      likes: 0,
      pgn: chapterPgn(
        'low01',
        'ch1',
        'Untitled analysis: g1',
        '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6'
      ),
    };
    const entries = matchStudy(study, eco, TEST_CONFIG);
    const shallow = [...entries.values()].find((e) => e.match.depth === 1);
    expect(shallow).toBeUndefined();
  });
});

describe('buildCoursesIndex', () => {
  const capConfig = { ...TEST_CONFIG, max_studies_per_page: 1 };

  test('sorts by score then likes and caps per page', () => {
    const eco = buildEcoFixture();
    const mk = (id, likes, moves) => ({
      studyId: id,
      name: 'Sicilian study ' + id,
      author: 't',
      likes,
      pgn: chapterPgn(id, 'c1', `Sicilian study ${id}: line`, moves),
    });
    const index = buildCoursesIndex(
      [mk('a', 10, '1. e4 c5'), mk('b', 99999, '1. e4 c5')],
      eco,
      capConfig
    );
    for (const arr of Object.values(index)) {
      expect(arr.length).toBeLessThanOrEqual(1);
    }
    const b20 = Object.values(index).find((arr) => arr[0] && arr[0].match.depth === 2);
    expect(b20[0].likes).toBe(99999); // same ratio/family -> likes decide
  });
});
