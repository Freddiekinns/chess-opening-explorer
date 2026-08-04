import React from 'react';
import styles from './ResultBar.module.css';

export interface ResultStats {
  /** Whole percent, 0-100. */
  white: number;
  draw: number;
  black: number;
}

export interface ResultBarProps {
  /** Real stats or null. Never synthesise numbers for a data product. */
  stats: ResultStats | null;
  /** Bar only, no "White 31% · Draw 39% · Black 30%" line. */
  hideLabels?: boolean;
  className?: string;
}

/**
 * The one win/draw/loss bar. Segments name themselves ("White 31%") so the
 * bar needs no legend — the cheapest high-value change in the 2026-07 UX
 * review. Returns null when stats are absent, so callers never guard.
 */
export const ResultBar: React.FC<ResultBarProps> = ({
  stats,
  hideLabels = false,
  className = '',
}) => {
  if (!stats) return null;

  return (
    <div className={`${styles.resultBar} ${className}`}>
      <div className={styles.track} aria-hidden="true">
        <div data-segment="white" className={styles.white} style={{ width: `${stats.white}%` }} />
        <div data-segment="draw" className={styles.draw} style={{ width: `${stats.draw}%` }} />
        <div data-segment="black" className={styles.black} style={{ width: `${stats.black}%` }} />
      </div>
      {!hideLabels && (
        <div className={styles.labels}>
          <span className={styles.labelWhite}>White {stats.white}%</span>
          <span className={styles.labelDraw}>Draw {stats.draw}%</span>
          <span className={styles.labelBlack}>Black {stats.black}%</span>
        </div>
      )}
    </div>
  );
};

export default ResultBar;
