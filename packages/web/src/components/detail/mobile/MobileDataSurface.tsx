import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import LevelLens from '../LevelLens';
import type { TreeContext } from '../../../hooks/useOpeningTree';
import type { ExplorerQuery } from '../../../hooks/useExplorerResult';
import { mergeExplorerMoves, type MergedMoveRow } from '../../../lib/bookExplorerMerge';
import {
  deduplicateAncestors,
  formatCount,
  getMoveNumber,
  pliesFromFen,
  sortNodesByPopularity,
  stripMoveNumber,
} from '../../../lib/openingBook';
import { getBand, type BandId, type ExplorerResult } from '../../../lib/lichessExplorer';
import styles from './MobileDataSurface.module.css';

/**
 * The mobile "one data surface" (Claude Design handoff, Opening Details
 * Mobile 2a): level pills, level stats, breadcrumb, continuations and
 * alternatives in a single card, so changing the level visibly re-shades
 * every number below it. Replaces the separate WinRatePanel +
 * OpeningNavigator cards on ≤767px only — desktop keeps both.
 */

const MIN_LIVE_SAMPLE = 100;
const ROWS_COLLAPSED_LIMIT = 5;

interface PopularityStats {
  games_analyzed?: number;
  white_win_rate?: number;
  black_win_rate?: number;
  draw_rate?: number;
  avg_rating?: number;
  analysis_date?: string;
}

interface MobileDataSurfaceProps {
  fen: string;
  band: BandId | null;
  onBandChange: (band: BandId | null) => void;
  /** Snapshot stats (all rated Lichess games) — fallback when live data fails. */
  popularityStats: PopularityStats | null;
  /** Live explorer query for the current position at the active band. */
  explorer: ExplorerQuery;
  /** Explorer stats for the parent position — powers the alternatives rows. */
  parentExplorer: ExplorerResult | null;
  treeData: TreeContext | null;
}

interface StatsView {
  games: string;
  elo: string | null;
  whitePct: number;
  drawPct: number;
  blackPct: number;
  meta: string;
}

function bandMeta(band: BandId): string {
  if (band === 'masters') return 'Master games · live';
  if (band === 'all') return 'All Lichess games · live';
  return `Lichess games, ${getBand(band).range} · live`;
}

function liveStatsView(result: ExplorerResult, band: BandId): StatsView | null {
  if (result.totalGames < MIN_LIVE_SAMPLE) return null;
  return {
    games: formatCount(result.totalGames),
    elo: result.averageRating ? Math.round(result.averageRating).toLocaleString() : null,
    whitePct: Math.round((result.white / result.totalGames) * 100),
    drawPct: Math.round((result.draws / result.totalGames) * 100),
    blackPct: Math.round((result.black / result.totalGames) * 100),
    meta: bandMeta(band),
  };
}

function snapshotStatsView(stats: PopularityStats | null): StatsView | null {
  if (!stats?.games_analyzed) return null;
  return {
    games: formatCount(stats.games_analyzed),
    elo: stats.avg_rating ? Math.round(stats.avg_rating).toLocaleString() : null,
    whitePct: Math.round((stats.white_win_rate || 0) * 100),
    drawPct: Math.round((stats.draw_rate || 0) * 100),
    blackPct: Math.round((stats.black_win_rate || 0) * 100),
    meta: stats.analysis_date
      ? `All Lichess games · updated ${stats.analysis_date}`
      : 'All Lichess games',
  };
}

function rowStatsTitle(row: MergedMoveRow): string | undefined {
  if (!row.stats) return undefined;
  const { whitePct, drawPct, blackPct, games } = row.stats;
  return (
    `White wins ${Math.round(whitePct)}% · draws ${Math.round(drawPct)}% · ` +
    `black wins ${Math.round(blackPct)}% (${formatCount(games)} games)`
  );
}

const MoveRow: React.FC<{ row: MergedMoveRow; ply: number; countLabel: string }> = ({
  row,
  ply,
  countLabel,
}) => {
  const inner = (
    <>
      <span className={styles.rowTop}>
        <span className={styles.rowSan}>
          {getMoveNumber(ply)}
          {row.san}
        </span>
        {row.name === null && <span className={styles.offBookTag}>off-book</span>}
        <span className={styles.rowName}>{row.name ?? ''}</span>
      </span>
      <span className={styles.rowBottom}>
        {row.stats ? (
          <>
            <span className={styles.rowPctWhite}>{Math.round(row.stats.whitePct)}%</span>
            <span className={styles.rowBar} aria-hidden="true">
              <span className={styles.rowBarWhite} style={{ width: `${row.stats.whitePct}%` }} />
              <span className={styles.rowBarDraw} style={{ width: `${row.stats.drawPct}%` }} />
              <span className={styles.rowBarBlack} style={{ width: `${row.stats.blackPct}%` }} />
            </span>
            <span className={styles.rowPctBlack}>{Math.round(row.stats.blackPct)}%</span>
            <span className={styles.rowGames}>{formatCount(row.stats.games)} games</span>
          </>
        ) : (
          <span className={styles.rowGames}>
            {row.count > 0 ? `${formatCount(row.count)} ${countLabel}` : '—'}
          </span>
        )}
      </span>
    </>
  );

  if (row.fen === null) {
    return (
      <div className={`${styles.moveRow} ${styles.moveRowOffBook}`} title={rowStatsTitle(row)}>
        {inner}
      </div>
    );
  }
  return (
    <Link
      to={`/opening/${encodeURIComponent(row.fen)}`}
      className={styles.moveRow}
      title={rowStatsTitle(row)}
    >
      {inner}
    </Link>
  );
};

