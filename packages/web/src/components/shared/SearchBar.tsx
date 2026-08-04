import React, { useRef, useState } from 'react';
import { SearchHub } from './SearchHub';
import { SearchRow, SurpriseRow } from './SearchRow';
import { SearchNoResults } from './SearchNoResults';
import { useOpeningSearch, type SearchResult } from '../../hooks/useOpeningSearch';
import { useSearchIndex } from '../../lib/searchIndex';
import type { Opening } from '../../lib/localSearch';

export type { Opening };

interface SearchBarProps {
  variant?: 'landing' | 'header' | 'inline';
  onSelect: (opening: Opening) => void;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  /**
   * Landing variant only. Supplied, the focused field opens the search hub
   * and this backs its Surprise me row. The caller owns the randomisation
   * because it can reach the whole corpus; this component only ever holds
   * the first slice of the search index.
   */
  onSurprise?: () => void;
  /**
   * Supplied, the field stops being a field: touching it hands off to whatever
   * this opens and nothing is typed here. Mobile passes it so the hero routes
   * into the full-screen overlay, the same place the top bar's magnifier goes.
   * The landing page otherwise had two search models on one screen, and the
   * inline dropdown was the one that sits under the on-screen keyboard.
   */
  onActivate?: () => void;
}

// Default placeholder with helpful hints
const DEFAULT_PLACEHOLDER = "Try: Sicilian, d4, QGD, B90, or 'aggressive openings'";

export const SearchBar: React.FC<SearchBarProps> = ({
  variant = 'landing',
  onSelect,
  placeholder = DEFAULT_PLACEHOLDER,
  autoFocus = false,
  disabled = false,
  loading = false,
  className = '',
  onSurprise,
  onActivate,
}) => {
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // The query itself belongs to the hook every surface shares. This component
  // owns only the parts a dropdown under a hero field needs: focus, the
  // keyboard cursor, and what happens to a chosen result.
  const { query, setQuery, results, noResults, hasQuery, reset } = useOpeningSearch();

  // Only to name a hub row's opening on the way out — see the select handler.
  // The hook loads the same slice for searching; this is the one copy of it.
  const openingsData = useSearchIndex(isFocused);

  const showSuggestions = !dismissed && hasQuery && results.length > 0;

  // Surprise me used to vanish on the second keystroke — the escape hatch for
  // "I don't know what I'm looking for" disappearing exactly when the user is
  // flailing. It now survives into the results list as a footer.
  const showSurpriseFooter = Boolean(onSurprise);

  const triggerSurprise = () => {
    if (!onSurprise) return;
    setIsFocused(false);
    setDismissed(true);
    setActiveSuggestion(-1);
    onSurprise();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setDismissed(false);
    setActiveSuggestion(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Surprise me sits one past the last result. It is a real destination in
    // the list, so arrowing has to reach it — a footer you can only click is
    // an escape hatch half the users cannot open.
    const lastIndex = showSurpriseFooter ? results.length : results.length - 1;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestion((prev) => (prev < lastIndex ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestion((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (showSurpriseFooter && activeSuggestion === results.length) {
        triggerSurprise();
      } else if (activeSuggestion >= 0) {
        selectOpening(results[activeSuggestion]);
      } else if (results.length > 0) {
        selectOpening(results[0]);
      }
    } else if (e.key === 'Escape') {
      setDismissed(true);
      setActiveSuggestion(-1);
    }
  };

  const selectOpening = (opening: SearchResult) => {
    reset();
    setDismissed(false);
    setActiveSuggestion(-1);
    onSelect(opening as Opening);
  };

  // Handing off, not searching here. Blur immediately so the on-screen keyboard
  // does not open behind the surface we are about to show, and so returning
  // from it does not land back on a focused field that reopens it.
  const handleActivate = () => {
    if (!onActivate) return;
    searchRef.current?.blur();
    onActivate();
  };

  const handleFocus = () => {
    if (onActivate) {
      handleActivate();
      return;
    }
    setIsFocused(true);
    setDismissed(false);
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow for click events
    setTimeout(() => {
      setIsFocused(false);
      setDismissed(true);
      setActiveSuggestion(-1);
    }, 150);
  };

  // Change 02: focusing the hero field opens the hub. Before typing, this
  // field showed nothing at all — the same gap the mobile overlay had fixed.
  const showHub = variant === 'landing' && isFocused && !hasQuery;

  return (
    <div className={`search-bar-container ${variant} ${className}`}>
      <div className="search-input-wrapper">
        <input
          ref={searchRef}
          type="text"
          className="search-input-field"
          placeholder={loading ? 'Loading openings...' : placeholder}
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onClick={onActivate ? handleActivate : undefined}
          /* readOnly, not disabled: the field must stay reachable by tab and
             announce itself, it just is not where the typing happens. iOS
             raises no keyboard for a readOnly input, so the handoff is clean. */
          readOnly={Boolean(onActivate)}
          disabled={disabled || loading}
          autoFocus={autoFocus}
        />

        {loading && (
          <div className="loading-indicator">
            <span className="loading-spinner">⟳</span>
          </div>
        )}

        {showHub && onSurprise && (
          // The blur handler tears the dropdown down after 150ms and hub rows
          // fire on click — a slow press would land on nothing. Holding focus
          // on the input keeps the row alive to receive it.
          <div className="search-hub-dropdown" onMouseDown={(e) => e.preventDefault()}>
            <SearchHub
              onSelect={(fen) => {
                setIsFocused(false);
                setDismissed(true);
                // Hub rows come from history and the repertoire, so the
                // opening may not be in the loaded index slice. Consumers
                // navigate by FEN; the rest of the record is only carried
                // through when we happen to have it.
                const match = openingsData.find((entry) => entry.fen === fen);
                onSelect(match ?? { fen, name: '', eco: '', moves: '', src: 'hub' });
              }}
              onSurprise={() => {
                setIsFocused(false);
                onSurprise();
              }}
            />
          </div>
        )}

        {showSuggestions && (
          <div className="search-results-dropdown" onMouseDown={(e) => e.preventDefault()}>
            {/* No count line. There is no "did you mean" and no correction
                notice either: fuzzy matching absorbs the typo, so the right
                openings appearing is the whole of the feedback. A number
                would only invite the question of what it counted — the search
                scores every record above zero, which is 4,269 for "sicilian"
                against a family of roughly 1,710. */}
            {/* A real <ul>: twenty ranked results are a list, and assistive
                technology should be told how many there are. */}
            <ul className="search-suggestions">
              {results.map((opening, index) => (
                <li key={`${opening.fen}-${index}`}>
                  <SearchRow
                    opening={opening}
                    active={index === activeSuggestion}
                    /* Repertoire membership travels with the result rather
                       than sitting in a section of its own: a saved opening
                       that also matches the query would otherwise be drawn
                       twice, in two different ranks. */
                    saved={opening.saved}
                    onSelect={() => selectOpening(opening)}
                    onMouseEnter={() => setActiveSuggestion(index)}
                  />
                </li>
              ))}
            </ul>

            {showSurpriseFooter && (
              // Outside the scroller on purpose: an escape hatch that scrolls
              // away is not one.
              <div className="search-results-footer">
                <SurpriseRow
                  onSurprise={triggerSurprise}
                  active={activeSuggestion === results.length}
                  onMouseEnter={() => setActiveSuggestion(results.length)}
                />
              </div>
            )}
          </div>
        )}

        {noResults && !dismissed && (
          <div className="search-no-results">
            <SearchNoResults />
          </div>
        )}
      </div>
    </div>
  );
};
