/**
 * Descriptive queries the intent parser used to misread (found 2026-10-05, all
 * older than the style tags): a style word in front of "response to" or of a
 * move was taken for an opening name, "for white" kept nearly every opening, and
 * a level word dropped the opening name that followed it.
 */
const searchService = require('../../packages/api/src/services/search-service');
const styleTags = require('../../packages/api/src/services/style-tags-service');
const QueryIntentParser = require('../../packages/api/src/services/search/QueryIntentParser');

const parse = (query) => QueryIntentParser.parseQueryIntent(query);

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
  { fen: 'f-kp', name: "King's Pawn Game", moves: '1. e4' },
  { fen: 'f-qp', name: "Queen's Pawn Game", moves: '1. d4' },
  { fen: 'f-sic', name: 'Sicilian Defense', moves: '1. e4 c5' },
  { fen: 'f-sic-nf3', name: 'Sicilian Defense', moves: '1. e4 c5 2. Nf3' },
  {
    fen: 'f-najdorf',
    name: 'Sicilian Defense: Najdorf Variation',
    moves: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6',
  },
  {
    fen: 'f-morra',
    name: 'Sicilian Defense: Smith-Morra Gambit',
    moves: '1. e4 c5 2. d4 cxd4 3. c3',
  },
  { fen: 'f-caro', name: 'Caro-Kann Defense', moves: '1. e4 c6' },
  { fen: 'f-kg', name: "King's Gambit", moves: '1. e4 e5 2. f4' },
  { fen: 'f-englund', name: 'Englund Gambit', moves: '1. d4 e5' },
  { fen: 'f-london', name: 'London System', moves: '1. d4 d5 2. Bf4' },
  { fen: 'f-italian', name: 'Italian Game', moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4' },
  {
    fen: 'f-two-knights',
    name: 'Italian Game: Two Knights Defense',
    moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6',
  },
  // e4 played later, not as a reply to 1.e4.
  { fen: 'f-qp-e4', name: "Queen's Pawn Game: Blackmar Gambit", moves: '1. d4 d5 2. e4' },
];

beforeAll(() =>
  styleTags.reset({
    labels: {},
    plans: {},
    variations: {
      najdorf: tags({ character: 'sharp', level: 'advanced' }),
      morra: tags({ character: 'sharp', gambit: 'white' }),
      caro: tags({ character: 'solid' }),
      kg: tags({ character: 'sharp', gambit: 'white' }),
      englund: tags({ gambit: 'black', soundness: 'dubious' }),
      london: tags({ character: 'solid', approach: 'system', level: 'beginner' }),
      sic: tags({ character: 'sharp', level: 'advanced' }),
    },
    positions: {
      'f-najdorf': 'najdorf',
      'f-morra': 'morra',
      'f-caro': 'caro',
      'f-kg': 'kg',
      'f-englund': 'englund',
      'f-london': 'london',
      'f-sic': 'sic',
      'f-sic-nf3': 'sic',
      'f-caro-adv': 'caro',
    },
  })
);
afterAll(() => styleTags.reset(undefined));

const names = (openings) => openings.map((o) => o.name);

describe('a style word in front of "response to"', () => {
  test('is read as a response search with that style', () => {
    const intent = parse('solid response to e4');
    expect(intent.type).toBe('response_search');
    expect(intent.targetMoves).toEqual(['e4']);
    expect(intent.modifiers).toEqual(['solid']);
  });

  test('a response to e4 is an opening that starts 1.e4 and has Black reply', () => {
    const replies = searchService.filterByResponseToMoves(OPENINGS, ['e4']);
    expect(names(replies)).toContain('Sicilian Defense');
    expect(names(replies)).toContain('Caro-Kann Defense');
    expect(names(replies)).not.toContain("King's Pawn Game");
    expect(names(replies)).not.toContain("Queen's Pawn Game: Blackmar Gambit");
  });

  test('the style then narrows the replies', () => {
    expect(names(searchService.filterByResponseToMoves(OPENINGS, ['e4'], ['solid']))).toEqual([
      'Caro-Kann Defense',
    ]);
  });
});

describe('a style word in front of a move', () => {
  test('"solid e4 openings" is a style-and-move search, not an opening name', () => {
    const intent = parse('solid e4 openings');
    expect(intent.type).toBe('style_with_move');
    expect(intent.style).toEqual(['solid']);
    expect(intent.targetMoves).toEqual(['e4']);
  });

  test('a style word in front of a name is still a modified opening', () => {
    const intent = parse('solid sicilian');
    expect(intent.type).toBe('modified_opening');
    expect(intent.openingName).toBe('sicilian');
  });
});

describe('"for white" and "for black"', () => {
  // An opening belongs to the side whose move first gave it its name.
  test('white openings are the ones White chose', () => {
    expect(names(searchService.filterByColor(OPENINGS, 'white'))).toEqual([
      "King's Pawn Game",
      "Queen's Pawn Game",
      'Sicilian Defense: Smith-Morra Gambit',
      "King's Gambit",
      'London System',
      'Italian Game',
      "Queen's Pawn Game: Blackmar Gambit",
    ]);
  });

  test('a British spelling joins its line rather than starting a new one', () => {
    const transposed = { fen: 'f-sic-uk', name: 'Sicilian Defence', moves: '1. Nf3 c5 2. e4' };
    expect(names(searchService.filterByColor([...OPENINGS, transposed], 'white'))).not.toContain(
      'Sicilian Defence'
    );
  });

  test('black openings are the ones Black chose, at every depth of the line', () => {
    expect(names(searchService.filterByColor(OPENINGS, 'black'))).toEqual([
      'Sicilian Defense',
      'Sicilian Defense',
      'Sicilian Defense: Najdorf Variation',
      'Caro-Kann Defense',
      'Englund Gambit',
      'Italian Game: Two Knights Defense',
    ]);
  });
});

describe('a level word in front of an opening name', () => {
  test.each(['advanced sicilian defence', 'advanced sicilian defense'])(
    '"%s" keeps the name',
    (query) => {
      const intent = parse(query);
      expect(intent.type).toBe('complexity_search');
      expect(intent.complexity).toBe('advanced');
      expect(intent.style).toEqual([]);
      expect(intent.openingName).toBe(query.replace('advanced ', ''));
    }
  );

  test('the name filter treats Defence and Defense as one spelling', () => {
    expect(names(searchService.filterByOpeningName(OPENINGS, 'sicilian defence'))).toContain(
      'Sicilian Defense'
    );
  });
});

describe('style and move together', () => {
  test('equal matches are ordered by games played, not left tied', () => {
    const rare = {
      fen: 'f-caro',
      name: 'Caro-Kann Defense',
      moves: '1. e4 c6',
      games_analyzed: 1000,
    };
    const common = {
      fen: 'f-caro-adv',
      name: 'Caro-Kann Defense: Advance Variation',
      moves: '1. e4 c6 2. d4 d5 3. e5',
      games_analyzed: 5000000,
    };
    const scored = searchService.scoreSemanticResults([rare, common], parse('solid e4 openings'));
    expect(names(scored)).toEqual(['Caro-Kann Defense: Advance Variation', 'Caro-Kann Defense']);
    expect(scored[0].searchScore).toBeGreaterThan(scored[1].searchScore);
  });
});
