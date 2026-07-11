# Study Matching V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Lichess study → opening-page matching with multi-anchor scored
matching, family guards, a local PGN cache for offline rematch, schema v2 with
study-level cards, and an audit proving old-vs-new quality.

**Architecture:** A fetch step caches raw study PGN+metadata under
`tools/data/study-cache/`; a pure offline matcher (`study-matcher.js`) anchors
each chapter to every ECO position on its move path, guards by move-prefix
family compatibility (reusing `tools/video-pipeline/lib/opening-families.js`),
scores with weights from `config/study_matching.json`, and aggregates to one
entry per (study, page). `courses.json` is fully regenerated from cache (all
6,142 current entries are curated Lichess entries — no manual entries to
preserve). An audit script reads both schemas to produce the before/after
comparison.

**Tech Stack:** Node.js >= 18 CommonJS (tools + backend), chess.js, Jest
(`tests/unit/`), React+TypeScript+Vitest (frontend), Prettier.

**Spec:** `docs/superpowers/specs/2026-07-10-study-matching-v2-design.md`
(baseline numbers + schema).

## Global Constraints

- Node >= 18; tools and backend are CommonJS (`require`), frontend is TypeScript
  ESM.
- Backend tests in `tests/unit/*.test.js` (Jest, run from repo root:
  `npx jest tests/unit/<file>`). Frontend tests in
  `packages/web/src/**/__tests__/*.test.tsx` (Vitest: `npm run test:frontend`).
- Conventional commits (`feat`/`fix`/`chore`/`docs`). Prettier runs via
  lint-staged on commit.
- CSS Modules for component styles; update `design-system/` in lockstep only if
  new tokens/visual patterns are introduced (this plan reuses the existing
  badge/chip patterns — no new tokens expected).
- `api/data/` is the single canonical data location; `packages/api/src/data/` is
  a dead path.
- No `console.log` in production code (`packages/`); CLI tools/scripts use their
  Logger/console by design.
