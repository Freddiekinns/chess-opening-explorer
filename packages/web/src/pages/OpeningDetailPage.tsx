import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Chess } from 'chess.js'
// @ts-ignore
import { Chessboard } from 'react-chessboard'
import { ChessOpening } from '../../../shared/src/types/chess'
import { CommonPlans, DescriptionCard } from '../components/detail'
import '../styles/index.css' // Use design system

// Use ChessOpening type from shared
type Opening = ChessOpening & {
  src?: string
  scid?: string
  aliases?: Record<string, string>
  analysis?: {
    description?: string
    style_tags?: string[]
    popularity?: number
    complexity?: string
  }
  analysis_json?: {
    description?: string
    style_tags?: string[]
    tactical_tags?: string[]
    positional_tags?: string[]
    player_style_tags?: string[]
    phase_tags?: string[]
    complexity?: string
    strategic_themes?: string[]
    common_plans?: string[]
    version?: string
    last_enriched_at?: string
  }
  // Direct properties that come from the API
  description?: string
  style_tags?: string[]
  tactical_tags?: string[]
  positional_tags?: string[]
  player_style_tags?: string[]
  phase_tags?: string[]
  complexity?: string
  strategic_themes?: string[]
  common_plans?: string[]
  games_analyzed?: number
  popularity_rank?: number
}

interface MovePair {
  white: string
  black?: string
}

