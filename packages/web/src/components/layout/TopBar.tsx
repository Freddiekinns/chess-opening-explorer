import { useState, useRef, useEffect, useCallback } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Loader2 } from 'lucide-react';
import SearchOverlay from '../shared/SearchOverlay';
import { SearchHub } from '../shared/SearchHub';
import styles from './TopBar.module.css';

interface SearchResult {
  fen: string;
  name: string;
  eco: string;
  moves: string;
}

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
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [mobileOpen, setMobileOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const doSearch = useCallback((value: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    if (value.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/openings/semantic-search?q=${encodeURIComponent(value)}&limit=8`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setResults(data.data);
            setShowDropdown(data.data.length > 0);
          }
        }
      } catch {
        // Silent fail
      } finally {
        setIsSearching(false);
      }
    }, 250);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setActiveIndex(-1);
    doSearch(value);
  };

  const selectResult = (result: SearchResult) => {
    navigate(`/opening/${encodeURIComponent(result.fen)}`);
    setQuery('');
    setShowDropdown(false);
    setResults([]);
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
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0) {
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
  const showHub = query.trim().length < 2;

  const dropdownMarkup = showDropdown && (
    <div className={styles.dropdown}>
      {showHub ? (
        // The input's blur handler tears the dropdown down after 150ms, but
        // hub rows fire on click — a slow press would land on nothing. Keep
        // focus on the input so the row survives to receive the click.
        <div className={styles.hubWrap} onMouseDown={(e) => e.preventDefault()}>
          <SearchHub
            onSelect={(fen) => {
              navigate(`/opening/${encodeURIComponent(fen)}`);
              setQuery('');
              setShowDropdown(false);
            }}
            onSurprise={handleSurpriseMe}
          />
        </div>
      ) : (
        results.length > 0 && (
          <ul className={styles.results}>
            {results.map((r, i) => (
              <li
                key={`${r.fen}-${i}`}
                className={`${styles.dropdownItem} ${i === activeIndex ? styles.dropdownItemActive : ''}`}
                onMouseDown={() => selectResult(r)}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <span className={styles.dropdownName}>{r.name}</span>
                <span className={styles.dropdownMeta}>
                  {r.eco} &middot; {r.moves?.split(' ').slice(0, 6).join(' ')}
                </span>
              </li>
            ))}
          </ul>
        )
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
          {isSearching ? (
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
