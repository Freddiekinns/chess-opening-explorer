import React, { useId } from 'react';
import styles from './LevelLens.module.css';
import { BANDS, bandTooltip, type BandId } from '../../lib/lichessExplorer';

/**
 * The level lens (sidebar unification, 2026-07-11 decision record): one band
 * selector at the top of the sidebar column governing every data panel below
 * it — the win-rate stats and the opening book's move stats change together.
 * Learner-facing level names on the pills; the Lichess Elo ranges live in
 * tooltips. The page saves the choice site-wide as "my level". "All" is the broadest
 * default (every rating), so there is always an active level — no reset pill.
 */

interface LevelLensProps {
  band: BandId | null;
  onChange: (band: BandId | null) => void;
  /** Single-line swipeable pill row (mobile data surface) instead of wrapping. */
  scrollable?: boolean;
}

export const LevelLens: React.FC<LevelLensProps> = ({ band, onChange, scrollable = false }) => {
  const labelId = useId();
  return (
    <div className={styles.lens} role="group" aria-labelledby={labelId}>
      <span id={labelId} className="label-meta">
        Player rating
      </span>
      <div className={`${styles.pills} ${scrollable ? styles.pillsScroll : ''}`}>
        {BANDS.map((def) => (
          <button
            key={def.id}
            type="button"
            className={`${styles.pill} ${band === def.id ? styles.pillActive : ''}`}
            aria-pressed={band === def.id}
            title={bandTooltip(def)}
            onClick={() => onChange(def.id)}
          >
            {def.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LevelLens;
