import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import './OpeningExplorer.css';

const OpeningExplorer = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassification, setSelectedClassification] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedOpening, setSelectedOpening] = useState(null);
  const [gamePosition, setGamePosition] = useState('start');
  const [boardOrientation, setBoardOrientation] = useState('white');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);

  const classifications = [
    { code: 'A', name: 'Irregular Openings', description: 'Larsen, Bird, Polish, English' },
    { code: 'B', name: 'King\'s Pawn Openings', description: 'Alekhine, Caro-Kann, French, Sicilian' },
    { code: 'C', name: 'French Defense', description: 'French Defense and e4 e6 variations' },
    { code: 'D', name: 'Queen\'s Pawn Game', description: 'Queen\'s Gambit, Slav, Grünfeld' },
    { code: 'E', name: 'Indian Defenses', description: 'Catalan, Nimzo-Indian, King\'s Indian' }
  ];

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/openings/stats');
      const result = await response.json();
      
      if (result.success) {
        setStats(result.data);
      }
    } catch (err) {
      console.error('Error loading stats:', err);
    }
  };

  const searchOpenings = async (term) => {
    if (!term || term.length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/openings/search?q=${encodeURIComponent(term)}`);
      const result = await response.json();

      if (result.success) {
        setSearchResults(result.data.slice(0, 100)); // Limit results
      } else {
        setError(result.error || 'Search failed');
        setSearchResults([]);
      }
    } catch (err) {
      setError('Error searching openings: ' + err.message);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const loadOpeningsByClassification = async (classification) => {
    if (!classification) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/openings/classification/${classification}`);
      const result = await response.json();

      if (result.success) {
        setSearchResults(result.data.slice(0, 100)); // Limit results
      } else {
        setError(result.error || 'Failed to load openings');
        setSearchResults([]);
      }
    } catch (err) {
      setError('Error loading openings: ' + err.message);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const selectOpening = (opening) => {
    setSelectedOpening(opening);
    
    try {
      // Parse the moves and set up the position
      const game = new Chess();
      const moves = opening.moves.split(' ');
      
      for (const move of moves) {
        // Skip move numbers
        if (move.match(/^\d+\.$/)) {
          continue;
        }
        
        try {
          game.move(move);
        } catch (err) {
          console.warn('Invalid move:', move);
          break;
        }
      }
      
      setGamePosition(game.fen());
    } catch (err) {
      console.error('Error setting up position:', err);
      setGamePosition('start');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    searchOpenings(searchTerm);
  };

  const handleClassificationChange = (classification) => {
    setSelectedClassification(classification);
    setSearchTerm('');
    setSearchResults([]);
    
    if (classification) {
      loadOpeningsByClassification(classification);
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSelectedClassification('');
    setSearchResults([]);
    setSelectedOpening(null);
    setGamePosition('start');
  };

  const formatEcoCode = (eco) => {
    return eco;
  };

  const highlightSearchTerm = (text, term) => {
    if (!term || term.length < 2) return text;
    
    const regex = new RegExp(`(${term})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? <mark key={index}>{part}</mark> : part
    );
  };

  return (
    <div className="opening-explorer">
      <div className="explorer-header">
        <h1>Opening Explorer</h1>
        
        <div className="search-section">
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="Search openings by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>
          
          <div className="classification-filters">
            <label>Filter by Classification:</label>
            <div className="classification-buttons">
              {classifications.map(cls => (
                <button
                  key={cls.code}
                  onClick={() => handleClassificationChange(cls.code)}
                  className={`btn btn-outline ${selectedClassification === cls.code ? 'active' : ''}`}
                  disabled={loading}
                  title={cls.description}
                >
                  {cls.code} - {cls.name}
                </button>
              ))}
            </div>
          </div>
          
          {(searchTerm || selectedClassification) && (
            <button onClick={clearSearch} className="btn btn-secondary">
              Clear All
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {stats && (
        <div className="stats-section">
          <h3>Database Statistics</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-value">{stats.total.toLocaleString()}</span>
              <span className="stat-label">Total Openings</span>
            </div>
            {Object.entries(stats.byClassification).map(([cls, count]) => (
              <div key={cls} className="stat-item">
                <span className="stat-value">{count.toLocaleString()}</span>
                <span className="stat-label">Class {cls}</span>
              </div>
            ))}
            <div className="stat-item">
              <span className="stat-value">{stats.withInterpolation.toLocaleString()}</span>
              <span className="stat-label">Interpolated</span>
            </div>
          </div>
        </div>
      )}

      <div className="explorer-content">
        <div className="results-section">
          <div className="results-header">
            <h3>
              {searchResults.length > 0 && (
                <>Results ({searchResults.length})</>
              )}
              {searchResults.length === 0 && !loading && (searchTerm || selectedClassification) && (
                <>No results found</>
              )}
              {!searchTerm && !selectedClassification && (
                <>Search or select a classification to explore openings</>
              )}
            </h3>
          </div>
          
          <div className="results-list">
            {searchResults.map((opening, index) => (
              <div
                key={`${opening.fen}-${index}`}
                className={`result-item ${selectedOpening?.fen === opening.fen ? 'selected' : ''}`}
                onClick={() => selectOpening(opening)}
              >
                <div className="result-header">
                  <span className="result-name">
                    {highlightSearchTerm(opening.name, searchTerm)}
                  </span>
                  <span className="result-eco">{formatEcoCode(opening.eco)}</span>
                </div>
                <div className="result-moves">
                  {opening.moves}
                </div>
                {opening.aliases && Object.keys(opening.aliases).length > 0 && (
                  <div className="result-aliases">
                    Also known as: {Object.values(opening.aliases).join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="opening-display">
          {selectedOpening ? (
            <>
              <div className="board-section">
                <div className="board-header">
                  <h3>{selectedOpening.name}</h3>
                  <div className="board-controls">
                    <span className="eco-badge">{formatEcoCode(selectedOpening.eco)}</span>
                    <button
                      onClick={() => setBoardOrientation(boardOrientation === 'white' ? 'black' : 'white')}
                      className="btn btn-secondary btn-sm"
                    >
                      Flip Board
                    </button>
                  </div>
                </div>
                
                <div className="chessboard-container">
                  <Chessboard
                    position={gamePosition}
                    boardOrientation={boardOrientation}
                    arePiecesDraggable={false}
                    boardWidth={350}
                    customBoardStyle={{
                      borderRadius: '4px',
                      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
                    }}
                  />
                </div>
              </div>
              
              <div className="opening-details">
                <div className="detail-item">
                  <label>ECO Code:</label>
                  <span>{selectedOpening.eco}</span>
                </div>
                
                <div className="detail-item">
                  <label>Source:</label>
                  <span>{selectedOpening.src}</span>
                </div>
                
                {selectedOpening.scid && (
                  <div className="detail-item">
                    <label>SCID Code:</label>
                    <span>{selectedOpening.scid}</span>
                  </div>
                )}
                
                <div className="detail-item">
                  <label>Moves:</label>
                  <span className="moves-text">{selectedOpening.moves}</span>
                </div>
                
                {selectedOpening.aliases && Object.keys(selectedOpening.aliases).length > 0 && (
                  <div className="detail-item">
                    <label>Alternative Names:</label>
                    <div className="aliases-list">
                      {Object.entries(selectedOpening.aliases).map(([source, alias]) => (
                        <div key={source} className="alias-item">
                          <span className="alias-name">{alias}</span>
                          <span className="alias-source">({source})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="no-selection">
              <p>Select an opening from the search results to view details and position.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OpeningExplorer;
