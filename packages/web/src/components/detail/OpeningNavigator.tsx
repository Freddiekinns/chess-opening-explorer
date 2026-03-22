import React from 'react';
import { Link } from 'react-router-dom';
import type { TreeContext } from '../../hooks/useOpeningTree';
import styles from './OpeningNavigator.module.css';

interface OpeningNavigatorProps {
  treeData: TreeContext | null;
  loading: boolean;
  /** Index into gameHistory that the board is currently showing */
  currentMoveIndex: number;
  /** Callback to sync the board to a given move index */
  onMoveClick: (moveIndex: number) => void;
}

function formatCount(n: number): string {
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

export const OpeningNavigator: React.FC<OpeningNavigatorProps> = ({
  treeData,
  loading,
  currentMoveIndex,
  onMoveClick,
}) => {
  if (loading) {
    return (
      <div className={styles.navigator}>
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
  const totalAncestors = ancestors.length;
  const currentPly = totalAncestors;

  // Calculate total descendant count for percentage display
  const totalChildDescendants = children.reduce((sum, c) => sum + (c.descendantCount || 0), 0);

  return (
    <div className={styles.navigator}>
      {/* Previous — inline notation strip with timeline */}
      {ancestors.length > 0 && (
        <div className={`${styles.section} ${styles.sectionFirst}`}>
          <div className={styles.sectionLabel}>Previous</div>
          <div className={styles.timelineSection}>
            <div className={styles.timelineLine} />
            <div className={styles.notationStrip}>
              {ancestors.map((ancestor, i) => {
                const moveIdx = i + 1;
                const stripped = stripMoveNumber(ancestor.move);
                const isWhiteMove = i % 2 === 0;
                const moveNumber = getMoveNumber(i);

                return (
                  <React.Fragment key={ancestor.fen}>
                    {(isWhiteMove || i === 0) && (
                      <span className={styles.moveNumber}>{moveNumber}</span>
                    )}
                    <button
                      type="button"
                      className={`${styles.notationMove} ${currentMoveIndex >= moveIdx ? styles.notationMovePast : styles.notationMoveFuture}`}
                      onClick={() => onMoveClick(moveIdx)}
                      title={ancestor.name}
                    >
                      {stripped}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Active Line — current move with orange ring indicator */}
      <div className={`${styles.section} ${ancestors.length === 0 ? styles.sectionFirst : ''}`}>
        <div className={styles.sectionLabel}>Active line</div>
        <div className={styles.activeLineWrapper}>
          <div className={styles.timelineDotCurrent} />
          <div className={styles.activeLine}>
            <span className={styles.activeMove}>
              <span className={styles.moveNumber}>{getMoveNumber(currentPly)}</span>
              {stripMoveNumber(current.move)}
            </span>
            <span className={styles.activeName}>{current.name}</span>
          </div>
        </div>
      </div>

      {/* Continuations — with percentage labels */}
      {children.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Continuations</div>
          <div className={styles.rows}>
            {children.map((child, i) => {
              const percent =
                totalChildDescendants > 0
                  ? Math.round(((child.descendantCount || 0) / totalChildDescendants) * 100)
                  : 0;

              return (
                <Link
                  key={child.fen}
                  to={`/opening/${encodeURIComponent(child.fen)}`}
                  className={styles.contRow}
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <span className={styles.contDot} />
                  <span className={styles.rowMove}>{stripMoveNumber(child.move)}</span>
                  <span className={styles.rowName}>{child.name}</span>
                  {percent > 0 && <span className={styles.contPercent}>{percent}%</span>}
                  {percent === 0 && child.descendantCount > 0 && (
                    <span className={styles.rowCount}>{formatCount(child.descendantCount)}</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Sidelines */}
      {siblings.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Sidelines</div>
          <div className={styles.pills}>
            {siblings.map((sibling) => (
              <Link
                key={sibling.fen}
                to={`/opening/${encodeURIComponent(sibling.fen)}`}
                className={styles.pill}
                title={sibling.name}
              >
                {stripMoveNumber(sibling.move)}
                {sibling.descendantCount > 0 && (
                  <span className={styles.pillCount}>({formatCount(sibling.descendantCount)})</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OpeningNavigator;
