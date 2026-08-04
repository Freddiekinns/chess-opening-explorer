/**
 * What a search query looks like, and what it becomes before it is sent.
 *
 * Kept out of the search components so every surface reads the same definition
 * of "this is a move", "this is an ECO code" and "this is what QGD means" —
 * they used to disagree, and the hero was the only one that knew.
 */

/** Two characters before anything is fetched, on every surface. */
export const MIN_QUERY_LENGTH = 2;

/**
 * How long typing has to pause before the query goes to the server.
 *
 * One number, because three surfaces searching the same corpus at 250ms, 250ms
 * and 300ms is a difference no user asked for and no reader can justify.
 */
export const SEARCH_DEBOUNCE_MS = 250;

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

/** An ECO code as typed: family letter plus two digits. Codes are exactly
    three characters, so this is a whole code and never a prefix. */
const ECO_CODE_PATTERN = /^[a-e]\d{2}$/;

export function isEcoCode(query: string): boolean {
  return ECO_CODE_PATTERN.test(query.trim().toLowerCase());
}

/**
 * How people actually type opening names.
 *
 * Expanded before the query leaves the client, on every surface. The server's
 * fuzzy index matches on the literal string, so "kid" unexpanded returns 12,093
 * results led by the Kiddie Countergambit and Reti: KIA — the hero expanded it
 * and got the King's Indian, the top bar did not and got that. Same two
 * characters, two different products.
 */
const ABBREVIATION_MAP: Record<string, string> = {
  qgd: "Queen's Gambit Declined",
  qga: "Queen's Gambit Accepted",
  kid: "King's Indian Defense",
  qid: "Queen's Indian Defense",
  ck: 'Caro-Kann Defense',
  caro: 'Caro-Kann Defense',
  ruy: 'Ruy Lopez',
  rl: 'Ruy Lopez',
  nimzo: 'Nimzo-Indian Defense',
  grunfeld: 'Grunfeld Defense',
  grünfeld: 'Grunfeld Defense',
  benoni: 'Benoni Defense',
  slav: 'Slav Defense',
  catalan: 'Catalan Opening',
  dutch: 'Dutch Defense',
  london: 'London System',
  trompowsky: 'Trompowsky Attack',
  tromp: 'Trompowsky Attack',
  pirc: 'Pirc Defense',
  alekhine: "Alekhine's Defense",
  scandi: 'Scandinavian Defense',
  petroff: "Petrov's Defense",
  petrov: "Petrov's Defense",
  vienna: 'Vienna Game',
  scotch: 'Scotch Game',
  italian: 'Italian Game',
  giuoco: 'Italian Game',
  evans: 'Evans Gambit',
  marshall: 'Marshall Attack',
  berlin: 'Berlin Defense',
  sveshnikov: 'Sveshnikov Sicilian',
  dragon: 'Sicilian Dragon',
  najdorf: 'Sicilian Najdorf',
  scheveningen: 'Sicilian Scheveningen',
  bogo: 'Bogo-Indian Defense',
};

export function expandAbbreviations(query: string): string {
  return ABBREVIATION_MAP[query.toLowerCase().trim()] || query;
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
