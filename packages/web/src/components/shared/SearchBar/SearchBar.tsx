import React, { useState, useRef, useEffect } from 'react'
import './SearchBar.css'

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
}

// Fast client-side search function (based on original)
function findAndRankOpenings(query: string, openingsData: Opening[]): Opening[] {
  const lowerCaseQuery = query.toLowerCase()
  const rankedOpenings = openingsData.map(opening => {
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
    const description = opening.analysis?.description?.toLowerCase()
    if (description && description.includes(lowerCaseQuery)) {
      score += 10
    }
    
    // Style tags matching
    const styleTags = opening.analysis?.style_tags?.map(t => t.toLowerCase())
    if (styleTags && styleTags.some(tag => tag.includes(lowerCaseQuery))) {
      score += 5
    }
    
    // Popularity boost - prefer games_analyzed data when available
    if (score > 0) {
      const gamesAnalyzed = (opening as any).games_analyzed || 0
      if (gamesAnalyzed > 0) {
        // Use logarithmic scale to boost popular openings without overwhelming other factors
        score += Math.log10(gamesAnalyzed + 1) * 2
      } else {
        // Fallback to old popularity score
        const popularity = opening.analysis?.popularity || 0
        score += popularity / 100
      }
    }
    
    return { opening, score }
  })
  
  return rankedOpenings
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.opening)
}

export const SearchBar: React.FC<SearchBarProps> = ({
  variant = 'landing',
  onSelect,
  placeholder = "Search for a chess opening...",
  autoFocus = false,
  disabled = false,
  loading = false,
  openingsData,
  className = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [suggestions, setSuggestions] = useState<Opening[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const searchRef = useRef<HTMLInputElement>(null)

  // Fast client-side search
  useEffect(() => {
    if (searchTerm.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    const relevantOpenings = findAndRankOpenings(searchTerm, openingsData)
    setSuggestions(relevantOpenings.slice(0, 8))
    setShowSuggestions(relevantOpenings.length > 0)
  }, [searchTerm, openingsData])

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
          className="search-input"
          placeholder={loading ? "Loading openings..." : placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled || loading}
          autoFocus={autoFocus}
        />
        
        {loading && (
          <div className="loading-indicator">
            <span className="loading-spinner">⟳</span>
          </div>
        )}
        
        {showSuggestions && suggestions.length > 0 && (
          <ul className="suggestions-list">
            {suggestions.map((opening, index) => (
              <li
                key={`${opening.fen}-${index}`}
                className={`suggestion-item ${index === activeSuggestion ? 'active' : ''}`}
                onClick={() => handleSuggestionClick(opening)}
                onMouseEnter={() => setActiveSuggestion(index)}
              >
                <div className="suggestion-content">
                  <strong className="opening-name">{opening.name}</strong>
                  <span className="opening-eco">({opening.eco})</span>
                </div>
                {opening.analysis?.popularity && (
                  <span className="popularity-hint">
                    {opening.analysis.popularity.toFixed(1)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      
      {variant === 'landing' && (
        <div className="search-actions">
          <button 
            className="go-button" 
            onClick={handleGo}
            disabled={disabled || loading || searchTerm.length < 2}
          >
            {loading ? 'Loading...' : 'Go'}
          </button>
          <button 
            className="surprise-button" 
            onClick={handleSurpriseMe}
            disabled={disabled || loading}
          >
            {loading ? 'Loading...' : 'Surprise Me'}
          </button>
        </div>
      )}
    </div>
  )
}

export default SearchBar
