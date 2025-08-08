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

// Enhanced search function with semantic search as primary
async function searchOpenings(query: string, _useSemanticSearch: boolean = true): Promise<{
  results: Opening[],
  searchType: string,
  totalResults: number
}> {
  if (!query || query.trim().length < 2) {
    return { results: [], searchType: 'empty', totalResults: 0 };
  }

  try {
    // Use enhanced semantic search as primary (includes move search and name ranking fixes)
    const semanticResponse = await fetch(`/api/openings/semantic-search?q=${encodeURIComponent(query)}&limit=20`);
    
    if (semanticResponse.ok) {
      const semanticData = await semanticResponse.json();
      if (semanticData.success && semanticData.data && semanticData.data.length > 0) {
        return {
          results: semanticData.data,
          searchType: semanticData.searchType || 'semantic',
          totalResults: semanticData.totalResults || semanticData.data.length
        };
      }
    }

    // Fallback to old search endpoint if semantic search failed
    const response = await fetch(`/api/openings/search?q=${encodeURIComponent(query)}&limit=20`);
    
    if (response.ok) {
      const data = await response.json();
      if (data.success && data.data && data.data.length > 0) {
        return {
          results: data.data,
          searchType: data.searchType || 'server_fallback',
          totalResults: data.totalResults || data.count || data.data.length
        };
      }
    }

    // Server search returned no results
    return { results: [], searchType: 'no_server_results', totalResults: 0 };
  } catch (error) {
    console.warn('Search API error:', error);
    return { results: [], searchType: 'error', totalResults: 0 };
  }
}

// Get search suggestions (currently unused)
/*
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
*/

// Helper function to detect if a query looks like a chess move
function isChessMove(query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  
  // Common chess moves: d4, e4, nf3, etc.
  const movePatterns = [
    /^[a-h][1-8]$/, // Pawn moves: e4, d4, etc.
    /^[nbrqk][a-h][1-8]$/, // Piece moves: nf3, bb5, etc.
    /^o-o-o$/, // Long castling
    /^o-o$/, // Short castling
    /^[a-h]x[a-h][1-8]$/, // Captures: exd5, etc.
    /^[nbrqk]x[a-h][1-8]$/, // Piece captures: nxe5, etc.
  ];
  
  return movePatterns.some(pattern => pattern.test(trimmed));
}

