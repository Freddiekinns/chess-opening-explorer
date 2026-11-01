import React from 'react';
import { FacetOptionList } from './FacetSelect';
import { RANKABLE_BANDS, rangeLabel, type BandId } from '../../lib/lichessExplorer';
import styles from './LevelOptionList.module.css';

/**
 * The band menu behind "Your level" on Discover and "Change" in search. Rows
 * are rating ranges, never Beginner/Intermediate, which the Difficulty facet
 * uses to mean something else. The heading says whose ratings they are, so a
 * chess.com player needs no footnote. Masters has no batch data to rank by.
 */
export const LEVEL_OPTIONS = RANKABLE_BANDS.map((band) => ({
  value: band.id,
  label: rangeLabel(band.id),
}));

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
