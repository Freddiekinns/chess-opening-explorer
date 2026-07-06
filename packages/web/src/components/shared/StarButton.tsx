import React, { useState } from 'react';
import styles from './StarButton.module.css';

interface StarButtonProps {
  filled: boolean;
  onClick: (e: React.MouseEvent) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export const StarButton: React.FC<StarButtonProps> = ({
  filled,
  onClick,
  size = 'md',
  className = '',
}) => {
  const [animating, setAnimating] = useState(false);

  const px = size === 'sm' ? 16 : 24;

  const handleClick = (e: React.MouseEvent) => {
    // Cards are real links now — a star click must neither bubble to the
    // card's handler nor trigger the anchor's navigation.
    e.preventDefault();
    e.stopPropagation();
    setAnimating(true);
    onClick(e);
  };

  return (
    <button
      className={`${styles.starButton} ${className}`}
      onClick={handleClick}
      aria-label={filled ? 'Remove from repertoire' : 'Save to repertoire'}
      type="button"
    >
      <svg
        className={`${styles.starSvg} ${filled ? styles.filled : styles.outline} ${animating ? styles.animating : ''}`}
        width={px}
        height={px}
        viewBox="0 0 24 24"
        onAnimationEnd={() => setAnimating(false)}
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    </button>
  );
};
