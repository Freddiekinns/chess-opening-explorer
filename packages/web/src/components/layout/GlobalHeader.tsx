/**
 * @fileoverview Global Header Component
 * PRD-F14 Phase 2: Sticky header with navigation, search, and responsive design
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Loader2 } from 'lucide-react';

interface Opening {
  fen: string;
  name: string;
  eco: string;
  moves: string;
}

interface GlobalHeaderProps {
  className?: string;
}

export const GlobalHeader: React.FC<GlobalHeaderProps> = ({ className = '' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Opening[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchQuery(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/openings/semantic-search?q=${encodeURIComponent(value)}&limit=10`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            setSearchResults(data.data);
            setShowDropdown(data.data.length > 0);
          }
        }
      } catch {
        // Silent fail — user can keep typing
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const handleResultClick = (opening: Opening) => {
    const encodedFen = encodeURIComponent(opening.fen);
    navigate(`/opening/${encodedFen}`);
    setSearchQuery('');
    setShowDropdown(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      handleResultClick(searchResults[0]);
    }
  };

  return (
    <header
      className={`global-header ${className}`}
      style={{
        position: 'sticky',
        top: 0,
        backgroundColor: 'var(--bg-main)',
        borderBottom: '1px solid var(--border-color)',
        padding: 'var(--space-sm) var(--space-lg)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {/* Left: Logo */}
      <Link
        to="/"
        style={{
          color: 'var(--text-primary)',
          textDecoration: 'none',
          fontSize: 'var(--font-size-h3)',
          fontWeight: 'var(--font-weight-h3)',
        }}
      >
        Opening Book
      </Link>

      {/* Center: Autocomplete Search Bar */}
      <div style={{ position: 'relative', flex: '0 1 400px' }}>
        <form onSubmit={handleSearchSubmit}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search openings..."
              value={searchQuery}
              onChange={handleSearchChange}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              onFocus={() => searchQuery.length >= 2 && setShowDropdown(searchResults.length > 0)}
              style={{
                width: '100%',
                padding: 'var(--space-sm) var(--space-md)',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--border-radius-medium)',
                color: 'var(--text-primary)',
                fontSize: 'var(--font-size-body)',
                outline: 'none',
              }}
            />
            {isSearching ? (
              <Loader2
                size={20}
                style={{
                  position: 'absolute',
                  right: 'var(--space-sm)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-secondary)',
                  pointerEvents: 'none',
                  animation: 'spin 1s linear infinite',
                }}
              />
            ) : (
              <Search
                size={20}
                style={{
                  position: 'absolute',
                  right: 'var(--space-sm)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-secondary)',
                  pointerEvents: 'none',
                }}
              />
            )}
          </div>
        </form>

        {/* Dropdown Results */}
        {showDropdown && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius-medium)',
              marginTop: 'var(--space-xs)',
              maxHeight: '300px',
              overflowY: 'auto',
              zIndex: 1001,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            }}
          >
            {searchResults.map((opening, index) => (
              <div
                key={`${opening.eco}-${index}`}
                onClick={() => handleResultClick(opening)}
                style={{
                  padding: 'var(--space-sm) var(--space-md)',
                  cursor: 'pointer',
                  borderBottom:
                    index < searchResults.length - 1 ? '1px solid var(--border-color)' : 'none',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--bg-main)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{ fontWeight: '500', color: 'var(--text-primary)' }}>
                  {opening.name}
                </div>
                <div style={{ fontSize: 'var(--font-size-small)', color: 'var(--text-secondary)' }}>
                  {opening.eco} • {opening.moves}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: Navigation Links */}
      <div style={{ display: 'flex', gap: 'var(--space-lg)' }}>
        <Link
          to="/about"
          style={{
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            fontSize: 'var(--font-size-body)',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          About
        </Link>
        <Link
          to="/login"
          style={{
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            fontSize: 'var(--font-size-body)',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          Login
        </Link>
      </div>
    </header>
  );
};
