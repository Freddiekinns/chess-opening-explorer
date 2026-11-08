import { describe, expect, test } from 'vitest';
import { classifyPlan, parsePlan, type PlanReference } from '../planReferences';

const GIUOCO = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQK2R b KQkq - 0 5';
const QGD = 'rnbqkb1r/ppp2ppp/4pn2/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR w KQkq - 2 4';
const LONDON_ALAPIN = 'rnb1kbnr/pp2pppp/1qp5/3p4/3P1B2/5N2/PPP1PPPP/RN1QKB1R w KQkq - 2 4';

const refs = (fen: string, plan: string): PlanReference[] =>
  parsePlan(fen, plan).segments.filter((s): s is PlanReference => typeof s !== 'string');

const only = (fen: string, plan: string): PlanReference => {
  const found = refs(fen, plan);
  expect(found).toHaveLength(1);
  return found[0];
};

describe('classifyPlan', () => {
  test('strips the side label and capitalises what is left', () => {
    expect(classifyPlan('White: control the center')).toEqual({
      side: 'white',
      text: 'Control the center',
    });
    expect(classifyPlan("Black's plan is to break with ...d5")).toEqual({
      side: 'black',
      text: 'To break with ...d5',
    });
    expect(classifyPlan('Castle early')).toEqual({ side: 'general', text: 'Castle early' });
  });
});

describe('parsePlan: moves', () => {
  test('a Black move with dots, playable now', () => {
    const ref = only(GIUOCO, 'Black: solidify the position with ...d6');
    expect(ref).toMatchObject({
      text: '...d6',
      kind: 'move',
      status: 'now',
      arrows: [{ from: 'd7', to: 'd6', later: false }],
      description: 'Black pawn from d7 to d6',
    });
  });

  test('a Black move with no dots takes its side from the label', () => {
    const ref = only(GIUOCO, 'Black: play d6 and keep the centre closed');
    expect(ref).toMatchObject({ status: 'now', arrows: [{ from: 'd7', to: 'd6' }] });
  });

  test('0-0 is read as castling', () => {
    const ref = only(GIUOCO, 'White: castle early with 0-0');
    expect(ref.status).toBe('now');
    expect(ref.arrows[0]).toMatchObject({ from: 'e1', to: 'g1' });
  });

  test('a move number is dropped', () => {
    const [castle] = refs(GIUOCO, 'White: after 6.O-O the centre opens');
    expect(castle).toMatchObject({ kind: 'move', status: 'now', arrows: [{ to: 'g1' }] });
  });

  test('a "d4-break" is a pawn move', () => {
    const ref = only(GIUOCO, 'White: prepare the central d4-break');
    expect(ref).toMatchObject({ text: 'd4', status: 'now', arrows: [{ from: 'd3', to: 'd4' }] });
  });

  test('a move no piece can make is invalid, with a reason', () => {
    const ref = only(GIUOCO, 'White: play Qh7 at once');
    expect(ref.status).toBe('invalid');
    expect(ref.arrows).toEqual([]);
    expect(ref.reason).toBeTruthy();
  });
});

describe('parsePlan: ranges and routes', () => {
  test('d3-d4 moves the pawn already on d3', () => {
    const ref = only(GIUOCO, 'White: prepare d3-d4');
    expect(ref).toMatchObject({ status: 'now', arrows: [{ from: 'd3', to: 'd4', later: false }] });
  });

  test('a knight route: first leg now, the rest later', () => {
    const ref = only(GIUOCO, 'White: the Italian maneuver (Nbd2-f1-g3)');
    expect(ref.kind).toBe('route');
    expect(ref.status).toBe('now');
    expect(ref.arrows).toEqual([
      { from: 'b1', to: 'd2', later: false },
      { from: 'd2', to: 'f1', later: true },
      { from: 'f1', to: 'g3', later: true },
    ]);
    expect(ref.description).toBe('Knight from b1 to d2, then f1, then g3');
  });

  test('a3-b4 is two moves when nothing on a3 can reach b4', () => {
    const ref = only(GIUOCO, 'White: expand with a3-b4');
    expect(ref.arrows).toEqual([
      { from: 'a2', to: 'a3', later: false },
      { from: 'b2', to: 'b4', later: false },
    ]);
    expect(ref.description).toBe('Pawn from a2 to a3, then pawn from b2 to b4');
  });

  test('b4-b5: b4 now, then b5 later', () => {
    const ref = only(QGD, 'White: execute the Minority Attack (b4-b5)');
    expect(ref.arrows).toEqual([
      { from: 'b2', to: 'b4', later: false },
      { from: 'b4', to: 'b5', later: true },
    ]);
  });

  test('a route with a leg no piece can make is invalid', () => {
    expect(only(GIUOCO, 'White: reroute with Nbd2-f1-h8').status).toBe('invalid');
  });
});

