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
  const gamesNoun = summary.games === 1 ? 'game' : 'games';
  return (
    <p className={styles.footnote}>
      + {count} uncategorised {noun} · {summary.games} {gamesNoun} · {pct}%
    </p>
  );
};
