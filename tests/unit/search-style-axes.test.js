/**
 * Style words match the style tags (api/data/style-tags.json) through
 * STYLE_AXES, never the old analysis_json tags.
 */
const searchService = require('../../packages/api/src/services/search-service');
const styleTags = require('../../packages/api/src/services/style-tags-service');
const { STYLE_AXES } = require('../../packages/api/src/services/search/SearchConstants');
const QueryUtils = require('../../packages/api/src/services/search/QueryUtils');
const QueryIntentParser = require('../../packages/api/src/services/search/QueryIntentParser');

const tags = (axes) => ({
  character: 'balanced',
  gambit: 'none',
  soundness: 'sound',
  structure: 'flexible',
  approach: 'standard',
  level: 'intermediate',
  plans: [],
  ...axes,
});

const OPENINGS = [
  // The old tags say the opposite of the new ones, so a match on them shows.
  { fen: 'f-najdorf', name: 'Najdorf', analysis_json: { style_tags: ['Solid'] } },
  { fen: 'f-caro', name: 'Caro-Kann', analysis_json: { style_tags: ['Aggressive'] } },
  { fen: 'f-evans', name: 'Evans Gambit', analysis_json: { style_tags: [] } },
  { fen: 'f-englund', name: 'Englund', analysis_json: { style_tags: [] } },
  { fen: 'f-london', name: 'London', analysis_json: { style_tags: [] } },
  { fen: 'f-hub', name: "King's Pawn", analysis_json: { style_tags: ['Aggressive', 'Solid'] } },
  // Named gambits the taxonomy says are not: the pawn comes back, or is never
  // taken. One tagged, one not yet classified.
  { fen: 'f-qg', name: "Queen's Gambit", analysis_json: { style_tags: [] } },
  { fen: 'f-kgd', name: "King's Gambit Declined", analysis_json: { style_tags: [] } },
];

beforeAll(() =>
  styleTags.reset({
    labels: {},
    plans: {},
    variations: {
      najdorf: tags({ character: 'sharp', level: 'advanced' }),
      caro: tags({ character: 'solid' }),
      evans: tags({ gambit: 'white' }),
      englund: tags({ gambit: 'black', soundness: 'dubious', approach: 'offbeat' }),
      london: tags({ character: 'solid', approach: 'system', level: 'beginner' }),
      qg: tags({ character: 'solid' }),
    },
    positions: {
      'f-najdorf': 'najdorf',
      'f-caro': 'caro',
      'f-evans': 'evans',
      'f-englund': 'englund',
      'f-london': 'london',
      'f-qg': 'qg',
    },
  })
);
afterAll(() => styleTags.reset(undefined));

const names = (styles) => searchService.filterBySemanticStyle(OPENINGS, styles).map((o) => o.name);

describe('style search over the style tags', () => {
  test('solid means Solid, whatever the old tags said', () => {
    expect(names(['solid'])).toEqual(['Caro-Kann', 'London', "Queen's Gambit"]);
  });

  test('aggressive takes Sharp lines and gambits from either side', () => {
    expect(names(['aggressive'])).toEqual(['Najdorf', 'Evans Gambit', 'Englund']);
  });

  test('a search for gambits keeps every opening named one, tagged or not', () => {
    // The tag says whether material really changes hands; the name is what a
    // user types "gambit" looking for. The Queen's Gambit must not vanish.
    expect(names(['gambit'])).toEqual(
      expect.arrayContaining(["Queen's Gambit", "King's Gambit Declined"])
    );
  });

  test('a gambit name does not make an opening aggressive', () => {
    expect(names(['aggressive'])).not.toContain("Queen's Gambit");
  });

  test('the taxonomy words reach their own axes', () => {
    expect(names(['gambit'])).toEqual([
      'Evans Gambit',
      'Englund',
      "Queen's Gambit",
      "King's Gambit Declined",
    ]);
    expect(names(['dubious'])).toEqual(['Englund']);
    expect(names(['system'])).toEqual(['London']);
    expect(names(['offbeat'])).toEqual(['Englund']);
  });

  test('level words filter on Level, and simple and complex are its synonyms', () => {
    expect(searchService.filterByComplexity(OPENINGS, 'beginner').map((o) => o.name)).toEqual([
      'London',
    ]);
    expect(searchService.filterByComplexity(OPENINGS, 'complex').map((o) => o.name)).toEqual([
      'Najdorf',
    ]);
  });

  test('an untagged position and an unknown word match nothing', () => {
    expect(names(['aggressive'])).not.toContain("King's Pawn");
    expect(names(['banana'])).toEqual([]);
  });
});

describe('style words inside longer queries', () => {
  // "sharp openings for black" and "beginner sharp openings" take their style
  // from extractStylesFromText; a word it does not know is dropped and the query
  // comes back unfiltered.
  test.each(Object.keys(STYLE_AXES))('"%s" is read as a style word', (word) => {
    expect(QueryUtils.extractStylesFromText(`${word} openings`)).toContain(word);
  });

  test('a colour query keeps its style', () => {
    const intent = QueryIntentParser.parseQueryIntent('sharp openings for black');
    expect(intent.type).toBe('color_specific');
    expect(intent.style).toEqual(['sharp']);
  });

  test('a level query keeps its style', () => {
    const intent = QueryIntentParser.parseQueryIntent('beginner sharp openings');
    expect(intent.complexity).toBe('beginner');
    expect(intent.style).toEqual(['sharp']);
  });
});
