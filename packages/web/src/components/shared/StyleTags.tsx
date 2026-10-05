import React from 'react';
import styles from './StyleTags.module.css';
import type { StyleProfile } from '../../lib/styleProfile';

interface StyleTagsProps {
  profile: StyleProfile | null | undefined;
  /** Include the plans after the words. */
  showPlans?: boolean;
  /** At most this many words; plans are not counted. */
  maxWords?: number;
  size?: 'md' | 'sm';
  centred?: boolean;
  className?: string;
}

export const StyleTags: React.FC<StyleTagsProps> = ({
  profile,
  showPlans = false,
  maxWords,
  size = 'md',
  centred = false,
  className = '',
}) => {
  if (!profile) return null;
  const words = profile.words.slice(0, maxWords);
  const plans = showPlans ? profile.plans : [];
  if (words.length === 0 && plans.length === 0) return null;

  const pill = `${styles.pill} ${size === 'sm' ? styles.small : ''}`;
  return (
    <div
      className={`${styles.row} ${centred ? styles.centred : ''} ${className}`}
      data-testid="style-tags"
    >
      {words.map((w) => (
        <span key={w.axis} className={pill} title={w.glossary}>
          {w.label}
        </span>
      ))}
      {plans.map((p) => (
        <span key={p.key} className={`${pill} ${styles.plan}`} title={p.glossary}>
          {p.label}
        </span>
      ))}
    </div>
  );
};
