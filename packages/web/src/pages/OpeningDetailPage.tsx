import React, { useState, useEffect, useCallback, useRef, CSSProperties } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Chess, Move, Square } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { ChessOpening, Video } from '../../../shared/src';
import {
  CommonPlans,
  VideoGallery,
  StudiesGallery,
  OpeningNavigator,
  WinRateBar,
} from '../components/detail';
import type { Study, SearchLinks } from '../components/detail/StudiesGallery';
import styles from './OpeningDetailPage.module.css';
import practiceStyles from '../components/detail/PracticeControls.module.css';
import { VideoErrorBoundary } from '../components/shared/VideoErrorBoundary';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Play } from 'lucide-react';
import { useAudio } from '../hooks/useAudio';
import { useRepertoire } from '../hooks/useRepertoire';
import { StarButton } from '../components/shared/StarButton';
import type { TreeContext } from '../hooks/useOpeningTree';

// Use ChessOpening type from shared
type Opening = ChessOpening & {
  src?: string;
  scid?: string;
  aliases?: Record<string, string>;
  analysis?: {
    description?: string;
    style_tags?: string[];
    popularity?: number;
    complexity?: string;
  };
  analysis_json?: {
    description?: string;
    style_tags?: string[];
    tactical_tags?: string[];
    positional_tags?: string[];
    player_style_tags?: string[];
    phase_tags?: string[];
    complexity?: string;
    strategic_themes?: string[];
    common_plans?: string[];
    version?: string;
    last_enriched_at?: string;
  };
  // Direct properties that come from the API
  description?: string;
  style_tags?: string[];
  tactical_tags?: string[];
  positional_tags?: string[];
  player_style_tags?: string[];
  phase_tags?: string[];
  complexity?: string;
  strategic_themes?: string[];
  common_plans?: string[];
  games_analyzed?: number;
  popularity_rank?: number;
  white_win_rate?: number;
  black_win_rate?: number;
  draw_rate?: number;
};

const API_ENDPOINTS = {
  OPENING_BY_FEN: '/api/openings/fen/',
  VIDEOS_BY_FEN: '/api/openings/videos/',
  COURSES_BY_FEN: '/api/courses/',
  STATS_BY_FEN: '/api/stats/',
  RELATED_BY_FEN: '/api/openings/fen/',
} as const;

interface PopularityStats {
  games_analyzed?: number;
  white_win_rate?: number;
  black_win_rate?: number;
  draw_rate?: number;
  avg_rating?: number;
}

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

type CoursesResponse = {
  success: boolean;
  courses?: Study[];
  searchLinks?: SearchLinks | null;
};

const SITE_NAME = 'Opening Book';
const SITE_URL = 'https://www.openingbook.com';

