import React from 'react';
import styles from './FeedbackSection.module.css';

interface FeedbackSectionProps {
  source?: string;
}

// Simplified feedback component with inline link
export const FeedbackSection: React.FC<FeedbackSectionProps> = ({ source }) => {
  const baseUrl = 'https://forms.gle/3DfV8NpbhapzyTi26';
  const href = source ? `${baseUrl}?src=${encodeURIComponent(source)}` : baseUrl;
  return (
    <div className={styles.wrapper}>
      <a href={href} target="_blank" rel="noopener noreferrer" className={styles.link}>
        Help Us Improve Opening Book
      </a>
    </div>
  );
};

export default FeedbackSection;
