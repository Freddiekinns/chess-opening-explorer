import React from 'react';
import styles from './OpeningStats.module.css';

interface OpeningStatsProps {
  gamesAnalyzed: number;
  whiteWins: number;
  draws: number;
  blackWins: number;
  averageRating?: number;
}

export const OpeningStats: React.FC<OpeningStatsProps> = ({
  gamesAnalyzed,
  whiteWins,
  draws,
  blackWins,
  averageRating,
}) => {
  const totalGames = gamesAnalyzed > 0 ? gamesAnalyzed : 0;
  const whitePercent = totalGames ? (whiteWins / totalGames) * 100 : 0;
  const drawPercent = totalGames ? (draws / totalGames) * 100 : 0;
  const blackPercent = totalGames ? (blackWins / totalGames) * 100 : 0;

  return (
    <div className={styles.container}>
      <div className={`card-header ${styles.headerRow}`}>
        <h3 className="card-header__title">Win rate</h3>
        <div className={styles.metaRow}>
          <span className={styles.metaItem}>{gamesAnalyzed.toLocaleString()} games</span>
          {averageRating && (
            <>
              <span className={styles.metaSeparator} aria-hidden="true">
                •
              </span>
              <span className={styles.metaItem}>Avg Lichess Rating: {averageRating}</span>
            </>
          )}
        </div>
      </div>

      <div className={styles.results}>
        <div className={styles.segmentedBar}>
          <div
            className={`${styles.barSegment} ${styles.whiteSegment}`}
            style={{ width: `${whitePercent}%` }}
          />
          <div
            className={`${styles.barSegment} ${styles.drawSegment}`}
            style={{ width: `${drawPercent}%` }}
          />
          <div
            className={`${styles.barSegment} ${styles.blackSegment}`}
            style={{ width: `${blackPercent}%` }}
          />
        </div>
      </div>

      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.whiteDot}`} aria-hidden="true" />
          <span className={styles.legendLabel}>White</span>
          <span className={styles.legendValue}>{Math.round(whitePercent)}%</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.drawDot}`} aria-hidden="true" />
          <span className={styles.legendLabel}>Draw</span>
          <span className={styles.legendValue}>{Math.round(drawPercent)}%</span>
        </div>
        <div className={styles.legendItem}>
          <span className={`${styles.legendDot} ${styles.blackDot}`} aria-hidden="true" />
          <span className={styles.legendLabel}>Black</span>
          <span className={styles.legendValue}>{Math.round(blackPercent)}%</span>
        </div>
      </div>
    </div>
  );
};

export default OpeningStats;
