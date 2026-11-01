import React from 'react';
import { FacetOptionList } from './FacetSelect';
import { LEVEL_OPTIONS, type BandId } from '../../lib/lichessExplorer';
import styles from './LevelOptionList.module.css';

/**
 * The band menu behind "Player rating" on Discover and "Change" in search. Rows
 * are the level's name with its range beside it: players pick by the name,
 * and the heading says whose ratings the ranges are. Masters has no batch
 * data to rank by.
 */
interface LevelOptionListProps {
  /** The band ranked by, or null for all levels. */
  value: BandId | null;
  onSelect: (band: BandId) => void;
}

export const LevelOptionList: React.FC<LevelOptionListProps> = ({ value, onSelect }) => (
  <>
    <p className={`label-meta ${styles.heading}`}>Lichess rating</p>
    <FacetOptionList
      options={LEVEL_OPTIONS}
      value={value ?? 'all'}
      anyLabel={null}
      onSelect={(next) => onSelect((next ?? 'all') as BandId)}
    />
  </>
);
