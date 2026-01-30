import React, { useState, useEffect, useCallback, useRef, CSSProperties } from 'react'
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom'
import { Chess, Move, Square } from 'chess.js'
// @ts-ignore
import { Chessboard } from 'react-chessboard'
import { ChessOpening, Video } from '../../../shared/src'
import { CommonPlans, VideoGallery, RelatedOpeningsTeaser } from '../components/detail'
import { SearchBar } from '../components/shared/SearchBar'
import { OpeningStats } from '../components/detail/OpeningStats'
import { FloatingBackButton } from '../components/shared/FloatingBackButton'
import { MobileSearchOverlay } from '../components/shared/MobileSearchOverlay'
import { VideoErrorBoundary } from '../components/shared/VideoErrorBoundary'
import { LineTypePill } from '../components/shared/LineTypePill'
import { FeedbackSection } from '../components/shared/FeedbackSection'
import { useAudio } from '../hooks/useAudio'

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
  white_win_rate?: number
  black_win_rate?: number
  draw_rate?: number
}

// Constants
const TAB_TYPES = {
  OVERVIEW: 'overview',
  PLANS: 'plans',
  VIDEOS: 'videos'
} as const;

type TabType = typeof TAB_TYPES[keyof typeof TAB_TYPES];

const API_ENDPOINTS = {
  OPENING_BY_FEN: '/api/openings/fen/',
  VIDEOS_BY_FEN: '/api/openings/videos/',
  STATS_BY_FEN: '/api/stats/',
  ALL_OPENINGS: '/api/openings/all'
} as const;

interface MovePair {
  white: string
  black?: string
}

