import { Chess } from 'chess.js';
import { classifyPlan, parsePlan } from './planReferences';

/** SAN as the explorer rows write it: no check or mate mark. */
export const withoutCheckMark = (san: string): string => san.replace(/[+#]$/, '');

/**
 * The moves the position's Common plans name as playable now, by the side they
 * are for. Read through the plan parser, so a move counts only when it is a
 * single step the parser accepts for this position and it is a legal move for
 * the side to move: routes, moves that need earlier moves, squares and pieces
 * never count. A shared plan tags as the side to move, and so does a move both
 * sides name. Keys are SAN without check marks, as the explorer rows write them.
 */
export function plannedMoves(fen: string, plans: string[]): Map<string, 'white' | 'black'> {
  const planned = new Map<string, 'white' | 'black'>();
  let board: Chess;
  try {
    board = new Chess(fen);
  } catch {
    return planned;
  }
  const toMove = board.turn() === 'w' ? 'white' : 'black';
  const legal = new Map(board.moves({ verbose: true }).map((m) => [`${m.from}${m.to}`, m.san]));

  for (const raw of plans) {
    const side = classifyPlan(raw).side;
    const tag = side === 'general' ? toMove : side;
    for (const seg of parsePlan(fen, raw).segments) {
      if (typeof seg === 'string' || seg.kind !== 'move' || seg.status !== 'now') continue;
      if (seg.arrows.length !== 1) continue;
      const san = legal.get(`${seg.arrows[0].from}${seg.arrows[0].to}`);
      if (!san) continue;
      const key = withoutCheckMark(san);
      if (!planned.has(key) || tag === toMove) planned.set(key, tag);
    }
  }
  return planned;
}
