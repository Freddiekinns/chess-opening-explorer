import React from 'react';
import type { UncategorisedSummary } from './familyAggregation';
import styles from './UncategorisedFootnote.module.css';

interface Props {
  summary: UncategorisedSummary | null;
}

export const UncategorisedFootnote: React.FC<Props> = ({ summary }) => {
  if (!summary) return null;
  const pct = Math.round(summary.win_rate * 100);
  const count = summary.variation_count;
  const noun = count === 1 ? 'opening' : 'openings';
  return (
    <p className={styles.footnote}>
      + {count} uncategorised {noun} · {summary.games} games · {pct}%
    </p>
  );
};