const OpeningDetailPage: React.FC = () => {
  const { fen } = useParams<{ fen: string }>();
  const [opening, setOpening] = useState<Opening | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [game, setGame] = useState(new Chess());
  const [gameHistory, setGameHistory] = useState<string[]>([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [popularityStats, setPopularityStats] = useState<PopularityStats | null>(null);
  const [treeData, setTreeData] = useState<TreeContext | null>(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [studies, setStudies] = useState<Study[]>([]);
  const [searchLinks, setSearchLinks] = useState<SearchLinks | null>(null);

  const { isSaved, toggle: toggleRepertoire } = useRepertoire();

  // Practice mode state
  const [practiceMode, setPracticeMode] = useState(false);
  const [practiceColor, setPracticeColor] = useState<'white' | 'black'>('white');
  const [practiceIndex, setPracticeIndex] = useState(0);
  const [practiceGame, setPracticeGame] = useState<Chess | null>(null);
  const [incorrectAttempts, setIncorrectAttempts] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [highlightSquares, setHighlightSquares] = useState<Record<string, CSSProperties>>({});
  const [isComplete, setIsComplete] = useState(false);
  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const prevFenRef = useRef<string | undefined>(fen);
  const moveStripRef = useRef<HTMLDivElement>(null);

  // Click-to-move state
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  // Track the last move for visual highlighting
  const [lastMoveSquares, setLastMoveSquares] = useState<{ from: string; to: string } | null>(null);
  const { playAudio } = useAudio();

  // API Helper Functions
  const fetchWithErrorHandling = useCallback(async (url: string, errorMessage: string) => {
    try {
      const response = await fetch(url);
      const data = (await response.json()) as { success?: boolean };
      return data?.success ? data : null;
    } catch (err) {
      console.error(errorMessage, err);
      return null;
    }
  }, []);

  const loadPopularityStats = useCallback(
    async (fenString: string) => {
      const data = (await fetchWithErrorHandling(
        `${API_ENDPOINTS.STATS_BY_FEN}${encodeURIComponent(fenString)}`,
        'Error loading popularity stats:'
      )) as ApiResponse<PopularityStats> | null;

      setPopularityStats(data?.data || null);
    },
    [fetchWithErrorHandling]
  );

  const loadVideos = useCallback(
    async (fenString: string) => {
      const data = (await fetchWithErrorHandling(
        `${API_ENDPOINTS.VIDEOS_BY_FEN}${encodeURIComponent(fenString)}`,
        'Error loading videos:'
      )) as ApiResponse<Video[]> | null;

      setVideos(data?.data || []);
    },
    [fetchWithErrorHandling]
  );

  const loadStudies = useCallback(
    async (fenString: string, openingName: string) => {
      const encodedFen = encodeURIComponent(fenString);
      const nameParam = openingName ? `?openingName=${encodeURIComponent(openingName)}` : '';
      const data = (await fetchWithErrorHandling(
        `${API_ENDPOINTS.COURSES_BY_FEN}${encodedFen}${nameParam}`,
        'Error loading studies:'
      )) as CoursesResponse | null;

      setStudies(data?.courses || []);
      setSearchLinks(data?.searchLinks || null);
    },
    [fetchWithErrorHandling]
  );

  const loadTreeData = useCallback(
    async (fenString: string) => {
      setTreeLoading(true);
      try {
        const data = (await fetchWithErrorHandling(
          `${API_ENDPOINTS.RELATED_BY_FEN}${encodeURIComponent(fenString)}/tree`,
          'Error loading tree data:'
        )) as ApiResponse<TreeContext> | null;
        setTreeData(data?.data || null);
      } finally {
        setTreeLoading(false);
      }
    },
    [fetchWithErrorHandling]
  );

  const setupGame = useCallback((openingData: Opening) => {
    try {
      const newGame = new Chess();

      // Check if moves exist and is a string
      if (!openingData.moves || typeof openingData.moves !== 'string') {
        console.warn('No valid moves found in opening data:', openingData);
        setGameHistory(['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1']);
        setGame(new Chess());
        setCurrentMoveIndex(0);
        return;
      }

      // Parse moves properly - remove move numbers and split
      const movesArray = openingData.moves
        .replace(/\d+\./g, '') // Remove move numbers like "1.", "2.", etc.
        .split(/\s+/)
        .filter((move) => move.trim() !== '' && !move.includes('.'));

      const history: string[] = ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'];

      // Apply moves one by one to build game history
      for (const move of movesArray) {
        try {
          const result = newGame.move(move);
          if (result) {
            history.push(newGame.fen());
          }
        } catch (error) {
          console.warn('Invalid move:', move);
          break;
        }
      }

      setGameHistory(history);
      // Initialize to final position (end of opening sequence)
      const finalIndex = history.length - 1;
      setCurrentMoveIndex(finalIndex);
      setGame(new Chess(history[finalIndex]));
    } catch (e) {
      console.error('Error setting up game:', e);
    }
  }, []);

  const loadOpening = useCallback(
    async (fenString: string) => {
      try {
        setLoading(true);
        setError(null);

        console.log('Loading opening for FEN:', fenString);

        const data = (await fetchWithErrorHandling(
          `${API_ENDPOINTS.OPENING_BY_FEN}${encodeURIComponent(fenString)}`,
          'Error loading opening:'
        )) as ApiResponse<Opening> | null;

        if (data) {
          console.log('Opening data loaded from API:', data.data);
          setOpening(data.data);
          setupGame(data.data);
          // Fetch additional data (related openings fetched in parallel from useEffect)
          loadPopularityStats(fenString);
          loadVideos(fenString);
          loadStudies(fenString, data.data?.name || '');
        } else {
          setError('Opening not found');
        }
      } catch (err) {
        console.error('Error loading opening:', err);
        setError('Failed to load opening');
      } finally {
        setLoading(false);
      }
    },
    [fetchWithErrorHandling, loadPopularityStats, loadStudies, loadVideos, setupGame]
  );

  useEffect(() => {
    if (fen) {
      const decodedFen = decodeURIComponent(fen);
      // Start both fetches in parallel
      loadOpening(decodedFen);
      loadTreeData(decodedFen);
    }
  }, [fen, loadOpening, loadTreeData]);

  // Auto-scroll move strip to keep active move visible
  useEffect(() => {
    if (!moveStripRef.current) return;
    const pairIndex = currentMoveIndex === 0 ? 0 : Math.ceil(currentMoveIndex / 2);
    const activeEl = moveStripRef.current.querySelector(
      currentMoveIndex === 0 ? `.${styles.startPosition}` : `[data-move-pair="${pairIndex}"]`
    ) as HTMLElement | null;
    if (activeEl?.scrollIntoView) {
      activeEl.scrollIntoView({ inline: 'center', behavior: 'smooth', block: 'nearest' });
    }
  }, [currentMoveIndex]);

  const goToMove = (moveIndex: number) => {
    if (moveIndex >= 0 && moveIndex < gameHistory.length) {
      setCurrentMoveIndex(moveIndex);
      const newGame = new Chess(gameHistory[moveIndex]);
      setGame(newGame);
    }
  };

  const nextMove = () => {
    if (currentMoveIndex < gameHistory.length - 1) {
      goToMove(currentMoveIndex + 1);
    }
  };

  const previousMove = () => {
    if (currentMoveIndex > 0) {
      goToMove(currentMoveIndex - 1);
    }
  };

  const getMovesList = useCallback((): string[] => {
    if (!opening?.moves) return [];
    return opening.moves
      .replace(/\d+\./g, '') // Remove move numbers like "1.", "2.", etc.
      .split(/\s+/)
      .filter((move) => move.trim() !== '' && !move.includes('.'));
  }, [opening]);

  // Practice mode functions
  const startPractice = useCallback(() => {
    const newGame = new Chess();
    setPracticeGame(newGame);
    setPracticeIndex(0);
    setIncorrectAttempts(0);
    setShowHint(false);
    setHighlightSquares({});
    setIsComplete(false);
    setPracticeMode(true);
    // Clear any click-to-move selection and last move
    setSelectedSquare(null);
    setLegalMoves([]);
    setLastMoveSquares(null);

    // If playing as black, auto-play white's first move
    if (practiceColor === 'black') {
      const movesArray = getMovesList();
      if (movesArray.length > 0) {
        setTimeout(() => {
          const tempGame = new Chess();
          const move = tempGame.move(movesArray[0]);
          if (move) {
            setPracticeGame(new Chess(tempGame.fen()));
            setPracticeIndex(1);
            // Set last move to show white's opening move
            setLastMoveSquares({ from: move.from, to: move.to });
            playAudio('move');
          }
        }, 400);
      }
    }
  }, [practiceColor, getMovesList, playAudio]);

  const exitPractice = useCallback(() => {
    if (autoPlayTimeoutRef.current) {
      clearTimeout(autoPlayTimeoutRef.current);
    }
    setPracticeMode(false);
    setPracticeGame(null);
    setPracticeIndex(0);
    setIncorrectAttempts(0);
    setShowHint(false);
    setHighlightSquares({});
    setIsComplete(false);
    // Clear any click-to-move selection and last move
    setSelectedSquare(null);
    setLegalMoves([]);
    setLastMoveSquares(null);
  }, []);

  const isUserTurn = useCallback((): boolean => {
    if (!practiceGame) return false;
    const turn = practiceGame.turn();
    return (
      (turn === 'w' && practiceColor === 'white') || (turn === 'b' && practiceColor === 'black')
    );
  }, [practiceGame, practiceColor]);

  const getExpectedMove = useCallback((): string | null => {
    const movesArray = getMovesList();
    if (practiceIndex >= movesArray.length) return null;
    return movesArray[practiceIndex];
  }, [getMovesList, practiceIndex]);

  const getHintSquare = useCallback((): string | null => {
    if (!practiceGame) return null;
    const expectedMove = getExpectedMove();
    if (!expectedMove) return null;

    // Try to find the source square by testing the move
    const tempGame = new Chess(practiceGame.fen());
    const move = tempGame.move(expectedMove);
    return move?.from || null;
  }, [practiceGame, getExpectedMove]);

  const showHintHighlight = useCallback(() => {
    setShowHint(true);
  }, []);

  const handleCorrectMove = useCallback(
    (move: Move) => {
      if (!practiceGame) return;

      const movesArray = getMovesList();
      const newIndex = practiceIndex + 1;

      // Update game state with the move
      const newGame = new Chess(practiceGame.fen());
      newGame.move(move.san);
      setPracticeGame(newGame);
      setPracticeIndex(newIndex);
      setIncorrectAttempts(0);
      setShowHint(false);

      // Set the last move for highlighting
      setLastMoveSquares({ from: move.from, to: move.to });
      playAudio('move');

      // Check for completion
      if (newIndex >= movesArray.length) {
        setIsComplete(true);
        playAudio('success');
        return;
      }

      // Auto-play opponent's move if it exists
      if (newIndex < movesArray.length) {
        const nextMove = movesArray[newIndex];
        const nextTurnIsUser =
          (newGame.turn() === 'w' && practiceColor === 'white') ||
          (newGame.turn() === 'b' && practiceColor === 'black');

        if (!nextTurnIsUser) {
          autoPlayTimeoutRef.current = setTimeout(() => {
            const autoGame = new Chess(newGame.fen());
            const autoMove = autoGame.move(nextMove);
            if (autoMove) {
              setPracticeGame(new Chess(autoGame.fen()));
              setPracticeIndex(newIndex + 1);
              // Update last move to show opponent's move
              setLastMoveSquares({ from: autoMove.from, to: autoMove.to });
              playAudio('move');

              // Check completion after auto-play
              if (newIndex + 1 >= movesArray.length) {
                setIsComplete(true);
                playAudio('success');
              }
            }
          }, 400);
        }
      }
    },
    [practiceGame, practiceIndex, practiceColor, getMovesList, playAudio]
  );

  const handleIncorrectMove = useCallback(() => {
    const newAttempts = incorrectAttempts + 1;
    setIncorrectAttempts(newAttempts);

    // Auto-show hint after 2 failed attempts
    if (newAttempts >= 2) {
      showHintHighlight();
    }
  }, [incorrectAttempts, showHintHighlight]);

  // Get legal moves for a given square (for click-to-move)
  const getLegalMovesForSquare = useCallback(
    (square: string): string[] => {
      if (!practiceGame) return [];
      const moves = practiceGame.moves({ square: square as Square, verbose: true });
      return moves.map((m) => m.to);
    },
    [practiceGame]
  );

  // Clear click-to-move selection
  const clearSelection = useCallback(() => {
    setSelectedSquare(null);
    setLegalMoves([]);
  }, []);

  // Function to handle move from click (defined before handleSquareClick to avoid undefined reference)
  const validateAndHandleMoveFromClick = useCallback(
    (sourceSquare: string, targetSquare: string): boolean => {
      if (!practiceGame || !isUserTurn()) return false;

      const expectedMove = getExpectedMove();
      if (!expectedMove) return false;

      // Try the move on a temp instance
      const tempGame = new Chess(practiceGame.fen());
      const attempt = tempGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q', // Auto-promote to queen for simplicity
      });

      if (!attempt) return false; // Illegal move

      // Compare with expected move
      const isCorrect = attempt.san === expectedMove;

      if (isCorrect) {
        handleCorrectMove(attempt);
      } else {
        handleIncorrectMove();
      }

      return isCorrect;
    },
    [practiceGame, isUserTurn, getExpectedMove, handleCorrectMove, handleIncorrectMove]
  );

  // Handle square click for click-to-move functionality
  const handleSquareClick = useCallback(
    ({ piece, square }: { piece: { pieceType: string } | null; square: string }) => {
      if (!practiceGame || !isUserTurn() || isComplete) return;

      // If we have a selected square and clicking on a legal move target
      if (selectedSquare && legalMoves.includes(square)) {
        // Execute the move
        validateAndHandleMoveFromClick(selectedSquare, square);
        clearSelection();
        return;
      }

      // If clicking on a piece that belongs to the current player
      if (piece) {
        // pieceType format is like "wP" (white Pawn), "bN" (black Knight)
        // First character is the color: 'w' for white, 'b' for black
        const pieceColor = piece.pieceType.charAt(0) === 'w' ? 'white' : 'black';
        const currentTurn = practiceGame.turn() === 'w' ? 'white' : 'black';

        if (pieceColor === currentTurn) {
          // Select this piece
          if (selectedSquare === square) {
            // Clicking the same square deselects
            clearSelection();
          } else {
            // Select new piece
            setSelectedSquare(square);
            setLegalMoves(getLegalMovesForSquare(square));
          }
          return;
        }
      }

      // Clicking on empty square or opponent piece (not a legal capture) - clear selection
      clearSelection();
    },
    [
      practiceGame,
      isUserTurn,
      isComplete,
      selectedSquare,
      legalMoves,
      getLegalMovesForSquare,
      clearSelection,
      validateAndHandleMoveFromClick,
    ]
  );

  const validateAndHandleMove = useCallback(
    ({
      sourceSquare,
      targetSquare,
    }: {
      sourceSquare: string;
      targetSquare: string | null;
    }): boolean => {
      // If source and target are the same, it's a click not a drag - let onSquareClick handle it
      if (sourceSquare === targetSquare) return false;

      // Clear any click-to-move selection when dragging
      clearSelection();
      if (!practiceGame || !isUserTurn() || !targetSquare) return false;

      const expectedMove = getExpectedMove();
      if (!expectedMove) return false;

      // Try the move on a temp instance
      const tempGame = new Chess(practiceGame.fen());
      const attempt = tempGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q', // Auto-promote to queen for simplicity
      });

      if (!attempt) return false; // Illegal move

      // Compare with expected move
      const isCorrect = attempt.san === expectedMove;

      if (isCorrect) {
        handleCorrectMove(attempt);
      } else {
        handleIncorrectMove();
      }

      return isCorrect;
    },
    [
      practiceGame,
      isUserTurn,
      getExpectedMove,
      handleCorrectMove,
      handleIncorrectMove,
      clearSelection,
    ]
  );

  // Cleanup auto-play timeout on unmount
  useEffect(() => {
    return () => {
      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current);
      }
    };
  }, []);

  // Update highlight squares when selection, last move, or hint changes
  useEffect(() => {
    if (!practiceMode) return;

    const newHighlights: Record<string, CSSProperties> = {};

    // 1. Previous move highlighting (lowest priority - can be overridden)
    if (lastMoveSquares) {
      const prevMoveStyle = { backgroundColor: 'rgba(186, 202, 68, 0.4)' };
      newHighlights[lastMoveSquares.from] = prevMoveStyle;
      newHighlights[lastMoveSquares.to] = prevMoveStyle;
    }

    // 2. Selected square - bright yellow like Lichess/Chess.com (overrides previous move)
    if (selectedSquare) {
      newHighlights[selectedSquare] = { backgroundColor: 'rgba(255, 255, 0, 0.5)' };
    }

    // 3. Legal move squares - dots for empty, rings for captures
    if (selectedSquare && practiceGame) {
      legalMoves.forEach((square) => {
        const piece = practiceGame.get(square as Square);
        if (piece) {
          // Capture indicator: hollow ring around enemy piece
          newHighlights[square] = {
            background: 'radial-gradient(circle, transparent 64%, rgba(0, 0, 0, 0.14) 65%)',
            cursor: 'pointer',
          };
        } else {
          // Empty square: small centered dot
          newHighlights[square] = {
            background: 'radial-gradient(circle, rgba(0, 0, 0, 0.14) 22%, transparent 23%)',
            cursor: 'pointer',
          };
        }
      });
    }

    // 4. Hint highlighting (highest priority - persists until correct move)
    if (showHint) {
      const hintSquare = getHintSquare();
      if (hintSquare) {
        newHighlights[hintSquare] = { backgroundColor: 'rgba(255, 170, 0, 0.5)' };
      }
    }

    setHighlightSquares(newHighlights);
  }, [
    selectedSquare,
    legalMoves,
    lastMoveSquares,
    practiceMode,
    practiceGame,
    showHint,
    getHintSquare,
  ]);

  // Reset practice mode when opening changes
  useEffect(() => {
    if (prevFenRef.current && prevFenRef.current !== fen && practiceMode) {
      exitPractice();
    }
    prevFenRef.current = fen;
  }, [fen, practiceMode, exitPractice]);

  if (loading) {
    return (
      <div className="detail-page-body">
        <div className="loading-state">
          <h2>Loading opening...</h2>
        </div>
      </div>
    );
  }

  if (error || !opening) {
    return (
      <div className="detail-page-body">
        <div className="error-state">
          <h2>{error || 'Opening not found'}</h2>
          <Link to="/" className="back-link">
            ← Back to search results
          </Link>
        </div>
      </div>
    );
  }

  const seoTitle = opening
    ? `${opening.name}${opening.eco ? ` (${opening.eco})` : ''} — ${SITE_NAME}`
    : `Chess Opening — ${SITE_NAME}`;
  const seoDescription = opening
    ? `Explore the ${opening.name}${opening.eco ? ` (${opening.eco})` : ''}.${opening.moves ? ` Played after ${opening.moves.split(/\s+/).slice(0, 7).join(' ')}.` : ''} Learn key ideas, watch videos, and practice this opening.`
    : 'Explore this chess opening. Learn key ideas, watch videos, and practice.';
  const canonicalUrl = `${SITE_URL}/opening/${fen ? encodeURIComponent(fen) : ''}`;
  const jsonLd = opening
    ? {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: seoTitle,
        description: seoDescription,
        url: canonicalUrl,
        isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
      }
    : null;

  return (
    <div className="detail-page-body">
      <title>{seoTitle}</title>
      <meta name="description" content={seoDescription} />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDescription} />
      {jsonLd && (
        <script
          type="application/ld+json"
          // Content is from our own ECO data files, not user input — safe for JSON-LD
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {/* Page Title Area */}
      <div className="page-title-area centered">
        <div className={styles.titleWithStar}>
          <h1 className="opening-name">
            {(() => {
              const colonIdx = opening.name.indexOf(':');
              if (colonIdx === -1) return opening.name;
              return (
                <>
                  <span className={styles.titleFamily}>{opening.name.slice(0, colonIdx)}</span>
                  <span className={styles.titleColon}>:</span>
                  <span className={styles.titleVariation}>
                    {opening.name.slice(colonIdx + 1).trimStart()}
                  </span>
                </>
              );
            })()}
          </h1>
          <StarButton
            filled={isSaved(opening.fen)}
            onClick={() =>
              toggleRepertoire({
                fen: opening.fen,
                name: opening.name,
                eco: opening.eco,
                moves: opening.moves,
                complexity: opening.complexity,
              })
            }
            size="md"
          />
        </div>
        <div className={styles.tagPillsRow}>
          {/* Complexity pill */}
          {opening.complexity && <span className={styles.tagPill}>{opening.complexity}</span>}

          {/* Style tags pills */}
          {(() => {
            const styleTags =
              opening.analysis_json?.style_tags ||
              opening.analysis?.style_tags ||
              opening.style_tags ||
              [];
            return styleTags && styleTags.length > 0
              ? styleTags.map((tag: string, index: number) => (
                  <span key={`style-${index}`} className={styles.tagPill}>
                    {tag}
                  </span>
                ))
              : null;
          })()}
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className="two-column-layout">
        {/* Left Column - Position Explorer (45%) */}
        <div className="left-column position-explorer">
          {/* Interactive Chessboard with immediate navigation */}
          <div className={`chessboard-section ${styles.boardSectionCompact}`}>
            <div
              className="chessboard-container"
              style={practiceMode ? { touchAction: 'none' } : undefined}
            >
              <Chessboard
                options={{
                  position: practiceMode ? practiceGame?.fen() : game.fen(),
                  boardOrientation: practiceMode ? practiceColor : 'white',
                  allowDragging: practiceMode && isUserTurn() && !isComplete,
                  dragActivationDistance: 5, // Lower threshold - library v5.2.2+ properly handles tap vs drag on mobile
                  onPieceDrop: practiceMode ? validateAndHandleMove : undefined,
                  onSquareClick:
                    practiceMode && isUserTurn() && !isComplete ? handleSquareClick : undefined,
                  squareStyle: {
                    touchAction: practiceMode ? 'none' : 'auto',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                  },
                  squareStyles: highlightSquares,
                  boardStyle: {
                    borderRadius: '8px',
                    touchAction: practiceMode ? 'none' : 'auto',
                    userSelect: 'none',
                    WebkitUserSelect: 'none',
                  },
                }}
              />
            </div>

            {/* Practice Mode Controls */}
            {practiceMode ? (
              <>
                {/* Desktop controls — hidden on mobile via CSS */}
                <div className={`${practiceStyles.controls} ${practiceStyles.desktopOnly}`}>
                  <div className={practiceStyles.row}>
                    <div className={practiceStyles.colorToggle}>
                      <span className={practiceStyles.label}>Playing as:</span>
                      <div className={practiceStyles.pillGroup}>
                        <button
                          className={`${practiceStyles.colorBtn} ${practiceColor === 'white' ? practiceStyles.colorBtnActive : ''}`}
                          aria-pressed={practiceColor === 'white'}
                          onClick={() => {
                            setPracticeColor('white');
                            if (practiceMode) startPractice();
                          }}
                          disabled={isComplete}
                        >
                          White
                        </button>
                        <button
                          className={`${practiceStyles.colorBtn} ${practiceColor === 'black' ? practiceStyles.colorBtnActive : ''}`}
                          aria-pressed={practiceColor === 'black'}
                          onClick={() => {
                            setPracticeColor('black');
                            if (practiceMode) {
                              const newGame = new Chess();
                              const movesArray = getMovesList();
                              if (movesArray.length > 0) {
                                const move = newGame.move(movesArray[0]);
                                if (move) {
                                  setPracticeGame(new Chess(newGame.fen()));
                                  setPracticeIndex(1);
                                  setIncorrectAttempts(0);
                                  setShowHint(false);
                                  setHighlightSquares({});
                                  setIsComplete(false);
                                }
                              }
                            }
                          }}
                          disabled={isComplete}
                        >
                          Black
                        </button>
                      </div>
                    </div>

                    <div className={practiceStyles.progress}>
                      {isComplete ? (
                        <span className={practiceStyles.complete}>Complete!</span>
                      ) : (
                        <span className={practiceStyles.counter}>
                          Move {Math.floor(practiceIndex / 2) + 1} of{' '}
                          {Math.ceil(getMovesList().length / 2)}
                        </span>
                      )}
                    </div>

                    <div className={practiceStyles.actions}>
                      {!isComplete && !showHint && (
                        <button
                          className={`${practiceStyles.btn} ${practiceStyles.hintBtn}`}
                          onClick={showHintHighlight}
                          title="Show which piece to move"
                        >
                          Hint
                        </button>
                      )}
                      <button
                        className={`${practiceStyles.btn} ${practiceStyles.exitBtn}`}
                        onClick={exitPractice}
                      >
                        Exit
                      </button>
                    </div>
                  </div>
                </div>

                {/* Mobile bottom bar — shown only on mobile via CSS */}
                <div className={practiceStyles.mobileBar}>
                  <div className={practiceStyles.mobilePillGroup}>
                    <button
                      className={`${practiceStyles.mobileColorBtn} ${practiceColor === 'white' ? practiceStyles.mobileColorBtnActive : ''}`}
                      aria-pressed={practiceColor === 'white'}
                      onClick={() => {
                        setPracticeColor('white');
                        if (practiceMode) startPractice();
                      }}
                      disabled={isComplete}
                      title="Play as White"
                    >
                      W
                    </button>
                    <button
                      className={`${practiceStyles.mobileColorBtn} ${practiceColor === 'black' ? practiceStyles.mobileColorBtnActive : ''}`}
                      aria-pressed={practiceColor === 'black'}
                      onClick={() => {
                        setPracticeColor('black');
                        if (practiceMode) {
                          const newGame = new Chess();
                          const movesArray = getMovesList();
                          if (movesArray.length > 0) {
                            const move = newGame.move(movesArray[0]);
                            if (move) {
                              setPracticeGame(new Chess(newGame.fen()));
                              setPracticeIndex(1);
                              setIncorrectAttempts(0);
                              setShowHint(false);
                              setHighlightSquares({});
                              setIsComplete(false);
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

                  <div className={practiceStyles.mobileProgress}>
                    {isComplete ? (
                      <span className={practiceStyles.mobileComplete}>Complete!</span>
                    ) : (
                      <span className={practiceStyles.mobileCounter}>
                        Move {Math.floor(practiceIndex / 2) + 1}/
                        {Math.ceil(getMovesList().length / 2)}
                      </span>
                    )}
                  </div>

                  <div className={practiceStyles.mobileActions}>
                    {!isComplete && !showHint && (
                      <button
                        className={`${practiceStyles.mobileBtn} ${practiceStyles.mobileHintBtn}`}
                        onClick={showHintHighlight}
                        title="Show which piece to move"
                      >
                        Hint
                      </button>
                    )}
                    <button
                      className={`${practiceStyles.mobileBtn} ${practiceStyles.mobileExitBtn}`}
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
                  <ChevronsLeft size={20} />
                </button>
                <button
                  onClick={previousMove}
                  className="chessboard-nav-btn"
                  disabled={currentMoveIndex === 0}
                  title="Previous move"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  onClick={nextMove}
                  className="chessboard-nav-btn"
                  disabled={currentMoveIndex >= getMovesList().length}
                  title="Next move"
                >
                  <ChevronRight size={20} />
                </button>
                <button
                  onClick={() => goToMove(getMovesList().length)}
                  className="chessboard-nav-btn"
                  disabled={currentMoveIndex >= getMovesList().length}
                  title="Go to end"
                >
                  <ChevronsRight size={20} />
                </button>
                <button
                  className="chessboard-nav-btn practice-toggle-btn"
                  onClick={startPractice}
                  title="Practice this opening"
                >
                  <Play size={14} />
                  Practice
                </button>
              </div>
            )}

            {/* Move Strip - position scrubber (hidden during practice) */}
            {!practiceMode && getMovesList().length > 0 && (
              <div className={styles.moveStrip} ref={moveStripRef}>
                <span
                  className={`${styles.startPosition} ${currentMoveIndex === 0 ? styles.startPositionActive : ''}`}
                  onClick={() => goToMove(0)}
                >
                  Start
                </span>
                {getMovesList().reduce<React.ReactNode[]>((pairs, move, i) => {
                  const moveNum = Math.floor(i / 2) + 1;
                  const isWhite = i % 2 === 0;
                  const moveIndex = i + 1; // gameHistory index (0 = start position)
                  const isActive = currentMoveIndex === moveIndex;
                  const isFuture = currentMoveIndex < moveIndex;

                  if (isWhite) {
                    // Start a new pair
                    const blackMove = getMovesList()[i + 1];
                    const blackIndex = i + 2;
                    const blackActive = currentMoveIndex === blackIndex;
                    const pairActive = isActive || blackActive;
                    const pairFuture = !pairActive && isFuture;

                    pairs.push(
                      <span
                        key={moveNum}
                        className={`${styles.movePair} ${pairActive ? styles.movePairActive : ''} ${pairFuture ? styles.movePairFuture : ''}`}
                        data-move-pair={moveNum}
                        onClick={() =>
                          goToMove(isActive ? moveIndex : blackActive ? blackIndex : moveIndex)
                        }
                      >
                        <span className={styles.moveNumber}>{moveNum}.</span>
                        <span
                          style={
                            isActive
                              ? { textDecoration: 'underline', textUnderlineOffset: '3px' }
                              : undefined
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            goToMove(moveIndex);
                          }}
                        >
                          {move}
                        </span>
                        {blackMove && (
                          <span
                            style={
                              blackActive
                                ? { textDecoration: 'underline', textUnderlineOffset: '3px' }
                                : undefined
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              goToMove(blackIndex);
                            }}
                          >
                            {blackMove}
                          </span>
                        )}
                      </span>
                    );
                  }
                  return pairs;
                }, [])}
              </div>
            )}

            {/* FEN Utilities - Technical information (hidden during practice) */}
            {!practiceMode && (
              <div className="chessboard-fen-utilities">
                <label className="fen-utilities-label">Position (FEN)</label>
                <div className="fen-display">
                  <input type="text" value={game.fen()} readOnly className="fen-input" />
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
            )}
          </div>
        </div>

        {/* Right Column - Stats + Overview + Navigator */}
        <div className={`right-column ${styles.rightColumn}`}>
          <WinRateBar popularityStats={popularityStats} />

          {/* Overview — about this opening */}
          {opening?.eco && (
            <div className={styles.overviewCard}>
              <div className={styles.overviewLabel}>Overview</div>
              <p className={styles.overviewText}>
                {opening.description ||
                  opening.analysis?.description ||
                  opening.analysis_json?.description ||
                  `The ${opening?.name || 'opening'} is a chess opening classified under ECO code ${opening?.eco || 'unknown'}. This opening has been played in ${opening?.games_analyzed?.toLocaleString() || 'many'} games and offers strategic opportunities for both sides.`}
              </p>
            </div>
          )}

          <OpeningNavigator treeData={treeData} loading={treeLoading} />
        </div>
      </div>

      {/* Full-width sections below two-column layout */}
      <div className={styles.fullWidthSections}>
        {/* Plans */}
        {opening?.eco && (
          <div className={styles.stackedSection}>
            <h3 className={styles.sectionHeading}>Common plans</h3>
            <CommonPlans ecoCode={opening.eco} layout="structured" hideTitle />
          </div>
        )}

        {/* Learning Resources — combined videos + studies */}
        {(videos.length > 0 || studies.length > 0 || searchLinks) && (
          <div className={styles.stackedSection}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionHeading}>Learning resources</h3>
              {searchLinks && (
                <div className={styles.searchPills}>
                  <a
                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent((opening?.name || '') + ' chess opening')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.searchPill}
                  >
                    Search YouTube
                  </a>
                  <a
                    href={searchLinks.lichess}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.searchPill}
                  >
                    Search Lichess Studies
                  </a>
                  <a
                    href={searchLinks.chessable}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.searchPill}
                  >
                    Search Chessable
                  </a>
                </div>
              )}
            </div>
            {(videos.length > 0 || studies.length > 0) && (
              <div
                className={`${styles.resourcesGrid} ${
                  videos.length === 0 || studies.length === 0 ? styles.resourcesGridSingle : ''
                }`}
              >
                {videos.length > 0 && (
                  <div>
                    <div className={styles.resourceLabel}>Videos ({videos.length})</div>
                    <VideoErrorBoundary>
                      <VideoGallery videos={videos} hideTitle />
                    </VideoErrorBoundary>
                  </div>
                )}
                {studies.length > 0 && (
                  <div>
                    <div className={styles.resourceLabel}>Studies ({studies.length})</div>
                    <StudiesGallery studies={studies} openingName={opening?.name || ''} />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default OpeningDetailPage;
