import React from 'react';
import { Link } from 'react-router-dom';
import { normalizeUsername, type OpeningAgg, type Platform } from './personalStatsLib';
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

  return (
    <Link
      className={styles.openingRow}
      to={`/opening/${encodeURIComponent(opening.fen)}?ref=personal&platform=${platform}&username=${encodeURIComponent(normalizeUsername(username))}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={styles.openingRowLeft}>
        <OpeningNameSplit name={opening.name} className={styles.openingName} />
        {opening.moves && <span className={styles.openingMoves}>{opening.moves}</span>}
      </div>

      {/* Desktop: inline GP + bar (this row only renders in the desktop
          dashboard — the mobile dashboard uses FamilyRow / .mobileCard) */}
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
    </Link>
  );
};
