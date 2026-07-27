import React from 'react';
import { Link } from 'react-router-dom';
import { useRepertoire } from '../../hooks/useRepertoire';
import { StarButton } from '../shared/StarButton';
import { MiniBoard } from '../shared/MiniBoard';
import styles from './RepertoireSection.module.css';

export const RepertoireSection: React.FC = () => {
  const { repertoire, count, remove } = useRepertoire();

  const getFirstMovesDisplay = (moves: string): string => {
    const trimmed = moves.trim();
    const movePattern = /(\d+\.\s*\S+(?:\s+\S+)?)/g;
    const moveMatches = trimmed.match(movePattern) || [];
    return moveMatches.slice(0, 2).join(' ');
  };

  // On a first visit a dashed empty box occupied prime space and pushed the
  // actual content below the fold — the page led with something the user
  // hadn't done yet (UX review change 03). One line, no heading, no panel.
  if (count === 0) {
    return (
      <section className={styles.repertoireSection}>
        <p className={styles.emptyPrompt}>Star openings to build your repertoire.</p>
      </section>
    );
  }

  return (
    <section className={`${styles.repertoireSection} ${styles.hasOpenings}`}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Your repertoire</h2>
        <span className={styles.count}>
          {count} {count === 1 ? 'opening' : 'openings'}
        </span>
      </div>

      <div className={styles.cardScroller}>
        {repertoire.map((entry) => (
          <Link
            key={entry.fen}
            className={styles.repCard}
            to={`/opening/${encodeURIComponent(entry.fen)}`}
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
                  <span className={`complexity-pill complexity-${entry.complexity.toLowerCase()}`}>
                    {entry.complexity}
                  </span>
                )}
                {entry.eco && <span className="eco-pill">{entry.eco}</span>}
              </div>
              <span className={styles.repCardMoves}>{getFirstMovesDisplay(entry.moves)}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};
