import React from 'react';
import styles from './DistributionBar.module.css';

interface Props {
  win: number;
  draw: number;
  loss: number;
  games: number;
  /** Render the raw counts inside wide-enough segments. Default true. */
  showCounts?: boolean;
  /** Slightly shorter bar for nested / variation rows. */
  compact?: boolean;
}

/**
 * Win / draw / loss distribution bar — the shared visual primitive behind both
 * the variation view (OpeningRow) and the family rollup view (FamilyRow). The
 * segment colours map to the Warm-Editorial-Dark result tokens: amber = win,
 * warm grey = draw, cream = loss. Percentages beneath are tinted to match
 * their segment so the row reads at a glance.
 */
export const DistributionBar: React.FC<Props> = ({
  win,
  draw,
  loss,
  games,
  showCounts = true,
  compact = false,
}) => {
  if (games === 0) return null;
  const wPct = (win / games) * 100;
  const dPct = (draw / games) * 100;
  const lPct = (loss / games) * 100;

  return (
    <div className={`${styles.bar} ${compact ? styles.compact : ''}`}>
      <div className={styles.segments}>
        {wPct > 0 && (
          <div className={`${styles.segment} ${styles.win}`} style={{ width: `${wPct}%` }}>
            {showCounts && wPct >= 14 && <span className={styles.count}>{win}</span>}
          </div>
        )}
        {dPct > 0 && (
          <div className={`${styles.segment} ${styles.draw}`} style={{ width: `${dPct}%` }}>
            {showCounts && dPct >= 14 && <span className={styles.count}>{draw}</span>}
          </div>
        )}
        {lPct > 0 && (
          <div className={`${styles.segment} ${styles.loss}`} style={{ width: `${lPct}%` }}>
            {showCounts && lPct >= 14 && <span className={styles.count}>{loss}</span>}
          </div>
        )}
      </div>
      <div className={styles.pcts}>
        <span className={styles.pctWin}>{Math.round(wPct)}%</span>
        <span className={styles.pctDraw}>{Math.round(dPct)}%</span>
        <span className={styles.pctLoss}>{Math.round(lPct)}%</span>
      </div>
    </div>
  );
};

export default DistributionBar;
