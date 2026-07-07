import React from 'react';
import styles from './DistributionBar.module.css';

interface Props {
  win: number;
  draw: number;
  loss: number;
  games: number;
  /** Slightly shorter bar for nested / variation rows. */
  compact?: boolean;
}

/**
 * Win / draw / loss distribution bar — the shared visual primitive behind both
 * the variation view (OpeningRow) and the family rollup view (FamilyRow).
 * Slim rounded segments in the personal-performance palette (sage = win,
 * warm grey = draw, brick = loss) matching the detail-page stat bars.
 * Exact counts live in the tooltip and accessible label; the tinted
 * percentages beneath let the row read at a glance.
 */
export const DistributionBar: React.FC<Props> = ({ win, draw, loss, games, compact = false }) => {
  if (games === 0) return null;
  const wPct = (win / games) * 100;
  const dPct = (draw / games) * 100;
  const lPct = (loss / games) * 100;
  const count = (n: number, singular: string, plural: string) =>
    `${n} ${n === 1 ? singular : plural}`;

  return (
    <div
      className={`${styles.bar} ${compact ? styles.compact : ''}`}
      title={`${win}W · ${draw}D · ${loss}L`}
    >
      <div
        className={styles.segments}
        role="img"
        aria-label={`${count(win, 'win', 'wins')}, ${count(draw, 'draw', 'draws')}, ${count(loss, 'loss', 'losses')}`}
      >
        {wPct > 0 && (
          <div className={`${styles.segment} ${styles.win}`} style={{ width: `${wPct}%` }} />
        )}
        {dPct > 0 && (
          <div className={`${styles.segment} ${styles.draw}`} style={{ width: `${dPct}%` }} />
        )}
        {lPct > 0 && (
          <div className={`${styles.segment} ${styles.loss}`} style={{ width: `${lPct}%` }} />
        )}
      </div>
      <div className={styles.pcts} aria-hidden="true">
        <span className={styles.pctWin}>{Math.round(wPct)}%</span>
        <span className={styles.pctDraw}>{Math.round(dPct)}%</span>
        <span className={styles.pctLoss}>{Math.round(lPct)}%</span>
      </div>
    </div>
  );
};

export default DistributionBar;
