import React, { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { SearchHub } from './SearchHub';
import { SearchRow, SurpriseRow } from './SearchRow';
import { SearchNoResults } from './SearchNoResults';
import { useOpeningSearch } from '../../hooks/useOpeningSearch';
import styles from './SearchOverlay.module.css';

/**
 * Full-screen mobile search (design 2a): the empty state is a navigation
 * hub — recently viewed openings, the user's repertoire, and Surprise me —
 * and typing two or more characters switches to live results. Replaces the
 * bare input-plus-dropdown overlay that TopBar used to render inline.
 */

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({ open, onClose }) => {
  const { query, setQuery, results, searching, noResults, hasQuery, reset } = useOpeningSearch();
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const close = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  // Focus each time the overlay opens; Escape closes. SearchHub reads its own
  // recents when it mounts, which is on every open.
  useEffect(() => {
    if (!open) return;
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 50);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  // The bottom tab bar paints above this overlay and stays tappable, so a tab
  // can navigate while search is open. Close on that navigation, or the overlay
  // sits over the page that just loaded and the tabs read as dead. Keyed on the
  // path alone: re-running when `open` flips would close the overlay on open.
  const pathRef = useRef(pathname);
  useEffect(() => {
    if (pathRef.current === pathname) return;
    pathRef.current = pathname;
    if (open) close();
  }, [pathname, open, close]);

  const select = (opening: { fen: string }) => {
    close();
    navigate(`/opening/${encodeURIComponent(opening.fen)}`);
  };

  const surpriseMe = async () => {
    try {
      const res = await fetch('/api/openings/random');
      const data = await res.json();
      if (data.success && data.data) select(data.data);
    } catch {
      // Silent fail
    }
  };

  if (!open) return null;

  const showResults = hasQuery && results.length > 0;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Search openings">
      <div className={styles.header}>
        <div className={styles.inputWrap}>
          <Search size={15} className={styles.inputIcon} aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search openings..."
            className={styles.input}
          />
        </div>
        <button type="button" className={styles.cancelBtn} onClick={close}>
          Cancel
        </button>
      </div>

      <div className={styles.body}>
        {!hasQuery && (
          <SearchHub
            onSelect={(fen) => {
              close();
              navigate(`/opening/${encodeURIComponent(fen)}`);
            }}
            onSurprise={surpriseMe}
          />
        )}

        {hasQuery && searching && results.length === 0 && (
          <div className={styles.searchingNote} role="status">
            Searching…
          </div>
        )}

        {/* No count line: the openings appearing are the feedback, the same
            reason there is no "did you mean". */}
        {showResults && (
          <ul className={styles.rowList}>
            {results.map((opening, i) => (
              <li key={`${opening.fen}-${i}`}>
                <SearchRow opening={opening} saved={opening.saved} onSelect={select} />
              </li>
            ))}
          </ul>
        )}

        {noResults && <SearchNoResults />}
      </div>

      {/* Outside the scrolling body, same as the hero dropdown: twenty results
          deep is exactly where someone gives up, and that is where this has to
          still be on screen. */}
      {showResults && (
        <div className={styles.surpriseFooter}>
          <SurpriseRow onSurprise={surpriseMe} />
        </div>
      )}
    </div>
  );
};

export default SearchOverlay;