- Copy style: sentence case, reuse existing copy (videos use "Covers this
  variation").
- Baseline metrics to beat (measured 2026-07-10): coverage 18.2% all / 62.5%
  top-200 / 45.2% top-1000; contamination 5.8%; same-study dupes 1,329; title
  dupes 3,245. Targets: contamination <1%, dupes 0, title dupes 0, top-200 >
  62.5%, no ranking ties.

---

### Task 1: Scoring config + `scoreMatch`

**Files:**

- Create: `config/study_matching.json`
- Create: `tools/course-discovery/lib/study-matcher.js`
- Test: `tests/unit/study-matcher.test.js`

**Interfaces:**

- Produces: `loadMatchConfig(configPath?) -> config`,
  `scoreMatch({ratio, familyRelation, likes, chaptersMatched}, weights) -> integer`
- `config` shape:
  `{min_match_score, max_studies_per_page, covers_position_ratio, weights: {line_context_base, specificity_scale, family_same, family_compatible, likes_per_magnitude, per_extra_chapter}}`

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/study-matcher.test.js
const {
  loadMatchConfig,
  scoreMatch,
} = require('../../tools/course-discovery/lib/study-matcher');

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
      {
        ratio: 0.2,
        familyRelation: 'compatible',
        likes: 100,
        chaptersMatched: 1,
      },
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
      {
        ratio: 0.15,
        familyRelation: 'compatible',
        likes: 41000,
        chaptersMatched: 5,
      },
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/unit/study-matcher.test.js` Expected: FAIL —
`Cannot find module '../../tools/course-discovery/lib/study-matcher'`

- [ ] **Step 3: Write config + minimal implementation**

```json
// config/study_matching.json
{
  "min_match_score": 25,
  "max_studies_per_page": 20,
  "covers_position_ratio": 0.8,
  "weights": {
    "line_context_base": 10,
    "specificity_scale": 60,
    "family_same": 20,
    "family_compatible": 5,
    "likes_per_magnitude": 6,
    "per_extra_chapter": 2
  }
}
```

```js
// tools/course-discovery/lib/study-matcher.js
/**
 * Study → opening matching with multi-anchor scoring.
 *
 * Replaces the deepest-FEN-only anchoring: each chapter anchors to every ECO
 * position along its move path, guarded by move-prefix family compatibility
 * (shared with the video pipeline), scored by specificity + family agreement
 * + log-likes + chapter count. Weights live in config/study_matching.json.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_CONFIG_PATH = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'config',
  'study_matching.json'
);

/**
 * Load scoring config.
 * @param {string} [configPath]
 * @returns {object}
 */
function loadMatchConfig(configPath) {
  return JSON.parse(fs.readFileSync(configPath || DEFAULT_CONFIG_PATH, 'utf8'));
}

/**
 * Score one (study, page) match.
 * @param {{ratio: number, familyRelation: 'same'|'compatible'|'unknown', likes: number, chaptersMatched: number}} m
 * @param {object} weights - config.weights
 * @returns {number} integer score
 */
function scoreMatch(
  { ratio, familyRelation, likes, chaptersMatched },
  weights
) {
  const positionScore =
    weights.line_context_base + weights.specificity_scale * ratio;
  const familyBonus =
    familyRelation === 'same'
      ? weights.family_same
      : familyRelation === 'compatible'
        ? weights.family_compatible
        : 0;
  const likesBonus =
    Math.min(Math.log10((likes || 0) + 1), 5) * weights.likes_per_magnitude;
  const chaptersBonus =
    Math.min(chaptersMatched || 0, 5) * weights.per_extra_chapter;
  return Math.round(positionScore + familyBonus + likesBonus + chaptersBonus);
}

module.exports = { loadMatchConfig, scoreMatch, DEFAULT_CONFIG_PATH };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/unit/study-matcher.test.js` Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add config/study_matching.json tools/course-discovery/lib/study-matcher.js tests/unit/study-matcher.test.js
git commit -m "feat(studies): config-driven match scoring core"
```

---

### Task 2: Anchors, family inference, guard, aggregation

**Files:**

- Modify: `tools/course-discovery/lib/study-matcher.js`
- Test: `tests/unit/study-matcher.test.js` (append)

**Interfaces:**

- Consumes: `scoreMatch`, `loadMatchConfig` (Task 1); `splitPGNIntoChapters`,
  `generateFENsFromPGN`, `normalizeFEN` from `./pgn-matcher`;
  `getFamilyFromEco`, `getFamiliesFromTitle`, `compareFamilies` from
  `../../video-pipeline/lib/opening-families`
- Produces:
  - `collectChapterAnchors(fens, ecoIndex) -> Array<{fen, name, eco, depth}>`
    (depth 1-based ply)
  - `inferStudyFamilies(studyTitle, chapterAnchorSets) -> string[]`
  - `cleanChapterTitle(studyName, chapterName) -> string`
  - `matchStudy(study, ecoIndex, config) -> Map<pageFen, entry>` where
    `study = {studyId, name, author, likes, pgn, fetched_at?}` and `entry` is a
    schema-v2 object (see spec §3.3)
  - `buildCoursesIndex(studies, ecoIndex, config) -> {[fen]: entry[]}` sorted
    best-first, capped at `config.max_studies_per_page`
- `ecoIndex` is the `Map` from `pgn-matcher.loadECOIndex()` (normalized FEN →
  `{fen, name, eco}`).

- [ ] **Step 1: Write the failing tests**

Append to `tests/unit/study-matcher.test.js`:

```js
const {
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

/** Tiny ECO index fixture: B00 (1.e4), B20 (1.e4 c5), B90-ish Najdorf-depth position,
 *  D00 (1.d4 d5), B10 (1.e4 c6). Built by replaying real move sequences so the
 *  FENs are genuine. */
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
    index.set(normalizeFEN(last), {
      fen: last,
      name: line.name,
      eco: line.eco,
    });
  }
  return index;
}

function chapterPgn(studyId, chapterId, event, moves) {
  return `[Event "${event}"]\n[ChapterURL "https://lichess.org/study/${studyId}/${chapterId}"]\n\n${moves} *`;
}

describe('collectChapterAnchors', () => {
  test('returns every ECO position along the path with 1-based depth', () => {
    const eco = buildEcoFixture();
    const fens = generateFENsFromPGN(
      '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6'
    );
    const anchors = collectChapterAnchors(fens, eco);
    expect(anchors.map((a) => a.eco)).toEqual(['B00', 'B20', 'B90']);
    expect(anchors[0].depth).toBe(1); // after 1.e4
    expect(anchors[1].depth).toBe(2); // after 1...c5
    expect(anchors[2].depth).toBe(10); // after 5...a6
  });
});

describe('inferStudyFamilies', () => {
  test('title detectors win when the title names a family', () => {
    expect(inferStudyFamilies('The Complete Najdorf Sicilian', [])).toEqual([
      'sicilian',
    ]);
  });

  test('falls back to majority family of chapter deepest anchors', () => {
    const eco = buildEcoFixture();
    const sicilianAnchors = collectChapterAnchors(
      generateFENsFromPGN('1. e4 c5'),
      eco
    );
    const caroAnchors = collectChapterAnchors(
      generateFENsFromPGN('1. e4 c6'),
      eco
    );
    const families = inferStudyFamilies('My repertoire', [
      sicilianAnchors,
      sicilianAnchors,
      caroAnchors,
    ]);
    expect(families).toEqual(['sicilian']);
  });

  test('returns [] when no title family and no majority', () => {
    const eco = buildEcoFixture();
    const sicilianAnchors = collectChapterAnchors(
      generateFENsFromPGN('1. e4 c5'),
      eco
    );
    const caroAnchors = collectChapterAnchors(
      generateFENsFromPGN('1. e4 c6'),
      eco
    );
    expect(
      inferStudyFamilies('My repertoire', [sicilianAnchors, caroAnchors])
    ).toEqual([]);
  });
});

describe('cleanChapterTitle', () => {
  test('strips a leading repeat of the study name', () => {
    expect(
      cleanChapterTitle('Caro-Kann Defense', 'Caro-Kann Defense: Introduction')
    ).toBe('Introduction');
  });
  test('keeps chapter names that do not repeat the study name', () => {
    expect(cleanChapterTitle('Caro-Kann Defense', 'Panov Attack')).toBe(
      'Panov Attack'
    );
  });
  test('falls back to the full name when the strip would leave nothing', () => {
    expect(cleanChapterTitle('Caro-Kann Defense', 'Caro-Kann Defense')).toBe(
      'Caro-Kann Defense'
    );
  });
});

describe('matchStudy', () => {
  const config = {
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
    const entries = matchStudy(study, eco, config);
    const byEco = new Map([...entries.values()].map((e) => [e.match.depth, e]));

    // Deepest anchor (B90, depth 10) is covers-position
    const najdorf = byEco.get(10);
    expect(najdorf).toBeDefined();
    expect(najdorf.match.reason).toBe('covers-position');
    expect(najdorf.study_title).toBe('The Complete Najdorf');
    expect(najdorf.chapter_title).toBe('Main Line');
    expect(najdorf.chapter_url).toBe('https://lichess.org/study/najd01/ch1');
    expect(najdorf.study_url).toBe('https://lichess.org/study/najd01');

    // Ancestor anchor (B20, depth 2) is line-context and scores lower
    const sicilian = byEco.get(2);
    expect(sicilian).toBeDefined();
    expect(sicilian.match.reason).toBe('line-context');
    expect(sicilian.match.score).toBeLessThan(najdorf.match.score);
  });

  test('family guard drops anchors whose page family conflicts with the study family', () => {
    const eco = buildEcoFixture();
    // A "London System" study whose model game transposes through 1.e4 c6 (Caro-Kann page).
    // london prefix is ['d4'], caro_kann is ['e4','c6'] → conflict → dropped.
    const study = {
      studyId: 'lond01',
      name: 'Ideas in the London System',
      author: 'test',
      likes: 1000,
      pgn: chapterPgn(
        'lond01',
        'ch1',
        'Ideas in the London System: Traps',
        '1. e4 c6'
      ),
    };
    const entries = matchStudy(study, eco, config);
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
    const study = {
      studyId: 'sic01',
      name: 'Sicilian Repertoire',
      author: 't',
      likes: 10,
      pgn,
    };
    const entries = matchStudy(study, eco, config);
    const b20 = [...entries.values()].find((e) => e.match.depth === 2);
    expect(b20.chapters_matched).toBe(2);
    // chA anchors B20 at ratio 2/2 = 1; chB anchors B20 at ratio 2/10 → chA wins the link
    expect(b20.chapter_url).toBe('https://lichess.org/study/sic01/chA');
    expect(b20.match.reason).toBe('covers-position');
  });

  test('drops entries below min_match_score', () => {
    const eco = buildEcoFixture();
    // Zero-likes study anchoring 1.e4 at ratio 1/10 → score 10+6+5+0+2 = 23 < 25
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
    const entries = matchStudy(study, eco, config);
    const shallow = [...entries.values()].find((e) => e.match.depth === 1);
    expect(shallow).toBeUndefined();
  });
});

describe('buildCoursesIndex', () => {
  const config = {
    min_match_score: 25,
    max_studies_per_page: 1,
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
      config
    );
    const sicilianFens = Object.keys(index).filter(
      (fen) => index[fen].length > 0
    );
    for (const fen of sicilianFens) {
      expect(index[fen].length).toBeLessThanOrEqual(1);
    }
    const b20 = Object.values(index).find(
      (arr) => arr[0] && arr[0].match.depth === 2
    );
    expect(b20[0].likes).toBe(99999); // same ratio/family → likes decide
  });
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx jest tests/unit/study-matcher.test.js` Expected: FAIL —
`collectChapterAnchors is not a function` (Task 1 tests still pass)

- [ ] **Step 3: Implement**

Append to `tools/course-discovery/lib/study-matcher.js` (and extend
`module.exports`):

```js
const {
  getFamilyFromEco,
  getFamiliesFromTitle,
  compareFamilies,
} = require('../../video-pipeline/lib/opening-families');
const {
  splitPGNIntoChapters,
  generateFENsFromPGN,
  normalizeFEN,
} = require('./pgn-matcher');

/**
 * Every ECO position a chapter's move path passes through.
 * @param {string[]} fens - from generateFENsFromPGN (one per ply)
 * @param {Map<string, {fen, name, eco}>} ecoIndex - from loadECOIndex()
 * @returns {Array<{fen: string, name: string, eco: string, depth: number}>}
 */
function collectChapterAnchors(fens, ecoIndex) {
  const anchors = [];
  const seen = new Set();
  for (let i = 0; i < fens.length; i++) {
    const opening = ecoIndex.get(normalizeFEN(fens[i]));
    if (opening && !seen.has(opening.fen)) {
      seen.add(opening.fen);
      anchors.push({
        fen: opening.fen,
        name: opening.name,
        eco: opening.eco,
        depth: i + 1,
      });
    }
  }
  return anchors;
}

/**
 * Families a study is about: title detectors first; otherwise the majority
 * (>50%) family across the chapters' deepest anchors. [] = unknown.
 * @param {string} studyTitle
 * @param {Array<Array<{eco: string}>>} chapterAnchorSets
 * @returns {string[]}
 */
function inferStudyFamilies(studyTitle, chapterAnchorSets) {
  const fromTitle = getFamiliesFromTitle(studyTitle || '');
  if (fromTitle.length > 0) return fromTitle;

  const counts = new Map();
  let mappable = 0;
  for (const anchors of chapterAnchorSets) {
    if (!anchors || anchors.length === 0) continue;
    const family = getFamilyFromEco(anchors[anchors.length - 1].eco);
    if (!family) continue;
    mappable++;
    counts.set(family, (counts.get(family) || 0) + 1);
  }
  for (const [family, count] of counts) {
    if (count > mappable / 2) return [family];
  }
  return [];
}

/**
 * Lichess chapter [Event] headers repeat the study name
 * ("Study: Chapter") — strip the repeat so cards read cleanly.
 */
function cleanChapterTitle(studyName, chapterName) {
  const name = (chapterName || '').trim();
  const study = (studyName || '').trim();
  if (study && name.toLowerCase().startsWith(study.toLowerCase())) {
    const rest = name
      .slice(study.length)
      .replace(/^\s*[:\-–—]\s*/, '')
      .trim();
    return rest || name;
  }
  return name;
}

/**
 * True when the page's family diverges from every family the study covers.
 */
function anchorConflictsWithStudy(studyFamilies, pageEco) {
  if (!studyFamilies || studyFamilies.length === 0) return false;
  const pageFamily = getFamilyFromEco(pageEco);
  if (!pageFamily) return false;
  return studyFamilies.every(
    (f) => compareFamilies(f, pageFamily) === 'conflict'
  );
}

/**
 * Match one study to opening pages.
 * @param {{studyId, name, author, likes, pgn, fetched_at?}} study
 * @param {Map} ecoIndex
 * @param {object} config
 * @returns {Map<string, object>} page fen -> schema-v2 entry
 */
function matchStudy(study, ecoIndex, config) {
  const chapters = splitPGNIntoChapters(study.pgn || '');
  const chapterData = chapters.map((chapter) => ({
    chapter,
    anchors: collectChapterAnchors(generateFENsFromPGN(chapter.pgn), ecoIndex),
  }));
  const studyFamilies = inferStudyFamilies(
    study.name,
    chapterData.map((c) => c.anchors)
  );

  // page fen -> best chapter for that page + how many chapters touch it
  const pages = new Map();
  for (const { chapter, anchors } of chapterData) {
    if (anchors.length === 0) continue;
    const deepest = anchors[anchors.length - 1].depth;
    for (const anchor of anchors) {
      if (anchorConflictsWithStudy(studyFamilies, anchor.eco)) continue;
      const ratio = anchor.depth / deepest;
      const existing = pages.get(anchor.fen);
      if (!existing) {
        pages.set(anchor.fen, { chapter, anchor, ratio, count: 1 });
      } else {
        existing.count++;
        if (ratio > existing.ratio) {
          existing.chapter = chapter;
          existing.anchor = anchor;
          existing.ratio = ratio;
        }
      }
    }
  }

  const entries = new Map();
  for (const [fen, { chapter, anchor, ratio, count }] of pages) {
    const pageFamily = getFamilyFromEco(anchor.eco);
    const familyRelation =
      studyFamilies.length === 0 || !pageFamily
        ? 'unknown'
        : studyFamilies.includes(pageFamily)
          ? 'same'
          : 'compatible';
    const score = scoreMatch(
      { ratio, familyRelation, likes: study.likes, chaptersMatched: count },
      config.weights
    );
    if (score < config.min_match_score) continue;

    entries.set(fen, {
      study_title: study.name,
      chapter_title: cleanChapterTitle(study.name, chapter.chapterName),
      study_url: `https://lichess.org/study/${study.studyId}`,
      chapter_url: chapter.chapterId
        ? `https://lichess.org/study/${study.studyId}/${chapter.chapterId}`
        : `https://lichess.org/study/${study.studyId}`,
      author: study.author || '',
      platform: 'Lichess',
      likes: study.likes || 0,
      chapters_matched: count,
      curated: true,
      match: {
        score,
        depth: anchor.depth,
        reason:
          ratio >= config.covers_position_ratio
            ? 'covers-position'
            : 'line-context',
      },
      discovered_at: study.fetched_at || new Date().toISOString(),
    });
  }
  return entries;
}

