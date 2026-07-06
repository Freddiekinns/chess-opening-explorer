import React from 'react';
import { Link } from 'react-router-dom';
import {
  getOpeningMovesDisplay,
  normalizeUsername,
  type OpeningAgg,
  type Platform,
} from './personalStatsLib';
import { DistributionBar } from './DistributionBar';
import styles from './PersonalOpeningStats.module.css';

/* ==============================
   OPENING NAME SPLIT (family : variation)
   ============================== */
export const OpeningNameSplit: React.FC<{ name: string; className?: string }> = ({
  name,
  className,
}) => {
  const colonIdx = name.indexOf(':');
  if (colonIdx === -1) return <span className={className}>{name}</span>;
  return (
    <span className={className}>
      <span className={styles.nameFamily}>{name.slice(0, colonIdx)}</span>
      <span className={styles.nameColon}>:</span>
      <span className={styles.nameVariation}>{name.slice(colonIdx + 1).trimStart()}</span>
    </span>
  );
};

/* ==============================
   OPENING ROW COMPONENT
   ============================== */
export const OpeningRow: React.FC<{
  opening: OpeningAgg;
  platform: Platform;
  username: string;
  index: number;
}> = ({ opening, platform, username, index }) => {
  const delay = Math.min(index * 30, 300);
  const wPct = opening.games > 0 ? (opening.win / opening.games) * 100 : 0;
  const dPct = opening.games > 0 ? (opening.draw / opening.games) * 100 : 0;
  const lPct = opening.games > 0 ? (opening.loss / opening.games) * 100 : 0;
  const openingMoves = getOpeningMovesDisplay(opening.moves);

  return (
    <Link
      className={styles.openingRow}
      to={`/opening/${encodeURIComponent(opening.fen)}?ref=personal&platform=${platform}&username=${encodeURIComponent(normalizeUsername(username))}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={styles.openingRowLeft}>
        <OpeningNameSplit name={opening.name} className={styles.openingName} />
        {openingMoves && <span className={styles.openingMoves}>{openingMoves}</span>}
      </div>

      {/* Desktop: inline GP + bar */}
      <div className={styles.openingRowRight}>
        <span className={styles.gamesCount}>{opening.games}</span>
        <span className={styles.distBar}>
          <DistributionBar
            win={opening.win}
            draw={opening.draw}
            loss={opening.loss}
            games={opening.games}
          />
        </span>
      </div>

      {/* Mobile: stat counters + accent bar */}
      <div className={styles.mobileStats}>
        <div className={styles.statCounters}>
          <span className={styles.statChip}>
            <span className={styles.statDot + ' ' + styles.statDotWin} />
            <span className={styles.statNum}>{opening.win}</span>
            <span className={styles.statLabel}>W</span>
          </span>
          <span className={styles.statChip}>
            <span className={styles.statDot + ' ' + styles.statDotDraw} />
            <span className={styles.statNum}>{opening.draw}</span>
            <span className={styles.statLabel}>D</span>
          </span>
          <span className={styles.statChip}>
            <span className={styles.statDot + ' ' + styles.statDotLoss} />
            <span className={styles.statNum}>{opening.loss}</span>
            <span className={styles.statLabel}>L</span>
          </span>
          <span className={styles.statGames}>{opening.games} games</span>
        </div>
        {opening.games > 0 && (
          <div className={styles.accentBar}>
            {wPct > 0 && <div className={styles.accentWin} style={{ width: `${wPct}%` }} />}
            {dPct > 0 && <div className={styles.accentDraw} style={{ width: `${dPct}%` }} />}
            {lPct > 0 && <div className={styles.accentLoss} style={{ width: `${lPct}%` }} />}
          </div>
        )}
      </div>
    </Link>
  );
};
