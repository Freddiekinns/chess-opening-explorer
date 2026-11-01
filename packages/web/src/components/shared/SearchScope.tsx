import React, { useState } from 'react';
import { LevelOptionList } from '../filters/LevelOptionList';
import { rangeInText, type BandId } from '../../lib/lichessExplorer';
import styles from './SearchScope.module.css';

/**
 * "Ranked for 1400–1800 · Change", above every search surface's results
 * (#205). The menu is Discover's band menu, opened in place: choosing a level
 * re-ranks the list the user is reading rather than closing it, so mousedown
 * is swallowed the way each dropdown already swallows it to keep the field
 * focused.
 */
interface SearchScopeProps {
  /** The band results are ranked for, or null for all players. */
  band: BandId | null;
  onChange: (band: BandId) => void;
}

export const SearchScope: React.FC<SearchScopeProps> = ({ band, onChange }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.scope} onMouseDown={(e) => e.preventDefault()}>
      <span className="label-meta">
        {band ? `Ranked for ${rangeInText(band)}` : 'Ranked for all players'}
      </span>
      <button
        type="button"
        className={styles.change}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        Change
      </button>
      {open && (
        <div className={styles.menu} role="dialog" aria-label="Rank by your level">
          <LevelOptionList
            value={band}
            onSelect={(next) => {
              onChange(next);
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
};
