import React from 'react';
import styles from './SearchNoResults.module.css';

/**
 * The dead end, said once.
 *
 * There were two of these, in two voices. The hero offered "Try a different
 * spelling, ECO code (e.g., B90), or abbreviation (e.g., QGD)"; the overlay
 * offered "Try an ECO code (B02) or paste a PGN on the Analyse tab."; and the
 * top bar offered nothing at all — it simply closed its dropdown, so a failed
 * search on desktop looked identical to not having typed.
 *
 * The overlay's is the one that survived. It points somewhere the user can
 * actually go, and it does not teach them the word "abbreviation" at the moment
 * they have just failed. Two example ECO codes for the same advice was the
 * other half of the tell.
 */
export const SearchNoResults: React.FC = () => (
  <div className={styles.noResults}>
    <span className={styles.title}>No openings match your search</span>
    <span className={styles.hint}>Try an ECO code (B02) or paste a PGN on the Analyse tab.</span>
  </div>
);

export default SearchNoResults;