// Fast client-side search function
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
  const [popularityStats, setPopularityStats] = useState<any>(null)
  
  // Search functionality
  const [searchTerm, setSearchTerm] = useState('')
  const [suggestions, setSuggestions] = useState<Opening[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [openingsData, setOpeningsData] = useState<Opening[]>([])

  useEffect(() => {
    if (fen) {
      loadOpening(decodeURIComponent(fen))
    }
  }, [fen])

  // Initialize component without heavy data loading
  useEffect(() => {
    // Component ready for immediate use
  }, [])

  // Load openings data only when search is actually used
  useEffect(() => {
    if (searchTerm.length >= 2 && openingsData.length === 0) {
      const loadOpeningsData = async () => {
        try {
          const response = await fetch('/api/openings/all')
          const data = await response.json()
          
          if (data.success) {
            console.log(`Loaded ${data.data.length} openings for search`)
            setOpeningsData(data.data)
          }
        } catch (error) {
          console.error('Error loading openings data:', error)
        }
      }
      
      loadOpeningsData()
    }
  }, [searchTerm, openingsData.length])

  // Fast client-side search (only when data is loaded)
  useEffect(() => {
    if (searchTerm.length < 2 || openingsData.length === 0) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    const relevantOpenings = findAndRankOpenings(searchTerm, openingsData)
    setSuggestions(relevantOpenings.slice(0, 8))
    setShowSuggestions(relevantOpenings.length > 0)
  }, [searchTerm, openingsData])

  const loadOpening = async (fenString: string) => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Loading opening for FEN:', fenString)
      
      // Use API directly for better performance - no need to load all data
      const response = await fetch(`/api/openings/fen/${encodeURIComponent(fenString)}`)
      const data = await response.json()
      
      if (data.success) {
        console.log('Opening data loaded from API:', data.data)
        setOpening(data.data)
        setupGame(data.data)
        loadPopularityStats(fenString)
      } else {
        setError('Opening not found')
      }
    } catch (err) {
      console.error('Error loading opening:', err)
      setError('Failed to load opening')
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
      } else {
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
      // Parse moves properly - remove move numbers and split
      const movesArray = openingData.moves
        .replace(/\d+\./g, '') // Remove move numbers like "1.", "2.", etc.
        .split(/\s+/)
        .filter(move => move.trim() !== '' && !move.includes('.'))
      
      const history: string[] = ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1']
      
      // Apply moves one by one to build game history
      for (const move of movesArray) {
        try {
          const result = newGame.move(move)
          if (result) {
            history.push(newGame.fen())
          }
        } catch (error) {
          console.warn('Invalid move:', move)
          break
        }
      }
      
      setGameHistory(history)
      setGame(new Chess()) // Reset to starting position
      setCurrentMoveIndex(0)
    } catch (e) {
      console.error('Error setting up game:', e)
    }
  }

  const goToMove = (moveIndex: number) => {
    if (moveIndex >= 0 && moveIndex < gameHistory.length) {
      setCurrentMoveIndex(moveIndex)
      const newGame = new Chess(gameHistory[moveIndex])
      setGame(newGame)
    }
  }

  const nextMove = () => {
    if (currentMoveIndex < gameHistory.length - 1) {
      goToMove(currentMoveIndex + 1)
    }
  }

  const previousMove = () => {
    if (currentMoveIndex > 0) {
      goToMove(currentMoveIndex - 1)
    }
  }

  const formatMovesAsPairs = (movesArray: string[]): MovePair[] => {
    const pairs: MovePair[] = []
    for (let i = 0; i < movesArray.length; i += 2) {
      pairs.push({
        white: movesArray[i],
        black: movesArray[i + 1] || undefined
      })
    }
    return pairs
  }

  const getMovesList = (): string[] => {
    if (!opening?.moves) return []
    return opening.moves
      .replace(/\d+\./g, '') // Remove move numbers like "1.", "2.", etc.
      .split(/\s+/)
      .filter(move => move.trim() !== '' && !move.includes('.'))
  }

  const selectOpening = (opening: Opening) => {
    const encodedFen = encodeURIComponent(opening.fen)
    navigate(`/opening/${encodedFen}`)
    setSearchTerm('')
    setShowSuggestions(false)
  }

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
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
        <div className="loading-state">
          <h2>Loading opening...</h2>
        </div>
      </div>
    )
  }

  if (error || !opening) {
    return (
      <div className="detail-page-body">
        <div className="error-state">
          <h2>{error || 'Opening not found'}</h2>
          <Link to="/" className="back-link">← Back to search results</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="detail-page-body">
      {/* New Header Layout */}
      <header className="detail-header">
        <div className="header-left">
          <Link to="/" className="back-button">
            ← Back to search
          </Link>
        </div>
        
        <div className="header-center">
          <Link to="/" className="site-title">
            Chess Trainer
          </Link>
        </div>
        
        <div className="header-right">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search openings..."
              value={searchTerm}
              onChange={handleSearchInputChange}
              className="search-input"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="search-suggestions">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={`${suggestion.fen}-${index}`}
                    className="suggestion-item"
                    onClick={() => selectOpening(suggestion)}
                  >
                    <strong>{suggestion.name}</strong>
                    <span className="eco-code">({suggestion.eco})</span>
                  </div>
                ))}
              </div>
            )}
            <button 
              className="surprise-btn"
              onClick={handleSurpriseMe}
              title="Random opening"
            >
              🎲
            </button>
          </div>
        </div>
      </header>

      {/* Page Title Area - Full Width */}
      <div className="page-title-area centered">
        <h1 className="opening-name">{opening.name}</h1>
        <div className="complexity-and-tags centered">
          {/* ECO code pill */}
          {opening.eco && (
            <span className="eco-pill">
              {opening.eco}
            </span>
          )}
          
          {/* Complexity pill */}
          {opening.complexity && (
            <span className={`complexity-pill ${opening.complexity.toLowerCase()}`}>
              {opening.complexity}
            </span>
          )}
          
          {/* Style tags pills */}
          {(() => {
            const styleTags = opening.analysis_json?.style_tags || opening.analysis?.style_tags || opening.style_tags || [];
            return styleTags && styleTags.length > 0 ? styleTags.slice(0, 5).map((tag: string, index: number) => (
              <span key={`style-${index}`} className="style-pill">
                {tag}
              </span>
            )) : null;
          })()}
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="two-column-layout">
        {/* Left Column - Position Explorer (45%) */}
        <div className="left-column position-explorer">
          {/* Interactive Chessboard */}
          <div className="chessboard-section">
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
          </div>

          {/* Board Controls Container */}
          <div className="board-controls">
            <div className="navigation-buttons">
              <button 
                onClick={() => goToMove(0)}
                className="nav-btn"
                disabled={currentMoveIndex === 0}
              >
                {'<<'}
              </button>
              <button 
                onClick={previousMove}
                className="nav-btn"
                disabled={currentMoveIndex === 0}
              >
                {'<'}
              </button>
              <button 
                onClick={nextMove}
                className="nav-btn"
                disabled={currentMoveIndex >= getMovesList().length}
              >
                {'>'}
              </button>
              <button 
                onClick={() => goToMove(getMovesList().length)}
                className="nav-btn"
                disabled={currentMoveIndex >= getMovesList().length}
              >
                {'>>'}
              </button>
            </div>
            
            <div className="fen-display">
              <input 
                type="text" 
                value={game.fen()} 
                readOnly 
                className="fen-input"
              />
              <button 
                onClick={() => navigator.clipboard.writeText(game.fen())}
                className="copy-btn"
              >
                Copy
              </button>
              <a 
                href={`https://lichess.org/analysis/${game.fen()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="analyze-btn"
              >
                Analyze
              </a>
            </div>
          </div>

          {/* Opening Moves List */}
          <div className="opening-moves-list">
            <h3>Opening Moves</h3>
            <div className="moves-notation">
              {formatMovesAsPairs(getMovesList()).map((movePair, index) => (
                <div key={index} className="move-pair">
                  <span className="move-number">{index + 1}.</span>
                  <button 
                    className={`move-btn ${currentMoveIndex === index * 2 + 1 ? 'active' : ''}`}
                    onClick={() => goToMove(index * 2 + 1)}
                  >
                    {movePair.white}
                  </button>
                  {movePair.black && (
                    <button 
                      className={`move-btn ${currentMoveIndex === index * 2 + 2 ? 'active' : ''}`}
                      onClick={() => goToMove(index * 2 + 2)}
                    >
                      {movePair.black}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Knowledge Panel (55%) */}
        <div className="right-column knowledge-panel">
          {/* Statistics Component */}
          <div className="statistics-component">
            <h3>Game Statistics</h3>
            {popularityStats ? (
              <>
                <div className="statistics-bars">
                  <div className="stat-bar">
                    <span className="stat-label">White Success</span>
                    <div className="bar-container">
                      <div className="bar-track">
                        <div 
                          className="bar-fill white-bar" 
                          style={{ width: `${((popularityStats.white_win_rate || 0) * 100).toFixed(1)}%` }}
                        ></div>
                      </div>
                      <span className="stat-value">{((popularityStats.white_win_rate || 0) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="stat-bar">
                    <span className="stat-label">Draw</span>
                    <div className="bar-container">
                      <div className="bar-track">
                        <div 
                          className="bar-fill draw-bar" 
                          style={{ width: `${((popularityStats.draw_rate || 0) * 100).toFixed(1)}%` }}
                        ></div>
                      </div>
                      <span className="stat-value">{((popularityStats.draw_rate || 0) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="stat-bar">
                    <span className="stat-label">Black Success</span>
                    <div className="bar-container">
                      <div className="bar-track">
                        <div 
                          className="bar-fill black-bar" 
                          style={{ width: `${((popularityStats.black_win_rate || 0) * 100).toFixed(1)}%` }}
                        ></div>
                      </div>
                      <span className="stat-value">{((popularityStats.black_win_rate || 0) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
                <div className="total-games">
                  <span className="games-label">Total Games Analyzed:</span>
                  <span className="games-value">{popularityStats.games_analyzed?.toLocaleString() || 'N/A'}</span>
                </div>
                {popularityStats.avg_rating && (
                  <div className="average-rating">
                    <span className="rating-label">Average Rating:</span>
                    <span className="rating-value">{popularityStats.avg_rating}</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="statistics-bars">
                  <div className="stat-bar">
                    <span className="stat-label">White Success</span>
                    <div className="bar-container">
                      <div className="bar-track">
                        <div className="bar-fill white-bar" style={{ width: '48%' }}></div>
                      </div>
                      <span className="stat-value">48%</span>
                    </div>
                  </div>
                  <div className="stat-bar">
                    <span className="stat-label">Draw</span>
                    <div className="bar-container">
                      <div className="bar-track">
                        <div className="bar-fill draw-bar" style={{ width: '32%' }}></div>
                      </div>
                      <span className="stat-value">32%</span>
                    </div>
                  </div>
                  <div className="stat-bar">
                    <span className="stat-label">Black Success</span>
                    <div className="bar-container">
                      <div className="bar-track">
                        <div className="bar-fill black-bar" style={{ width: '20%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="total-games">
                  <span className="games-label">Total Games Analyzed:</span>
                  <span className="games-value">{opening?.games_analyzed?.toLocaleString() || 'N/A'}</span>
                </div>
              </>
            )}
          </div>

          {/* Description/Overview Section - Always Visible */}
          {opening?.eco && (
            <DescriptionCard 
              ecoCode={opening.eco}
              fen={opening.fen}
              fallbackDescription={`The ${opening?.name || 'opening'} is a chess opening classified under ECO code ${opening?.eco || 'unknown'}. This opening has been played in ${opening?.games_analyzed?.toLocaleString() || 'many'} games and offers strategic opportunities for both sides.`}
              className="content-panel-improved"
            />
          )}

          {/* Strategic Plans - Always Visible */}
          {opening?.eco && (
            <CommonPlans 
              ecoCode={opening.eco}
              fen={opening.fen}
              className="content-panel-improved"
            />
          )}

          {/* Video Carousel Placeholder - Always Visible */}
          <div className="video-lessons-section content-panel-improved">
            <h3>Video Lessons</h3>
            <p>Video lessons coming soon...</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OpeningDetailPage
