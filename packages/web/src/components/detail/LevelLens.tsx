import React from 'react';
import styles from './LevelLens.module.css';
import { BANDS, bandTooltip, type BandId } from '../../lib/lichessExplorer';
import { setMyLevel } from '../../lib/myLevel';
import { trackEvent } from '../../lib/analytics';

/**
 * The level lens (sidebar unification, 2026-07-11 decision record): one band
 * selector at the top of the sidebar column governing every data panel below
 * it — the win-rate stats and the opening book's move stats change together.
 * Learner-facing level names on the pills; the Lichess Elo ranges live in
 * tooltips. Selection persists site-wide as "my level". "All" is the broadest
 * default (every rating), so there is always an active level — no reset pill.
 */

interface LevelLensProps {
  band: BandId | null;
  onChange: (band: BandId | null) => void;
}

export const LevelLens: React.FC<LevelLensProps> = ({ band, onChange }) => {
  const select = (id: BandId) => {
    setMyLevel(id);
    trackEvent('band_select', { band: id });
    onChange(id);
  };

  return (
    <div className={styles.lens} role="group" aria-label="Level">
      <div className={styles.pills}>
        {BANDS.map((def) => (
          <button
            key={def.id}
            type="button"
            className={`${styles.pill} ${band === def.id ? styles.pillActive : ''}`}
            aria-pressed={band === def.id}
            title={bandTooltip(def)}
            onClick={() => select(def.id)}
          >
            {def.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default LevelLens;