/**
 * Build the FEN-keyed courses object from all studies: sorted best-first
 * (score, then likes, then study_url for determinism), capped per page.
 */
function buildCoursesIndex(studies, ecoIndex, config) {
  const byFen = {};
  for (const study of studies) {
    for (const [fen, entry] of matchStudy(study, ecoIndex, config)) {
      (byFen[fen] = byFen[fen] || []).push(entry);
    }
  }
  for (const fen of Object.keys(byFen)) {
    byFen[fen].sort(
      (a, b) =>
        b.match.score - a.match.score ||
        b.likes - a.likes ||
        a.study_url.localeCompare(b.study_url)
    );
    byFen[fen] = byFen[fen].slice(0, config.max_studies_per_page);
  }
  return byFen;
}
```

Add to exports:
`collectChapterAnchors, inferStudyFamilies, cleanChapterTitle, matchStudy, buildCoursesIndex`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest tests/unit/study-matcher.test.js` Expected: PASS (all)

- [ ] **Step 5: Commit**

```bash
git add tools/course-discovery/lib/study-matcher.js tests/unit/study-matcher.test.js
git commit -m "feat(studies): multi-anchor matcher with family guard and study-level aggregation"
```

---

### Task 3: Study cache

**Files:**

- Create: `tools/course-discovery/lib/study-cache.js`
- Test: `tests/unit/study-cache.test.js`
- Modify: `.gitignore` (add `tools/data/study-cache/`)

**Interfaces:**

- Produces: `saveStudy(cacheDir, study)`,
  `loadStudy(cacheDir, studyId) -> study|null`,
  `loadAllStudies(cacheDir) -> study[]`,
  `hasStudy(cacheDir, studyId) -> boolean`, `DEFAULT_CACHE_DIR`
- `study` shape: `{studyId, name, author, likes, pgn, fetched_at, source}` — the
  exact input `matchStudy` (Task 2) consumes.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/study-cache.test.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  saveStudy,
  loadStudy,
  loadAllStudies,
  hasStudy,
} = require('../../tools/course-discovery/lib/study-cache');

