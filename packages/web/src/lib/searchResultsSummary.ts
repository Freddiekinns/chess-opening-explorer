/**
 * The one line of feedback above a result list.
 *
 * The design deliberately has no "did you mean", no correction notice and no
 * explanation of what was understood — fuzzy matching already absorbs the
 * typo, so the right openings appearing *is* the feedback, and a count line
 * says how many there are. That only works if the count is true: "14 openings
 * match" printed above a list of eight is the same class of fabrication as an
 * invented win rate. Every phrasing here is checkable against what is on
 * screen.
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

interface SummarisableResult {
  moves?: string;
}

/**
 * The opening move shared by every result, or null.
 *
 * Two things this must not do. It must not claim "openings begin with 1. d4"
 * when the scorer also matches moves further down the line — one result that
 * merely contains the move disqualifies the phrasing. And it returns the
 * token as the *data* spells it rather than as the user typed it: case is
 * semantic in algebraic notation, so echoing a typed "nf3" back would print a
 * move that does not exist.
 */
function sharedOpeningMove(query: string, results: SummarisableResult[]): string | null {
  if (!isChessMove(query) || results.length === 0) return null;

  const wanted = query.trim().toLowerCase();
  let token: string | null = null;

  for (const result of results) {
    const opening = /^1\.\s*(\S+)/.exec(result.moves?.trim() ?? '');
    if (!opening || opening[1].toLowerCase() !== wanted) return null;
    token = opening[1];
  }

  return token;
}

export interface ResultsSummaryInput {
  query: string;
  /** The results actually rendered — not the page of them that was fetched. */
  results: SummarisableResult[];
  /** True match count before truncation, where the source reports one. */
  total?: number;
}

export function summariseResults({ query, results, total }: ResultsSummaryInput): string {
  const shown = results.length;
  if (shown === 0) return '';

  const move = sharedOpeningMove(query, results);

  // More matches exist than this list can reach. Say that the list is a top
  // slice — but not how deep it goes. The total the search reports is a count
  // of everything scoring above zero, which for "sicilian" is 4,269 against a
  // family of about 1,710: true as arithmetic, and read by anyone as a claim
  // about how many Sicilians exist. There is no "load more" by design, so
  // this line is the only place the truncation shows at all.
  if (typeof total === 'number' && total > shown) {
    return move ? `Top ${shown} begin with 1. ${move}` : `Top ${shown} matches`;
  }

  if (move) {
    return shown === 1
      ? `1 opening begins with 1. ${move}`
      : `${shown.toLocaleString()} openings begin with 1. ${move}`;
  }

  return shown === 1 ? '1 opening matches' : `${shown.toLocaleString()} openings match`;
}
