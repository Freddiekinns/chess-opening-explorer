import { getBand, type BandId, type ExplorerResult } from './lichessExplorer';
import { formatCount } from './openingBook';

/**
 * One source for every level-dependent label and stat figure on the opening
 * detail page (UX review phase 4). The desktop ExplorerCard and the mobile
 * data surface are separate shells by design, so the only way their numbers
 * and wording cannot drift is to import them from the same place.
 *
 * The honesty rules live here too: a live view below MIN_LIVE_SAMPLE is null
 * rather than a small-sample percentage, a missing Elo is null rather than a
 * zero, and the source line never says "Lichess · <level>" while the card is
 * actually serving the bundled snapshot.
 */

/** Below this a band's percentages are noise, so we show a note instead. */
export const MIN_LIVE_SAMPLE = 100;

export interface StatsView {
  games: string;
  /** Null when the explorer reports no ratings — never a fabricated 0. */
  elo: string | null;
  whitePct: number;
  drawPct: number;
  blackPct: number;
}

export interface PopularityStats {
  games_analyzed?: number;
  white_win_rate?: number;
  black_win_rate?: number;
  draw_rate?: number;
  avg_rating?: number;
  analysis_date?: string;
}

/**
 * How a band is named inside a sentence. The rating range, not the learner
 * label: "Games · 1400–1800" states the scope, "Games · Intermediate" only
 * repeats the pill the reader just pressed.
 */
export function levelEcho(band: BandId): string {
  if (band === 'masters') return 'masters';
  return getBand(band).range ?? 'all ratings';
}

/** Header source line. `live` false means the card is serving the snapshot. */
export function explorerSourceLine(
  band: BandId | null,
  live: boolean,
  analysisDate?: string
): string {
  if (band && live) return `Lichess · ${levelEcho(band)}`;
  return `Saved snapshot · ${analysisDate ? `updated ${analysisDate}` : 'all rated games'}`;
}

/** Label above the games figure. */
export function gamesStatLabel(band: BandId | null, live: boolean): string {
  return band && live ? `Games · ${levelEcho(band)}` : 'Total games';
}

/** Caption under "Next moves". */
export function movesCaption(band: BandId | null, live: boolean): string {
  return band && live ? `Most popular at ${levelEcho(band)}` : 'Most popular next moves';
}

/** Caption under "Instead of <move>". */
export function alternativesCaption(band: BandId | null, live: boolean): string {
  return band && live
    ? `Most popular alternatives at ${levelEcho(band)}`
    : 'Most popular alternatives';
}

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

export function liveStatsView(result: ExplorerResult): StatsView | null {
  if (result.totalGames < MIN_LIVE_SAMPLE) return null;
  return {
    games: formatCount(result.totalGames),
    elo: result.averageRating ? Math.round(result.averageRating).toLocaleString() : null,
    whitePct: pct(result.white, result.totalGames),
    drawPct: pct(result.draws, result.totalGames),
    blackPct: pct(result.black, result.totalGames),
  };
}

export function snapshotStatsView(stats: PopularityStats | null): StatsView | null {
  if (!stats?.games_analyzed) return null;
  return {
    games: formatCount(stats.games_analyzed),
    elo: stats.avg_rating ? Math.round(stats.avg_rating).toLocaleString() : null,
    whitePct: Math.round((stats.white_win_rate || 0) * 100),
    drawPct: Math.round((stats.draw_rate || 0) * 100),
    blackPct: Math.round((stats.black_win_rate || 0) * 100),
  };
}
