/**
 * Style words match the style tags (api/data/style-tags.json) through
 * STYLE_AXES, never the old analysis_json tags.
 */
const searchService = require('../../packages/api/src/services/search-service');
const styleTags = require('../../packages/api/src/services/style-tags-service');

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
    },
    positions: {
      'f-najdorf': 'najdorf',
      'f-caro': 'caro',
      'f-evans': 'evans',
      'f-englund': 'englund',
      'f-london': 'london',
    },
  })
);
afterAll(() => styleTags.reset(undefined));

const names = (styles) => searchService.filterBySemanticStyle(OPENINGS, styles).map((o) => o.name);

describe('style search over the style tags', () => {
  test('solid means Solid, whatever the old tags said', () => {
    expect(names(['solid'])).toEqual(['Caro-Kann', 'London']);
  });

  test('aggressive takes Sharp lines and gambits from either side', () => {
    expect(names(['aggressive'])).toEqual(['Najdorf', 'Evans Gambit', 'Englund']);
  });

  test('the taxonomy words reach their own axes', () => {
    expect(names(['gambit'])).toEqual(['Evans Gambit', 'Englund']);
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
