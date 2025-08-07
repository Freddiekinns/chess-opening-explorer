import React, { useState, useEffect, useRef } from 'react';

interface Opening {
  fen: string
  name: string
  eco: string
  moves: string
  src: string
  scid?: string
  aliases?: Record<string, string>
  analysis?: {
    description?: string
    style_tags?: string[]
    popularity?: number
  }
  games_analyzed?: number  // Number of games this opening was played
  popularity_rank?: number // Rank based on games_analyzed
}

interface SearchBarProps {
  variant?: 'landing' | 'header' | 'inline'
  onSelect: (opening: Opening) => void
  placeholder?: string
  autoFocus?: boolean
  disabled?: boolean
  loading?: boolean
  openingsData: Opening[]
  className?: string
  onExpandSearch?: () => void // Callback to load more search data if needed
}

// Enhanced search function with semantic search fallback
async function searchOpenings(query: string, useSemanticSearch: boolean = true): Promise<{
  results: Opening[],
  searchType: string,
  totalResults: number
}> {
  if (!query || query.trim().length < 2) {
    return { results: [], searchType: 'empty', totalResults: 0 };
  }

  try {
    // Try semantic search first if enabled
    if (useSemanticSearch) {
      const response = await fetch(`/api/openings/semantic-search?q=${encodeURIComponent(query)}&limit=20`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.length > 0) {
          return {
            results: data.data,
            searchType: data.searchType || 'semantic',
            totalResults: data.totalResults || data.data.length
          };
        }
      }
    }

    // Fallback to regular search
    const response = await fetch(`/api/openings/search?q=${encodeURIComponent(query)}&limit=20`);
    
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        return {
          results: data.data,
          searchType: 'traditional',
          totalResults: data.count
        };
      }
    }

    // Final fallback to client-side search if available
    return { results: [], searchType: 'fallback', totalResults: 0 };
  } catch (error) {
    console.warn('Search API error:', error);
    return { results: [], searchType: 'error', totalResults: 0 };
  }
}

// Get search suggestions
async function getSearchSuggestions(query: string): Promise<string[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  try {
    const response = await fetch(`/api/openings/search-suggestions?q=${encodeURIComponent(query)}&limit=8`);
    
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        return data.data;
      }
    }
  } catch (error) {
    console.warn('Suggestions API error:', error);
  }

  return [];
}

