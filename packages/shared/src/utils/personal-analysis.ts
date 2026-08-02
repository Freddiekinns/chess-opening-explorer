/**
 * Pure PGN → dashboard reduction for the Analyse page.
 *
 * Lives in `shared` rather than in `packages/web` because the sample-report
 * generator (plain Node, `tools/sample-reports/`) computes the committed
 * fixtures with exactly this code. If it were duplicated, the fixtures could
 * drift from what the page shows and nothing would catch it.
 *
 * Its tests live in `packages/web/src/components/personal/__tests__/` — this
 * package's own `tests/` directory is run by neither Jest nor Vitest.
 */
import { lookupOpeningFromPGN, type OpeningForLookup } from './pgn-utils.js';

export type Side = 'white' | 'black';
export type Result = 'win' | 'draw' | 'loss';
export type AggSortMode = 'frequency' | 'best' | 'worst';

export interface OpeningAgg {
  fen: string;
  name: string;
  eco: string;
  moves: string;
  family_id?: string;
  games: number;
  win: number;
  draw: number;
  loss: number;
}

export interface DashboardData {
  totalGames: number;
  classifiedGames: number;
  unclassifiedGames: number;
  /**
   * `whiteGames` / `blackGames` count games whose opening was *matched* — they
   * label the opening lists, so they equal the sum of the rows beneath them.
   *
   * `whiteWin`/`Draw`/`Loss` (and the black pair) count every game whose result
   * we could read, matched or not. They feed the record card, and an opening we
   * failed to recognise is a gap in our data, not a game the player didn't
   * play. The two therefore diverge whenever `unclassifiedGames > 0`, which is
   * intended: the record is the player's, the lists are ours.
   */
  whiteGames: number;
  whiteWin: number;
  whiteDraw: number;
  whiteLoss: number;
  blackGames: number;
  blackWin: number;
  blackDraw: number;
  blackLoss: number;
  asWhite: OpeningAgg[];
  asBlack: OpeningAgg[];
}

export function parsePgnHeaders(pgn: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const lines = (pgn || '').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('[')) continue;
    const m = trimmed.match(/^\[([^\s]+)\s+"(.*)"\]$/);
    if (!m) continue;
    headers[m[1]] = m[2];
  }
  return headers;
}

export function getUserSide(headers: Record<string, string>, username: string): Side | null {
  const u = username.toLowerCase();
  const white = (headers.White || '').toLowerCase();
  const black = (headers.Black || '').toLowerCase();
  if (white === u) return 'white';
  if (black === u) return 'black';
  return null;
}

export function getUserResult(headers: Record<string, string>, side: Side): Result | null {
  const r = headers.Result;
  if (!r) return null;
  if (r === '1/2-1/2') return 'draw';
  if (r === '1-0') return side === 'white' ? 'win' : 'loss';
  if (r === '0-1') return side === 'black' ? 'win' : 'loss';
  return null;
}

export function sortAgg(list: OpeningAgg[], mode: AggSortMode = 'frequency'): OpeningAgg[] {
  return [...list].sort((a, b) => {
    if (mode === 'best') return b.win / b.games - a.win / a.games;
    if (mode === 'worst') return a.win / a.games - b.win / b.games;
    if (b.games !== a.games) return b.games - a.games;
    if (b.win !== a.win) return b.win - a.win;
    return (a.name || '').localeCompare(b.name || '');
  });
}

export function upsertAgg(
  map: Map<string, OpeningAgg>,
  opening: { fen: string; name: string; eco: string; moves?: string; family_id?: string },
  result: Result
): void {
  const existing = map.get(opening.fen) || {
    fen: opening.fen,
    name: opening.name,
    eco: opening.eco,
    moves: opening.moves || '',
    family_id: opening.family_id,
    games: 0,
    win: 0,
    draw: 0,
    loss: 0,
  };

  existing.games += 1;
  existing[result] += 1;
  map.set(opening.fen, existing);
}

export interface AnalyseGamesOptions {
  /** Called once per game, classified or not, with (processed, total). */
  onProgress?: (processed: number, total: number) => void;
  /** Checked before each game; a true return abandons the run. */
  shouldAbort?: () => boolean;
  /** Yield to the host every N games so a UI caller stays responsive. */
  yieldEvery?: number;
}

/**
 * Reduces a run of PGNs to the dashboard the page renders.
 * Resolves `null` if `shouldAbort` fired — a partial run is not a result.
 */
export async function analyseGames(
  gamesPgn: string[],
  username: string,
  openingsMap: Map<string, OpeningForLookup>,
  options: AnalyseGamesOptions = {}
): Promise<DashboardData | null> {
  const { onProgress, shouldAbort, yieldEvery = 10 } = options;

  const asWhite = new Map<string, OpeningAgg>();
  const asBlack = new Map<string, OpeningAgg>();
  let classified = 0;
  let unclassified = 0;
  let whiteGames = 0;
  let whiteWin = 0;
  let whiteDraw = 0;
  let whiteLoss = 0;
  let blackGames = 0;
  let blackWin = 0;
  let blackDraw = 0;
  let blackLoss = 0;

  for (let i = 0; i < gamesPgn.length; i++) {
    if (shouldAbort?.()) return null;

    const pgn = gamesPgn[i];
    const headers = parsePgnHeaders(pgn);
    const side = getUserSide(headers, username);
    const result = side ? getUserResult(headers, side) : null;
    const lookup = side && result ? lookupOpeningFromPGN(pgn, openingsMap) : null;

    // The record counts every game we could read a result for, whether or not
    // we recognised its opening. Tallying inside the classified branch made
    // "Your record" quietly drop real results — a player with 17 unrecognised
    // games saw a record over the other 138 under a header stating 155.
    if (side && result) {
      if (side === 'white') {
        if (result === 'win') whiteWin += 1;
        if (result === 'draw') whiteDraw += 1;
        if (result === 'loss') whiteLoss += 1;
      } else {
        if (result === 'win') blackWin += 1;
        if (result === 'draw') blackDraw += 1;
        if (result === 'loss') blackLoss += 1;
      }
    }

    if (!side || !result || !lookup?.success || !lookup.bestMatch) {
      unclassified += 1;
    } else {
      classified += 1;
      const opening = { ...lookup.bestMatch, moves: lookup.bestMatch.moves || '' };
      if (side === 'white') {
        upsertAgg(asWhite, opening, result);
        whiteGames += 1;
      } else {
        upsertAgg(asBlack, opening, result);
        blackGames += 1;
      }
    }

    onProgress?.(i + 1, gamesPgn.length);

    if (yieldEvery > 0 && (i + 1) % yieldEvery === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  return {
    totalGames: gamesPgn.length,
    classifiedGames: classified,
    unclassifiedGames: unclassified,
    whiteGames,
    whiteWin,
    whiteDraw,
    whiteLoss,
    blackGames,
    blackWin,
    blackDraw,
    blackLoss,
    // Full lists, untruncated — family rollups aggregate over every opening.
    // The flat "all openings" view caps its own display.
    asWhite: sortAgg(Array.from(asWhite.values())),
    asBlack: sortAgg(Array.from(asBlack.values())),
  };
}
