import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Chess } from 'chess.js'
// @ts-ignore
import { Chessboard } from 'react-chessboard'
import { ChessOpening } from '../../../shared/src/types/chess'
import { 
  DescriptionCard, 
  OpeningFamily,
  CommonPlans
} from '../components/detail'
import './OpeningDetailPage.css'

// Use ChessOpening type from shared
type Opening = ChessOpening & {
  src?: string
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

// Fast client-side search function (same as LandingPage)
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
    
    // Description matching (future enhancement)
    const description = opening.analysis?.description?.toLowerCase()
    if (description && description.includes(lowerCaseQuery)) {
      score += 10
    }
    
    // Style tags matching (future enhancement)
    const styleTags = opening.analysis?.style_tags?.map(t => t.toLowerCase())
    if (styleTags && styleTags.some(tag => tag.includes(lowerCaseQuery))) {
      score += 5
    }
    
    // Popularity boost (future enhancement)
    if (score > 0) {
      const popularity = opening.analysis?.popularity || 0
      score += popularity / 100
    }
    
    return { opening, score }
  })
  
  return rankedOpenings
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.opening)
}

const OpeningDetailPage: React.FC = () => {
  const { fen } = useParams<{ fen: string }>()
  const navigate = useNavigate()
  const [opening, setOpening] = useState<Opening | null>(null)
  const [game, setGame] = useState(new Chess())
  const [gameHistory, setGameHistory] = useState<string[]>([])
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Popularity stats state
  const [popularityStats, setPopularityStats] = useState<any>(null)
  
  // Fast client-side search functionality (same as LandingPage)
  const [searchTerm, setSearchTerm] = useState('')
  const [suggestions, setSuggestions] = useState<Opening[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const [openingsData, setOpeningsData] = useState<Opening[]>([])
  const [dataLoaded, setDataLoaded] = useState(false)

  useEffect(() => {
    if (fen) {
      loadOpening(decodeURIComponent(fen))
    }
  }, [fen])

  // Load all openings data once for fast search (same as LandingPage)
  useEffect(() => {
    const loadOpeningsData = async () => {
      try {
        const response = await fetch('/api/openings/all')
        const data = await response.json()
        
        if (data.success) {
          setOpeningsData(data.data)
          setDataLoaded(true)
        }
      } catch (error) {
        console.error('Error loading openings data:', error)
      }
    }
    
    loadOpeningsData()
  }, [])

  // Fast client-side search (no API calls after initial load)
  useEffect(() => {
    if (!dataLoaded || searchTerm.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    // Instant client-side search
    const relevantOpenings = findAndRankOpenings(searchTerm, openingsData)
    setSuggestions(relevantOpenings.slice(0, 8))
    setShowSuggestions(relevantOpenings.length > 0)
  }, [searchTerm, openingsData, dataLoaded])

  const loadOpening = async (fenString: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/openings/fen/${encodeURIComponent(fenString)}`)
      const data = await response.json()
      
      if (data.success) {
        setOpening(data.data)
        setupGame(data.data)
        // Load popularity stats for this opening
        loadPopularityStats(fenString)
      } else {
        setError('Opening not found')
      }
    } catch (err) {
      setError('Failed to load opening')
      console.error('Error loading opening:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadPopularityStats = async (fenString: string) => {
    try {
      const response = await fetch(`/api/stats/${encodeURIComponent(fenString)}`)
      const data = await response.json()
      
      if (data.success) {
        setPopularityStats(data.data)
        console.log('Loaded popularity stats:', data.data)
      } else {
        console.log('No popularity stats found for this opening')
        setPopularityStats(null)
      }
    } catch (err) {
      console.error('Error loading popularity stats:', err)
      setPopularityStats(null)
    }
  }

  const setupGame = (openingData: Opening) => {
    try {
      const newGame = new Chess()
      const moves = parseMoves(openingData.moves)
      const history: string[] = []
      
      for (const move of moves) {
        try {
          const result = newGame.move(move)
          if (result) {
            history.push(newGame.fen())
          }
        } catch (e) {
          console.warn(`Invalid move: ${move}`)
          break
        }
      }
      
      setGameHistory(['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', ...history])
      setCurrentMoveIndex(history.length)
      
      // Set game to final position
      setGame(newGame)
    } catch (e) {
      console.error('Error setting up game:', e)
    }
  }

  const parseMoves = (moveString: string): string[] => {
    return moveString
      .replace(/\d+\./g, '') // Remove move numbers
      .split(/\s+/)
      .filter(move => move.length > 0 && !move.includes('.'))
  }

  const goToMove = (moveIndex: number) => {
    if (moveIndex >= 0 && moveIndex < gameHistory.length) {
      setCurrentMoveIndex(moveIndex)
      const newGame = new Chess(gameHistory[moveIndex])
      setGame(newGame)
    }
  }

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    setActiveSuggestion(-1)
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
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
      } else if (suggestions.length > 0) {
        selectOpening(suggestions[0])
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
      setActiveSuggestion(-1)
    }
  }

  const selectOpening = (opening: Opening) => {
    const encodedFen = encodeURIComponent(opening.fen)
    navigate(`/opening/${encodedFen}`)
    setSearchTerm('')
    setShowSuggestions(false)
  }

  const handleSurpriseMe = async () => {
    try {
      const response = await fetch('/api/openings/random')
      const data = await response.json()
      
      if (data.success) {
        selectOpening(data.data)
      }
    } catch (error) {
      console.error('Random opening error:', error)
    }
  }

  if (loading) {
    return (
      <div className="detail-page-body">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div>Loading opening...</div>
        </div>
      </div>
    )
  }

  if (error || !opening) {
    return (
      <div className="detail-page-body">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div>
            <h2>{error || 'Opening not found'}</h2>
            <Link to="/">← Back to search</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="detail-page-body">
      <header className="site-header">
        <div className="header-content">
          <div className="logo-container">
            <Link to="/" className="back-to-search">
              ← Back to Search
            </Link>
            <Link to="/" className="site-logo">
              <i className="fas fa-chess-knight"></i>
              <span>Chess Trainer</span>
            </Link>
          </div>
          <div className="search-area">
            <div id="search-container">
              <div id="search-input-wrapper">
                <input
                  type="text"
                  id="search-bar"
                  placeholder="Search for a chess opening..."
                  value={searchTerm}
                  onChange={handleSearchInputChange}
                  onKeyDown={handleSearchKeyDown}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                />
                {showSuggestions && suggestions.length > 0 && (
                  <ul id="suggestions-list">
                    {suggestions.map((suggestion, index) => (
                      <li
                        key={`${suggestion.fen}-${index}`}
                        className={index === activeSuggestion ? 'active' : ''}
                        onClick={() => selectOpening(suggestion)}
                        onMouseEnter={() => setActiveSuggestion(index)}
                      >
                        <strong>{suggestion.name}</strong>
                        <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>
                          ({suggestion.eco})
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="button-group">
                <button 
                  id="go-button" 
                  onClick={() => suggestions.length > 0 && selectOpening(suggestions[0])}
                  disabled={suggestions.length === 0}
                >
                  Go
                </button>
                <button 
                  id="surprise-button" 
                  onClick={handleSurpriseMe}
                >
                  Surprise Me
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* New 70/30 Layout Structure */}
      <div className="detail-page-container">
        {/* Opening Header - Full Width */}
        {opening && (
          <div className="opening-header-improved">
            <div className="title-box">
              <h1>{opening.name}</h1>
              <div className="opening-meta">
                <span className="eco-tag-improved">{opening.eco}</span>
                {opening.analysis?.style_tags && opening.analysis.style_tags.length > 0 && (
                  <div className="tags-container">
                    {opening.analysis.style_tags.slice(0, 3).map((tag, index) => (
                      <span key={index} className="style-tag-improved">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area - 70/30 Split */}
        <div className="content-layout-improved">
          {/* Learning Path Section - 70% */}
          <main className="learning-path-improved">
            {/* Opening Description */}
            <DescriptionCard
              ecoCode={opening?.eco || ''}
              fen={opening?.fen}
              fallbackDescription={opening ? `${opening.name} is a chess opening classified under ECO code ${opening.eco}.` : undefined}
            />

            {/* Interactive Board & Moves */}
            <section className="board-section content-panel-improved">
              <h2 className="panel-header-improved">Interactive Board</h2>
              <div className="board-layout">
                <div className="board-container-improved">
                  <div className="chessboard-container">
                    <Chessboard
                      options={{
                        position: game.fen(),
                        boardOrientation: 'white',
                        allowDragging: false,
                        boardStyle: {
                          borderRadius: '8px',
                        },
                      }}
                    />
                  </div>
                  {/* Board controls moved below chessboard */}
                  <div className="board-controls-below">
                    <button 
                      onClick={() => goToMove(0)}
                      disabled={currentMoveIndex === 0}
                      className="control-button-improved"
                    >
                      ⏮ Start
                    </button>
                    <button 
                      onClick={() => goToMove(Math.max(0, currentMoveIndex - 1))}
                      disabled={currentMoveIndex === 0}
                      className="control-button-improved"
                    >
                      ⏪ Back
                    </button>
                    <button 
                      onClick={() => goToMove(Math.min(gameHistory.length - 1, currentMoveIndex + 1))}
                      disabled={currentMoveIndex === gameHistory.length - 1}
                      className="control-button-improved"
                    >
                      Next ⏩
                    </button>
                    <button 
                      onClick={() => goToMove(gameHistory.length - 1)}
                      disabled={currentMoveIndex === gameHistory.length - 1}
                      className="control-button-improved"
                    >
                      End ⏭
                    </button>
                  </div>
                  <div className="position-info">
                    <div className="fen-section">
                      <strong>Current Position:</strong>
                      <div className="fen-display-container">
                        <code className="fen-display">{game.fen()}</code>
                        <button 
                          className="copy-fen-btn"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(game.fen());
                              // Could add toast notification here
                            } catch (error) {
                              console.error('Failed to copy FEN:', error);
                            }
                          }}
                          title="Copy FEN position to clipboard"
                        >
                          📋
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Strategic Plans - Dynamic from ECO data */}
            {opening?.eco && (
              <CommonPlans 
                ecoCode={opening.eco}
                fen={opening.fen}
                className="content-panel-improved"
              />
            )}

            {/* Video Carousel Placeholder */}
            <section className="video-carousel-placeholder content-panel-improved">
              <h2 className="panel-header-improved">Video Lessons</h2>
              <div className="carousel-placeholder-content">
                <p className="panel-text-improved">Video lessons coming soon</p>
                <div className="placeholder-thumbnails">
                  <div className="placeholder-thumb"></div>
                  <div className="placeholder-thumb"></div>
                  <div className="placeholder-thumb"></div>
                </div>
              </div>
            </section>
          </main>

          {/* Unified Fact Sheet Sidebar - 30% */}
          <aside className="fact-sheet-improved">
            <div className="stats-panel-improved content-panel-improved">
              <h2 className="stats-header-improved panel-header-improved">Game Statistics</h2>
              {popularityStats ? (
                <div className="stats-content">
                  <div className="stats-bar-visual">
                    <div 
                      className="stats-white-section" 
                      style={{ width: `${(popularityStats.white_win_rate || 0) * 100}%` }}
                      title={`White: ${((popularityStats.white_win_rate || 0) * 100).toFixed(1)}%`}
                    ></div>
                    <div 
                      className="stats-draw-section" 
                      style={{ width: `${(popularityStats.draw_rate || 0) * 100}%` }}
                      title={`Draws: ${((popularityStats.draw_rate || 0) * 100).toFixed(1)}%`}
                    ></div>
                    <div 
                      className="stats-black-section" 
                      style={{ width: `${(popularityStats.black_win_rate || 0) * 100}%` }}
                      title={`Black: ${((popularityStats.black_win_rate || 0) * 100).toFixed(1)}%`}
                    ></div>
                  </div>
                  <div className="stats-details">
                    <p className="panel-text-improved">Total Games: {popularityStats.games_analyzed || 0}</p>
                    <p className="panel-text-improved">Popularity: {popularityStats.popularity_score ? Math.round(popularityStats.popularity_score * 10) : 'N/A'}/10</p>
                    {popularityStats.avg_rating && (
                      <p className="panel-text-improved">Avg Rating: {popularityStats.avg_rating}</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="panel-text-improved">No statistics available</p>
              )}
            </div>

            {/* Opening Family Navigation */}
            {opening?.eco && (
              <OpeningFamily 
                ecoCode={opening.eco}
                currentFen={opening.fen}
              />
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}

export default OpeningDetailPage