// Client-side fallback search (kept for offline scenarios)
function findAndRankOpenings(query: string, openingsData: Opening[]): Opening[] {
  const lowerCaseQuery = query.toLowerCase()
  
  return openingsData
    .map(opening => {
      let score = 0
      const lowerCaseName = opening.name.toLowerCase()
      
      // Name matching (highest priority)
      if (lowerCaseName.startsWith(lowerCaseQuery)) {
        score += 100
      } else if (lowerCaseName.includes(lowerCaseQuery)) {
        score += 50
      }
      
      // ECO code matching
      if (opening.eco.toLowerCase().includes(lowerCaseQuery)) {
        score += 30
      }
      
      // Description matching
      if (opening.analysis?.description?.toLowerCase().includes(lowerCaseQuery)) {
        score += 10
      }
      
      // Style tags matching
      if (opening.analysis?.style_tags?.some(tag => 
        tag.toLowerCase().includes(lowerCaseQuery)
      )) {
        score += 5
      }
      
      // Simple popularity boost
      if (score > 0) {
        const popularity = opening.analysis?.popularity || 0
        score += popularity / 10 // Simpler than logarithmic
      }
      
      return { opening, score }
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.opening)
}

export const SearchBar: React.FC<SearchBarProps> = ({
  variant = 'landing',
  onSelect,
  placeholder = "Search to find your opening",
  autoFocus = false,
  disabled = false,
  loading = false,
  openingsData,
  className = '',
  onExpandSearch
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [suggestions, setSuggestions] = useState<Opening[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const [hasRequestedExpansion, setHasRequestedExpansion] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  // Enhanced search with server-side semantic search
  useEffect(() => {
    if (searchTerm.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    // Debounce search requests
    const searchTimeout = setTimeout(async () => {
      try {
        // Try semantic search first
        const searchResults = await searchOpenings(searchTerm, true);
        
        if (searchResults.results.length > 0) {
          setSuggestions(searchResults.results.slice(0, 8))
          setShowSuggestions(true)
          return
        }
        
        // Fallback to client-side search if server search fails
        const relevantOpenings = findAndRankOpenings(searchTerm, openingsData)
        setSuggestions(relevantOpenings.slice(0, 8))
        setShowSuggestions(relevantOpenings.length > 0)
        
        // If we have few results and haven't expanded yet, request more data
        if (relevantOpenings.length < 3 && !hasRequestedExpansion && onExpandSearch && openingsData.length < 5000) {
          setHasRequestedExpansion(true)
          onExpandSearch()
        }
      } catch (error) {
        console.warn('Search failed, using client-side fallback:', error)
        // Fallback to client-side search
        const relevantOpenings = findAndRankOpenings(searchTerm, openingsData)
        setSuggestions(relevantOpenings.slice(0, 8))
        setShowSuggestions(relevantOpenings.length > 0)
      }
    }, 300) // 300ms debounce

    // Cleanup timeout
    return () => clearTimeout(searchTimeout)
  }, [searchTerm, openingsData, hasRequestedExpansion, onExpandSearch])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    setActiveSuggestion(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveSuggestion(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveSuggestion(prev => prev > 0 ? prev - 1 : prev)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeSuggestion >= 0) {
        selectOpening(suggestions[activeSuggestion])
      } else if (searchTerm.trim()) {
        handleGo()
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setActiveSuggestion(-1)
    }
  }

  const selectOpening = (opening: Opening) => {
    setSearchTerm('')
    setShowSuggestions(false)
    setActiveSuggestion(-1)
    onSelect(opening)
  }

  const handleGo = () => {
    if (searchTerm.trim() && openingsData.length > 0) {
      const relevantOpenings = findAndRankOpenings(searchTerm, openingsData)
      if (relevantOpenings.length > 0) {
        selectOpening(relevantOpenings[0])
      }
    }
  }

  const handleSurpriseMe = () => {
    if (openingsData.length > 0) {
      const randomIndex = Math.floor(Math.random() * openingsData.length)
      const randomOpening = openingsData[randomIndex]
      selectOpening(randomOpening)
    }
  }

  const handleSuggestionClick = (opening: Opening) => {
    selectOpening(opening)
  }

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true)
    }
  }

  const handleBlur = () => {
    // Delay hiding suggestions to allow for click events
    setTimeout(() => {
      setShowSuggestions(false)
      setActiveSuggestion(-1)
    }, 150)
  }

  return (
    <div className={`search-bar-container ${variant} ${className}`}>
      <div className="search-input-wrapper">
        <input
          ref={searchRef}
          type="text"
          className="search-input-field"
          placeholder={loading ? "Loading openings..." : placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled || loading}
          autoFocus={autoFocus}
        />
        
        {variant === 'landing' && (
          <button 
            className="search-surprise-btn" 
            onClick={handleSurpriseMe}
            disabled={disabled || loading}
          >
            {loading ? 'Loading...' : 'Surprise me!'}
          </button>
        )}
        
        {loading && (
          <div className="loading-indicator">
            <span className="loading-spinner">⟳</span>
          </div>
        )}
        
        {showSuggestions && suggestions.length > 0 && (
          <ul className="search-suggestions">
            {suggestions.map((opening, index) => (
              <li
                key={`${opening.fen}-${index}`}
                className={`suggestion-item ${index === activeSuggestion ? 'active' : ''}`}
                onClick={() => handleSuggestionClick(opening)}
                onMouseEnter={() => setActiveSuggestion(index)}
              >
                <strong className="opening-name">{opening.name}</strong>
                <span className="opening-eco eco-code">({opening.eco})</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default SearchBar