const MoveRowList: React.FC<{ rows: MergedMoveRow[]; ply: number; countLabel: string }> = ({
  rows,
  ply,
  countLabel,
}) => {
  const [expanded, setExpanded] = useState(false);
  const canCollapse = rows.length > ROWS_COLLAPSED_LIMIT;
  const visible = canCollapse && !expanded ? rows.slice(0, ROWS_COLLAPSED_LIMIT) : rows;

  return (
    <>
      <div className={styles.rowList}>
        {visible.map((row) => (
          <MoveRow key={row.key} row={row} ply={ply} countLabel={countLabel} />
        ))}
      </div>
      {canCollapse && (
        <button type="button" className={styles.showMoreBtn} onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Show less' : `Show ${rows.length - ROWS_COLLAPSED_LIMIT} more`}
        </button>
      )}
    </>
  );
};

export const MobileDataSurface: React.FC<MobileDataSurfaceProps> = ({
  fen,
  band,
  onBandChange,
  popularityStats,
  explorer,
  parentExplorer,
  treeData,
}) => {
  const [crumbOpen, setCrumbOpen] = useState(false);

  // Hold the last live result while a band switch is loading so the stats
  // dim instead of flashing to a placeholder (design's loading treatment).
  // A new position drops the held result — stale numbers must never carry
  // across pages.
  const lastResultRef = useRef<{ fen: string; band: BandId; result: ExplorerResult } | null>(null);
  useEffect(() => {
    if (explorer.result && band) {
      lastResultRef.current = { fen, band, result: explorer.result };
    }
  }, [explorer.result, fen, band]);
  useEffect(() => {
    setCrumbOpen(false);
    if (lastResultRef.current && lastResultRef.current.fen !== fen) {
      lastResultRef.current = null;
    }
  }, [fen]);

  const heldResult =
    explorer.result ?? (lastResultRef.current?.fen === fen ? lastResultRef.current.result : null);
  const heldBand = explorer.result ? band : (lastResultRef.current?.band ?? band);

  const snapshotView = snapshotStatsView(popularityStats);
  const liveView = band && heldResult && heldBand ? liveStatsView(heldResult, heldBand) : null;
  const statsView = band && !explorer.failed ? liveView : snapshotView;
  const loadingDim = explorer.loading;
  const tooFewGames =
    Boolean(band) && !explorer.loading && !explorer.failed && heldResult !== null && !liveView;

  // ── Opening book lists (same rules as the desktop OpeningNavigator) ──
  const current = treeData?.current ?? null;
  const ancestors = treeData?.ancestors ?? [];
  const children = treeData?.children ?? [];
  const siblings = treeData?.siblings ?? [];

  const pliesPlayed = current ? (pliesFromFen(current.fen) ?? ancestors.length + 1) : 0;
  const currentMoveIdx = pliesPlayed - 1;
  const breadcrumbAncestors = deduplicateAncestors(ancestors);

  const allNodes = [...children, ...siblings];
  const hasGamesData = allNodes.some((n) => (n.gamesPlayed || 0) > 0);
  const getCount = (node: { gamesPlayed?: number; descendantCount?: number }) =>
    hasGamesData ? node.gamesPlayed || 0 : node.descendantCount || 0;
  const countLabel = hasGamesData ? 'games' : 'lines';

  const childRows = mergeExplorerMoves(
    sortNodesByPopularity(children, getCount).map((child) => ({
      san: stripMoveNumber(child.move),
      name: child.name,
      fen: child.fen,
      count: getCount(child),
      snapshotStats: child.stats ?? null,
    })),
    explorer.result?.moves ?? null
  );
  const currentSan = current ? stripMoveNumber(current.move || '') : '';
  const siblingRows = mergeExplorerMoves(
    sortNodesByPopularity(siblings, getCount).map((sibling) => ({
      san: stripMoveNumber(sibling.move),
      name: sibling.name,
      fen: sibling.fen,
      count: getCount(sibling),
      snapshotStats: sibling.stats ?? null,
    })),
    parentExplorer?.moves ?? null,
    { excludeSans: currentSan ? [currentSan] : [] }
  );

  const alternativesLabel =
    currentSan && currentMoveIdx >= 0
      ? `Instead of ${getMoveNumber(currentMoveIdx)}${currentSan}`
      : 'Alternatives';

  // Collapsed breadcrumb: first crumb › … › last crumb › current move
  const crumbSummary =
    breadcrumbAncestors.length > 2
      ? [breadcrumbAncestors[0].name, '…', breadcrumbAncestors[breadcrumbAncestors.length - 1].name]
      : breadcrumbAncestors.map((a) => a.name);
  const currentShort = currentSan
    ? `${getMoveNumber(Math.max(currentMoveIdx, 0))}${currentSan}`
    : (current?.name ?? '');

  const hasBook = current !== null && (childRows.length > 0 || siblingRows.length > 0);
  if (!statsView && !loadingDim && !tooFewGames && !hasBook) return null;

  return (
    <div className={styles.surface}>
      <div className={styles.gradientStrip} aria-hidden="true" />

      <div className={styles.stickyHeader}>
        <LevelLens band={band} onChange={onBandChange} scrollable />
      </div>

      <div
        className={`${styles.statsBlock} ${loadingDim ? styles.dimmed : ''}`}
        aria-busy={loadingDim || undefined}
      >
        {statsView ? (
          <>
            <div className={styles.statsHeader}>
              <span className={styles.statGroup}>
                <span className={styles.statLabel}>
                  {band && !explorer.failed ? 'Games at this level' : 'Total games'}
                </span>
                <span className={styles.statValue}>{statsView.games}</span>
              </span>
              {statsView.elo && (
                <span className={`${styles.statGroup} ${styles.statGroupRight}`}>
                  <span className={styles.statLabel}>Average Elo</span>
                  <span className={`${styles.statValue} ${styles.statValueElo}`}>
                    {statsView.elo}
                  </span>
                </span>
              )}
            </div>
            <div className={styles.resultBar} aria-hidden="true">
              <span className={styles.resultWhite} style={{ width: `${statsView.whitePct}%` }} />
              <span className={styles.resultDraw} style={{ width: `${statsView.drawPct}%` }} />
              <span className={styles.resultBlack} style={{ width: `${statsView.blackPct}%` }} />
            </div>
            <div className={styles.resultLegend}>
              <span className={styles.legendWhite}>White {statsView.whitePct}%</span>
              <span>Draws {statsView.drawPct}%</span>
              <span className={styles.legendBlack}>Black {statsView.blackPct}%</span>
            </div>
            {band && explorer.failed && (
              <div className={styles.statsNote} role="status">
                Live Lichess data isn't available right now — showing a saved snapshot instead.
              </div>
            )}
            <div className={styles.statsMeta}>{statsView.meta}</div>
          </>
        ) : tooFewGames ? (
          <div className={styles.statsPlaceholder}>
            Not enough games at this level to show reliable numbers.
          </div>
        ) : (
          <div className={styles.statsPlaceholder} role="status">
            Loading Lichess data…
          </div>
        )}
      </div>

      {hasBook && current && (
        <div className={`${styles.bookBlock} ${loadingDim ? styles.dimmed : ''}`}>
          {breadcrumbAncestors.length > 0 &&
            (crumbOpen ? (
              <div className={styles.crumbOpen}>
                <span className={styles.crumbPath}>
                  {breadcrumbAncestors.map((ancestor) => (
                    <span key={ancestor.fen} className={styles.crumbSegment}>
                      <Link
                        to={`/opening/${encodeURIComponent(ancestor.fen)}`}
                        className={styles.crumbLink}
                      >
                        {ancestor.name}
                      </Link>
                      <span className={styles.crumbSep} aria-hidden="true">
                        ›
                      </span>
                    </span>
                  ))}
                  <span className={styles.crumbCurrent}>{current.name}</span>
                </span>
                <button
                  type="button"
                  className={styles.crumbToggle}
                  aria-expanded="true"
                  aria-label="Collapse opening hierarchy"
                  onClick={() => setCrumbOpen(false)}
                >
                  <ChevronDown size={14} className={styles.crumbChevronOpen} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className={styles.crumbClosed}
                aria-expanded="false"
                aria-label="Show opening hierarchy"
                onClick={() => setCrumbOpen(true)}
              >
                <span className={styles.crumbSummary}>
                  {crumbSummary.map((name, i) => (
                    <React.Fragment key={i}>
                      {name}
                      <span className={styles.crumbSep} aria-hidden="true">
                        {' › '}
                      </span>
                    </React.Fragment>
                  ))}
                  <span className={styles.crumbCurrentMove}>{currentShort}</span>
                </span>
                <ChevronDown size={14} className={styles.crumbChevron} />
              </button>
            ))}

          {childRows.length > 0 && (
            <>
              <div className={styles.bookHeading}>Continuations</div>
              <MoveRowList rows={childRows} ply={pliesPlayed} countLabel={countLabel} />
            </>
          )}

          {siblingRows.length > 0 && (
            <>
              <div className={`${styles.bookHeading} ${styles.bookHeadingAlt}`}>
                {alternativesLabel}
              </div>
              <div className={styles.bookSubheading}>Most popular alternatives</div>
              <MoveRowList rows={siblingRows} ply={currentMoveIdx} countLabel={countLabel} />
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MobileDataSurface;
