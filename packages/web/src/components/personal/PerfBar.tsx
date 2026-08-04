import React from 'react';
import styles from './PerfBar.module.css';

interface Props {
  win: number;
  draw: number;
  loss: number;
  games: number;
  /** Extra class for the wrapper (e.g. to gate visibility by breakpoint). */
  className?: string;
  /**
   * Show the worded "50% win · 0% draw · 50% loss" legend. Off for the summary
   * cards at the top of the dashboard, which already state their figures in
   * type directly above the bar — a legend there would print the same numbers
   * twice. Everything below (opening / family / variation rows) keeps it, since
   * the bar is the only place those rows carry numbers.
   */
  legend?: boolean;
}

/**
 * The Analyse-page win/draw/loss bar with an optional worded legend. Shared by
 * the dashboard summary cards, the individual opening cards, and the family /
 * variation cards (FamilyRow) so every bar on the page is the same object.
 *
 * With the legend on, the bar is decorative (aria-hidden) and the visible
 * legend carries the numbers. With it off, the bar itself takes the label.
 */
export const PerfBar: React.FC<Props> = ({ win, draw, loss, games, className, legend = true }) => {
  if (games === 0) return null;
  const wPct = Math.round((win / games) * 100);
  const dPct = Math.round((draw / games) * 100);
  const lPct = Math.round((loss / games) * 100);

  const trackA11y = legend
    ? { 'aria-hidden': true as const }
    : { role: 'img', 'aria-label': `${wPct}% win, ${dPct}% draw, ${lPct}% loss` };

  return (
    <div className={`${styles.perfBar} ${className ?? ''}`}>
      <div className={styles.track} {...trackA11y}>
        {wPct > 0 && <span className={styles.win} style={{ width: `${wPct}%` }} />}
        {dPct > 0 && <span className={styles.draw} style={{ width: `${dPct}%` }} />}
        {lPct > 0 && <span className={styles.loss} style={{ width: `${lPct}%` }} />}
      </div>
      {legend && (
        <div className={styles.legend}>
          <span className={styles.pctWin}>{wPct}% win</span>
          <span className={styles.pctDraw}>{dPct}% draw</span>
          <span className={styles.pctLoss}>{lPct}% loss</span>
        </div>
      )}
    </div>
  );
};

export default PerfBar;