// Client-side fallback search (kept for offline scenarios)
function findAndRankOpenings(query: string, openingsData: Opening[]): Opening[] {
  const lowerCaseQuery = query.toLowerCase()
  
  return openingsData
    .map(opening => {
      let score = 0
      const lowerCaseName = opening.name.toLowerCase()
      const moves = opening.moves.toLowerCase()
      
      // Move sequence matching (highest priority for move queries)
      if (isChessMove(lowerCaseQuery)) {
        if (moves.startsWith(`1. ${lowerCaseQuery}`) || moves.startsWith(`1.${lowerCaseQuery}`)) {
          score += 1000 // Exact opening move match - highest priority
        } else if (moves.startsWith(`1. ${lowerCaseQuery} `) || moves.startsWith(`1.${lowerCaseQuery} `)) {
          score += 950 // Opening move with continuation
        } else if (moves.includes(`1... ${lowerCaseQuery}`) || moves.includes(`1...${lowerCaseQuery}`)) {
          score += 800 // Black's first response
        } else if (moves.includes(`2. ${lowerCaseQuery}`) || moves.includes(`2.${lowerCaseQuery}`)) {
          score += 700 // White's second move
        } else if (moves.includes(`2... ${lowerCaseQuery}`) || moves.includes(`2...${lowerCaseQuery}`)) {
          score += 600 // Black's second move
        } else if (moves.includes(` ${lowerCaseQuery} `) || moves.includes(` ${lowerCaseQuery}.`)) {
          score += 400 // Move appears later in sequence
        } else if (moves.includes(lowerCaseQuery)) {
          score += 200 // Move appears somewhere
        }
      }
      
      // Name matching (high priority for text queries)
      if (lowerCaseName.startsWith(lowerCaseQuery)) {
        score += 500
      } else if (lowerCaseName.includes(lowerCaseQuery)) {
        score += 250
      }
      
      // Improved fuzzy name matching for common variations
      if (!isChessMove(lowerCaseQuery)) {
        // Handle common search variations
        const queryWords = lowerCaseQuery.split(/\s+/).filter(word => word.length > 0)
        const nameWords = lowerCaseName.split(/\s+/).filter(word => word.length > 0)
        
        // Check if all query words appear in the name (any order)
        const allWordsMatch = queryWords.every(queryWord => 
          nameWords.some(nameWord => 
            nameWord.includes(queryWord) || queryWord.includes(nameWord)
          )
        )
        
        if (allWordsMatch && queryWords.length > 1) {
          score += 400 // Multi-word fuzzy match bonus
        }
        
        // Handle specific common cases
        if (lowerCaseQuery.includes('kings') && lowerCaseName.includes("king's")) {
          score += 300 // Handle apostrophe variations
        }
        if (lowerCaseQuery.includes('queens') && lowerCaseName.includes("queen's")) {
          score += 300 // Handle apostrophe variations  
        }
      }
      
      // ECO code matching
      if (opening.eco.toLowerCase().includes(lowerCaseQuery)) {
        score += 150
      }
      
      // Move sequence matching for non-chess notation
      if (!isChessMove(lowerCaseQuery) && moves.includes(lowerCaseQuery)) {
        score += 200
      }
      
      // Description matching
      if (opening.analysis?.description?.toLowerCase().includes(lowerCaseQuery)) {
        score += 50
      }
      
      // Style tags matching
      if (opening.analysis?.style_tags?.some(tag => 
        tag.toLowerCase().includes(lowerCaseQuery)
      )) {
        score += 25
      }
      
      // Popularity boost (more significant for move queries to surface popular openings)
      if (score > 0) {
        const gamesAnalyzed = opening.games_analyzed || 0
        const analysisPopularity = opening.analysis?.popularity || 0
        
        // Use games_analyzed if available, otherwise analysis popularity
        const popularity = gamesAnalyzed > 0 ? gamesAnalyzed : analysisPopularity * 1000
        
        if (isChessMove(lowerCaseQuery)) {
          // For move queries, give significant popularity boost to surface common openings
          score += Math.min(300, popularity / 100)
        } else {
          // For text queries, smaller popularity boost
          score += Math.min(100, popularity / 500)
        }
        
        // Extra boost for very popular openings (>10k games)
        if (popularity > 10000) {
          score += 100
        }
      }
      
      return { opening, score }
    })
    .filter(item => item.score > 0)
    .sort((a, b) => {
      // Add debug logging for d4 searches
      if (query.toLowerCase() === 'd4' && (a.score > 800 || b.score > 800)) {
        console.log(`Sorting: ${a.opening.name} (${a.score}) vs ${b.opening.name} (${b.score})`)
      }
      return b.score - a.score
    })
    .map(item => {
      // Log top results for d4
      if (query.toLowerCase() === 'd4' && item.score > 800) {
        console.log(`Top result: ${item.opening.name} - Score: ${item.score} - Moves: ${item.opening.moves}`)
      }
      return item.opening
    })
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
        // For chess moves, prioritize client-side search for better move matching
        if (isChessMove(searchTerm)) {
          console.log('Chess move detected, using enhanced client-side search for:', searchTerm)
          const relevantOpenings = findAndRankOpenings(searchTerm, openingsData)
          if (relevantOpenings.length > 0) {
            setSuggestions(relevantOpenings.slice(0, 8))
            setShowSuggestions(true)
            return
          }
        }

        // For non-chess moves, try server-side search first
        const searchResults = await searchOpenings(searchTerm, true);
        
        if (searchResults.results.length > 0) {
          setSuggestions(searchResults.results.slice(0, 8))
          setShowSuggestions(true)
          return
        }
        
        // Fallback to client-side search if server returns no results
        console.log('Server search returned no results, trying client-side fallback')
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
      // Use our improved client-side search for direct navigation
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
