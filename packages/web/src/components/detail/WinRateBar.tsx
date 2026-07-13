import React from 'react';
import styles from './WinRateBar.module.css';

interface PopularityStats {
  games_analyzed?: number;
  white_win_rate?: number;
  black_win_rate?: number;
  draw_rate?: number;
  avg_rating?: number;
  analysis_date?: string;
}

interface WinRateBarProps {
  popularityStats: PopularityStats | null;
  /** Source/freshness line, e.g. "All Lichess games · updated 2025-07-15" */
  meta?: string;
  /** 'bare' drops the card chrome for embedding inside another card. */
  variant?: 'card' | 'bare';
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

export const WinRateBar: React.FC<WinRateBarProps> = ({
  popularityStats,
  meta,
  variant = 'card',
}) => {
  const totalGames = popularityStats?.games_analyzed || 0;
  if (totalGames === 0) return null;

  const whitePercent = Math.round((popularityStats?.white_win_rate || 0) * 100);
  const drawPercent = Math.round((popularityStats?.draw_rate || 0) * 100);
  const blackPercent = Math.round((popularityStats?.black_win_rate || 0) * 100);

  return (
    <div className={`${styles.statsCard} ${variant === 'bare' ? styles.bare : ''}`}>
      <div className={styles.statsHeader}>
        <div className={styles.statGroup}>
          <span className={styles.statLabel}>Total games</span>
          <span className={styles.statValue}>{formatNumber(totalGames)}</span>
        </div>
        {popularityStats?.avg_rating && (
          <div className={`${styles.statGroup} ${styles.statGroupRight}`}>
            <span className={styles.statLabel}>Average Elo</span>
            <span className={`${styles.statValue} ${styles.statValueElo}`}>
              {popularityStats.avg_rating.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {meta && <div className={styles.metaLine}>{meta}</div>}

      <div className={styles.bar}>
        <div
          className={`${styles.barSegment} ${styles.barWhite}`}
          style={{ width: `${whitePercent}%` }}
        />
        <div
          className={`${styles.barSegment} ${styles.barDraw}`}
          style={{ width: `${drawPercent}%` }}
        />
        <div
          className={`${styles.barSegment} ${styles.barBlack}`}
          style={{ width: `${blackPercent}%` }}
        />
      </div>

      <div className={styles.barLegend}>
        <span className={styles.legendItem}>
          <span className={`${styles.swatch} ${styles.swatchWhite}`} aria-hidden="true" />
          White wins {whitePercent}%
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.swatch} ${styles.swatchDraw}`} aria-hidden="true" />
          Draws {drawPercent}%
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.swatch} ${styles.swatchBlack}`} aria-hidden="true" />
          Black wins {blackPercent}%
        </span>
      </div>
    </div>
  );
};

export default WinRateBar;
