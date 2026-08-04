import React from 'react';
import styles from './WinRatePanel.module.css';
import type { ExplorerQuery } from '../../hooks/useExplorerResult';
import type { BandId } from '../../lib/lichessExplorer';
import {
  gamesStatLabel,
  liveStatsView,
  snapshotStatsView,
  type PopularityStats,
} from '../../lib/explorerStats';

/**
 * The stats block inside the ExplorerCard (UX review phase 4): the stat pair,
 * the W/D/L bar and its legend, and nothing else. July's styling survives
 * unchanged — what moved is the parentage. The level pills belong to the card
 * header (they govern the whole card, not just these numbers), master games
 * moved outside the card entirely (the level filter does not reach them), and
 * the explorer fetch belongs to the page, which was already making the same
 * request for the opening book.
 *
 * While a band is selected the block holds a loading state until the fetch
 * resolves — the snapshot must never flash first and then get swapped out.
 * Only a failed fetch degrades to the snapshot, with a note.
 */

interface WinRatePanelProps {
  /** Bundled snapshot (all rated Lichess games) — the fallback. */
  popularityStats: PopularityStats | null;
  /** Active level from the card header; null = snapshot. */
  band: BandId | null;
  /** The page's explorer query for this position at this band. */
  explorer: ExplorerQuery;
}

export const WinRatePanel: React.FC<WinRatePanelProps> = ({ popularityStats, band, explorer }) => {
  const live = Boolean(band) && !explorer.failed;
  const snapshotView = snapshotStatsView(popularityStats);
  const liveView = explorer.result ? liveStatsView(explorer.result) : null;
  const view = live ? liveView : snapshotView;

  // Pending, not `explorer.loading`: between first render and the hook's
  // effect the query is {result: null, loading: false}, and keying off
  // `loading` alone would blank the block for a frame before the placeholder
  // appears. No result yet and no failure means we are still waiting.
  const pending = live && explorer.result === null;
  const thinSample = live && explorer.result !== null && liveView === null;

  if (!view && !pending && !thinSample) return null;

  return (
    <div className={styles.panel}>
      {band && explorer.failed && (
        <div className={styles.liveUnavailable} role="status">
          Live Lichess data isn't available right now — showing a saved snapshot instead.
        </div>
      )}

      {view ? (
        <>
          <div className={styles.statsHeader}>
            <div className={styles.statGroup}>
              <span className={styles.statLabel}>{gamesStatLabel(band, live)}</span>
              <span className={styles.statValue}>{view.games}</span>
            </div>
            {view.elo && (
              <div className={`${styles.statGroup} ${styles.statGroupRight}`}>
                <span className={styles.statLabel}>Average Elo</span>
                <span className={`${styles.statValue} ${styles.statValueElo}`}>{view.elo}</span>
              </div>
            )}
          </div>

          <div className={styles.bar} aria-hidden="true">
            <span className={styles.barWhite} style={{ width: `${view.whitePct}%` }} />
            <span className={styles.barDraw} style={{ width: `${view.drawPct}%` }} />
            <span className={styles.barBlack} style={{ width: `${view.blackPct}%` }} />
          </div>

          <div className={styles.legend}>
            <span className={styles.legendItem}>
              <span className={`${styles.swatch} ${styles.swatchWhite}`} aria-hidden="true" />
              White wins {view.whitePct}%
            </span>
            <span className={styles.legendItem}>
              <span className={`${styles.swatch} ${styles.swatchDraw}`} aria-hidden="true" />
              Draws {view.drawPct}%
            </span>
            <span className={styles.legendItem}>
              <span className={`${styles.swatch} ${styles.swatchBlack}`} aria-hidden="true" />
              Black wins {view.blackPct}%
            </span>
          </div>
        </>
      ) : thinSample ? (
        <div className={styles.livePlaceholder}>
          Not enough games at this level to show reliable numbers.
        </div>
      ) : (
        <div className={styles.livePlaceholder} role="status">
          Loading Lichess data…
        </div>
      )}
    </div>
  );
};

export default WinRatePanel;