describe('study-cache', () => {
  let dir;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'study-cache-'));
  });
  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const study = {
    studyId: 'abc123',
    name: 'Test Study',
    author: 'tester',
    likes: 42,
    pgn: '[Event "Test"]\n\n1. e4 *',
    fetched_at: '2026-07-10T00:00:00.000Z',
    source: 'curated',
  };

  test('round-trips a study', () => {
    saveStudy(dir, study);
    expect(hasStudy(dir, 'abc123')).toBe(true);
    expect(loadStudy(dir, 'abc123')).toEqual(study);
  });

  test('loadStudy returns null for missing ids', () => {
    expect(loadStudy(dir, 'nope')).toBeNull();
    expect(hasStudy(dir, 'nope')).toBe(false);
  });

  test('loadAllStudies returns every cached study', () => {
    saveStudy(dir, study);
    saveStudy(dir, { ...study, studyId: 'def456' });
    const all = loadAllStudies(dir);
    expect(all.map((s) => s.studyId).sort()).toEqual(['abc123', 'def456']);
  });

  test('loadAllStudies returns [] when the directory does not exist', () => {
    expect(loadAllStudies(path.join(dir, 'missing'))).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/unit/study-cache.test.js` Expected: FAIL — module not found

- [ ] **Step 3: Implement**

```js
// tools/course-discovery/lib/study-cache.js
/**
 * Local cache of raw study metadata + PGN, one JSON per study, so matching
 * can rerun offline with zero Lichess API calls (the videos.sqlite lesson).
 * Directory is gitignored — it is a rematch convenience, not shipped data.
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_CACHE_DIR = path.join(
  __dirname,
  '..',
  '..',
  'data',
  'study-cache'
);

function cachePath(cacheDir, studyId) {
  return path.join(cacheDir, `${studyId}.json`);
}

function saveStudy(cacheDir, study) {
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(
    cachePath(cacheDir, study.studyId),
    JSON.stringify(study, null, 2),
    'utf8'
  );
}

function loadStudy(cacheDir, studyId) {
  const file = cachePath(cacheDir, studyId);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function hasStudy(cacheDir, studyId) {
  return fs.existsSync(cachePath(cacheDir, studyId));
}

function loadAllStudies(cacheDir) {
  if (!fs.existsSync(cacheDir)) return [];
  return fs
    .readdirSync(cacheDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(cacheDir, f), 'utf8')));
}

module.exports = {
  saveStudy,
  loadStudy,
  hasStudy,
  loadAllStudies,
  DEFAULT_CACHE_DIR,
};
```

`.gitignore`: add a line `tools/data/study-cache/`.

Note: `DEFAULT_CACHE_DIR` resolves to `tools/data/study-cache` (the lib lives at
`tools/course-discovery/lib`, so `..`, `..` lands on `tools/`, then
`data/study-cache`).

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest tests/unit/study-cache.test.js` Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add tools/course-discovery/lib/study-cache.js tests/unit/study-cache.test.js .gitignore
git commit -m "feat(studies): local study cache for offline rematch"
```

---

### Task 4: Rewire `add-studies.js` — fetch→cache→build, `--fromCache`, path fix

**Files:**

- Modify: `tools/course-discovery/add-studies.js`
- Modify: `tools/course-discovery/lib/course-merger.js` (fix
  `DEFAULT_COURSES_PATH` only)
- Modify: `package.json` (add `course:rematch` script)
- Test: `tests/unit/add-studies.test.js` (update),
  `tests/unit/course-merger.test.js` (update path expectation if asserted)

**Interfaces:**

- Consumes: `buildCoursesIndex`, `loadMatchConfig` (Task 2/1); `saveStudy`,
  `loadAllStudies`, `hasStudy`, `DEFAULT_CACHE_DIR` (Task 3);
  `fetchStudyMetadata(studyId)`, `fetchStudyPGN(studyId)` (existing
  `lichess-fetcher.js`); `writeCourses(path, data)` (existing
  `course-merger.js`)
- Produces: CLI behaviour —
  - default run: parse input file(s) → for each study, fetch metadata+PGN
    (skipping ones already in cache unless `--refetch`) → `saveStudy` →
    `loadAllStudies` → `buildCoursesIndex` → `writeCourses` to
    `api/data/courses.json`
  - `--fromCache`: skip all fetching; build from cache only
  - `--includeDiscovered`: also parse `config/discovered-studies.txt`
  - **Full rebuild semantics**: `courses.json` is regenerated from cache every
    run; the old `mergeDiscoveries`/`--replaceCurated`/`auto_discovered` merge
    logic is deleted (verified 2026-07-10: all 6,142 live entries are
    `curated: true` Lichess entries — nothing manual to preserve).

- [ ] **Step 1: Update constants and read the existing tests**

In `tools/course-discovery/add-studies.js` replace the `DEFAULT_COURSES_PATH`
constant:

```js
const DEFAULT_COURSES_PATH = path.join(
  process.cwd(),
  'api',
  'data',
  'courses.json'
);
```

Apply the same replacement in `tools/course-discovery/lib/course-merger.js`:

```js
const DEFAULT_COURSES_PATH = path.join(
  process.cwd(),
  'api',
  'data',
  'courses.json'
);
```

Read `tests/unit/add-studies.test.js` and `tests/unit/course-merger.test.js`
before editing: keep the passing tests for `parseInputText`, `extractStudyId`,
`StateManager`; delete tests for `mergeDiscoveries` (function is being removed);
update any assertion on `DEFAULT_COURSES_PATH` to the new path.

- [ ] **Step 2: Write failing tests for the new pipeline seams**

Append to `tests/unit/add-studies.test.js` (exact module API below is what Step
3 must export):

```js
const {
  buildIndexFromCache,
} = require('../../tools/course-discovery/add-studies');
const { saveStudy } = require('../../tools/course-discovery/lib/study-cache');
const fs = require('fs');
const os = require('os');
const path = require('path');

describe('buildIndexFromCache', () => {
  test('builds a v2 index from cached studies using the real ECO index', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'add-studies-'));
    saveStudy(dir, {
      studyId: 'sic99',
      name: 'Sicilian Defense Basics',
      author: 'tester',
      likes: 100,
      pgn: '[Event "Sicilian Defense Basics: Intro"]\n[ChapterURL "https://lichess.org/study/sic99/c1"]\n\n1. e4 c5 *',
      fetched_at: '2026-07-10T00:00:00.000Z',
      source: 'curated',
    });
    const index = buildIndexFromCache(dir);
    const allEntries = Object.values(index).flat();
    expect(allEntries.length).toBeGreaterThan(0);
    expect(allEntries[0].study_title).toBe('Sicilian Defense Basics');
    expect(allEntries[0].match.score).toBeGreaterThanOrEqual(25);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
```

- [ ] **Step 3: Run to verify the new test fails, then implement**

Run: `npx jest tests/unit/add-studies.test.js` Expected: new test FAILS
(`buildIndexFromCache` undefined)

Rework `add-studies.js`:

1. Add requires:

```js
const { loadMatchConfig, buildCoursesIndex } = require('./lib/study-matcher');
const { loadECOIndex } = require('./lib/pgn-matcher');
const {
  saveStudy,
  loadAllStudies,
  hasStudy,
  DEFAULT_CACHE_DIR,
} = require('./lib/study-cache');
```

2. Add the pure seam the test exercises:

```js
/**
 * Build the v2 courses index from every study in the cache.
 * @param {string} [cacheDir]
 * @param {object} [config]
 * @returns {object} FEN-keyed schema-v2 index
 */
function buildIndexFromCache(
  cacheDir = DEFAULT_CACHE_DIR,
  config = loadMatchConfig()
) {
  const ecoIndex = loadECOIndex();
  const studies = loadAllStudies(cacheDir);
  return buildCoursesIndex(studies, ecoIndex, config);
}
```

Export it from the module.

3. Rework `run()`:
   - New yargs options: `fromCache` (boolean, default false),
     `includeDiscovered` (boolean, default false), `refetch` (boolean, default
     false, "re-fetch studies already in the cache"), `cacheDir` (string,
     default `DEFAULT_CACHE_DIR`). Remove `replaceCurated`.
   - Input parsing: when `--includeDiscovered`, also
     `parseInputFile(path.join(__dirname, 'config', 'discovered-studies.txt'))`
     and concatenate, deduplicating by `studyId` (first occurrence wins).
   - Fetch loop (skipped entirely under `--fromCache`): for each study,
     `if (!argv.refetch && hasStudy(argv.cacheDir, studyId)) { stats.studiesSkipped++; continue; }`
     then fetch metadata + PGN exactly as today, and instead of matching inline:

```js
saveStudy(argv.cacheDir, {
  studyId,
  name: metadata.name || displayTitle || 'Untitled',
  author: metadata.owner || '',
  likes: metadata.likes || 0,
  pgn,
  fetched_at: new Date().toISOString(),
  source: 'curated',
});
```

- After the loop (both modes):
  `const index = buildIndexFromCache(argv.cacheDir);` then dry-run print or
  `writeCourses(argv.output, index)`.
- Delete the per-chapter matching block, the `discovered` accumulator, and the
  Step-4 merge block (full rebuild). Keep `StateManager` for `--resume`
  fetch-skipping.
- Summary prints: studies fetched / skipped (cache hit) / failed, cached total,
  pages populated, entries written.

4. `package.json` — in root `scripts`, after `"course:import"` add:

```json
"course:rematch": "node tools/course-discovery/add-studies.js --fromCache",
```

- [ ] **Step 4: Run the course tool suites**

Run:
`npx jest tests/unit/add-studies.test.js tests/unit/course-merger.test.js tests/unit/study-matcher.test.js tests/unit/study-cache.test.js`
Expected: PASS (after updating/removing merge-era tests per Step 1)

- [ ] **Step 5: Commit**

```bash
git add tools/course-discovery/add-studies.js tools/course-discovery/lib/course-merger.js package.json tests/unit/add-studies.test.js tests/unit/course-merger.test.js
git commit -m "feat(studies): cache-backed import with offline course:rematch, output to api/data"
```

---

### Task 5: Audit harness (dual-schema)

**Files:**

- Create: `scripts/audit-study-matches.js`
- Test: `tests/unit/audit-study-matches.test.js`

**Interfaces:**

- Consumes: `getFamilyFromEco`, `getFamiliesFromTitle`, `compareFamilies` from
  `tools/video-pipeline/lib/opening-families`; `api/data/eco/eco[A-E].json`;
  `api/data/popularity_stats.json` (`.positions` map, ranked by
  `frequency_count`)
- Produces: `audit(coursesPath) -> metrics` and a CLI
  (`node scripts/audit-study-matches.js [path] [--json]`). Metrics object:

```js
{
  schema: ('v1' | 'v2',
    totalEntries,
    totalStudies,
    fensCovered,
    coverageAllPct,
    coverageTop200Pct,
    coverageTop1000Pct,
    contaminationPct,
    contaminationCount,
    duplicateStudyEntries, // same study >1 time on one page
    titleDuplicationCount, // "Study – Study: Chapter" pattern (v1) / study name repeated in chapter_title (v2)
    rankingTies, // pages where displayed top-5 contains equal (score, likes) pairs (v2; v1 uses likes only)
    maxEntriesPerPage);
}
```

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/audit-study-matches.test.js
const fs = require('fs');
const os = require('os');
const path = require('path');
const { audit, detectSchema } = require('../../scripts/audit-study-matches');

const SICILIAN_FEN =
  'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

function writeTemp(data) {
  const file = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'audit-')),
    'courses.json'
  );
  fs.writeFileSync(file, JSON.stringify(data));
  return file;
}

describe('detectSchema', () => {
  test('v1 entries have course_title, v2 entries have study_title', () => {
    expect(detectSchema([{ course_title: 'x' }])).toBe('v1');
    expect(detectSchema([{ study_title: 'x', match: { score: 1 } }])).toBe(
      'v2'
    );
  });
});

describe('audit', () => {
  test('counts contamination for a conflicting v1 entry', () => {
    const file = writeTemp({
      [SICILIAN_FEN]: [
        {
          course_title: 'London System Guide - London System Guide: Intro',
          author: 'a',
          platform: 'Lichess',
          source_url: 'https://lichess.org/study/x/y',
          curated: true,
          likes: 1,
        },
      ],
    });
    const m = audit(file);
    expect(m.schema).toBe('v1');
    expect(m.contaminationCount).toBe(1);
    expect(m.titleDuplicationCount).toBe(1);
  });

  test('clean v2 entry produces zero contamination and duplication', () => {
    const file = writeTemp({
      [SICILIAN_FEN]: [
        {
          study_title: 'Sicilian Repertoire',
          chapter_title: 'Intro',
          study_url: 'https://lichess.org/study/x',
          chapter_url: 'https://lichess.org/study/x/y',
          author: 'a',
          platform: 'Lichess',
          likes: 1,
          chapters_matched: 1,
          curated: true,
          match: { score: 80, depth: 2, reason: 'covers-position' },
        },
      ],
    });
    const m = audit(file);
    expect(m.schema).toBe('v2');
    expect(m.contaminationCount).toBe(0);
    expect(m.duplicateStudyEntries).toBe(0);
    expect(m.titleDuplicationCount).toBe(0);
    expect(m.rankingTies).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest tests/unit/audit-study-matches.test.js` Expected: FAIL — module
not found

- [ ] **Step 3: Implement `scripts/audit-study-matches.js`**

Model on `scripts/audit-video-matches.js` (same header comment style, `--json`
flag, exit 0). Core:

```js
#!/usr/bin/env node

/**
 * Audit study → opening match quality in api/data/courses.json.
 *
 * Reads both the legacy v1 schema (course_title/source_url per chapter) and
 * the v2 schema (study_title/match.score per study) so the same script
 * measures before and after a rematch:
 *
 *   1. Coverage — pages with >=1 study: all pages, top-200 and top-1000
 *      most-played (popularity_stats.json).
 *   2. Cross-family contamination — entries whose title names only families
 *      that move-prefix-conflict with the page's family.
 *   3. Duplication — same study appearing more than once on one page.
 *   4. Title duplication — study name repeated inside the display title.
 *   5. Ranking ties — pages whose displayed top-5 contains equal sort keys.
 *
 * Usage: node scripts/audit-study-matches.js [coursesPath] [--json]
 */

const fs = require('fs');
const path = require('path');
const {
  getFamilyFromEco,
  getFamiliesFromTitle,
  compareFamilies,
} = require('../tools/video-pipeline/lib/opening-families');

const DEFAULT_COURSES = path.join(
  __dirname,
  '..',
  'api',
  'data',
  'courses.json'
);
const ECO_DIR = path.join(__dirname, '..', 'api', 'data', 'eco');
const POPULARITY_PATH = path.join(
  __dirname,
  '..',
  'api',
  'data',
  'popularity_stats.json'
);
const DISPLAYED_TOP_N = 5; // StudiesGallery INITIAL_DISPLAY_COUNT

function loadEco() {
  const eco = {};
  for (const f of ['ecoA', 'ecoB', 'ecoC', 'ecoD', 'ecoE']) {
    const p = path.join(ECO_DIR, `${f}.json`);
    if (fs.existsSync(p))
      Object.assign(eco, JSON.parse(fs.readFileSync(p, 'utf8')));
  }
  return eco;
}

function detectSchema(entries) {
  const first = entries && entries[0];
  return first && first.study_title ? 'v2' : 'v1';
}

function entryStudyKey(entry) {
  if (entry.study_url) return entry.study_url;
  const m = (entry.source_url || '').match(/study\/([^/]+)/);
  return m ? m[1] : entry.course_title || '';
}

function entryDisplayTitle(entry) {
  return entry.study_title || entry.course_title || '';
}

function hasTitleDuplication(entry) {
  if (entry.study_title !== undefined) {
    const study = (entry.study_title || '').trim().toLowerCase();
    const chapter = (entry.chapter_title || '').trim().toLowerCase();
    return Boolean(study && chapter && chapter.startsWith(study));
  }
  const parts = (entry.course_title || '').split(' - ');
  return (
    parts.length >= 2 &&
    parts[1]
      .trim()
      .toLowerCase()
      .startsWith(parts[0].trim().toLowerCase().slice(0, 20))
  );
}

function audit(coursesPath = DEFAULT_COURSES) {
  const courses = JSON.parse(fs.readFileSync(coursesPath, 'utf8'));
  const eco = loadEco();
  const allEntries = Object.values(courses).flat();
  const schema = detectSchema(allEntries);

  let totalEntries = 0;
  let contaminationCount = 0;
  let duplicateStudyEntries = 0;
  let titleDuplicationCount = 0;
  let rankingTies = 0;
  let maxEntriesPerPage = 0;
  const studies = new Set();

  for (const [fen, entries] of Object.entries(courses)) {
    const opening = eco[fen];
    const pageFamily = opening ? getFamilyFromEco(opening.eco) : null;
    maxEntriesPerPage = Math.max(maxEntriesPerPage, entries.length);

    const perStudy = new Map();
    for (const entry of entries) {
      totalEntries++;
      studies.add(entryStudyKey(entry));
      perStudy.set(
        entryStudyKey(entry),
        (perStudy.get(entryStudyKey(entry)) || 0) + 1
      );
      if (hasTitleDuplication(entry)) titleDuplicationCount++;

      const families = getFamiliesFromTitle(entryDisplayTitle(entry));
      if (
        pageFamily &&
        families.length > 0 &&
        families.every((f) => compareFamilies(f, pageFamily) === 'conflict')
      ) {
        contaminationCount++;
      }
    }
    for (const n of perStudy.values())
      if (n > 1) duplicateStudyEntries += n - 1;

    const top = entries.slice(0, DISPLAYED_TOP_N);
    const keys = top.map((e) =>
      e.match ? `${e.match.score}|${e.likes || 0}` : `${e.likes || 0}`
    );
    if (new Set(keys).size < keys.length) rankingTies++;
  }

  const ecoFens = Object.keys(eco);
  const covered = ecoFens.filter(
    (fen) => (courses[fen] || []).length > 0
  ).length;

  let coverageTop200Pct = null;
  let coverageTop1000Pct = null;
  if (fs.existsSync(POPULARITY_PATH)) {
    const popularity =
      JSON.parse(fs.readFileSync(POPULARITY_PATH, 'utf8')).positions || {};
    const ranked = Object.entries(popularity).sort(
      (a, b) => (b[1].frequency_count || 0) - (a[1].frequency_count || 0)
    );
    const pct = (n) => {
      const top = ranked.slice(0, n);
      const hit = top.filter(([fen]) => (courses[fen] || []).length > 0).length;
      return Math.round((hit / n) * 1000) / 10;
    };
    coverageTop200Pct = pct(200);
    coverageTop1000Pct = pct(1000);
  }

  return {
    schema,
    totalEntries,
    totalStudies: studies.size,
    fensCovered: Object.keys(courses).length,
    coverageAllPct: Math.round((covered / ecoFens.length) * 1000) / 10,
    coverageTop200Pct,
    coverageTop1000Pct,
    contaminationCount,
    contaminationPct: totalEntries
      ? Math.round((contaminationCount / totalEntries) * 1000) / 10
      : 0,
    duplicateStudyEntries,
    titleDuplicationCount,
    rankingTies,
    maxEntriesPerPage,
  };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const jsonMode = args.includes('--json');
  const pathArg = args.find((a) => !a.startsWith('--'));
  const metrics = audit(pathArg || DEFAULT_COURSES);
  if (jsonMode) {
    console.log(JSON.stringify(metrics, null, 2));
  } else {
    console.log(`Schema: ${metrics.schema}`);
    console.log(
      `Studies: ${metrics.totalStudies}  Entries: ${metrics.totalEntries}  Pages covered: ${metrics.fensCovered}`
    );
    console.log(
      `Coverage: ${metrics.coverageAllPct}% all | ${metrics.coverageTop200Pct}% top-200 | ${metrics.coverageTop1000Pct}% top-1000`
    );
    console.log(
      `Contamination: ${metrics.contaminationCount} (${metrics.contaminationPct}%)  Dupes: ${metrics.duplicateStudyEntries}  Title dupes: ${metrics.titleDuplicationCount}`
    );
    console.log(
      `Ranking ties (top-${DISPLAYED_TOP_N}): ${metrics.rankingTies}  Max entries/page: ${metrics.maxEntriesPerPage}`
    );
  }
}

module.exports = { audit, detectSchema };
```

- [ ] **Step 4: Run tests, then run the audit against the live index to confirm
      the baseline**

Run: `npx jest tests/unit/audit-study-matches.test.js` Expected: PASS

Run: `node scripts/audit-study-matches.js` Expected: schema v1, coverage ≈ 18.2%
/ 62.5% / 45.2%, contamination ≈ 355 (≈5.8%), dupes ≈ 1,329, title dupes ≈
3,245. Record the exact output — it is the "before" column of the final report.

- [ ] **Step 5: Commit**

```bash
git add scripts/audit-study-matches.js tests/unit/audit-study-matches.test.js
git commit -m "feat(studies): dual-schema study match audit harness"
```

---

### Task 6: API services on schema v2

**Files:**

- Modify: `packages/api/src/services/family-resource-service.js:129-145`
- Test: `tests/unit/videos-family-fallback.test.js` (course fixtures),
  `tests/unit/course-service.test.js`, `tests/unit/course-routes.test.js`

**Interfaces:**

- Consumes: schema-v2 entries (Task 2 shape) from
  `courseService.loadCourseData()`
- Produces: `getFamilyCourses(familyId, limit)` deduped by `study_url` (falling
  back to `source_url`/`course_title` for v1 data) and ranked by `match.score`
  desc, then `likes` desc.

- [ ] **Step 1: Update the failing tests first**

Read the three test files. In `tests/unit/videos-family-fallback.test.js`,
update course fixtures to v2 (add `study_url` and `match: { score }`), and add
one test:

```js
test('getFamilyCourses ranks by match score before likes and dedupes by study_url', async () => {
  // fixture: two entries for the same study_url on different fens (keep higher score),
  // plus a lower-score study with more likes — expect score to win.
});
```

Write the fixture concretely in the style the file already uses (it injects a
fake `courseService.loadCourseData`). Example fixture rows:

```js
const courseData = {
  [FEN_A]: [
    {
      study_url: 'https://lichess.org/study/aaa',
      study_title: 'A',
      likes: 10,
      match: { score: 90 },
    },
    {
      study_url: 'https://lichess.org/study/bbb',
      study_title: 'B',
      likes: 99999,
      match: { score: 40 },
    },
  ],
  [FEN_B]: [
    {
      study_url: 'https://lichess.org/study/aaa',
      study_title: 'A',
      likes: 10,
      match: { score: 60 },
    },
  ],
};
// expect order: aaa (score 90, deduped to its best copy), then bbb
```

In `tests/unit/course-service.test.js` / `tests/unit/course-routes.test.js`,
update any fixture entries to v2 field names where the tests assert on fields
(`course_title` → `study_title` etc.). The service itself is schema-agnostic
(pass-through), so most tests only need fixture renames.

- [ ] **Step 2: Run to verify the new/updated tests fail**

Run:
`npx jest tests/unit/videos-family-fallback.test.js tests/unit/course-service.test.js tests/unit/course-routes.test.js`
Expected: new ranking test FAILS (current comparator is likes-only)

- [ ] **Step 3: Implement**

In `family-resource-service.js`, `getFamilyCourses` builder (lines ~129-145):
replace the dedupe key and comparator:

```js
const courseKey = (course) =>
  course.study_url || course.source_url || course.course_title;
const courseCompare = (a, b) =>
  ((b.match && b.match.score) || 0) - ((a.match && a.match.score) || 0) ||
  (b.likes || 0) - (a.likes || 0);
// ...
this.familyCourseIndex = this._buildFamilyIndex(
  entries,
  (entry) => entry.courses,
  courseKey,
  courseCompare
);
```

- [ ] **Step 4: Run tests**

Run:
`npx jest tests/unit/videos-family-fallback.test.js tests/unit/course-service.test.js tests/unit/course-routes.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/api/src/services/family-resource-service.js tests/unit/videos-family-fallback.test.js tests/unit/course-service.test.js tests/unit/course-routes.test.js
git commit -m "feat(studies): rank family study shelves by match score, dedupe by study"
```

---

### Task 7: StudiesGallery v2 — study cards

**Files:**

- Modify: `packages/web/src/components/detail/StudiesGallery.tsx`
- Modify: `packages/web/src/components/detail/StudiesGallery.module.css`
- Modify: `packages/web/src/pages/OpeningDetailPage.tsx` (only if it accesses
  removed `Study` fields — it imports the type and passes arrays through; check
  `likes`/`course_title` usages)
- Test: `packages/web/src/components/detail/__tests__/StudiesGallery.test.tsx`
  (create)

**Interfaces:**

- Consumes: v2 entries from `/api/openings/page/:fen` (`courses` array, passed
  as `studies` prop)
- Produces: updated exported `Study` interface:

```ts
export interface Study {
  study_title: string;
  chapter_title: string;
  study_url: string;
  chapter_url: string;
  author: string;
  platform: string;
  likes: number;
  chapters_matched: number;
  curated: boolean;
  match: {
    score: number;
    depth: number;
    reason: 'covers-position' | 'line-context';
  };
  discovered_at: string;
}
```

(`SearchLinks` unchanged.)

- [ ] **Step 1: Write the failing component test**

```tsx
// packages/web/src/components/detail/__tests__/StudiesGallery.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import StudiesGallery, { Study } from '../StudiesGallery';

const study = (over: Partial<Study> = {}): Study => ({
  study_title: 'The Complete Najdorf',
  chapter_title: 'Main line',
  study_url: 'https://lichess.org/study/abc',
  chapter_url: 'https://lichess.org/study/abc/def',
  author: 'gm_test',
  platform: 'Lichess',
  likes: 1234,
  chapters_matched: 7,
  curated: true,
  match: { score: 90, depth: 10, reason: 'covers-position' },
  discovered_at: '2026-07-10T00:00:00.000Z',
  ...over,
});

describe('StudiesGallery', () => {
  test('renders one card per study with clean title, author and chapter count', () => {
    render(
      <StudiesGallery studies={[study()]} openingName="Sicilian: Najdorf" />
    );
    expect(screen.getByText('The Complete Najdorf')).toBeInTheDocument();
    expect(screen.getByText(/gm_test/)).toBeInTheDocument();
    expect(screen.getByText(/7 chapters/)).toBeInTheDocument();
  });

  test('shows the match-reason badge', () => {
    render(<StudiesGallery studies={[study()]} openingName="x" />);
    expect(screen.getByText('Covers this variation')).toBeInTheDocument();
  });

  test('line-context studies get the deeper-lines badge', () => {
    render(
      <StudiesGallery
        studies={[
          study({ match: { score: 50, depth: 2, reason: 'line-context' } }),
        ]}
        openingName="x"
      />
    );
    expect(screen.getByText('Explores deeper lines')).toBeInTheDocument();
  });

  test('card links to the best-matching chapter', () => {
    render(<StudiesGallery studies={[study()]} openingName="x" />);
    const link = screen.getByRole('link', { name: /open/i });
    expect(link).toHaveAttribute('href', 'https://lichess.org/study/abc/def');
  });

  test('singular chapter label', () => {
    render(
      <StudiesGallery
        studies={[study({ chapters_matched: 1 })]}
        openingName="x"
      />
    );
    expect(screen.getByText(/1 chapter\b/)).toBeInTheDocument();
  });

  test('show more expands past 5 studies', () => {
    const studies = Array.from({ length: 7 }, (_, i) =>
      study({
        study_url: `https://lichess.org/study/s${i}`,
        study_title: `Study ${i}`,
      })
    );
    render(<StudiesGallery studies={studies} openingName="x" />);
    expect(screen.queryByText('Study 6')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/show 2 more/i));
    expect(screen.getByText('Study 6')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:frontend -- StudiesGallery` Expected: FAIL (old fields/copy)

- [ ] **Step 3: Implement the card**

Rewrite `StudyCard` in `StudiesGallery.tsx` (gallery shell,
`INITIAL_DISPLAY_COUNT = 5`, and show-more logic stay as they are; card keys
become `study.study_url`):

```tsx
const REASON_LABEL: Record<Study['match']['reason'], string> = {
  'covers-position': 'Covers this variation',
  'line-context': 'Explores deeper lines',
};

const StudyCard: React.FC<{ study: Study }> = ({ study }) => (
  <div className={styles.studyCard}>
    <div className={styles.studyInfo}>
      <h4 className={styles.studyTitle}>{study.study_title}</h4>
      <div className={styles.studyMeta}>
        <span className={styles.author}>by {study.author}</span>
        <span className={styles.metaSeparator}>·</span>
        <span>
          {study.chapters_matched}{' '}
          {study.chapters_matched === 1 ? 'chapter' : 'chapters'}
        </span>
        <span className={styles.metaSeparator}>·</span>
        <span className={styles.platformBadge}>{study.platform}</span>
      </div>
      {study.match && (
        <span className={styles.reasonBadge}>
          {REASON_LABEL[study.match.reason]}
        </span>
      )}
    </div>
    <a
      href={study.chapter_url || study.study_url}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.openButton}
    >
      Open
      {/* existing external-link svg unchanged */}
    </a>
  </div>
);
```

CSS: add `.reasonBadge` to `StudiesGallery.module.css`, copying the match-reason
badge treatment from `VideoGallery.module.css` (same tokens — check the class it
uses, likely a small pill with `var(--…)` tokens; reuse identical values so no
design-system bundle change is needed).

Check `OpeningDetailPage.tsx` for uses of removed `Study` fields (search
`course_title`, `source_url`, `anchor_fens` within the file) — the grep on
2026-07-10 showed it only stores `Study[]` state and renders counts, so likely
no change; fix any compile errors `npm run build` surfaces.

- [ ] **Step 4: Run frontend tests + typecheck**

Run: `npm run test:frontend -- StudiesGallery` then `npm run build` Expected:
tests PASS; build clean

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/detail/StudiesGallery.tsx packages/web/src/components/detail/StudiesGallery.module.css packages/web/src/components/detail/__tests__/StudiesGallery.test.tsx
git commit -m "feat(studies): study-level cards with chapter count and match-reason badge"
```

