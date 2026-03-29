import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { TreeContext } from '../../hooks/useOpeningTree';
import styles from './OpeningNavigator.module.css';

const CONTINUATIONS_COLLAPSED_LIMIT = 5;
const ALTERNATIVES_COLLAPSED_LIMIT = 5;

interface OpeningNavigatorProps {
  treeData: TreeContext | null;
  loading: boolean;
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

export const OpeningNavigator: React.FC<OpeningNavigatorProps> = ({ treeData, loading }) => {
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
  const currentPly = ancestors.length;

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

  // Current move number for the "Alternatives" label
  const currentMoveNum = Math.floor(currentPly / 2) + 1;

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

      {/* Continuations — main lines with popularity bars */}
      {sortedChildren.length > 0 &&
        (() => {
          const canCollapse = sortedChildren.length > CONTINUATIONS_COLLAPSED_LIMIT;
          const visibleChildren =
            canCollapse && !continuationsExpanded
              ? sortedChildren.slice(0, CONTINUATIONS_COLLAPSED_LIMIT)
              : sortedChildren;
          const hiddenCount = sortedChildren.length - CONTINUATIONS_COLLAPSED_LIMIT;

          return (
            <div
              className={`${styles.section} ${breadcrumbAncestors.length === 0 ? styles.sectionFirst : ''}`}
            >
              <div className={styles.sectionLabel}>Continuations</div>
              <div className={styles.rows}>
                {visibleChildren.map((child, i) => {
                  const count = getCount(child);
                  const barPercent = maxCount > 0 ? Math.max((count / maxCount) * 100, 2) : 0;

                  return (
                    <Link
                      key={child.fen}
                      to={`/opening/${encodeURIComponent(child.fen)}`}
                      className={styles.contRow}
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <span className={styles.rowMove}>
                        {getMoveNumber(currentPly)}
                        {stripMoveNumber(child.move)}
                      </span>
                      <span className={styles.rowName}>{child.name}</span>
                      <span className={styles.rowBarWrap}>
                        <span className={styles.rowBar} style={{ width: `${barPercent}%` }} />
                      </span>
                      <span className={styles.rowCount}>
                        {count > 0 ? `${formatCount(count)} ${countLabel}` : '—'}
                      </span>
                    </Link>
                  );
                })}
              </div>
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

      {/* Alternatives at current ply */}
      {sortedSiblings.length > 0 &&
        (() => {
          const canCollapse = sortedSiblings.length > ALTERNATIVES_COLLAPSED_LIMIT;
          const visibleSiblings =
            canCollapse && !alternativesExpanded
              ? sortedSiblings.slice(0, ALTERNATIVES_COLLAPSED_LIMIT)
              : sortedSiblings;
          const hiddenCount = sortedSiblings.length - ALTERNATIVES_COLLAPSED_LIMIT;

          return (
            <div className={styles.section}>
              <div className={styles.sectionLabel}>Alternatives (move {currentMoveNum})</div>
              <div className={styles.rows}>
                {visibleSiblings.map((sibling, i) => {
                  const count = getCount(sibling);
                  const barPercent = maxCount > 0 ? Math.max((count / maxCount) * 100, 2) : 0;

                  return (
                    <Link
                      key={sibling.fen}
                      to={`/opening/${encodeURIComponent(sibling.fen)}`}
                      className={`${styles.contRow} ${styles.altRow}`}
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <span className={styles.rowMove}>
                        {getMoveNumber(currentPly - 1)}
                        {stripMoveNumber(sibling.move)}
                      </span>
                      <span className={styles.rowName}>{sibling.name}</span>
                      <span className={styles.rowBarWrap}>
                        <span className={styles.rowBar} style={{ width: `${barPercent}%` }} />
                      </span>
                      <span className={styles.rowCount}>
                        {count > 0 ? `${formatCount(count)} ${countLabel}` : '—'}
                      </span>
                    </Link>
                  );
                })}
              </div>
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
