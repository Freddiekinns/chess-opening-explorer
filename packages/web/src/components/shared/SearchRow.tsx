import React from 'react';
import { formatMovesPreview } from '../../lib/searchQuery';
import styles from './SearchRow.module.css';

/**
 * The row every search surface draws — hero hub, hero results, mobile overlay.
 *
 * The blank state and the typing state used to be two separate implementations
 * on two separate type scales, so the same opening changed size, weight,
 * layout and hover behaviour the moment a second character arrived.
 *
 * No leading icon, deliberately. Hub rows carried a clock or a star and result
 * rows carried nothing, which pushed the opening's name 26px further right
 * before you typed than after — the name's left edge moving is the most visible
 * drift there is, and it was being caused by the marker meant to reassure you
 * nothing had changed. The clock and the star also only repeated the section
 * heading directly above them ("Recent", "Your repertoire"), one repetition per
 * row. The headings say it once, which is enough.
 */

export interface SearchRowOpening {
  fen: string;
  name: string;
  eco: string;
  moves: string;
}

export interface SearchRowProps {
  opening: SearchRowOpening;
  onSelect: (opening: SearchRowOpening) => void;
  saved?: boolean;
  /** Keyboard cursor. Styled identically to hover — arrowing and pointing are
      the same act. */
  active?: boolean;
  onMouseEnter?: () => void;
}

export const SearchRow: React.FC<SearchRowProps> = ({
  opening,
  onSelect,
  saved = false,
  active = false,
  onMouseEnter,
}) => (
  <button
    type="button"
    className={`${styles.row} ${active ? styles.active : ''}`}
    /* The styling class is hashed by CSS Modules, so the keyboard cursor needs
       a stable name to be asserted on. Not an ARIA role: a proper combobox
       would carry aria-activedescendant, and this list is not one yet. */
    data-active={active || undefined}
    onClick={() => onSelect(opening)}
    onMouseEnter={onMouseEnter}
  >
    <span className={styles.rowText}>
      <span className={styles.rowName}>{opening.name}</span>
      {opening.moves && (
        <span className={styles.rowMoves}>{formatMovesPreview(opening.moves)}</span>
      )}
    </span>
    <span className={styles.rowTrailing}>
      {saved && <span className={styles.rowSaved}>Saved</span>}
      {opening.eco && <span className={styles.rowEco}>{opening.eco}</span>}
    </span>
  </button>
);

export interface SurpriseRowProps {
  onSurprise: () => void;
  active?: boolean;
  onMouseEnter?: () => void;
}

/**
 * Surprise me, drawn once for every surface and every state.
 *
 * Quiet on purpose. This is the way out when the results are not the answer,
 * so it must not outrank them — the results list used to paint it brand orange
 * and semibold, which made the escape hatch the loudest thing under a list of
 * twenty real answers.
 *
 * No icon either, and the glyph question is the reason why: nothing available
 * was honest. Sparkles is the industry's AI mark and promises intelligence that
 * is not there. Shuffle and dice both name chance rather than a destination, and
 * shuffle specifically reads as a mode you switch on, not a jump you take once.
 * A gift or an opening box reads as a reward, and mystery-box imagery carries a
 * loot-box association this has no business borrowing — the payoff here is a
 * chess opening, chosen at random, which is a smaller and more honest promise
 * than any of those pictures make. The second line says exactly that in words,
 * and words are what the row needed.
 */
export const SurpriseRow: React.FC<SurpriseRowProps> = ({
  onSurprise,
  active = false,
  onMouseEnter,
}) => (
  <button
    type="button"
    className={`${styles.row} ${active ? styles.active : ''}`}
    /* The styling class is hashed by CSS Modules, so the keyboard cursor needs
       a stable name to be asserted on. Not an ARIA role: a proper combobox
       would carry aria-activedescendant, and this list is not one yet. */
    data-active={active || undefined}
    onClick={onSurprise}
    onMouseEnter={onMouseEnter}
  >
    <span className={styles.rowText}>
      <span className={styles.rowName}>Surprise me</span>
      <span className={styles.rowHint}>Jump to a random opening</span>
    </span>
  </button>
);

export default SearchRow;
