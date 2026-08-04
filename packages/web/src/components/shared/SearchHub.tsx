import React, { useEffect, useState } from 'react';
import { useRepertoire } from '../../hooks/useRepertoire';
import { getRecentOpenings, type RecentOpening } from '../../lib/recentOpenings';
import { SearchRow, SurpriseRow, type SearchRowOpening } from './SearchRow';
import styles from './SearchHub.module.css';

export interface SearchHubProps {
  /** Called with the chosen opening's FEN; the caller navigates and closes. */
  onSelect: (fen: string) => void;
  /** Called when Surprise me is chosen; the caller fetches and navigates. */
  onSurprise: () => void;
  recentsLimit?: number;
  repertoireLimit?: number;
}

/**
 * The pre-typing state of every search surface: recently viewed, the user's
 * repertoire, and a way out to a random opening. Shared so the desktop
 * dropdown and the mobile overlay cannot drift — desktop previously showed
 * nothing at all until you typed.
 *
 * Rows come from `SearchRow`, the same component the results lists use, so
 * typing changes which openings are listed and nothing else about them.
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

  // No per-row icon: the section heading above already says which group this
  // is, and a leading icon pushed the name 26px right of where the results
  // list puts it — the drift this component exists to remove.
  const renderRow = (entry: SearchRowOpening) => (
    <li key={entry.fen}>
      <SearchRow opening={entry} onSelect={(opening) => onSelect(opening.fen)} />
    </li>
  );

  return (
    <div className={styles.hub}>
      {recents.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionLabel}>Recent</h3>
          <ul className={styles.rowList}>{recents.map((entry) => renderRow(entry))}</ul>
        </section>
      )}

      {saved.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionLabel}>Your repertoire</h3>
          <ul className={styles.rowList}>{saved.map((entry) => renderRow(entry))}</ul>
        </section>
      )}

      <SurpriseRow onSurprise={onSurprise} />
    </div>
  );
};

export default SearchHub;
