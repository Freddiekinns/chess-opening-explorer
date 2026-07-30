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

/**
 * The moves line on a search row.
 *
 * Similar variations share their opening moves, so a preview taken from the
 * front makes every Sicilian read "1. e4 c5" — which is exactly the part that
 * does not tell them apart. When the line is too long, keep the tail and start
 * it at a move number so we never show half a move pair.
 *
 * Lives here rather than in a component because all three search surfaces draw
 * the same row, and a preview that differed between them would be a difference
 * with no meaning behind it.
 */
const MOVES_PREVIEW_MAX_LENGTH = 60;

export function formatMovesPreview(moves: string): string {
  if (!moves) return '';
  const trimmed = moves.trim();
  if (trimmed.length <= MOVES_PREVIEW_MAX_LENGTH) return trimmed;

  const tail = trimmed.slice(-MOVES_PREVIEW_MAX_LENGTH);
  const moveNumberMatch = tail.match(/\d+\.\s/);
  if (moveNumberMatch && moveNumberMatch.index !== undefined) {
    return '… ' + tail.slice(moveNumberMatch.index);
  }
  const firstSpace = tail.indexOf(' ');
  return '… ' + (firstSpace > -1 ? tail.slice(firstSpace + 1) : tail);
}
