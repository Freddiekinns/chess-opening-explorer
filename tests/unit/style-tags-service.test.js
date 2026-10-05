const fs = require('fs');
const path = require('path');
const styleTags = require('../../packages/api/src/services/style-tags-service');

const FIXTURE = {
  labels: {
    gambit: { white: { label: 'White gambit', glossary: 'g' } },
    character: { sharp: { label: 'Sharp', glossary: 's' } },
    level: { advanced: { label: 'Advanced', glossary: 'a' } },
  },
  plans: {
    kingside_attack: { label: 'Kingside attack', glossary: 'k' },
    pawn_storm: { label: 'Pawn storm', glossary: 'p' },
    fianchetto: { label: 'Fianchetto', glossary: 'f' },
  },
  variations: {
    dragon: {
      character: 'sharp',
      gambit: 'none',
      soundness: 'sound',
      structure: 'semi_open',
      approach: 'standard',
      level: 'advanced',
      plans: ['kingside_attack', 'pawn_storm', 'fianchetto'],
    },
  },
  positions: { 'fen-dragon': 'dragon' },
};

afterEach(() => styleTags.reset(undefined));

describe('style-tags-service', () => {
  beforeEach(() => styleTags.reset(FIXTURE));

  test('axesFor gives every stored value, middle values and all three plans included', () => {
    expect(styleTags.axesFor('fen-dragon')).toEqual(FIXTURE.variations.dragon);
  });

  test('a position with no entry has no tags, never a default', () => {
    expect(styleTags.axesFor('fen-hub')).toBeNull();
    expect(styleTags.profileFor('fen-hub')).toBeNull();
  });

  test('profileFor shows only words that have a label, in the labels order', () => {
    const { words } = styleTags.profileFor('fen-dragon');
    // Balanced, none, Sound, standard have no label: hidden middle values. And
    // semi_open has none in this fixture, so it is not shown either.
    expect(words.map((w) => w.label)).toEqual(['Sharp', 'Advanced']);
    expect(words[0]).toEqual({ axis: 'character', value: 'sharp', label: 'Sharp', glossary: 's' });
  });

  test('profileFor shows at most two plans, most characteristic first', () => {
    expect(styleTags.profileFor('fen-dragon').plans).toEqual([
      { key: 'kingside_attack', label: 'Kingside attack', glossary: 'k' },
      { key: 'pawn_storm', label: 'Pawn storm', glossary: 'p' },
    ]);
  });
});

// The file the export writes, checked as shipped: a page that draws a word with
// no glossary, or a position keyed to a variation that is not there, would only
// surface in production otherwise.
describe('api/data/style-tags.json', () => {
  const file = path.join(__dirname, '../../api/data/style-tags.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const AXES = ['character', 'gambit', 'soundness', 'structure', 'approach', 'level'];

  test('every position points at a variation that exists', () => {
    for (const slug of Object.values(data.positions)) expect(data.variations[slug]).toBeDefined();
  });

  test('every variation has a value on every axis and only known plans', () => {
    for (const v of Object.values(data.variations)) {
      for (const axis of AXES) expect(typeof v[axis]).toBe('string');
      for (const plan of v.plans) expect(data.plans[plan]).toBeDefined();
    }
  });

  test('every shown word and plan carries a label and a glossary line', () => {
    for (const values of Object.values(data.labels))
      for (const w of Object.values(values)) {
        expect(w.label).toBeTruthy();
        expect(w.glossary).toBeTruthy();
      }
    for (const p of Object.values(data.plans)) {
      expect(p.label).toBeTruthy();
      expect(p.glossary).toBeTruthy();
    }
  });

  test('hub positions get no tags (1.e4, 1.d4)', () => {
    expect(data.positions['rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1']).toBe(
      undefined
    );
    expect(data.positions['rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1']).toBe(
      undefined
    );
  });
});