---

### Task 8: Fetch the full catalogue into the cache

**Files:**

- Modify: none (data run) — produces `tools/data/study-cache/*.json`
  (gitignored) and a regenerated `api/data/courses.json`

**Interfaces:**

- Consumes: Task 4 CLI. Network: Lichess API, rate-limited 1.1s/request, 2
  requests per study (~924 studies → ~35-40 min).

- [ ] **Step 1: Dry-run a small batch to validate the pipeline end-to-end**

Run: `node tools/course-discovery/add-studies.js --limit 5 --verbose --dryRun`
Expected: 5 studies fetched and cached, dry-run summary shows v2 entries with
scores; no `courses.json` write.

- [ ] **Step 2: Full fetch (background, ~40 min)**

Run: `node tools/course-discovery/add-studies.js --includeDiscovered --verbose`
(Use a background shell; check progress every ~10 min.) Expected: ~924 studies
processed (some 404/private → skipped), cache populated, `api/data/courses.json`
regenerated in schema v2.

- [ ] **Step 3: Sanity-check the output**

Run: `node scripts/audit-study-matches.js` Expected: schema v2;
coverage/contamination/dupe numbers printed. Contamination ~0, dupes 0, title
dupes 0. If coverage regressed or entries look wrong, investigate before
proceeding (weights can be tuned in `config/study_matching.json` +
`npm run course:rematch` — offline, seconds).

