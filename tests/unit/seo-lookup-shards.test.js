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
