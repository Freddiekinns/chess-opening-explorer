import React from 'react';
import styles from './PerfBar.module.css';

interface Props {
  win: number;
  draw: number;
  loss: number;
  games: number;
  /** Extra class for the wrapper (e.g. to gate visibility by breakpoint). */
  className?: string;
}

/**
 * The Analyse-page card's win/draw/loss bar with a worded legend
 * ("50% win · 0% draw · 50% loss"). Shared by the individual opening cards
 * (PersonalOpeningStats mobile list) and the family / variation cards
 * (FamilyRow) so every card on the page reads with one visual language.
 *
 * The bar is decorative (aria-hidden); the visible legend carries the numbers
 * for screen readers.
 */
export const PerfBar: React.FC<Props> = ({ win, draw, loss, games, className }) => {
  if (games === 0) return null;
  const wPct = Math.round((win / games) * 100);
  const dPct = Math.round((draw / games) * 100);
  const lPct = Math.round((loss / games) * 100);

  return (
    <div className={`${styles.perfBar} ${className ?? ''}`}>
      <div className={styles.track} aria-hidden="true">
        {wPct > 0 && <span className={styles.win} style={{ width: `${wPct}%` }} />}
        {dPct > 0 && <span className={styles.draw} style={{ width: `${dPct}%` }} />}
        {lPct > 0 && <span className={styles.loss} style={{ width: `${lPct}%` }} />}
      </div>
      <div className={styles.legend}>
        <span className={styles.pctWin}>{wPct}% win</span>
        <span className={styles.pctDraw}>{dPct}% draw</span>
        <span className={styles.pctLoss}>{lPct}% loss</span>
      </div>
    </div>
  );
};

export default PerfBar;
