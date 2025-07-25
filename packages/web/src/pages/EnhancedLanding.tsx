/**
 * @fileoverview Enhanced Landing Page Component  
 * PRD-F14 Phase 2: Hero section with prominent search and popular openings display
 */

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, TrendingUp, Users } from 'lucide-react'

interface PopularOpening {
  eco: string
  name: string
  games: number
  rating: number
}

interface EnhancedLandingProps {
  popularOpenings?: PopularOpening[]
  onSearch?: (query: string) => void
}

export const EnhancedLanding: React.FC<EnhancedLandingProps> = ({ 
  popularOpenings = [], 
  onSearch 
}) => {
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setSearchQuery(value)
    onSearch?.(value)
  }

  const formatGameCount = (count: number): string => {
    if (count >= 1000) {
      return `${(count / 1000).toLocaleString()}K games`
    }
    return `${count.toLocaleString()} games`
  }

  return (
    <main 
      role="main"
      style={{
        backgroundColor: 'var(--bg-main)',
        color: 'var(--text-primary)',
        minHeight: '100vh',
        paddingTop: 'var(--space-xl)'
      }}
    >
      {/* Hero Section */}
      <section
        role="region"
        aria-label="Hero section"
        style={{
          padding: 'var(--space-xxl) var(--space-lg)',
          textAlign: 'center',
          maxWidth: '1280px',
          margin: '0 auto'
        }}
      >
        <h1
          style={{
            fontSize: 'var(--font-size-h1)',
            fontWeight: 'var(--font-weight-h1)',
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-lg)',
            lineHeight: 1.2
          }}
        >
          Master Chess Openings
        </h1>
        
        <p
          style={{
            fontSize: 'var(--font-size-lg)',
            color: 'var(--text-secondary)',
            marginBottom: 'var(--space-xxl)',
            maxWidth: '600px',
            margin: '0 auto var(--space-xxl) auto'
          }}
        >
          Explore thousands of chess openings with detailed analysis, video tutorials, and popularity statistics.
        </p>

        {/* Prominent Search */}
        <div
          style={{
            position: 'relative',
            maxWidth: '500px',
            margin: '0 auto',
            marginBottom: 'var(--space-xxl)'
          }}
        >
          <Search 
            size={24} 
            style={{
              position: 'absolute',
              left: 'var(--space-md)',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-secondary)',
              pointerEvents: 'none'
            }}
          />
          <input
            type="text"
            placeholder="Search openings..."
            aria-label="Search openings"
            value={searchQuery}
            onChange={handleSearchChange}
            style={{
              width: '100%',
              padding: 'var(--space-lg) var(--space-lg) var(--space-lg) 3.5rem',
              backgroundColor: 'var(--bg-surface)',
              border: '2px solid var(--border-color)',
              borderRadius: 'var(--border-radius-large)',
              color: 'var(--text-primary)',
              fontSize: 'var(--font-size-lg)',
              outline: 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </section>

      {/* Popular Openings Section */}
      <section
        role="region"
        aria-label="Popular openings"
        style={{
          padding: 'var(--space-xxl) var(--space-lg)',
          maxWidth: '1280px',
          margin: '0 auto'
        }}
      >
        <h2
          style={{
            fontSize: 'var(--font-size-h2)',
            fontWeight: 'var(--font-weight-h2)',
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-xl)',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-sm)'
          }}
        >
          <TrendingUp size={32} />
          Popular Openings
        </h2>

        {popularOpenings.length > 0 ? (
          <ul
            role="list"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 'var(--space-lg)',
              listStyle: 'none',
              padding: 0,
              margin: 0
            }}
          >
            {popularOpenings.map((opening) => (
              <li key={opening.eco}>
                <Link
                  to={`/opening/${opening.eco}`}
                  style={{
                    display: 'block',
                    padding: 'var(--space-lg)',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--border-radius-large)',
                    textDecoration: 'none',
                    color: 'inherit',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 'var(--space-md)'
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          fontSize: 'var(--font-size-xl)',
                          fontWeight: 'var(--font-weight-h3)',
                          color: 'var(--text-primary)',
                          margin: 0,
                          marginBottom: 'var(--space-sm)'
                        }}
                      >
                        {opening.name}
                      </h3>
                      <span
                        style={{
                          fontSize: 'var(--font-size-sm)',
                          color: 'var(--text-secondary)',
                          fontWeight: 'var(--font-weight-medium)'
                        }}
                      >
                        {opening.eco}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-xs)'
                      }}
                    >
                      <Users size={16} />
                      <span>{formatGameCount(opening.games)}</span>
                    </div>
                    <div>
                      <span>Avg Rating: {opening.rating}</span>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: 'var(--space-xxl)',
              color: 'var(--text-secondary)'
            }}
          >
            <p>Loading popular openings...</p>
          </div>
        )}
      </section>
    </main>
  )
}
