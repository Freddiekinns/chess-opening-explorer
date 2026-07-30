/**
 * What a search query looks like.
 *
 * Kept out of the search components so scoring and any future query-shape
 * decision read the same definition of "this is a move".
 */

const MOVE_PATTERNS = [
  /^[a-h][1-8]$/, // pawn moves: e4, d4
  /^[nbrqk][a-h][1-8]$/, // piece moves: nf3, bb5
  /^o-o-o$/, // long castling
  /^o-o$/, // short castling
  /^[a-h]x[a-h][1-8]$/, // pawn captures: exd5
  /^[nbrqk]x[a-h][1-8]$/, // piece captures: nxe5
];

export function isChessMove(query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  return MOVE_PATTERNS.some((pattern) => pattern.test(trimmed));
}
