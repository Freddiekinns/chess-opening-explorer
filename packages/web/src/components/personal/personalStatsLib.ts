import type { OpeningAggInput, SortMode } from './familyAggregation';

/* ==============================
   TYPES
   ============================== */
export type GroupBy = 'family' | 'variation';

export type Platform = 'lichess' | 'chess.com';

export type Side = 'white' | 'black';

export type Result = 'win' | 'draw' | 'loss';

export type SideTab = 'white' | 'black';

/* ==============================
   CONTROL OPTION CONSTANTS
   (live here, not in PersonalStatsControls.tsx — mixing constant and
   component exports breaks Vite fast refresh and the lint gate)
   ============================== */
export const SORT_LABELS: Record<SortMode, string> = {
  frequency: 'Most played',
  best: 'Highest win rate',
  worst: 'Lowest win rate',
};

export const SORT_ORDER: ReadonlyArray<SortMode> = ['frequency', 'best', 'worst'];

export const SIDE_OPTIONS: ReadonlyArray<{ value: SideTab; label: string }> = [
  { value: 'white', label: 'As White' },
  { value: 'black', label: 'As Black' },
];

export type OpeningAgg = {
  fen: string;
  name: string;
  eco: string;
  moves: string;
  family_id?: string;
  games: number;
  win: number;
  draw: number;
  loss: number;
};

export type DashboardData = {
  totalGames: number;
  classifiedGames: number;
  unclassifiedGames: number;
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
};

export const toAggInput = (o: OpeningAgg): OpeningAggInput => ({
  key: o.fen,
  name: o.name,
  eco: o.eco,
  family_id: o.family_id,
  games: o.games,
  wins: o.win,
  draws: o.draw,
  losses: o.loss,
});

/* ==============================
   SESSION STORAGE KEYS
   ============================== */
export const FORM_STATE_KEY = 'personal-openings:form-state';
export const LAST_ANALYSIS_SNAPSHOT_KEY = 'personal-openings:last-analysis-snapshot';

export function readSavedFormState(): {
  username?: string;
  platform?: Platform;
  limit?: number;
  activeTab?: SideTab;
} | null {
  try {
    const raw = sessionStorage.getItem(FORM_STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/* ==============================
   PURE HELPERS
   ============================== */
export function clampInt(value: unknown, min: number, max: number, fallback: number) {
  const n = Number.parseInt(String(value), 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export function normalizeUsername(value: string) {
  return value.trim();
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

export function sortAgg(list: OpeningAgg[], mode: SortMode = 'frequency') {
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
) {
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

export function getWinRate(o: OpeningAgg): number {
  if (o.games === 0) return 0;
  return Math.round((o.win / o.games) * 100);
}

export function getLossRate(o: OpeningAgg): number {
  if (o.games === 0) return 0;
  return Math.round((o.loss / o.games) * 100);
}

// Featured cards need a few games behind them — a 2-game 100% line shouldn't
// headline "Top-performing". (The opening list/sort have no such floor.)
export const MIN_CARD_GAMES = 4;

export function findBestOpening(list: OpeningAgg[]): OpeningAgg | null {
  if (list.length === 0) return null;
  const qualified = list.filter((o) => o.games >= MIN_CARD_GAMES);
  if (qualified.length === 0) return list[0];
  return qualified.reduce((best, curr) => (getWinRate(curr) > getWinRate(best) ? curr : best));
}

export function findWeakestOpening(list: OpeningAgg[]): OpeningAgg | null {
  if (list.length === 0) return null;
  const qualified = list.filter((o) => o.games >= MIN_CARD_GAMES);
  if (qualified.length === 0) return null;
  // Select by highest loss rate so "Needs work" matches the loss rate the card
  // displays (lowest win rate could flag a safe, drawish line as a weakness).
  return qualified.reduce((worst, curr) => (getLossRate(curr) > getLossRate(worst) ? curr : worst));
}

export function getOpeningMovesDisplay(moves: string): string {
  const trimmedMoves = moves.trim();
  if (!trimmedMoves) return '';

  const movePattern = /(\d+\.\s*\S+(?:\s+\S+)?)/g;
  const moveMatches = trimmedMoves.match(movePattern) || [];

  if (moveMatches.length > 0) {
    return moveMatches.slice(0, 2).join(' ');
  }

  return trimmedMoves;
}

// Featured cards must distinguish sibling variations ("Vienna Gambit: 3...d6"
// vs "Vienna Game: Vienna Gambit"). Sibling lines share their first moves, so
// when the line is too long keep the tail — that's the distinguishing part.
// Mirrors the search-suggestion fix from the 2026-06-11 design review.
export function formatDistinguishingMoves(moves: string): string {
  if (!moves) return '';
  const trimmed = moves.trim();
  const MAX_LENGTH = 60;
  if (trimmed.length <= MAX_LENGTH) return trimmed;

  const tail = trimmed.slice(-MAX_LENGTH);
  // Start at a move number ("4." / "12.") so we don't show half a move pair
  const moveNumberMatch = tail.match(/\d+\.\s/);
  if (moveNumberMatch && moveNumberMatch.index !== undefined) {
    return '… ' + tail.slice(moveNumberMatch.index);
  }
  const firstSpace = tail.indexOf(' ');
  return '… ' + (firstSpace > -1 ? tail.slice(firstSpace + 1) : tail);
}
