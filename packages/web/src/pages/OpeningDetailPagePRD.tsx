import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Chess } from 'chess.js'
// @ts-ignore
import { Chessboard } from 'react-chessboard'
import { ChessOpening } from '../../../shared/src/types/chess'
import './OpeningDetailPagePRD.css'

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

const OpeningDetailPagePRD: React.FC = () => {
  const { fen } = useParams<{ fen: string }>()
  const navigate = useNavigate()
  const [opening, setOpening] = useState<Opening | null>(null)
  const [game, setGame] = useState(new Chess())
  const [gameHistory, setGameHistory] = useState<string[]>([])
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'plans' | 'videos'>('overview')
  const [moves, setMoves] = useState<string[]>([])
  const [popularityStats, setPopularityStats] = useState<any>(null)
  
  // Search functionality
  const [searchTerm, setSearchTerm] = useState('')
  const [suggestions, setSuggestions] = useState<Opening[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [openingsData, setOpeningsData] = useState<Opening[]>([])
  const [dataLoaded, setDataLoaded] = useState(false)

  useEffect(() => {
    if (fen && dataLoaded) {
      loadOpening(decodeURIComponent(fen))
    }
  }, [fen, dataLoaded])

  // Load all openings data for search
  useEffect(() => {
    const loadOpeningsData = async () => {
      try {
        const response = await fetch('/api/openings/all')
        const data = await response.json()
        
        if (data.success) {
          console.log(`Loaded ${data.data.length} openings for search`)
          setOpeningsData(data.data)
          setDataLoaded(true)
        }
      } catch (error) {
        console.error('Error loading openings data:', error)
      }
    }
    
    loadOpeningsData()
  }, [])

  // Fast client-side search
  useEffect(() => {
    if (!dataLoaded || searchTerm.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    const relevantOpenings = findAndRankOpenings(searchTerm, openingsData)
    setSuggestions(relevantOpenings.slice(0, 8))
    setShowSuggestions(relevantOpenings.length > 0)
  }, [searchTerm, openingsData, dataLoaded])

  const loadOpening = async (fenString: string) => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('Loading opening for FEN:', fenString)
      console.log('Available openings count:', openingsData.length)
      
      // First try to find the opening in our loaded data
      const foundOpening = openingsData.find(opening => opening.fen === fenString)
      
      if (foundOpening) {
        console.log('Opening found in local data:', foundOpening)
        console.log('Analysis JSON:', foundOpening.analysis_json)
        console.log('Description exists:', !!foundOpening.analysis_json?.description)
        console.log('Common plans exist:', !!foundOpening.analysis_json?.common_plans)
        console.log('Common plans count:', foundOpening.analysis_json?.common_plans?.length)
        setOpening(foundOpening)
        setupGame(foundOpening)
        loadPopularityStats(fenString)
      } else {
        console.log('Opening not found in local data, trying API fallback...')
        console.log('Sample of available FENs:', openingsData.slice(0, 3).map(o => o.fen))
      } else {
        // Fallback to API call
        const response = await fetch(`/api/openings/fen/${encodeURIComponent(fenString)}`)
        const data = await response.json()
        
        if (data.success) {
          console.log('Opening data loaded from API:', data.data)
          console.log('Analysis JSON:', data.data.analysis_json)
          setOpening(data.data)
          setupGame(data.data)
          loadPopularityStats(fenString)
        } else {
          setError('Opening not found')
        }
      }
    } catch (err) {
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
      
      setMoves(movesArray)
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
      <div className="page-title-area">
        <h1 className="opening-name">{opening.name}</h1>
        <span className="eco-code">{opening.eco}</span>
        {(opening.analysis_json?.style_tags || opening.analysis?.style_tags) && (opening.analysis_json?.style_tags || opening.analysis?.style_tags || []).length > 0 && (
          <div className="tag-pills-row">
            {(opening.analysis_json?.style_tags || opening.analysis?.style_tags || []).slice(0, 4).map((tag, index) => (
              <span key={index} className="tag-pill">{tag}</span>
            ))}
          </div>
        )}
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
                disabled={currentMoveIndex >= moves.length}
              >
                {'>'}
              </button>
              <button 
                onClick={() => goToMove(moves.length)}
                className="nav-btn"
                disabled={currentMoveIndex >= moves.length}
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
              {formatMovesAsPairs(moves).map((movePair, index) => (
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

          {/* Tabs Component */}
          <div className="tabs-component">
            <div className="tab-buttons">
              <button 
                className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </button>
              <button 
                className={`tab-btn ${activeTab === 'plans' ? 'active' : ''}`}
                onClick={() => setActiveTab('plans')}
              >
                Common Plans
              </button>
              <button 
                className={`tab-btn ${activeTab === 'videos' ? 'active' : ''}`}
                onClick={() => setActiveTab('videos')}
              >
                Videos
              </button>
            </div>

            <div className="tab-panels">
              {activeTab === 'overview' && (
                <div className="tab-panel overview-panel">
                  <div className="opening-description">
                    <h4>Opening Description</h4>
                    {opening?.analysis_json?.description ? (
                      <div className="description-content">
                        <p>{opening.analysis_json.description}</p>
                      </div>
                    ) : opening?.analysis?.description ? (
                      <div className="description-content">
                        <p>{opening.analysis.description}</p>
                      </div>
                    ) : (
                      <div className="description-content">
                        <p>
                          The {opening?.name} is a chess opening classified under ECO code {opening?.eco}. 
                          This opening has been played in {opening?.games_analyzed?.toLocaleString() || 'many'} games 
                          and offers strategic opportunities for both sides.
                        </p>
                      </div>
                    )}
                    
                    {(opening?.analysis_json?.style_tags || opening?.analysis?.style_tags) && (
                      <div className="style-tags">
                        <h5>Style Tags</h5>
                        <div className="tags-grid">
                          {(opening.analysis_json?.style_tags || opening.analysis?.style_tags || []).map((tag, index) => (
                            <span key={index} className="style-tag">{tag}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {opening?.analysis_json?.tactical_tags && opening.analysis_json.tactical_tags.length > 0 && (
                      <div className="tactical-tags">
                        <h5>Tactical Themes</h5>
                        <div className="tags-grid">
                          {opening.analysis_json.tactical_tags.map((tag, index) => (
                            <span key={index} className="tactical-tag">{tag}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {opening?.analysis_json?.positional_tags && opening.analysis_json.positional_tags.length > 0 && (
                      <div className="positional-tags">
                        <h5>Positional Themes</h5>
                        <div className="tags-grid">
                          {opening.analysis_json.positional_tags.map((tag, index) => (
                            <span key={index} className="positional-tag">{tag}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {(opening?.analysis_json?.complexity || opening?.analysis?.complexity) && (
                      <div className="complexity-level">
                        <h5>Complexity Level</h5>
                        <span className={`complexity-badge ${(opening.analysis_json?.complexity || opening.analysis?.complexity || '').toLowerCase()}`}>
                          {opening.analysis_json?.complexity || opening.analysis?.complexity}
                        </span>
                      </div>
                    )}
                    
                    {opening?.analysis_json?.strategic_themes && opening.analysis_json.strategic_themes.length > 0 && (
                      <div className="strategic-themes">
                        <h5>Strategic Themes</h5>
                        <ul>
                          {opening.analysis_json.strategic_themes.map((theme, index) => (
                            <li key={index}>{theme}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Debug info */}
                    <div style={{marginTop: '20px', padding: '10px', background: '#333', color: '#fff', fontSize: '12px', borderRadius: '4px'}}>
                      <strong>Debug Info:</strong> 
                      <div>Opening name: {opening?.name}</div>
                      <div>Has analysis: {opening?.analysis ? 'Yes' : 'No'}</div>
                      <div>Has analysis_json: {opening?.analysis_json ? 'Yes' : 'No'}</div>
                      <div>Analysis keys: {opening?.analysis ? Object.keys(opening.analysis).join(', ') : 'None'}</div>
                      <div>Analysis_json keys: {opening?.analysis_json ? Object.keys(opening.analysis_json).join(', ') : 'None'}</div>
                      <div>Raw opening object keys: {opening ? Object.keys(opening).join(', ') : 'None'}</div>
                    </div>
                  </div>
                </div>
              )}
              
              {activeTab === 'plans' && (
                <div className="tab-panel plans-panel">
                  <div className="common-plans">
                    <h4>Strategic Plans</h4>
                    {opening?.analysis_json?.common_plans && opening.analysis_json.common_plans.length > 0 ? (
                      <div className="plans-content">
                        <div className="specific-plans">
                          {opening.analysis_json.common_plans.map((plan, index) => (
                            <div key={index} className="plan-item">
                              <div className="plan-number">Plan {index + 1}:</div>
                              <div className="plan-text">{plan}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="plans-content">
                        <div className="plan-section">
                          <h5>🔲 White's Plans</h5>
                          <ul>
                            <li>Control the center with pawns and pieces</li>
                            <li>Develop pieces quickly and safely</li>
                            <li>Castle early for king safety</li>
                            <li>Look for tactical opportunities</li>
                          </ul>
                        </div>
                        
                        <div className="plan-section">
                          <h5>🔳 Black's Plans</h5>
                          <ul>
                            <li>Challenge White's central control</li>
                            <li>Develop with purpose</li>
                            <li>Seek counterplay opportunities</li>
                            <li>Maintain piece coordination</li>
                          </ul>
                        </div>
                        
                        <div className="plan-section">
                          <h5>⚡ Key Ideas</h5>
                          <ul>
                            <li>Focus on piece development over pawn moves</li>
                            <li>Control key central squares</li>
                            <li>Prepare for the middlegame transition</li>
                            <li>Watch for tactical patterns</li>
                          </ul>
                        </div>
                      </div>
                    )}
                    
                    {/* Debug info for Plans */}
                    <div style={{marginTop: '20px', padding: '10px', background: '#333', color: '#fff', fontSize: '12px', borderRadius: '4px'}}>
                      <strong>Plans Debug Info:</strong> 
                      <div>Has common_plans: {opening?.analysis_json?.common_plans ? 'Yes' : 'No'}</div>
                      <div>Common plans count: {opening?.analysis_json?.common_plans?.length || 0}</div>
                      <div>Common plans: {opening?.analysis_json?.common_plans ? JSON.stringify(opening.analysis_json.common_plans) : 'None'}</div>
                    </div>
                  </div>
                </div>
              )}
              
              {activeTab === 'videos' && (
                <div className="tab-panel videos-panel">
                  <p>Video lessons coming soon...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OpeningDetailPagePRD