Also check the file size: `ls -la api/data/courses.json`. If it exceeds ~15 MB,
raise `min_match_score` or lower `max_studies_per_page` and rematch.

- [ ] **Step 4: Commit the new index**

```bash
git add api/data/courses.json
git commit -m "feat(studies): regenerate courses.json with v2 multi-anchor scored matching"
```

---

### Task 9: Old-vs-new comparison report + full verification

**Files:**

- Create: `docs/reviews/2026-07-10-study-matching-v2.md`
- Test: full suites

**Interfaces:**

- Consumes: audit metrics from Task 5 run against
  `git show main:api/data/courses.json` (old) and the new index.

- [ ] **Step 1: Produce both audit outputs**

```bash
git show main:api/data/courses.json > /tmp/courses-v1.json   # use the scratchpad dir on Windows
node scripts/audit-study-matches.js /tmp/courses-v1.json --json
node scripts/audit-study-matches.js --json
```

- [ ] **Step 2: Write the report**

`docs/reviews/2026-07-10-study-matching-v2.md`: what changed (multi-anchor,
family guard, scoring, aggregation, cache/rematch), the before/after metric
table (schema, studies, entries, coverage all/top-200/top-1000, contamination,
dupes, title dupes, ties, max/page), 3-5 concrete page examples (e.g. the
Caro-Kann Advance page no longer lists London System studies; the Sicilian page
now lists Najdorf studies with "Explores deeper lines"), and remaining
gaps/follow-ups (fresh discovery run, monthly automation mirroring
`video-refresh.yml`).

