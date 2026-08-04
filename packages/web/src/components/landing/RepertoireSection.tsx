import React from 'react';
import { Link } from 'react-router-dom';
import { useRepertoire } from '../../hooks/useRepertoire';
import { useRepertoireToast } from '../../hooks/useRepertoireToast';
import { StarButton } from '../shared/StarButton';
import { MiniBoard } from '../shared/MiniBoard';
import { Toast } from '../shared/Toast';
import styles from './RepertoireSection.module.css';

export const RepertoireSection: React.FC = () => {
  const { repertoire, count } = useRepertoire();
  // Undo matters more here than anywhere: every other star adds, this one
  // removes something the user built, one tap, inside a scroller.
  const { toggleWithToast, toast } = useRepertoireToast();

  const getFirstMovesDisplay = (moves: string): string => {
    const trimmed = moves.trim();
    const movePattern = /(\d+\.\s*\S+(?:\s+\S+)?)/g;
    const moveMatches = trimmed.match(movePattern) || [];
    return moveMatches.slice(0, 2).join(' ');
  };

  // On a first visit a dashed empty box occupied prime space and pushed the
  // actual content below the fold — the page led with something the user
  // hadn't done yet (UX review change 03). The fix was height, not chrome:
  // one line tall, no heading, but still the bordered surface the mock draws,
  // so the slot reads as a slot and the first save fills it rather than
  // conjuring a section out of bare text.
  if (count === 0) {
    return (
      <section className={`${styles.repertoireSection} ${styles.isEmpty}`}>
        <p className={styles.emptyPrompt}>
          {/* The one word in the sentence doing instructional work — it ties
              the prompt to the star glyphs in every card header below. */}
          <svg
            className={styles.emptyPromptIcon}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          Star openings to build your repertoire.
        </p>
        {/* Unstarring the last opening lands here. Without this the toast —
            and with it the only way back — would vanish on the way. */}
        {toast && <Toast message={toast.message} onUndo={toast.onUndo} />}
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
                <StarButton
                  filled
                  size="sm"
                  onClick={() =>
                    toggleWithToast({
                      fen: entry.fen,
                      name: entry.name,
                      eco: entry.eco,
                      moves: entry.moves,
                      complexity: entry.complexity,
                    })
                  }
                />
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

      {toast && <Toast message={toast.message} onUndo={toast.onUndo} />}
    </section>
  );
};