describe('parsePlan: squares and pieces', () => {
  test('the d4-square rings the Black pieces that control it', () => {
    const ref = only(GIUOCO, 'Black: control the d4-square');
    expect(ref.kind).toBe('square');
    expect(ref.highlight).toEqual(['d4']);
    expect([...ref.rings].sort()).toEqual(['c5', 'c6', 'e5']);
    expect(ref.description).toBe('The d4 square, and the Black pieces that already control it');
  });

  test('"the b5 square" is a square, not a move', () => {
    const ref = only(GIUOCO, 'Black: control the b5 square');
    expect(ref).toMatchObject({ kind: 'square', highlight: ['b5'] });
  });

  test('a piece named on its square is already on the board', () => {
    const ref = only(LONDON_ALAPIN, 'Black: harass the Bf4');
    expect(ref).toMatchObject({ status: 'on-board', rings: ['f4'], arrows: [] });
  });

  test('"the c4 bishop" rings the bishop', () => {
    const ref = only(GIUOCO, "Black: neutralise White's c4 bishop");
    expect(ref).toMatchObject({ kind: 'piece', status: 'on-board', rings: ['c4'] });
  });

  test('"the c4 bishop" with no bishop there is invalid', () => {
    expect(only(GIUOCO, 'Black: trade off the c3 bishop').status).toBe('invalid');
  });
});

describe('parsePlan: what real plans say', () => {
  const PIRC_BD3 = 'rnbqkb1r/ppp1pp1p/3p1np1/8/3PP3/2N2N2/PPP2PPP/R1BQKB1R w KQkq - 0 5';

  test('a square after "to" is a place, not a pawn move', () => {
    const ref = only(GIUOCO, 'Black: bring the knight to e7');
    expect(ref).toMatchObject({ kind: 'square', highlight: ['e7'] });
  });

  test('a square after "attack" is a place', () => {
    expect(only(GIUOCO, 'White: attack f7').kind).toBe('square');
  });

  test('"the f4 pawn break" is a pawn move', () => {
    const ref = only(GIUOCO, 'Black: prepare the d5 pawn break');
    expect(ref).toMatchObject({ kind: 'move', status: 'now', arrows: [{ from: 'd7', to: 'd5' }] });
  });

  test('a move one quiet move away is drawn as later', () => {
    // In the Giuoco Black's dark bishop is already on c5, so Bg7 can't happen.
    // In the Pirc, Bg2 needs g3 first, which the plan leaves unsaid.
    const ref = only(GIUOCO, 'Black: develop with Bg7');
    expect(ref).toMatchObject({ status: 'invalid' });
    const fianchetto = only(PIRC_BD3, 'White: fianchetto with Bg2');
    expect(fianchetto).toMatchObject({
      status: 'later',
      arrows: [{ from: 'f1', to: 'g2', later: true }],
    });
  });

  test('"the g2-bishop" before it gets there points at where it is going', () => {
    const ref = only(PIRC_BD3, "Black: neutralise White's g2-bishop");
    expect(ref).toMatchObject({
      kind: 'piece',
      status: 'later',
      highlight: ['g2'],
      arrows: [{ from: 'f1', to: 'g2', later: true }],
    });
  });

  test('a numbered move that is already history stays plain text', () => {
    const parsed = parsePlan(GIUOCO, 'White: after 2.Nf3 the centre is White');
    expect(parsed.segments.every((s) => typeof s === 'string')).toBe(true);
  });

  test('the unnumbered moves that carry on a numbered line are history too', () => {
    const SHILLING = 'r1b1kbnr/pppp1Npp/8/6q1/2BnP3/8/PPPP1PPP/RNBQK2R b KQkq - 0 5';
    const found = refs(
      SHILLING,
      'White, a move earlier: 4.Nxd4 exd4 or 4.O-O sidesteps the trap. After 6.Rf1 Qxe4+, only 7.Qe2 avoids mate.'
    );
    expect(found.map((r) => r.text)).not.toContain('exd4');
    expect(found.map((r) => r.text)).not.toContain('Qxe4+');
  });

  test('"the e4-d4 pawn centre" rings both pawns', () => {
    const ITALIAN_D4 = 'r1bqk1nr/pppp1ppp/2n5/2b5/2BPP3/5N2/PP3PPP/RNBQK2R b KQkq - 0 5';
    const ref = only(ITALIAN_D4, 'White: hold the e4-d4 pawn centre');
    expect(ref).toMatchObject({ kind: 'piece', status: 'on-board' });
    expect([...ref.rings].sort()).toEqual(['d4', 'e4']);
  });
});

