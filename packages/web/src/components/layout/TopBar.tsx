import { useState, useRef } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Loader2 } from 'lucide-react';
import SearchOverlay from '../shared/SearchOverlay';
import { SearchHub } from '../shared/SearchHub';
import { SearchRow, SurpriseRow } from '../shared/SearchRow';
import { SearchNoResults } from '../shared/SearchNoResults';
import { useOpeningSearch, type SearchResult } from '../../hooks/useOpeningSearch';
import styles from './TopBar.module.css';

const navItems = [
  { to: '/', label: 'Discover' },
  { to: '/analyse', label: 'Analyse' },
];

export default function TopBar() {
  const location = useLocation();
  const isDetailPage = location.pathname.startsWith('/opening/');

  // "Discover" should be active on "/" AND on "/opening/*" detail pages
  const isDiscoverActive = (navTo: string, routerIsActive: boolean) => {
    if (navTo === '/') return routerIsActive || isDetailPage;
    return routerIsActive;
  };

  return (
    <header className={styles.topBar}>
      <Link to="/" className={styles.logo}>
        Opening Book
      </Link>

      <nav className={styles.nav}>
        {navItems.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              `${styles.navItem} ${isDiscoverActive(to, isActive) ? styles.navItemActive : ''}`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Search is the product's core action — it lives in the bar on every
          page, not only on detail pages. Scrolling into the grid used to put
          the core action out of reach (UX review change 01). */}
      <div className={styles.rightSlot}>
        <TopBarSearch />
      </div>
    </header>
  );
}

/** Compact search bar shown in the TopBar on every page */
function TopBarSearch() {
  // Same hook as the hero and the mobile overlay: same expansion, same
  // debounce, same ranking. This component decides only how a dropdown pinned
  // to a 240px field behaves.
  const { query, setQuery, results, searching, noResults, hasQuery, reset } = useOpeningSearch();
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [mobileOpen, setMobileOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setActiveIndex(-1);
    setShowDropdown(true);
  };

  const selectResult = (result: SearchResult) => {
    navigate(`/opening/${encodeURIComponent(result.fen)}`);
    reset();
    setShowDropdown(false);
  };

  const handleSurpriseMe = async () => {
    try {
      const response = await fetch('/api/openings/random');
      const data = await response.json();
      if (data.success && data.data) {
        navigate(`/opening/${encodeURIComponent(data.data.fen)}`);
      }
    } catch {
      // Silent fail
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Surprise me is the row one past the last result, so arrowing reaches it.
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < results.length ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex === results.length && results.length > 0) {
        handleSurpriseMe();
      } else if (activeIndex >= 0) {
        selectResult(results[activeIndex]);
      } else if (results.length > 0) {
        selectResult(results[0]);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      setActiveIndex(-1);
    }
  };

  // Before typing, desktop showed nothing at all. It now gets the same hub the
  // mobile overlay has: recents, repertoire and Surprise me (UX review #09).
  const showHub = !hasQuery;

  // An empty panel is worse than no panel: between the second keystroke and the
  // response there is nothing to put in it, and the bordered box would blink.
  const hasSomethingToShow = showHub || results.length > 0 || noResults;

  const dropdownMarkup = showDropdown && hasSomethingToShow && (
    <div className={styles.dropdown}>
      {showHub ? (
        // The input's blur handler tears the dropdown down after 150ms, but
        // hub rows fire on click — a slow press would land on nothing. Keep
        // focus on the input so the row survives to receive the click.
        <div className={styles.hubWrap} onMouseDown={(e) => e.preventDefault()}>
          <SearchHub
            onSelect={(fen) => {
              navigate(`/opening/${encodeURIComponent(fen)}`);
              reset();
              setShowDropdown(false);
            }}
            onSurprise={handleSurpriseMe}
          />
        </div>
      ) : (
        <div onMouseDown={(e) => e.preventDefault()}>
          {/* A failed search used to close this panel, so on desktop it looked
              exactly like not having typed. It now says the same thing the
              overlay says. */}
          {noResults && <SearchNoResults />}
          {results.length > 0 && (
            <>
              {/* No count line: the openings appearing are the feedback. */}
              <ul className={styles.results}>
                {results.map((r, i) => (
                  <li key={`${r.fen}-${i}`}>
                    <SearchRow
                      opening={r}
                      saved={r.saved}
                      active={i === activeIndex}
                      onSelect={() => selectResult(r)}
                      onMouseEnter={() => setActiveIndex(i)}
                    />
                  </li>
                ))}
              </ul>
              {/* Outside the scrolling list, so it stays reachable however long
                  the results run. The hint used to be dropped here — the panel
                  was pinned to a 240px field and the label plus hint need
                  ~265px, so it survived only in a title and an aria-label, which
                  a sighted user navigating by keyboard never sees. The field is
                  now sized to hold a row (see .searchField), so the row explains
                  itself here exactly as it does everywhere else. */}
              <div className={styles.surpriseFooter}>
                <SurpriseRow
                  onSurprise={handleSurpriseMe}
                  active={activeIndex === results.length}
                  onMouseEnter={() => setActiveIndex(results.length)}
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop: inline search + surprise me */}
      <div className={styles.searchDesktop}>
        <div className={styles.searchField}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search openings..."
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowDropdown(true)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            className={styles.searchInput}
          />
          {searching ? (
            <Loader2
              size={16}
              className={styles.searchIcon}
              style={{ animation: 'spin 1s linear infinite' }}
            />
          ) : (
            <Search size={16} className={styles.searchIcon} />
          )}
          {dropdownMarkup}
        </div>
      </div>

      {/* Mobile: search icon opening the full-screen overlay (design 2a:
          recents + repertoire + surprise me before typing, live results after) */}
      <button
        className={styles.searchMobileBtn}
        onClick={() => setMobileOpen(true)}
        aria-label="Search openings"
        title="Search openings"
      >
        <Search size={18} />
      </button>

      <SearchOverlay open={mobileOpen} onClose={() => setMobileOpen(false)} />
    </>
  );
}