const OpeningDetailPage: React.FC = () => {
  const { fen } = useParams<{ fen: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [opening, setOpening] = useState<Opening | null>(null)
  const [videos, setVideos] = useState<Video[]>([])
  const [game, setGame] = useState(new Chess())
  const [gameHistory, setGameHistory] = useState<string[]>([])
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [popularityStats, setPopularityStats] = useState<any>(null)
  const [openingsData, setOpeningsData] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<TabType>(TAB_TYPES.OVERVIEW)
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false)

  // Practice mode state
  const [practiceMode, setPracticeMode] = useState(false)
  const [practiceColor, setPracticeColor] = useState<'white' | 'black'>('white')
  const [practiceIndex, setPracticeIndex] = useState(0)
  const [practiceGame, setPracticeGame] = useState<Chess | null>(null)
  const [incorrectAttempts, setIncorrectAttempts] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const [highlightSquares, setHighlightSquares] = useState<Record<string, CSSProperties>>({})
  const [isComplete, setIsComplete] = useState(false)
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Click-to-move state
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [legalMoves, setLegalMoves] = useState<string[]>([])
  const { playAudio } = useAudio()

  useEffect(() => {
    if (fen) {
      loadOpening(decodeURIComponent(fen))
    }
  }, [fen])

  // Switch away from videos tab if no videos are available
  useEffect(() => {
    if (activeTab === TAB_TYPES.VIDEOS && videos.length === 0) {
      setActiveTab(TAB_TYPES.OVERVIEW)
    }
  }, [videos, activeTab])

  // API Helper Functions
  const fetchWithErrorHandling = async (url: string, errorMessage: string) => {
    try {
      const response = await fetch(url);
      const data = await response.json();
      return data.success ? data : null;
    } catch (err) {
      console.error(errorMessage, err);
      return null;
    }
  };

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
      
      const data = await fetchWithErrorHandling(
        `${API_ENDPOINTS.OPENING_BY_FEN}${encodeURIComponent(fenString)}`,
        'Error loading opening:'
      );
      
      if (data) {
        console.log('Opening data loaded from API:', data.data)
        setOpening(data.data)
        setupGame(data.data)
        loadPopularityStats(fenString)
        loadVideos(fenString)
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
    const data = await fetchWithErrorHandling(
      `${API_ENDPOINTS.STATS_BY_FEN}${encodeURIComponent(fenString)}`,
      'Error loading popularity stats:'
    );
    
    setPopularityStats(data?.data || null);
  }

  const loadVideos = async (fenString: string) => {
    const data = await fetchWithErrorHandling(
      `${API_ENDPOINTS.VIDEOS_BY_FEN}${encodeURIComponent(fenString)}`,
      'Error loading videos:'
    );
    
    setVideos(data?.data || []);
  }

  const setupGame = (openingData: Opening) => {
    try {
      const newGame = new Chess()
      
      // Check if moves exist and is a string
      if (!openingData.moves || typeof openingData.moves !== 'string') {
        console.warn('No valid moves found in opening data:', openingData)
        setGameHistory(['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'])
        setGame(new Chess())
        setCurrentMoveIndex(0)
        return
      }
      
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

  // Practice mode functions
  const startPractice = useCallback(() => {
    const newGame = new Chess()
    setPracticeGame(newGame)
    setPracticeIndex(0)
    setIncorrectAttempts(0)
    setShowHint(false)
    setHighlightSquares({})
    setIsComplete(false)
    setPracticeMode(true)
    // Clear any click-to-move selection
    setSelectedSquare(null)
    setLegalMoves([])

    // If playing as black, auto-play white's first move
    if (practiceColor === 'black') {
      const movesArray = getMovesList()
      if (movesArray.length > 0) {
        setTimeout(() => {
          const tempGame = new Chess()
          const move = tempGame.move(movesArray[0])
          if (move) {
            setPracticeGame(new Chess(tempGame.fen()))
            setPracticeIndex(1)
            playAudio('move')
          }
        }, 400)
      }
    }
  }, [practiceColor, opening])

  const exitPractice = useCallback(() => {
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current)
    }
    setPracticeMode(false)
    setPracticeGame(null)
    setPracticeIndex(0)
    setIncorrectAttempts(0)
    setShowHint(false)
    setHighlightSquares({})
    setIsComplete(false)
    // Clear any click-to-move selection
    setSelectedSquare(null)
    setLegalMoves([])
  }, [])

  const isUserTurn = useCallback((): boolean => {
    if (!practiceGame) return false
    const turn = practiceGame.turn()
    return (turn === 'w' && practiceColor === 'white') || (turn === 'b' && practiceColor === 'black')
  }, [practiceGame, practiceColor])

  const getExpectedMove = useCallback((): string | null => {
    const movesArray = getMovesList()
    if (practiceIndex >= movesArray.length) return null
    return movesArray[practiceIndex]
  }, [opening, practiceIndex])

  const getHintSquare = useCallback((): string | null => {
    if (!practiceGame) return null
    const expectedMove = getExpectedMove()
    if (!expectedMove) return null

    // Try to find the source square by testing the move
    const tempGame = new Chess(practiceGame.fen())
    const move = tempGame.move(expectedMove)
    return move?.from || null
  }, [practiceGame, getExpectedMove])

  const showHintHighlight = useCallback(() => {
    const hintSquare = getHintSquare()
    if (hintSquare) {
      setHighlightSquares({
        [hintSquare]: { backgroundColor: 'rgba(255, 170, 0, 0.5)' }
      })
      setShowHint(true)
    }
  }, [getHintSquare])

  const handleCorrectMove = useCallback((move: Move) => {
    if (!practiceGame) return

    const movesArray = getMovesList()
    const newIndex = practiceIndex + 1

    // Update game state with the move
    const newGame = new Chess(practiceGame.fen())
    newGame.move(move.san)
    setPracticeGame(newGame)
    setPracticeIndex(newIndex)
    setIncorrectAttempts(0)
    setShowHint(false)

    // Show green highlight briefly
    setHighlightSquares({
      [move.from]: { backgroundColor: 'rgba(0, 200, 83, 0.4)' },
      [move.to]: { backgroundColor: 'rgba(0, 200, 83, 0.4)' }
    })
    playAudio('move')

    setTimeout(() => {
      setHighlightSquares({})
    }, 300)

    // Check for completion
    if (newIndex >= movesArray.length) {
      setIsComplete(true)
      playAudio('success')
      return
    }

    // Auto-play opponent's move if it exists
    if (newIndex < movesArray.length) {
      const nextMove = movesArray[newIndex]
      const nextTurnIsUser = (newGame.turn() === 'w' && practiceColor === 'white') ||
                             (newGame.turn() === 'b' && practiceColor === 'black')

      if (!nextTurnIsUser) {
        autoPlayTimeoutRef.current = setTimeout(() => {
          const autoGame = new Chess(newGame.fen())
          const autoMove = autoGame.move(nextMove)
          if (autoMove) {
            setPracticeGame(new Chess(autoGame.fen()))
            setPracticeIndex(newIndex + 1)
            playAudio('move')

            // Check completion after auto-play
            if (newIndex + 1 >= movesArray.length) {
              setIsComplete(true)
              playAudio('success')
            }
          }
        }, 400)
      }
    }
  }, [practiceGame, practiceIndex, practiceColor, opening, playAudio])

  const handleIncorrectMove = useCallback(() => {
    const newAttempts = incorrectAttempts + 1
    setIncorrectAttempts(newAttempts)

    // Auto-show hint after 2 failed attempts
    if (newAttempts >= 2) {
      showHintHighlight()
    }
  }, [incorrectAttempts, showHintHighlight])

  // Get legal moves for a given square (for click-to-move)
  const getLegalMovesForSquare = useCallback((square: string): string[] => {
    if (!practiceGame) return []
    const moves = practiceGame.moves({ square: square as Square, verbose: true })
    return moves.map(m => m.to)
  }, [practiceGame])

  // Clear click-to-move selection
  const clearSelection = useCallback(() => {
    setSelectedSquare(null)
    setLegalMoves([])
  }, [])

  // Function to handle move from click (defined before handleSquareClick to avoid undefined reference)
  const validateAndHandleMoveFromClick = useCallback((sourceSquare: string, targetSquare: string): boolean => {
    if (!practiceGame || !isUserTurn()) return false

    const expectedMove = getExpectedMove()
    if (!expectedMove) return false

    // Try the move on a temp instance
    const tempGame = new Chess(practiceGame.fen())
    const attempt = tempGame.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q' // Auto-promote to queen for simplicity
    })

    if (!attempt) return false // Illegal move

    // Compare with expected move
    const isCorrect = attempt.san === expectedMove

    if (isCorrect) {
      handleCorrectMove(attempt)
    } else {
      handleIncorrectMove()
    }

    return isCorrect
  }, [practiceGame, isUserTurn, getExpectedMove, handleCorrectMove, handleIncorrectMove])

  // Handle square click for click-to-move functionality
  const handleSquareClick = useCallback(({ piece, square }: { piece: { pieceType: string } | null; square: string }) => {
    if (!practiceGame || !isUserTurn() || isComplete) return

    // If we have a selected square and clicking on a legal move target
    if (selectedSquare && legalMoves.includes(square)) {
      // Execute the move
      validateAndHandleMoveFromClick(selectedSquare, square)
      clearSelection()
      return
    }

    // If clicking on a piece that belongs to the current player
    if (piece) {
      // pieceType format is like "wP" (white Pawn), "bN" (black Knight)
      // First character is the color: 'w' for white, 'b' for black
      const pieceColor = piece.pieceType.charAt(0) === 'w' ? 'white' : 'black'
      const currentTurn = practiceGame.turn() === 'w' ? 'white' : 'black'
      
      if (pieceColor === currentTurn) {
        // Select this piece
        if (selectedSquare === square) {
          // Clicking the same square deselects
          clearSelection()
        } else {
          // Select new piece
          setSelectedSquare(square)
          setLegalMoves(getLegalMovesForSquare(square))
        }
        return
      }
    }

    // Clicking on empty square or opponent piece (not a legal capture) - clear selection
    clearSelection()
  }, [practiceGame, isUserTurn, isComplete, selectedSquare, legalMoves, getLegalMovesForSquare, clearSelection, validateAndHandleMoveFromClick])

  const validateAndHandleMove = useCallback(({ sourceSquare, targetSquare }: { piece?: any; sourceSquare: string; targetSquare: string | null }): boolean => {
    // If source and target are the same, it's a click not a drag - let onSquareClick handle it
    if (sourceSquare === targetSquare) return false
    
    // Clear any click-to-move selection when dragging
    clearSelection()
    if (!practiceGame || !isUserTurn() || !targetSquare) return false

    const expectedMove = getExpectedMove()
    if (!expectedMove) return false

    // Try the move on a temp instance
    const tempGame = new Chess(practiceGame.fen())
    const attempt = tempGame.move({
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q' // Auto-promote to queen for simplicity
    })

    if (!attempt) return false // Illegal move

    // Compare with expected move
    const isCorrect = attempt.san === expectedMove

    if (isCorrect) {
      handleCorrectMove(attempt)
    } else {
      handleIncorrectMove()
    }

    return isCorrect
  }, [practiceGame, isUserTurn, getExpectedMove, handleCorrectMove, handleIncorrectMove])

  // Cleanup auto-play timeout on unmount
  useEffect(() => {
    return () => {
      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current)
      }
    }
  }, [])

  // Update highlight squares when selection changes (for click-to-move)
  useEffect(() => {
    if (!practiceMode || !selectedSquare) return

    const newHighlights: Record<string, CSSProperties> = {}
    
    // Highlight selected square - bright yellow like Lichess/Chess.com
    newHighlights[selectedSquare] = { backgroundColor: 'rgba(255, 255, 0, 0.5)' }
    
    // Highlight legal move squares - green tint for available moves
    legalMoves.forEach(square => {
      newHighlights[square] = { 
        backgroundColor: 'rgba(0, 180, 0, 0.35)',
      }
    })

    setHighlightSquares(newHighlights)
  }, [selectedSquare, legalMoves, practiceMode, practiceGame])

  // Reset practice mode when opening changes
  useEffect(() => {
    if (practiceMode) {
      exitPractice()
    }
  }, [fen])

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

  const params = new URLSearchParams(location.search)
  const ref = params.get('ref')
  const personalPlatform = params.get('platform')
  const personalUsername = params.get('username')

  const backHref = ref === 'personal'
    ? `/?view=personal${personalPlatform ? `&platform=${encodeURIComponent(personalPlatform)}` : ''}${personalUsername ? `&username=${encodeURIComponent(personalUsername)}` : ''}`
    : '/'

  return (
    <div className="detail-page-body">
      {/* Floating Back Button for Mobile */}
      <FloatingBackButton />
      
      {/* Professional Header Layout */}
      <header className="detail-header">
        <div className="detail-header-container">
          <div className="header-left">
            <Link to={backHref} className="back-button">
              <span className="back-text-desktop">{ref === 'personal' ? 'Back to personal stats' : 'Back to search'}</span>
              <span className="back-text-mobile">←</span>
            </Link>
          </div>
          
          <div className="header-center">
            <Link to="/" className="site-title">
              Opening Book
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
            
            {/* Mobile menu toggle */}
            <button 
              className="mobile-menu-toggle"
              onClick={() => setIsMobileSearchOpen(true)}
              aria-label="Open search menu"
              title="Search openings"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Search Overlay */}
      <MobileSearchOverlay
        isOpen={isMobileSearchOpen}
        onClose={() => setIsMobileSearchOpen(false)}
        onSelect={selectOpening}
        openingsData={openingsData}
      />

      {/* Page Title Area */}
      <div className="page-title-area centered">
        <h1 className="opening-name">{opening.name}</h1>
        <div className="complexity-and-tags">
          {/* ECO code pill */}
          {opening.eco && (
            <span className="eco-pill">{opening.eco}</span>
          )}

                    {/* Mainline / Variation pill */}
          <LineTypePill isMainline={opening.isEcoRoot === true} />
          
          {/* Complexity pill */}
          {opening.complexity && (
            <span className={`complexity-tag complexity-${opening.complexity.toLowerCase()}`}>
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
          {/* Interactive Chessboard with immediate navigation */}
          <div className="chessboard-section">
            <div className="chessboard-container">
              <Chessboard
                options={{
                  position: practiceMode ? practiceGame?.fen() : game.fen(),
                  boardOrientation: practiceMode ? practiceColor : 'white',
                  allowDragging: practiceMode && isUserTurn() && !isComplete,
                  dragActivationDistance: 15, // Higher threshold to distinguish taps from drags on mobile
                  onPieceDrop: practiceMode ? validateAndHandleMove : undefined,
                  onSquareClick: practiceMode && isUserTurn() && !isComplete ? handleSquareClick : undefined,
                  squareStyle: {
                    touchAction: 'none', // Prevent iOS magnify/text selection on touch
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                  },
                  squareStyles: highlightSquares,
                  boardStyle: {
                    borderRadius: '8px',
                    touchAction: 'none', // Prevent default touch behaviors on the board
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                  },
                }}
              />
            </div>

            {/* Practice Mode Controls */}
            {practiceMode ? (
              <>
                {/* Desktop controls - hidden on mobile via CSS */}
                <div className="practice-controls practice-controls-desktop">
                  <div className="practice-controls-row">
                    <div className="practice-color-toggle">
                      <span className="practice-label">Playing as:</span>
                      <button
                        className={`practice-color-btn ${practiceColor === 'white' ? 'active' : ''}`}
                        onClick={() => {
                          setPracticeColor('white')
                          if (practiceMode) startPractice()
                        }}
                        disabled={isComplete}
                      >
                        White
                      </button>
                      <button
                        className={`practice-color-btn ${practiceColor === 'black' ? 'active' : ''}`}
                        onClick={() => {
                          setPracticeColor('black')
                          if (practiceMode) {
                            // Need to restart with black
                            const newGame = new Chess()
                            const movesArray = getMovesList()
                            if (movesArray.length > 0) {
                              const move = newGame.move(movesArray[0])
                              if (move) {
                                setPracticeGame(new Chess(newGame.fen()))
                                setPracticeIndex(1)
                                setIncorrectAttempts(0)
                                setShowHint(false)
                                setHighlightSquares({})
                                setIsComplete(false)
                              }
                            }
                          }
                        }}
                        disabled={isComplete}
                      >
                        Black
                      </button>
                    </div>

                    <div className="practice-progress">
                      {isComplete ? (
                        <span className="practice-complete">Complete!</span>
                      ) : (
                        <span className="practice-counter">
                          Move {Math.floor(practiceIndex / 2) + 1} of {Math.ceil(getMovesList().length / 2)}
                        </span>
                      )}
                    </div>

                    <div className="practice-actions">
                      {!isComplete && !showHint && (
                        <button
                          className="practice-btn practice-hint-btn"
                          onClick={showHintHighlight}
                          title="Show which piece to move"
                        >
                          Hint
                        </button>
                      )}
                      <button
                        className="practice-btn practice-exit-btn"
                        onClick={exitPractice}
                      >
                        Exit
                      </button>
                    </div>
                  </div>
                </div>

                {/* Mobile bottom bar - shown only on mobile via CSS */}
                <div className="practice-mobile-bar">
                  <div className="practice-mobile-color-toggle">
                    <button
                      className={`practice-mobile-color-btn ${practiceColor === 'white' ? 'active' : ''}`}
                      onClick={() => {
                        setPracticeColor('white')
                        if (practiceMode) startPractice()
                      }}
                      disabled={isComplete}
                      title="Play as White"
                    >
                      W
                    </button>
                    <button
                      className={`practice-mobile-color-btn ${practiceColor === 'black' ? 'active' : ''}`}
                      onClick={() => {
                        setPracticeColor('black')
                        if (practiceMode) {
                          const newGame = new Chess()
                          const movesArray = getMovesList()
                          if (movesArray.length > 0) {
                            const move = newGame.move(movesArray[0])
                            if (move) {
                              setPracticeGame(new Chess(newGame.fen()))
                              setPracticeIndex(1)
                              setIncorrectAttempts(0)
                              setShowHint(false)
                              setHighlightSquares({})
                              setIsComplete(false)
                            }
                          }
                        }
                      }}
                      disabled={isComplete}
                      title="Play as Black"
                    >
                      B
                    </button>
                  </div>

                  <div className="practice-mobile-progress">
                    {isComplete ? (
                      <span className="practice-mobile-complete">Complete!</span>
                    ) : (
                      <span className="practice-mobile-counter">
                        Move {Math.floor(practiceIndex / 2) + 1}/{Math.ceil(getMovesList().length / 2)}
                      </span>
                    )}
                  </div>

                  <div className="practice-mobile-actions">
                    {!isComplete && !showHint && (
                      <button
                        className="practice-mobile-btn practice-mobile-hint-btn"
                        onClick={showHintHighlight}
                        title="Show which piece to move"
                      >
                        Hint
                      </button>
                    )}
                    <button
                      className="practice-mobile-btn practice-mobile-exit-btn"
                      onClick={exitPractice}
                      title="Exit practice mode"
                    >
                      Exit
                    </button>
                  </div>
                </div>
              </>
            ) : (
              /* Navigation Controls - Shown when not in practice mode */
              <div className="chessboard-navigation">
                <button
                  onClick={() => goToMove(0)}
                  className="chessboard-nav-btn"
                  disabled={currentMoveIndex === 0}
                  title="Go to start"
                >
                  {'<<'}
                </button>
                <button
                  onClick={previousMove}
                  className="chessboard-nav-btn"
                  disabled={currentMoveIndex === 0}
                  title="Previous move"
                >
                  {'<'}
                </button>
                <button
                  onClick={nextMove}
                  className="chessboard-nav-btn"
                  disabled={currentMoveIndex >= getMovesList().length}
                  title="Next move"
                >
                  {'>'}
                </button>
                <button
                  onClick={() => goToMove(getMovesList().length)}
                  className="chessboard-nav-btn"
                  disabled={currentMoveIndex >= getMovesList().length}
                  title="Go to end"
                >
                  {'>>'}
                </button>
                <button
                  className="chessboard-nav-btn practice-toggle-btn"
                  onClick={startPractice}
                  title="Practice this opening"
                >
                  Practice
                </button>
              </div>
            )}

            {/* FEN Utilities - Technical information, less frequently accessed */}
            <div className="chessboard-fen-utilities">
              <label className="fen-utilities-label">Position (FEN)</label>
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
                  Analyse
                </a>
              </div>
            </div>
          </div>

          {/* Opening Moves List */}
          <div className="opening-moves-list">
            <div className="card-header">
              <h3 className="card-header__title card-header__title--accent">Opening Moves</h3>
            </div>
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

          {/* Related Openings Teaser inline expandable */}
          {opening?.fen && (
            <RelatedOpeningsTeaser
              fen={opening.fen}
              className="related-teaser-block"
            />
          )}

          {/* Simple Tabbed Content Section */}
          {opening?.eco && (
            <div className="simple-tabs">
              {/* Tab Buttons */}
              <div className="tab-buttons">
                <button 
                  className={`tab-button ${activeTab === TAB_TYPES.OVERVIEW ? 'active' : ''}`}
                  onClick={() => setActiveTab(TAB_TYPES.OVERVIEW)}
                >
                  Overview
                </button>
                <button 
                  className={`tab-button ${activeTab === TAB_TYPES.PLANS ? 'active' : ''}`}
                  onClick={() => setActiveTab(TAB_TYPES.PLANS)}
                >
                  Common Plans
                </button>
                {videos.length > 0 && (
                  <button 
                    className={`tab-button ${activeTab === TAB_TYPES.VIDEOS ? 'active' : ''}`}
                    onClick={() => setActiveTab(TAB_TYPES.VIDEOS)}
                  >
                    Related Videos ({videos.length})
                  </button>
                )}
              </div>

              {/* Tab Content */}
              <div className="tab-content-area">
                <div className={`tab-content-panel ${activeTab === TAB_TYPES.OVERVIEW ? 'active' : ''}`}>
                  <div className="content-panel-improved">
                    <h3 className="title-subsection">Description</h3>
                    <p>
                      {opening.description || opening.analysis?.description || opening.analysis_json?.description || 
                       `The ${opening?.name || 'opening'} is a chess opening classified under ECO code ${opening?.eco || 'unknown'}. This opening has been played in ${opening?.games_analyzed?.toLocaleString() || 'many'} games and offers strategic opportunities for both sides.`}
                    </p>
                  </div>
                </div>

                <div className={`tab-content-panel ${activeTab === TAB_TYPES.PLANS ? 'active' : ''}`}>
                  <CommonPlans 
                    ecoCode={opening.eco}
                  />
                </div>

                {videos.length > 0 && (
                  <div className={`tab-content-panel ${activeTab === TAB_TYPES.VIDEOS ? 'active' : ''}`}>
                    <div className="content-panel-improved">
                      <VideoErrorBoundary>
                        <VideoGallery 
                          videos={videos} 
                        />
                      </VideoErrorBoundary>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <FeedbackSection source="detail" />
    </div>
  )
}

export default OpeningDetailPage
