const { shardForFen, SHARD_COUNT } = require('../../scripts/generate-seo-lookup');

// The middleware (middleware.ts) carries a copy of this hash — these tests pin
// the algorithm so a change on either side shows up as a failure here.
describe('seo-lookup sharding', () => {
  const FENS = [
    'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2',
    'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    'rnbqkb1r/pppppppp/5n2/8/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 1 2',
  ];

  it('is deterministic', () => {
    for (const fen of FENS) {
      expect(shardForFen(fen)).toBe(shardForFen(fen));
    }
  });

  it('stays within [0, SHARD_COUNT)', () => {
    for (const fen of FENS) {
      const shard = shardForFen(fen);
      expect(shard).toBeGreaterThanOrEqual(0);
      expect(shard).toBeLessThan(SHARD_COUNT);
    }
  });

  it('pins djb2 outputs so generator and middleware cannot silently diverge', () => {
    // Golden values — computed once from the djb2 implementation, at a fixed
    // count so raising SHARD_COUNT does not churn them. If these change,
    // regenerate the shards AND update middleware.ts in the same PR.
    expect(FENS.map((fen) => shardForFen(fen, 16))).toEqual([11, 8, 12, 13]);
  });

  it('agrees with middleware.ts on how many shards there are', () => {
    // The hash is pinned above, but a mismatched modulus sends the middleware
    // to a shard the generator never wrote — every opening page would 404.
    const source = require('fs').readFileSync(
      require('path').join(__dirname, '..', '..', 'middleware.ts'),
      'utf-8'
    );
    const declared = source.match(/const SHARD_COUNT = (\d+)/);
    expect(declared).not.toBeNull();
    expect(Number(declared[1])).toBe(SHARD_COUNT);
  });

  it('spreads the corpus evenly enough that no shard dominates', () => {
    // The middleware fetches one whole shard per edge cold start, so a badly
    // skewed hash would be a latency problem, not just an untidy one.
    const { readOpenings } = require('../../scripts/generate-seo-lookup');
    const counts = new Array(SHARD_COUNT).fill(0);
    for (const row of readOpenings()) counts[shardForFen(row.fen)]++;

    const mean = counts.reduce((a, b) => a + b, 0) / SHARD_COUNT;
    expect(Math.max(...counts)).toBeLessThan(mean * 1.5);
    expect(Math.min(...counts)).toBeGreaterThan(mean * 0.5);
  });
});

describe('seo-lookup link payload', () => {
  const { buildLinks, MAX_RELATED, MAX_ANCESTORS } = require('../../scripts/generate-seo-lookup');

  const node = (fen, name, games) => ({ fen, name, games });

  it('puts ancestors root first and drops repeats', () => {
    const { ancestors } = buildLinks({
      ancestors: [
        node('f1', 'Indian Defence'),
        node('f1', 'Indian Defence'),
        node('f2', "King's Indian"),
      ],
      siblings: [],
      children: [],
    });
    expect(ancestors).toEqual([
      ['f1', 'Indian Defence'],
      ['f2', "King's Indian"],
    ]);
  });

  it('merges siblings and children into one list ordered by games', () => {
    const { related } = buildLinks({
      ancestors: [],
      siblings: [node('s1', 'Quiet sibling', 10), node('s2', 'Busy sibling', 5000)],
      children: [node('c1', 'Busy child', 900)],
    });
    expect(related).toEqual([
      ['s2', 'Busy sibling'],
      ['c1', 'Busy child'],
      ['s1', 'Quiet sibling'],
    ]);
  });

  it('caps related at MAX_RELATED, keeping the most played', () => {
    const many = Array.from({ length: 20 }, (_, i) => node(`s${i}`, `Line ${i}`, i));
    const { related } = buildLinks({ ancestors: [], siblings: many, children: [] });
    expect(MAX_RELATED).toBe(8);
    expect(related).toHaveLength(8);
    expect(related[0]).toEqual(['s19', 'Line 19']);
    expect(related[7]).toEqual(['s12', 'Line 12']);
  });

  it('treats a missing tree context as no links rather than throwing', () => {
    expect(buildLinks(null)).toEqual({ ancestors: [], related: [], elided: false });
  });

  it('collapses a repeated name to the deeper position, as the React breadcrumb does', () => {
    // lib/openingBook.ts deduplicateAncestors keeps the later of two
    // consecutive entries sharing a name. A chain repeats names, not FENs, so
    // deduplicating by fen leaves an 8.5-entry average and a 33-deep worst case.
    const { ancestors } = buildLinks({
      ancestors: [
        node('a1', 'Sicilian Defence'),
        node('a2', 'Sicilian Defence'),
        node('a3', 'Najdorf Variation'),
      ],
      siblings: [],
      children: [],
    });
    expect(ancestors).toEqual([
      ['a2', 'Sicilian Defence'],
      ['a3', 'Najdorf Variation'],
    ]);
  });

  it('keeps the family root and the two nearest when the chain is long', () => {
    const chain = Array.from({ length: 9 }, (_, i) => node(`a${i}`, `Level ${i}`));
    const { ancestors, elided } = buildLinks({ ancestors: chain, siblings: [], children: [] });

    expect(MAX_ANCESTORS).toBe(3);
    expect(elided).toBe(true);
    expect(ancestors).toEqual([
      ['a0', 'Level 0'],
      ['a7', 'Level 7'],
      ['a8', 'Level 8'],
    ]);
  });

  it('does not mark a chain that fits as elided', () => {
    const { ancestors, elided } = buildLinks({
      ancestors: [node('a0', 'Root'), node('a1', 'Parent')],
      siblings: [],
      children: [],
    });
    expect(elided).toBe(false);
    expect(ancestors).toHaveLength(2);
  });

  it('sorts a node with no games last rather than treating it as popular', () => {
    const { related } = buildLinks({
      ancestors: [],
      siblings: [node('s1', 'No data'), node('s2', 'Played', 1)],
      children: [],
    });
    expect(related).toEqual([
      ['s2', 'Played'],
      ['s1', 'No data'],
    ]);
  });
});

describe('seo-lookup tuple trimming still applies with the link slots', () => {
  const { buildEntry } = require('../../scripts/generate-seo-lookup');

  it('trims both link slots off an opening that has neither', () => {
    const entry = buildEntry(
      { name: 'Lonely Line', eco: 'A00', moves: '1. a3', description: 'd', games: null },
      { ancestors: [], related: [] }
    );
    expect(entry).toEqual(['Lonely Line', 'A00', '1. a3', 'd']);
  });

  it('keeps an empty ancestors slot when related has content, so indices do not shift', () => {
    const entry = buildEntry(
      { name: 'Root', eco: 'A00', moves: '1. e4', description: 'd', games: null },
      { ancestors: [], related: [['f', 'Child']] }
    );
    expect(entry[9]).toBeNull();
    expect(entry[10]).toEqual([]);
    expect(entry[11]).toEqual([['f', 'Child']]);
  });

  it('carries the elision flag in slot 12 only when the trail was cut', () => {
    const long = buildEntry(
      { name: 'Deep', eco: 'B90', moves: '1. e4', description: 'd', games: null },
      { ancestors: [['a', 'Root']], related: [], elided: true }
    );
    expect(long[12]).toBe(1);

    const short = buildEntry(
      { name: 'Shallow', eco: 'A00', moves: '1. a3', description: 'd', games: null },
      { ancestors: [['a', 'Root']], related: [], elided: false }
    );
    expect(short).toHaveLength(11);
  });
});
