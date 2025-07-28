import React from 'react';
import '../../styles/index.css';

interface OpeningStatsProps {
  gamesAnalyzed: number;
  whiteWins: number;
  draws: number;
  blackWins: number;
  averageRating?: number;
}

export const OpeningStats: React.FC<OpeningStatsProps> = ({
  gamesAnalyzed,
  whiteWins,
  draws, 
  blackWins,
  averageRating
}) => {
  const whitePercent = (whiteWins / gamesAnalyzed) * 100;
  const drawPercent = (draws / gamesAnalyzed) * 100;
  const blackPercent = (blackWins / gamesAnalyzed) * 100;

  return (
    <div className="game-statistics">
      <h3>Game Statistics</h3>
      
      <div className="success-bars">
        <div className="stat-row">
          <span className="stat-label">WHITE SUCCESS</span>
          <div className="progress-bar">
            <div className="bar white" style={{width: `${whitePercent}%`}} />
          </div>
        </div>
        <div className="stat-row">
          <span className="stat-label">DRAW</span>
          <div className="progress-bar">
            <div className="bar draw" style={{width: `${drawPercent}%`}} />
          </div>
        </div>
        <div className="stat-row">
          <span className="stat-label">BLACK SUCCESS</span>
          <div className="progress-bar">
            <div className="bar black" style={{width: `${blackPercent}%`}} />
          </div>
        </div>
      </div>

      <div className="stats-numbers">
        <div className="stat-item">
          <span className="stat-label">Total Games Analyzed:</span>
          <span className="stat-value">{gamesAnalyzed.toLocaleString()}</span>
        </div>
        {averageRating && (
          <div className="stat-item">
            <span className="stat-label">Average Rating:</span>
            <span className="stat-value">{averageRating}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default OpeningStats;