- [ ] **Step 3: Full test suites + spot-check the UI**

```bash
npx jest --testPathIgnorePatterns='\.worktrees'
npm run test:frontend
npm run build
npm run dev   # visit a Sicilian page + Caro-Kann Advance page, verify study cards
```

Expected: all green; study cards render with clean titles, chapter counts,
badges; no London System on Caro-Kann pages.

- [ ] **Step 4: Commit**

```bash
git add docs/reviews/2026-07-10-study-matching-v2.md
git commit -m "docs(studies): study matching v2 before/after quality report"
```

---

### Task 10: Documentation sync

**Files:**

- Modify: `tools/course-discovery/README.md` (workflow, output format → v2
  schema, new flags `--fromCache`/`--includeDiscovered`/`--refetch`, cache
  section, audit script)
- Modify: `CLAUDE.md` (Essential Commands: add `course:rematch`; Gotchas:
  replace/extend the courses bullet — cache-then-rematch workflow,
  `scripts/audit-study-matches.js` verification, weights in
  `config/study_matching.json`)
- Modify: `.github/memory-bank/activeContext.md` (replace current-task section,
  keep < 50 lines) and `.github/memory-bank/progress.md` (one-liner, keep < 100
  lines)

- [ ] **Step 1: Update all four documents** per the Files list. In CLAUDE.md
      mirror the video-pipeline gotcha's shape: "`course:rematch` re-scores from
      the local study cache only … run `course:import` to fetch … verify with
      `node scripts/audit-study-matches.js`".

- [ ] **Step 2: Commit**

```bash
git add tools/course-discovery/README.md CLAUDE.md .github/memory-bank/activeContext.md .github/memory-bank/progress.md
git commit -m "docs(studies): course pipeline v2 docs — rematch mode, audit, cache"
```

---

## Self-review notes

- Spec §3.1 (cache) → Task 3+4; §3.2 (matcher) → Tasks 1+2; §3.3 (schema) → Task
  2; §3.4 (API+UI) → Tasks 6+7; §3.5 (audit) → Task 5; §4 (rerun+evidence) →
  Tasks 8+9; docs-with-code rule → Task 10.
- `study` object shape is identical across Tasks 2, 3, 4
  (`{studyId, name, author, likes, pgn, fetched_at, source}`).
- v1 fallbacks: audit (Task 5) and family-resource-service (Task 6) read both
  schemas, so nothing breaks between merging the code and regenerating the data.
- `matchFENsToOpenings` in `pgn-matcher.js` becomes unused by `add-studies.js`
  after Task 4 but remains exported (used by its own tests and mirrors
  `pgn-utils.ts`); leave it.