describe('parsePlan: exchanges, lists and named sides', () => {
  const ENGLISH_BB4 = 'rnbqk1nr/pppp1ppp/8/4p3/1bP5/2N5/PP1PPPPP/R1BQKBNR w KQkq - 1 3';
  const CARO_EXCHANGE = 'rnbqkbnr/pp2pppp/8/3p4/3P4/8/PPP2PPP/RNBQKBNR w KQkq - 0 4';

  test('an exchange written out: the reply is the other side', () => {
    const [take, retake] = refs(ENGLISH_BB4, 'Black: double the pawns with Bxc3 bxc3');
    expect(take).toMatchObject({ status: 'now', arrows: [{ from: 'b4', to: 'c3' }] });
    expect(retake).toMatchObject({ status: 'later', arrows: [{ from: 'b2', to: 'c3' }] });
    expect(retake.description).toMatch(/^White pawn/);
  });

  test('a list of squares stays a list of squares', () => {
    const found = refs(GIUOCO, 'White: control the d4 and d5 squares');
    expect(found.map((r) => r.kind)).toEqual(['square', 'square']);
  });

  test('"after White plays c4" in a Black plan is White\'s move', () => {
    const ref = only(CARO_EXCHANGE, 'Black: after White plays c4, aim for a minority attack');
    expect(ref).toMatchObject({ status: 'now', arrows: [{ from: 'c2', to: 'c4' }] });
  });

  test('a diagonal is left as text', () => {
    const parsed = parsePlan(GIUOCO, 'White: keep the bishop on the a2-g8 diagonal');
    expect(parsed.segments.every((s) => typeof s === 'string')).toBe(true);
  });

  test('an ambiguous move says so', () => {
    const COCHRANE = 'r1bqk1nr/pppp1ppp/2n5/b3P3/2B5/2P2N2/P4PPP/RNBQK2R b KQkq - 0 7';
    expect(only(COCHRANE, 'Black: develop with ...Ne7-g6').reason).toMatch(/ambiguous/);
  });

  test('a plan for the side not to move still checks when the other side is in check', () => {
    const NIMZO_CHECK = 'rnbqk2r/pp1p1ppp/4pn2/2pP2B1/2P5/2b5/PP2PPPP/R2QKBNR w KQkq - 0 6';
    expect(only(NIMZO_CHECK, 'Black: solidify the centre with ...d6').status).toBe('now');
  });
});

describe('parsePlan: never guess', () => {
  test('text with no references is one plain segment', () => {
    const parsed = parsePlan(GIUOCO, 'White: create threats against the king');
    expect(parsed.segments).toEqual(['Create threats against the king']);
  });

  test('segments rebuild the display text exactly', () => {
    const parsed = parsePlan(GIUOCO, 'White: prepare d3-d4, then play Nbd2-f1-g3.');
    const rebuilt = parsed.segments.map((s) => (typeof s === 'string' ? s : s.text)).join('');
    expect(rebuilt).toBe(parsed.text);
  });
});
