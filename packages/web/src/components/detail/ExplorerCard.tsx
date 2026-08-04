import React from 'react';
import LevelLens from './LevelLens';
import WinRatePanel from './WinRatePanel';
import OpeningNavigator from './OpeningNavigator';
import styles from './ExplorerCard.module.css';
import type { ExplorerQuery } from '../../hooks/useExplorerResult';
import type { TreeContext } from '../../hooks/useOpeningTree';
import type { BandId, ExplorerResult } from '../../lib/lichessExplorer';
import { explorerSourceLine, type PopularityStats } from '../../lib/explorerStats';

/**
 * The opening explorer card (UX review phase 4, changes 11 and 12).
 *
 * One border around the level filter and everything it governs: the raised
 * header band carries the title, the source line and the LevelLens; the body
 * carries the stats and the move lists. Nothing outside this border responds
 * to the pills — which is the whole point. Before this, the pills sat inside
 * the stats card, did not reach the master games in that same card, and
 * silently drove a separate card outside it. There was no way to learn what
 * the filter governed by using it.
 *
 * The card does not fetch. The page already queries the explorer for this
 * position and band; passing that query in keeps one copy of the state and
 * lets the header state honestly whether the numbers below are live.
 */

interface ExplorerCardProps {
  fen: string;
  band: BandId | null;
  onBandChange: (band: BandId | null) => void;
  popularityStats: PopularityStats | null;
  explorer: ExplorerQuery;
  parentExplorer: ExplorerResult | null;
  treeData: TreeContext | null;
  treeLoading: boolean;
}

export const ExplorerCard: React.FC<ExplorerCardProps> = ({
  fen,
  band,
  onBandChange,
  popularityStats,
  explorer,
  parentExplorer,
  treeData,
  treeLoading,
}) => {
  const live = Boolean(band) && !explorer.failed;
  const hasStats = Boolean(popularityStats?.games_analyzed) || Boolean(band);
  const hasBook = treeLoading || Boolean(treeData?.current);

  // Sparse position: omit the block, never render an empty card.
  if (!fen || (!hasStats && !hasBook)) return null;

  return (
    <section className={styles.card} aria-labelledby="explorer-card-title">
      <div className={styles.headerBand}>
        <div className={styles.headerTop}>
          <h2 id="explorer-card-title" className={styles.title}>
            Opening explorer
          </h2>
          <span className={styles.source}>
            {explorerSourceLine(band, live, popularityStats?.analysis_date)}
          </span>
        </div>
        <LevelLens band={band} onChange={onBandChange} />
      </div>

      <div className={styles.body}>
        <WinRatePanel popularityStats={popularityStats} band={band} explorer={explorer} />
      </div>

      {hasBook && (
        <div className={`${styles.body} ${styles.bookBlock}`}>
          <OpeningNavigator
            treeData={treeData}
            loading={treeLoading}
            explorer={explorer.result}
            parentExplorer={parentExplorer}
            band={band}
            live={live && explorer.result !== null}
          />
        </div>
      )}
    </section>
  );
};

export default ExplorerCard;
