import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import '../styles/index.css'; // Use design system instead of component CSS

const OpeningTrainer = () => {
  const [game, setGame] = useState(new Chess());
  const [gamePosition, setGamePosition] = useState('start');
  const [currentOpening, setCurrentOpening] = useState(null);
  const [openingMoves, setOpeningMoves] = useState([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [boardOrientation, setBoardOrientation] = useState('white');
  const [selectedECO, setSelectedECO] = useState('');
  const [ecoCategories, setECOCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load ECO categories on mount
  useEffect(() => {
    loadECOCategories();
  }, []);

  const loadECOCategories = async () => {
    try {
      const response = await fetch('/api/openings/categories');
      const result = await response.json();
      
      if (result.success) {
        setECOCategories(result.data);
      } else {
        setError('Failed to load ECO categories');
      }
    } catch (err) {
      setError('Error loading ECO categories: ' + err.message);
    }
  };

  const loadRandomOpening = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/openings/random');
      const result = await response.json();
      
      if (result.success) {
        setupOpening(result.data);
      } else {
        setError('Failed to load random opening');
      }
    } catch (err) {
      setError('Error loading opening: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadOpeningByECO = async (ecoCode) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/openings/eco/${ecoCode}`);
      const result = await response.json();
      
      if (result.success && result.data.length > 0) {
        // Pick a random opening from the results
        const randomOpening = result.data[Math.floor(Math.random() * result.data.length)];
        setupOpening(randomOpening);
      } else {
        setError('No openings found for ECO code: ' + ecoCode);
      }
    } catch (err) {
      setError('Error loading opening: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const setupOpening = (opening) => {
    try {
      // Reset game
      const newGame = new Chess();
      
      // Parse and play the moves
      const moves = opening.moves.split(' ');
      const parsedMoves = [];
      
      for (let i = 0; i < moves.length; i++) {
        const move = moves[i];
        
        // Skip move numbers (e.g., "1.", "2.")
        if (move.match(/^\d+\.$/)) {
          continue;
        }
        
        try {
          const moveObj = newGame.move(move);
          if (moveObj) {
            parsedMoves.push(moveObj);
          }
        } catch (err) {
          console.warn('Invalid move:', move, err);
          break;
        }
      }
      
      setCurrentOpening(opening);
      setOpeningMoves(parsedMoves);
      setCurrentMoveIndex(0);
      setIsPlaying(false);
      setShowSolution(false);
      
      // Reset to starting position
      setGame(new Chess());
      setGamePosition(new Chess().fen());
      
    } catch (err) {
      setError('Error setting up opening: ' + err.message);
    }
  };

  const resetPosition = () => {
    setGame(new Chess());
    setGamePosition(new Chess().fen());
    setCurrentMoveIndex(0);
    setIsPlaying(false);
    setShowSolution(false);
  };

  const playNextMove = () => {
    if (currentMoveIndex < openingMoves.length) {
      const newGame = new Chess();
      
      // Play moves up to current index
      for (let i = 0; i <= currentMoveIndex; i++) {
        if (i < openingMoves.length) {
          newGame.move(openingMoves[i]);
        }
      }
      
      setGame(newGame);
      setGamePosition(newGame.fen());
      setCurrentMoveIndex(currentMoveIndex + 1);
    }
  };

  const playPreviousMove = () => {
    if (currentMoveIndex > 0) {
      const newGame = new Chess();
      
      // Play moves up to previous index
      for (let i = 0; i < currentMoveIndex - 1; i++) {
        if (i < openingMoves.length) {
          newGame.move(openingMoves[i]);
        }
      }
      
      setGame(newGame);
      setGamePosition(newGame.fen());
      setCurrentMoveIndex(currentMoveIndex - 1);
    }
  };

  const playAllMoves = () => {
    const newGame = new Chess();
    
    // Play all moves
    for (const move of openingMoves) {
      newGame.move(move);
    }
    
    setGame(newGame);
    setGamePosition(newGame.fen());
    setCurrentMoveIndex(openingMoves.length);
  };

  const toggleSolution = () => {
    setShowSolution(!showSolution);
  };

  const flipBoard = () => {
    setBoardOrientation(boardOrientation === 'white' ? 'black' : 'white');
  };

  const handleECOSelect = (ecoCode) => {
    setSelectedECO(ecoCode);
    if (ecoCode) {
      loadOpeningByECO(ecoCode);
    }
  };

  const formatMoves = (moves) => {
    let formatted = '';
    for (let i = 0; i < moves.length; i++) {
      if (i % 2 === 0) {
        formatted += `${Math.floor(i / 2) + 1}. `;
      }
      formatted += moves[i].san + ' ';
    }
    return formatted.trim();
  };

  return (
    <div className="opening-trainer">
      <div className="trainer-header">
        <h1>Chess Opening Trainer</h1>
        
        <div className="trainer-controls">
          <div className="eco-selector">
            <label htmlFor="eco-select">ECO Code:</label>
            <select
              id="eco-select"
              value={selectedECO}
              onChange={(e) => handleECOSelect(e.target.value)}
              disabled={loading}
            >
              <option value="">All Classifications</option>
              {ecoCategories.map(eco => (
                <option key={eco} value={eco}>{eco}</option>
              ))}
            </select>
          </div>
          
          <button
            onClick={loadRandomOpening}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'Loading...' : 'New Random Opening'}
          </button>
          
          <button
            onClick={flipBoard}
            className="btn btn-secondary"
          >
            Flip Board
          </button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="trainer-content">
        <div className="board-section">
          <div className="chessboard-container">
            <Chessboard
              position={gamePosition}
              boardOrientation={boardOrientation}
              arePiecesDraggable={false}
              boardWidth={400}
              customBoardStyle={{
                borderRadius: '4px',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
              }}
            />
          </div>
          
          <div className="move-controls">
            <button
              onClick={resetPosition}
              className="btn btn-secondary"
              disabled={currentMoveIndex === 0}
            >
              ⏮ Reset
            </button>
            
            <button
              onClick={playPreviousMove}
              className="btn btn-secondary"
              disabled={currentMoveIndex === 0}
            >
              ⏪ Previous
            </button>
            
            <button
              onClick={playNextMove}
              className="btn btn-secondary"
              disabled={currentMoveIndex >= openingMoves.length}
            >
              ⏩ Next
            </button>
            
            <button
              onClick={playAllMoves}
              className="btn btn-secondary"
              disabled={currentMoveIndex >= openingMoves.length}
            >
              ⏭ End
            </button>
          </div>
        </div>

        <div className="opening-info">
          {currentOpening && (
            <>
              <div className="opening-header">
                <h2>{currentOpening.name}</h2>
                <span className="eco-code">{currentOpening.eco}</span>
              </div>
              
              <div className="opening-details">
                <p><strong>Source:</strong> {currentOpening.src}</p>
                {currentOpening.scid && (
                  <p><strong>SCID:</strong> {currentOpening.scid}</p>
                )}
                
                {currentOpening.aliases && Object.keys(currentOpening.aliases).length > 0 && (
                  <div className="aliases">
                    <strong>Also known as:</strong>
                    <ul>
                      {Object.entries(currentOpening.aliases).map(([source, alias]) => (
                        <li key={source}>{alias} ({source})</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              <div className="moves-section">
                <div className="moves-header">
                  <h3>Moves</h3>
                  <button
                    onClick={toggleSolution}
                    className="btn btn-outline"
                  >
                    {showSolution ? 'Hide' : 'Show'} Solution
                  </button>
                </div>
                
                {showSolution && (
                  <div className="moves-display">
                    <p><strong>Move sequence:</strong> {currentOpening.moves}</p>
                    {openingMoves.length > 0 && (
                      <p><strong>Parsed moves:</strong> {formatMoves(openingMoves)}</p>
                    )}
                    <p><strong>Current move:</strong> {currentMoveIndex} / {openingMoves.length}</p>
                  </div>
                )}
              </div>
            </>
          )}
          
          {!currentOpening && !loading && (
            <div className="no-opening">
              <p>Click "New Random Opening" to start training!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OpeningTrainer;
