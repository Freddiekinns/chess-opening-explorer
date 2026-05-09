import React from 'react';
import { InlineLinkSwitch } from './InlineLinkSwitch';
import type { SortMode } from './familyAggregation';
import styles from './SectionToolbar.module.css';

interface Props {
  value: SortMode;
  onChange: (value: SortMode) => void;
  ariaLabel: string;
}

const OPTIONS: ReadonlyArray<{ value: SortMode; label: string }> = [
  { value: 'frequency', label: 'Most played' },
  { value: 'best', label: 'Highest win rate' },
  { value: 'worst', label: 'Lowest win rate' },
];

export const SectionToolbar: React.FC<Props> = ({ value, onChange, ariaLabel }) => (
  <div className={styles.bar}>
    <InlineLinkSwitch
      label="ORDER"
      options={OPTIONS}
      value={value}
      onChange={onChange}
      ariaLabel={ariaLabel}
    />
  </div>
);
