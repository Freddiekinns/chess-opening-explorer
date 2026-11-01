import React, { useState } from 'react';
import { LevelOptionList } from '../filters/LevelOptionList';
import { levelPlayers, type BandId } from '../../lib/lichessExplorer';
import styles from './SearchScope.module.css';

/**
 * "Ranked for intermediate players · Change", above every search surface's results
 * (#205). The menu is Discover's band menu, opened in place: choosing a level
 * re-ranks the list the user is reading rather than closing it, so mousedown
 * is swallowed the way each dropdown already swallows it to keep the field
 * focused.
 */
interface SearchScopeProps {
  /** The band results are ranked for, or null for all players. */
  band: BandId | null;
  onChange: (band: BandId) => void;
  /**
   * The query named the level ("openings for beginners", #206). It ranks by
   * that whatever the saved level, so there is nothing to Change.
   */
  fromQuery?: boolean;
}

export const SearchScope: React.FC<SearchScopeProps> = ({ band, onChange, fromQuery = false }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.scope} onMouseDown={(e) => e.preventDefault()}>
      <span className="label-meta">{`Ranked for ${levelPlayers(band ?? 'all')}`}</span>
      {!fromQuery && (
        <button
          type="button"
          className={styles.change}
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
        >
          Change
        </button>
      )}
      {open && !fromQuery && (
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
