import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { TreeContext } from '../../hooks/useOpeningTree';
import type { ExplorerResult } from '../../lib/lichessExplorer';
import { mergeExplorerMoves, type MergedMoveRow } from '../../lib/bookExplorerMerge';
import styles from './OpeningNavigator.module.css';

const CONTINUATIONS_COLLAPSED_LIMIT = 5;
const ALTERNATIVES_COLLAPSED_LIMIT = 5;

interface OpeningNavigatorProps {
  treeData: TreeContext | null;
  loading: boolean;
  /**
   * Live explorer stats for the current position at the active level.
   * Optional progressive enhancement (sidebar unification): when present,
   * "Next moves" rows re-rank by actual play, gain W/D/L mini bars, and
   * popular moves with no page in the book join as inert off-book rows.
   * Absent or null, the book renders exactly as before.
   */
  explorer?: ExplorerResult | null;
  /** Explorer stats for the parent position — the same treatment for Alternatives. */
  parentExplorer?: ExplorerResult | null;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

/** Strip move numbers like "1. ", "1... ", "12." from a move string */
function stripMoveNumber(move: string): string {
  return move.replace(/^\d+\.+\s*/, '').trim();
}

/** Get the move number prefix for display (e.g. "1." or "2...") */
function getMoveNumber(plyIndex: number): string {
  const moveNum = Math.floor(plyIndex / 2) + 1;
  const isBlack = plyIndex % 2 === 1;
  return isBlack ? `${moveNum}...` : `${moveNum}.`;
}

/**
 * Plies played to reach a position, read straight from the FEN (side to move
 * + fullmove number). The tree's ancestors array is one node per ply but has
 * been observed one short of the true ply, so the FEN is the source of
 * truth; callers fall back to the ancestors count for malformed FENs.
 */
function pliesFromFen(fen: string): number | null {
  const parts = fen.trim().split(/\s+/);
  if (parts.length < 6) return null;
  const side = parts[1];
  const fullmove = parseInt(parts[5], 10);
  if (!Number.isFinite(fullmove) || fullmove < 1 || (side !== 'w' && side !== 'b')) return null;
  return (fullmove - 1) * 2 + (side === 'b' ? 1 : 0);
}

function sortNodesByPopularity<
  T extends { name: string; move: string; gamesPlayed?: number; descendantCount?: number },
>(nodes: T[], getCount: (node: T) => number): T[] {
  return [...nodes].sort((left, right) => {
    const countDelta = getCount(right) - getCount(left);
    if (countDelta !== 0) {
      return countDelta;
    }

    const nameDelta = left.name.localeCompare(right.name);
    if (nameDelta !== 0) {
      return nameDelta;
    }

    return left.move.localeCompare(right.move);
  });
}

/** Deduplicate ancestor breadcrumbs — collapse consecutive ancestors with the same name */
function deduplicateAncestors(
  ancestors: { fen: string; name: string; move: string }[]
): { fen: string; name: string; move: string }[] {
  const result: { fen: string; name: string; move: string }[] = [];
  for (const ancestor of ancestors) {
    if (result.length === 0 || result[result.length - 1].name !== ancestor.name) {
      result.push(ancestor);
    } else {
      // Same name — keep the later one (deeper position)
      result[result.length - 1] = ancestor;
    }
  }
  return result;
}

function statsTitle(row: MergedMoveRow): string | undefined {
  if (!row.stats) return undefined;
  const { whitePct, drawPct, blackPct, games } = row.stats;
  return (
    `White wins ${Math.round(whitePct)}% · draws ${Math.round(drawPct)}% · ` +
    `black wins ${Math.round(blackPct)}% (${formatCount(games)} games)`
  );
}

interface MoveRowsProps {
  rows: MergedMoveRow[];
  ply: number;
  maxCount: number;
  countLabel: string;
  /** True when explorer data drives this list — retires the orange popularity bar. */
  hasStats: boolean;
  alternatives?: boolean;
}

const MoveRows: React.FC<MoveRowsProps> = ({
  rows,
  ply,
  maxCount,
  countLabel,
  hasStats,
  alternatives,
}) => (
  <div className={styles.rows}>
    {rows.map((row, i) => {
      const movePrefix = getMoveNumber(ply);
      const barPercent = maxCount > 0 ? Math.max((row.count / maxCount) * 100, 2) : 0;
      const inner = (
        <>
          <span className={styles.rowMove}>
            {movePrefix}
            {row.san}
          </span>
          {row.name !== null ? (
            <span className={styles.rowName}>{row.name}</span>
          ) : (
            <span className={styles.rowName}>
              <span className={styles.offBookTag}>off-book</span>
            </span>
          )}
          <span className={styles.rowBarWrap}>
            {row.stats ? (
              <span className={styles.resultBar} aria-hidden="true">
                <span className={styles.resultWhite} style={{ width: `${row.stats.whitePct}%` }} />
                <span className={styles.resultDraw} style={{ width: `${row.stats.drawPct}%` }} />
                <span className={styles.resultBlack} style={{ width: `${row.stats.blackPct}%` }} />
              </span>
            ) : !hasStats ? (
              <span className={styles.rowBar} style={{ width: `${barPercent}%` }} />
            ) : null}
          </span>
          <span className={styles.rowCount}>
            {row.stats
              ? `${formatCount(row.stats.games)} games`
              : row.count > 0
                ? `${formatCount(row.count)} ${countLabel}`
                : '—'}
          </span>
        </>
      );

      if (row.fen === null) {
        return (
          <div
            key={row.key}
            className={`${styles.contRow} ${styles.offBookRow}`}
            style={{ animationDelay: `${i * 30}ms` }}
            title={statsTitle(row)}
          >
            {inner}
          </div>
        );
      }

      return (
        <Link
          key={row.key}
          to={`/opening/${encodeURIComponent(row.fen)}`}
          className={`${styles.contRow} ${alternatives ? styles.altRow : ''}`}
          style={{ animationDelay: `${i * 30}ms` }}
          title={statsTitle(row)}
        >
          {inner}
        </Link>
      );
    })}
  </div>
);

export const OpeningNavigator: React.FC<OpeningNavigatorProps> = ({
  treeData,
  loading,
  explorer = null,
  parentExplorer = null,
}) => {
  const [continuationsExpanded, setContinuationsExpanded] = useState(false);
  const [alternativesExpanded, setAlternativesExpanded] = useState(false);

  // Reset expanded states when navigating to a different opening
  const currentFen = treeData?.current?.fen;
  useEffect(() => {
    setContinuationsExpanded(false);
    setAlternativesExpanded(false);
  }, [currentFen]);

  if (loading) {
    return (
      <div className={styles.navigator}>
        <div className={styles.navigatorTitle}>Opening book</div>
        <div className={styles.skeleton}>
          <div className={styles.skeletonStrip} />
          <div className={styles.skeletonActive} />
          <div className={styles.skeletonRows}>
            <div className={styles.skeletonRow} />
            <div className={styles.skeletonRow} />
            <div className={styles.skeletonRow} />
          </div>
          <div className={styles.skeletonPills}>
            <div className={styles.skeletonPill} />
            <div className={styles.skeletonPill} />
            <div className={styles.skeletonPill} />
          </div>
        </div>
      </div>
    );
  }

  if (!treeData?.current) return null;

  const { current, ancestors = [], children = [], siblings = [] } = treeData;
  // Plies played to reach this position; children sit at index pliesPlayed,
  // the current move (and its alternatives) at pliesPlayed - 1.
  const pliesPlayed = pliesFromFen(current.fen) ?? ancestors.length + 1;
  const currentMoveIdx = pliesPlayed - 1;

  // Deduplicate ancestors for breadcrumb display
  const breadcrumbAncestors = deduplicateAncestors(ancestors);

  // Use gamesPlayed for bars and counts; fall back to descendantCount if no games data
  const allNodes = [...children, ...siblings];
  const hasGamesData = allNodes.some((n) => (n.gamesPlayed || 0) > 0);
  const getCount = (node: { gamesPlayed?: number; descendantCount?: number }) =>
    hasGamesData ? node.gamesPlayed || 0 : node.descendantCount || 0;
  const countLabel = hasGamesData ? 'games' : 'lines';
  const sortedChildren = sortNodesByPopularity(children, getCount);
  const sortedSiblings = sortNodesByPopularity(siblings, getCount);

  // Find max count for relative bar widths
  const maxCount = Math.max(...allNodes.map(getCount), 1);

  // Merge live explorer data into the book lists (no-op passthrough without it)
  const childRows = mergeExplorerMoves(
    sortedChildren.map((child) => ({
      san: stripMoveNumber(child.move),
      name: child.name,
      fen: child.fen,
      count: getCount(child),
    })),
    explorer?.moves ?? null
  );
  const currentSan = stripMoveNumber(current.move || '');
  const siblingRows = mergeExplorerMoves(
    sortedSiblings.map((sibling) => ({
      san: stripMoveNumber(sibling.move),
      name: sibling.name,
      fen: sibling.fen,
      count: getCount(sibling),
    })),
    parentExplorer?.moves ?? null,
    { excludeSans: currentSan ? [currentSan] : [] }
  );

  // "Instead of 3.e3" — anchor the alternatives to the move actually played
  const alternativesLabel =
    currentSan && currentMoveIdx >= 0
      ? `Instead of ${getMoveNumber(currentMoveIdx)}${currentSan}`
      : 'Alternatives';

  return (
    <div className={styles.navigator}>
      <div className={styles.navigatorTitle}>Opening book</div>

      {/* Opening hierarchy breadcrumb */}
      {breadcrumbAncestors.length > 0 && (
        <div className={`${styles.section} ${styles.sectionFirst}`}>
          <nav className={styles.breadcrumb} aria-label="Opening hierarchy">
            {breadcrumbAncestors.map((ancestor, i) => (
              <React.Fragment key={ancestor.fen}>
                {i > 0 && (
                  <span className={styles.breadcrumbSep} aria-hidden="true">
                    ›
                  </span>
                )}
                <Link
                  to={`/opening/${encodeURIComponent(ancestor.fen)}`}
                  className={styles.breadcrumbLink}
                >
                  {ancestor.name}
                </Link>
              </React.Fragment>
            ))}
            <span className={styles.breadcrumbSep} aria-hidden="true">
              ›
            </span>
            <span className={styles.breadcrumbCurrent}>{current.name}</span>
          </nav>
        </div>
      )}

      {/* Next moves — the one list of what gets played from here */}
      {childRows.length > 0 &&
        (() => {
          const canCollapse = childRows.length > CONTINUATIONS_COLLAPSED_LIMIT;
          const visibleRows =
            canCollapse && !continuationsExpanded
              ? childRows.slice(0, CONTINUATIONS_COLLAPSED_LIMIT)
              : childRows;
          const hiddenCount = childRows.length - CONTINUATIONS_COLLAPSED_LIMIT;

          return (
            <div
              className={`${styles.section} ${breadcrumbAncestors.length === 0 ? styles.sectionFirst : ''}`}
            >
              <div className={styles.sectionHeader}>
                <div className={styles.sectionLabel}>Next moves</div>
                <div className={styles.sectionSub}>
                  What players do from here, most played first
                </div>
              </div>
              <MoveRows
                rows={visibleRows}
                ply={pliesPlayed}
                maxCount={maxCount}
                countLabel={countLabel}
                hasStats={Boolean(explorer?.moves?.length)}
              />
              {canCollapse && (
                <button
                  className={styles.showMoreBtn}
                  onClick={() => setContinuationsExpanded(!continuationsExpanded)}
                >
                  {continuationsExpanded ? 'Show less' : `Show ${hiddenCount} more`}
                </button>
              )}
            </div>
          );
        })()}

      {/* Alternatives to the move that reached this position */}
      {siblingRows.length > 0 &&
        (() => {
          const canCollapse = siblingRows.length > ALTERNATIVES_COLLAPSED_LIMIT;
          const visibleRows =
            canCollapse && !alternativesExpanded
              ? siblingRows.slice(0, ALTERNATIVES_COLLAPSED_LIMIT)
              : siblingRows;
          const hiddenCount = siblingRows.length - ALTERNATIVES_COLLAPSED_LIMIT;

          return (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionLabel}>{alternativesLabel}</div>
                <div className={styles.sectionSub}>Other moves at the same point</div>
              </div>
              <MoveRows
                rows={visibleRows}
                ply={currentMoveIdx}
                maxCount={maxCount}
                countLabel={countLabel}
                hasStats={Boolean(parentExplorer?.moves?.length)}
                alternatives
              />
              {canCollapse && (
                <button
                  className={styles.showMoreBtn}
                  onClick={() => setAlternativesExpanded(!alternativesExpanded)}
                >
                  {alternativesExpanded ? 'Show less' : `Show ${hiddenCount} more`}
                </button>
              )}
            </div>
          );
        })()}
    </div>
  );
};

export default OpeningNavigator;
