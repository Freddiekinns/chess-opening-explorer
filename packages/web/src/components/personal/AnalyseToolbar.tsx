import React from 'react';
import { InlineLinkSwitch } from './InlineLinkSwitch';
import styles from './AnalyseToolbar.module.css';

export type GroupBy = 'variation' | 'family';

interface Props {
  value: GroupBy;
  onChange: (value: GroupBy) => void;
}

const OPTIONS: ReadonlyArray<{ value: GroupBy; label: string }> = [
  { value: 'variation', label: 'Variation' },
  { value: 'family', label: 'Family' },
];

export const AnalyseToolbar: React.FC<Props> = ({ value, onChange }) => (
  <div className={styles.toolbar}>
    <InlineLinkSwitch
      label="VIEW"
      options={OPTIONS}
      value={value}
      onChange={onChange}
      ariaLabel="Group openings"
    />
  </div>
);
