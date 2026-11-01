const {
  contentHash,
  fenFromPath,
  dueReason,
  buildQueue,
  recordReviews,
  checkMoves,
} = require('../ledger');

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const E4E5 = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';

const rec = (name, description, plans = []) => ({
  name,
  eco: 'C20',
  moves: '1. e4',
  analysis_json: { description, common_plans: plans },
});

describe('contentHash', () => {
  it('changes when the description or a plan changes, and only then', () => {
    const a = rec('A', 'text', ['plan']);
    expect(contentHash(a)).toBe(contentHash(rec('Renamed', 'text', ['plan'])));
    expect(contentHash(a)).not.toBe(contentHash(rec('A', 'text!', ['plan'])));
    expect(contentHash(a)).not.toBe(contentHash(rec('A', 'text', ['plan!'])));
  });
});

describe('fenFromPath', () => {
  it('decodes an opening path to its FEN', () => {
    expect(fenFromPath('/opening/' + encodeURIComponent(E4))).toBe(E4);
  });

  it('returns null for other paths and undecodable ones', () => {
    expect(fenFromPath('/discover')).toBeNull();
    expect(fenFromPath('/opening/%E0%A4%A')).toBeNull();
  });
});

describe('dueReason', () => {
  const today = '2026-11-01';

  it('is unreviewed with no ledger entry', () => {
    expect(dueReason(undefined, 'h1', today)).toBe('unreviewed');
  });

  it('is changed when the text no longer matches what was reviewed', () => {
    expect(dueReason({ reviewedAt: '2026-10-11', contentHash: 'h0' }, 'h1', today)).toBe('changed');
  });

  it('is stale twelve months after the review, not before', () => {
    expect(dueReason({ reviewedAt: '2025-11-02', contentHash: 'h1' }, 'h1', today)).toBeNull();
    expect(dueReason({ reviewedAt: '2025-11-01', contentHash: 'h1' }, 'h1', today)).toBe('stale');
  });
});

describe('buildQueue', () => {
  const records = {
    [E4]: rec("King's Pawn Game", 'e4 text'),
    [E4E5]: rec('Open Game', 'e5 text'),
    [START]: rec('Start', 'start text'),
  };
  const path = (fen) => '/opening/' + encodeURIComponent(fen);

  it('ranks due pages by people, then views, and leaves out pages not due', () => {
    const { queue } = buildQueue({
      pages: [
        { path: path(E4), views: 8, people: 1 },
        { path: path(E4E5), views: 2, people: 2 },
        { path: path(START), views: 9, people: 5 },
      ],
      ledger: { [START]: { reviewedAt: '2026-10-11', contentHash: contentHash(records[START]) } },
      records,
      today: '2026-11-01',
      top: 10,
    });
    expect(queue.map((q) => [q.name, q.reason])).toEqual([
      ['Open Game', 'unreviewed'],
      ["King's Pawn Game", 'unreviewed'],
    ]);
  });

  it('adds up paths that decode to the same position and cuts at top', () => {
    const { queue } = buildQueue({
      pages: [
        { path: path(E4), views: 1, people: 1 },
        { path: path(E4).replace(/%20/g, '+'), views: 1, people: 1 },
        { path: path(E4E5), views: 1, people: 1 },
      ],
      ledger: {},
      records,
      today: '2026-11-01',
      top: 1,
    });
    expect(queue).toEqual([
      expect.objectContaining({ fen: E4, views: 2, people: 2, reason: 'unreviewed' }),
    ]);
  });

  it('matches a position whose move counters differ, and reports paths it cannot place', () => {
    const { queue, unmatched } = buildQueue({
      pages: [
        { path: path(E4.replace(/0 1$/, '3 9')), views: 1, people: 1 },
        { path: '/opening/1.e4-c5', views: 1, people: 1 },
      ],
      ledger: {},
      records,
      today: '2026-11-01',
      top: 10,
    });
    expect(queue.map((q) => q.fen)).toEqual([E4]);
    expect(unmatched).toEqual(['/opening/1.e4-c5']);
  });
});

describe('recordReviews', () => {
  const records = { [E4]: rec("King's Pawn Game", 'e4 text') };

  it('writes the verdict with the hash of the text as it stands now', () => {
    const ledger = recordReviews(
      {},
      [
        { fen: E4, verdict: 'ok', notes: '' },
        { fen: E4E5, verdict: null },
      ],
      records,
      '2026-11-01'
    );
    expect(ledger).toEqual({
      [E4]: {
        reviewedAt: '2026-11-01',
        verdict: 'ok',
        contentHash: contentHash(records[E4]),
        notes: '',
      },
    });
  });

  it('refuses an unknown verdict, a fix with no note, or a position with no record', () => {
    expect(() => recordReviews({}, [{ fen: E4, verdict: 'good' }], records, 'd')).toThrow(
      /verdict/
    );
    expect(() =>
      recordReviews({}, [{ fen: E4, verdict: 'fixed', notes: '' }], records, 'd')
    ).toThrow(/notes/);
    expect(() => recordReviews({}, [{ fen: E4E5, verdict: 'ok' }], records, 'd')).toThrow(/record/);
  });
});

describe('checkMoves', () => {
  const moves = '1. e4 e5 2. f3';

  it('passes sequences that replay legally from the opening, including branches', () => {
    expect(checkMoves('After 2.f3 Nc6 3.d4, or 2...Nf6 and 1...c5 instead', moves)).toEqual([]);
  });

  it('flags a move that is illegal where the text places it', () => {
    expect(checkMoves('Black replies 2...Nd5 at once', moves)).toEqual([
      { sequence: '2...Nd5', problem: 'Nd5 is illegal' },
    ]);
  });

  it('flags a sequence numbered past the end of the opening as unplaced, not wrong', () => {
    expect(checkMoves('later 9.Qh5', moves)).toEqual([
      { sequence: '9.Qh5', problem: 'starts after the opening ends; check by hand' },
    ]);
  });
});
