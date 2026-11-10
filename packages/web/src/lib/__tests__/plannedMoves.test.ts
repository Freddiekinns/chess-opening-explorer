import { describe, expect, test } from 'vitest';
import { plannedMoves } from '../plannedMoves';

const SICILIAN = 'rnbqkbnr/pp2pppp/3p4/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3';
const GIUOCO = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQK2R b KQkq - 0 5';

describe('plannedMoves', () => {
  test('a move playable now tags its move for the plan’s side', () => {
    expect(plannedMoves(SICILIAN, ['White: open the centre with d4']).get('d4')).toBe('white');
  });

  test('a move that only becomes possible later does not tag', () => {
    // Nd5 is not legal yet: it needs a knight on c3 first.
    expect(plannedMoves(SICILIAN, ['White: play Nc3 and then Nd5']).has('Nd5')).toBe(false);
    expect(plannedMoves(SICILIAN, ['White: play Nc3 and then Nd5']).get('Nc3')).toBe('white');
  });

  test('a route does not tag its first step', () => {
    const planned = plannedMoves(GIUOCO, ['Black: reroute the knight with Nb8-d7-f8']);
    expect([...planned.keys()]).toEqual([]);
  });

  test('a Black move written with dots tags as Black', () => {
    expect(plannedMoves(GIUOCO, ['Black: solidify with ...d6']).get('d6')).toBe('black');
  });

  test('a shared plan tags as the side to move', () => {
    expect(plannedMoves(SICILIAN, ['Fight for the centre with d4']).get('d4')).toBe('white');
    expect(plannedMoves(GIUOCO, ['Both sides can play ...d6']).get('d6')).toBe('black');
  });

  test('a plan for the side not to move names nothing on the board to tag', () => {
    expect(plannedMoves(SICILIAN, ['Black: solidify with ...d6']).size).toBe(0);
  });

  test('when both sides name the same move, the side to move wins', () => {
    const planned = plannedMoves(GIUOCO, ['White: prepare ...d6', 'Black: play ...d6']);
    expect(planned.get('d6')).toBe('black');
  });

  test('an invalid reference does not tag', () => {
    expect(plannedMoves(SICILIAN, ['White: play Qh5 at once']).has('Qh5')).toBe(false);
    expect(plannedMoves(SICILIAN, ['White: play Ke5']).size).toBe(0);
  });

  test('castling counts when the parser reads it as a move playable now', () => {
    const fen = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5';
    expect(plannedMoves(fen, ['White: castle with O-O']).get('O-O')).toBe('white');
  });
});
