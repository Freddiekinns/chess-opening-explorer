import type { OpeningAggInput, SortMode } from './familyAggregation';
import type { OpeningAgg } from '../../../../shared/src/utils/personal-analysis';

/* ==============================
   THE REDUCTION LIVES IN `shared`
   The sample-report generator (tools/sample-reports/) is plain Node and cannot
   import web TypeScript, so the PGN reduction and its per-game helpers moved to
   packages/shared — one implementation, no drift between the committed
   fixtures and what the page computes. Re-exported here because this module is
   the barrel every personal-stats caller already imports.
   ============================== */
export {
  parsePgnHeaders,
  getUserSide,
  getUserResult,
  sortAgg,
  upsertAgg,
} from '../../../../shared/src/utils/personal-analysis';
export type {
  Side,
  Result,
  OpeningAgg,
  DashboardData,
} from '../../../../shared/src/utils/personal-analysis';

/* ==============================
   TYPES
   ============================== */
export type GroupBy = 'family' | 'variation';

export type Platform = 'lichess' | 'chess.com';

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

export const toAggInput = (o: OpeningAgg): OpeningAggInput => ({
  key: o.fen,
  name: o.name,
  eco: o.eco,
  moves: o.moves,
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
