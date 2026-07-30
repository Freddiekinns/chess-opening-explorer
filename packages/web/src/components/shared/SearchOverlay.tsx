import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { SearchHub } from './SearchHub';
import { SearchRow, SurpriseRow } from './SearchRow';
import { useRepertoire } from '../../hooks/useRepertoire';
import styles from './SearchOverlay.module.css';

/**
 * Full-screen mobile search (design 2a): the empty state is a navigation
 * hub — recently viewed openings, the user's repertoire, and Surprise me —
 * and typing two or more characters switches to live results. Replaces the
 * bare input-plus-dropdown overlay that TopBar used to render inline.
 */

interface SearchResult {
  fen: string;
  name: string;
  eco: string;
  moves: string;
}

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({ open, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const { isSaved } = useRepertoire();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const close = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setQuery('');
    setResults([]);
    setSearching(false);
    onClose();
  }, [onClose]);

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

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setQuery(value);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (value.trim().length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/openings/semantic-search?q=${encodeURIComponent(value)}&limit=20`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setResults(data.data);
          }
        }
      } catch {
        // Silent fail — the no-results state carries the hint text.
      } finally {
        setSearching(false);
      }
    }, 250);
  };

  const select = (opening: SearchResult) => {
    close();
    navigate(`/opening/${encodeURIComponent(opening.fen)}`);
  };

  const surpriseMe = async () => {
    try {
      const res = await fetch('/api/openings/random');
      const data = await res.json();
      if (data.success && data.data) select(data.data as SearchResult);
    } catch {
      // Silent fail
    }
  };

  if (!open) return null;

  const hasQuery = query.trim().length >= 2;
  const showEmptyState = !hasQuery;
  const showResults = hasQuery && results.length > 0;
  const noResults = hasQuery && !searching && results.length === 0;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Search openings">
      <div className={styles.header}>
        <div className={styles.inputWrap}>
          <Search size={15} className={styles.inputIcon} aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            placeholder="Search openings..."
            className={styles.input}
          />
        </div>
        <button type="button" className={styles.cancelBtn} onClick={close}>
          Cancel
        </button>
      </div>

      <div className={styles.body}>
        {showEmptyState && (
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
                <SearchRow
                  opening={opening}
                  saved={isSaved(opening.fen)}
                  showChevron
                  onSelect={select}
                />
              </li>
            ))}
          </ul>
        )}

        {noResults && (
          <div className={styles.noResults}>
            <span className={styles.noResultsTitle}>No openings match your search</span>
            <span className={styles.noResultsHint}>
              Try an ECO code (B02) or paste a PGN on the Analyse tab.
            </span>
          </div>
        )}
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
