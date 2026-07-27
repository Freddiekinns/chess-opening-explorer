import React, { useEffect, useState } from 'react';
import { Clock, Sparkles, Star } from 'lucide-react';
import { useRepertoire } from '../../hooks/useRepertoire';
import { getRecentOpenings, type RecentOpening } from '../../lib/recentOpenings';
import styles from './SearchHub.module.css';

export interface SearchHubProps {
  /** Called with the chosen opening's FEN; the caller navigates and closes. */
  onSelect: (fen: string) => void;
  /** Called when Surprise me is chosen; the caller fetches and navigates. */
  onSurprise: () => void;
  recentsLimit?: number;
  repertoireLimit?: number;
}

const movesPreview = (moves: string) => moves?.split(' ').slice(0, 6).join(' ') ?? '';

interface HubRow {
  fen: string;
  name: string;
  eco: string;
  moves: string;
}

/**
 * The pre-typing state of every search surface: recently viewed, the user's
 * repertoire, and a way out to a random opening. Shared so the desktop
 * dropdown and the mobile overlay cannot drift — desktop previously showed
 * nothing at all until you typed.
 */
export const SearchHub: React.FC<SearchHubProps> = ({
  onSelect,
  onSurprise,
  recentsLimit = 4,
  repertoireLimit = 5,
}) => {
  const [recents, setRecents] = useState<RecentOpening[]>([]);
  const { repertoire } = useRepertoire();

  useEffect(() => {
    setRecents(getRecentOpenings().slice(0, recentsLimit));
  }, [recentsLimit]);

  const saved = repertoire.slice(0, repertoireLimit);

  const renderRow = (entry: HubRow, icon: React.ReactNode) => (
    <button
      key={entry.fen}
      type="button"
      className={styles.row}
      onClick={() => onSelect(entry.fen)}
    >
      {icon}
      <span className={styles.rowText}>
        <span className={styles.rowName}>{entry.name}</span>
        <span className={styles.rowMeta}>
          <span className={styles.rowEco}>{entry.eco}</span> · {movesPreview(entry.moves)}
        </span>
      </span>
    </button>
  );

  return (
    <div className={styles.hub}>
      {recents.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionLabel}>Recent</h3>
          <div className={styles.rowList}>
            {recents.map((entry) =>
              renderRow(entry, <Clock size={14} className={styles.rowIcon} aria-hidden="true" />)
            )}
          </div>
        </section>
      )}

      {saved.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionLabel}>Your repertoire</h3>
          <div className={styles.rowList}>
            {saved.map((entry) =>
              renderRow(
                entry,
                <Star
                  size={14}
                  className={`${styles.rowIcon} ${styles.rowIconStar}`}
                  aria-hidden="true"
                />
              )
            )}
          </div>
        </section>
      )}

      <button type="button" className={styles.surprise} onClick={onSurprise}>
        <Sparkles size={14} aria-hidden="true" />
        <span className={styles.rowText}>
          <span className={styles.rowName}>Surprise me</span>
          <span className={styles.rowMeta}>Jump to a random opening</span>
        </span>
      </button>
    </div>
  );
};

export default SearchHub;
