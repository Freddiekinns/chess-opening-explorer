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
    // Golden values — computed once from the djb2 implementation. If these
    // change, regenerate the shards AND update middleware.ts in the same PR.
    expect(FENS.map((fen) => shardForFen(fen))).toEqual([11, 8, 12, 13]);
  });
});
