import React from 'react';
import { useRepertoire } from '../../hooks/useRepertoire';
import { StarButton } from '../shared/StarButton';
import { MiniBoard } from '../shared/MiniBoard';
import styles from './RepertoireSection.module.css';

interface RepertoireSectionProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onOpeningSelect: (opening: any) => void;
}

export const RepertoireSection: React.FC<RepertoireSectionProps> = ({ onOpeningSelect }) => {
  const { repertoire, count, remove } = useRepertoire();

  const getFirstMovesDisplay = (moves: string): string => {
    const trimmed = moves.trim();
    const movePattern = /(\d+\.\s*\S+(?:\s+\S+)?)/g;
    const moveMatches = trimmed.match(movePattern) || [];
    return moveMatches.slice(0, 2).join(' ');
  };

  return (
    <section className={`${styles.repertoireSection}${count > 0 ? ` ${styles.hasOpenings}` : ''}`}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>My repertoire</h2>
        {count > 0 && <span className={styles.count}>({count})</span>}
      </div>

      {count === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </div>
          <p className={styles.emptyTitle}>No openings saved yet</p>
          <p className={styles.emptyHint}>
            Tap the star on any opening to save it to your repertoire for quick access.
          </p>
        </div>
      ) : (
        <div className={styles.cardScroller}>
          {repertoire.map((entry) => (
            <button
              key={entry.fen}
              className={styles.repCard}
              onClick={() => onOpeningSelect({ fen: entry.fen })}
              type="button"
            >
              <div className={styles.repCardBoard}>
                <MiniBoard fen={entry.fen} size={120} />
              </div>
              <div className={styles.repCardInfo}>
                <div className={styles.repCardHeader}>
                  <h3 className={styles.repCardName}>{entry.name}</h3>
                  <StarButton filled onClick={() => remove(entry.fen)} size="sm" />
                </div>
                <div className={styles.repCardMeta}>
                  {entry.complexity && (
                    <span
                      className={`complexity-pill complexity-${entry.complexity.toLowerCase()}`}
                    >
                      {entry.complexity}
                    </span>
                  )}
                  {entry.eco && <span className="eco-pill">{entry.eco}</span>}
                </div>
                <span className={styles.repCardMoves}>{getFirstMovesDisplay(entry.moves)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
};
