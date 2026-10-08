const { build } = require('../export');

const answers = (axes) => ({
  character: 'balanced',
  gambit: 'none',
  soundness: 'sound',
  structure: 'flexible',
  approach: 'standard',
  level: 'intermediate',
  plans: [],
  ...axes,
});

const glossary = {
  'White gambit': 'g',
  'Black gambit': 'g',
  Solid: 's',
  Sharp: 's',
  Dubious: 'd',
  Open: 'o',
  'Semi-open': 'o',
  Closed: 'c',
  System: 's',
  Offbeat: 'o',
  Beginner: 'b',
  Advanced: 'a',
};

function run(over = {}) {
  return build({
    final: {
      'london-system': answers({ character: 'solid', approach: 'system', plans: ['stonewall'] }),
      disputed: answers({ character: null, plans: ['invented_plan'] }),
    },
    map: {
      'fen-london': 'london-system',
      'fen-london-alias': 'london-alias',
      'fen-disputed': 'disputed',
      'fen-hub': 'kings-pawn-game',
      'fen-tail': 'not-classified-yet',
    },
    shared: { 'london-alias': 'london-system' },
    planList: [{ key: 'stonewall', label: 'Stonewall', glossary: 'w' }],
    glossary,
    ...over,
  });
}

describe('style-tags export', () => {
  test('every position takes its variation, through shared briefs', () => {
    const { positions } = run();
    expect(positions['fen-london']).toBe('london-system');
    expect(positions['fen-london-alias']).toBe('london-system');
  });

  test('hubs and unclassified variations are left out, not guessed', () => {
    const { positions } = run();
    expect(positions['fen-hub']).toBeUndefined();
    expect(positions['fen-tail']).toBeUndefined();
  });

  test('an unresolved axis exports as its hidden middle value', () => {
    expect(run().variations.disputed.character).toBe('balanced');
  });

  test('a plan missing from the taxonomy is dropped', () => {
    expect(run().variations.disputed.plans).toEqual([]);
    expect(run().variations['london-system'].plans).toEqual(['stonewall']);
  });

  test('labels carry the glossary line from the taxonomy', () => {
    expect(run().labels.character.solid).toEqual({ label: 'Solid', glossary: 's' });
  });

  test('a shown value with no glossary fails the export', () => {
    const { Solid, ...rest } = glossary;
    expect(() => run({ glossary: rest })).toThrow(/Solid/);
  });
});
