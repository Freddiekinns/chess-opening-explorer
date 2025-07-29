import React, { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Chess } from 'chess.js'
// @ts-ignore
import { Chessboard } from 'react-chessboard'
import { ChessOpening } from '../../../shared/src/types/chess'
import { CommonPlans } from '../components/detail'
import { SearchBar } from '../components/shared/SearchBar'
import { OpeningStats } from '../components/detail/OpeningStats'

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
  const [openingsData, setOpeningsData] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'overview' | 'plans' | 'videos'>('overview')

  useEffect(() => {
    if (fen) {
      loadOpening(decodeURIComponent(fen))
    }
  }, [fen])

  // Load openings data for SearchBar component
  useEffect(() => {
    const loadOpeningsData = async () => {
      try {
        const response = await fetch('/api/openings/all')
        const data = await response.json()
        
        if (data.success) {
          setOpeningsData(data.data)
        }
      } catch (error) {
        console.error('Error loading openings data:', error)
      }
    }
    
    loadOpeningsData()
  }, [])

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

  const selectOpening = (opening: any) => {
    const encodedFen = encodeURIComponent(opening.fen)
    navigate(`/opening/${encodedFen}`)
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
      {/* Professional Header Layout */}
      <header className="detail-header">
        <div className="detail-header-container">
          <div className="header-left">
            <Link to="/" className="back-button">
              Back to search
            </Link>
          </div>
          
          <div className="header-center">
            <Link to="/" className="site-title">
              Chess Trainer
            </Link>
          </div>
          
          <div className="header-right">
            <SearchBar
              variant="header"
              onSelect={selectOpening}
              placeholder="Search openings..."
              openingsData={openingsData}
              className="header-search"
            />
            <button 
              className="surprise-btn"
              onClick={handleSurpriseMe}
              title="Explore random opening"
            >
              Surprise me
            </button>
          </div>
        </div>
      </header>

      {/* Page Title Area - Full Width */}
      <div className="page-title-area centered">
        <h1 className="title-page">{opening.name}</h1>
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
            <h3 className="title-subsection">Opening Moves</h3>
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
          {popularityStats ? (
            <OpeningStats
              gamesAnalyzed={popularityStats.games_analyzed || 0}
              whiteWins={Math.round((popularityStats.white_win_rate || 0) * (popularityStats.games_analyzed || 0))}
              draws={Math.round((popularityStats.draw_rate || 0) * (popularityStats.games_analyzed || 0))}
              blackWins={Math.round((popularityStats.black_win_rate || 0) * (popularityStats.games_analyzed || 0))}
              averageRating={popularityStats.avg_rating}
            />
          ) : (
            <OpeningStats
              gamesAnalyzed={opening?.games_analyzed || 100000}
              whiteWins={48000}
              draws={32000}
              blackWins={20000}
            />
          )}

          {/* Simple Tabbed Content Section */}
          {opening?.eco && (
            <div className="simple-tabs">
              {/* Tab Buttons */}
              <div className="tab-buttons">
                <button 
                  className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                  onClick={() => setActiveTab('overview')}
                >
                  Overview
                </button>
                <button 
                  className={`tab-button ${activeTab === 'plans' ? 'active' : ''}`}
                  onClick={() => setActiveTab('plans')}
                >
                  Common Plans
                </button>
                <button 
                  className={`tab-button ${activeTab === 'videos' ? 'active' : ''}`}
                  onClick={() => setActiveTab('videos')}
                >
                  Related Videos
                </button>
              </div>

              {/* Tab Content */}
              <div className="tab-content-area">
                {/* Overview Tab */}
                <div className={`tab-content-panel ${activeTab === 'overview' ? 'active' : ''}`}>
                  <div className="content-panel-improved">
                    <h3 className="title-subsection">Description</h3>
                    <p>
                      {opening.description || opening.analysis?.description || opening.analysis_json?.description || 
                       `The ${opening?.name || 'opening'} is a chess opening classified under ECO code ${opening?.eco || 'unknown'}. This opening has been played in ${opening?.games_analyzed?.toLocaleString() || 'many'} games and offers strategic opportunities for both sides.`}
                    </p>
                  </div>
                </div>

                {/* Common Plans Tab */}
                <div className={`tab-content-panel ${activeTab === 'plans' ? 'active' : ''}`}>
                  <CommonPlans 
                    ecoCode={opening.eco}
                  />
                </div>

                {/* Videos Tab */}
                <div className={`tab-content-panel ${activeTab === 'videos' ? 'active' : ''}`}>
                  <div className="video-lessons-section content-panel-improved">
                    <h3 className="title-subsection">Video Lessons</h3>
                    <p>Video lessons coming soon...</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default OpeningDetailPage
