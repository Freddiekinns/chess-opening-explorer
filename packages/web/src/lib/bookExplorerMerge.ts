/**
 * Merges live explorer move stats into the opening-book move lists
 * (sidebar unification — docs/proposals/2026-07-11-sidebar-unification.md).
 *
 * The book tree is the backbone: book rows always render and stay navigable
 * even with no explorer data. When explorer data for the active level is
 * available, matched rows gain W/D/L stats and re-rank by actual play, and
 * popular moves with no page in the book join as inert "off-book" rows.
 * Explorer moves under MIN_MOVE_SAMPLE games are ignored outright — a result
 * bar over a handful of games looks like data but is noise.
 *
 * Without explorer data (still loading, or Lichess unavailable) book rows
 * fall back to their bundled snapshot stats (all rated Lichess games), so the
 * book keeps the same visual language either way — just no off-book rows.
 * The two sources are never mixed within one list: snapshot bars next to
 * band-specific live bars would silently compare different populations.
 */

import type { ExplorerMove } from './lichessExplorer';

export const MIN_MOVE_SAMPLE = 20;
const OFF_BOOK_CAP = 3;
const OFF_BOOK_MIN_SHARE = 0.02;

export interface BookMoveInput {
  /** Bare SAN — move number already stripped. */
  san: string;
  name: string;
  fen: string;
  /** Book games (or lines) — the metric shown when no explorer data exists. */
  count: number;
  /** Snapshot W/D/L for this move's position — fallback when live data is absent. */
  snapshotStats?: MoveStats | null;
}

export interface MoveStats {
  games: number;
  whitePct: number;
  drawPct: number;
  blackPct: number;
}

export interface MergedMoveRow {
  key: string;
  san: string;
  /** null = off-book: the move has no page, the row is not navigable. */
  name: string | null;
  fen: string | null;
  count: number;
  stats: MoveStats | null;
}

/** Normalise SAN for matching: strip check/mate/annotation suffixes, unify castling glyphs. */
export function normaliseSan(san: string): string {
  return san
    .trim()
    .replace(/[+#!?]+$/, '')
    .replace(/^0-0-0/, 'O-O-O')
    .replace(/^0-0/, 'O-O');
}

function toStats(move: ExplorerMove): MoveStats {
  return {
    games: move.games,
    whitePct: move.whitePct,
    drawPct: move.drawPct,
    blackPct: move.blackPct,
  };
}

export function mergeExplorerMoves(
  book: BookMoveInput[],
  explorer: ExplorerMove[] | null,
  opts: { excludeSans?: string[] } = {}
): MergedMoveRow[] {
  const bookRows: MergedMoveRow[] = book.map((entry) => ({
    key: entry.fen,
    san: entry.san,
    name: entry.name,
    fen: entry.fen,
    count: entry.count,
    stats: null,
  }));

  if (!explorer || explorer.length === 0) {
    // No live data: fall back to snapshot stats, same sample floor.
    for (let i = 0; i < bookRows.length; i++) {
      const snapshot = book[i].snapshotStats;
      if (snapshot && snapshot.games >= MIN_MOVE_SAMPLE) {
        bookRows[i].stats = snapshot;
      }
    }
    return bookRows;
  }

  const totalGames = explorer.reduce((sum, move) => sum + move.games, 0);
  const unmatched = new Map<string, ExplorerMove>();
  for (const move of explorer) {
    if (move.games >= MIN_MOVE_SAMPLE) unmatched.set(normaliseSan(move.san), move);
  }

  for (const row of bookRows) {
    const norm = normaliseSan(row.san);
    const match = unmatched.get(norm);
    if (match) {
      row.stats = toStats(match);
      unmatched.delete(norm);
    }
  }

  const excluded = new Set((opts.excludeSans ?? []).map(normaliseSan));
  const offBook: MergedMoveRow[] = [...unmatched.entries()]
    .filter(([norm]) => !excluded.has(norm))
    .filter(([, move]) => totalGames > 0 && move.games / totalGames >= OFF_BOOK_MIN_SHARE)
    .sort(([, left], [, right]) => right.games - left.games)
    .slice(0, OFF_BOOK_CAP)
    .map(([norm, move]) => ({
      key: `off:${norm}`,
      san: norm,
      name: null,
      fen: null,
      count: 0,
      stats: toStats(move),
    }));

  const ranked = [...bookRows.filter((row) => row.stats), ...offBook].sort(
    (left, right) => (right.stats?.games ?? 0) - (left.stats?.games ?? 0)
  );
  const unranked = bookRows.filter((row) => !row.stats);
  return [...ranked, ...unranked];
}
