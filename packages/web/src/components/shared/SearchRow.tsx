import React from 'react';
import { ChevronRight, Shuffle } from 'lucide-react';
import { formatMovesPreview } from '../../lib/searchQuery';
import styles from './SearchRow.module.css';

/**
 * The row every search surface draws — hero hub, hero results, mobile overlay.
 *
 * The blank state and the typing state used to be two separate implementations
 * on two separate type scales, so the same opening changed size, weight,
 * layout and hover behaviour the moment a second character arrived. Whether a
 * row came from your history, your repertoire or a query is a fact about where
 * it came from, not about what it is, so it is carried by the leading icon and
 * the section heading above it — never by the row's shape.
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
  /** Clock for recents, star for the repertoire. Results carry none: in a
      ranked list every row is the same kind of thing, so an icon per row is
      twenty repetitions of one fact. */
  icon?: React.ReactNode;
  saved?: boolean;
  /** Keyboard cursor. Styled identically to hover — arrowing and pointing are
      the same act. */
  active?: boolean;
  /** The mobile overlay is a full-screen list, where a chevron reads as
      "this navigates". A dropdown anchored to the field does not need it. */
  showChevron?: boolean;
  onMouseEnter?: () => void;
}

export const SearchRow: React.FC<SearchRowProps> = ({
  opening,
  onSelect,
  icon,
  saved = false,
  active = false,
  showChevron = false,
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
    {icon}
    <span className={styles.rowText}>
      <span className={styles.rowName}>{opening.name}</span>
      {opening.moves && (
        <span className={styles.rowMoves}>{formatMovesPreview(opening.moves)}</span>
      )}
    </span>
    <span className={styles.rowTrailing}>
      {saved && <span className={styles.rowSaved}>Saved</span>}
      {opening.eco && <span className={styles.rowEco}>{opening.eco}</span>}
      {showChevron && <ChevronRight size={14} className={styles.rowChevron} aria-hidden="true" />}
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
 * The glyph is Shuffle, not Sparkles. Sparkles is the industry's AI icon; on a
 * control that picks a random opening it promises intelligence that is not
 * there. Shuffle means "one at random from a set", which is exactly the
 * behaviour.
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
    <Shuffle size={14} className={styles.rowIcon} aria-hidden="true" />
    <span className={styles.rowText}>
      <span className={styles.rowName}>Surprise me</span>
      <span className={styles.rowHint}>Jump to a random opening</span>
    </span>
  </button>
);

export default SearchRow;
