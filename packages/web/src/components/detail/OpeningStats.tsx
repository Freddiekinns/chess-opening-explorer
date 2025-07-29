import React from 'react';

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
    <div className="statistics-component">
      <h3 className="title-subsection">Game Statistics</h3>
      
      <div className="statistics-bars">
        <div className="stat-bar">
          <span className="stat-label">White Success</span>
          <div className="bar-container">
            <div className="bar-fill white-bar" style={{width: `${whitePercent}%`}} />
          </div>
          <span className="stat-value">{Math.round(whitePercent)}%</span>
        </div>
        
        <div className="stat-bar">
          <span className="stat-label">Draw Rate</span>
          <div className="bar-container">
            <div className="bar-fill draw-bar" style={{width: `${drawPercent}%`}} />
          </div>
          <span className="stat-value">{Math.round(drawPercent)}%</span>
        </div>
        
        <div className="stat-bar">
          <span className="stat-label">Black Success</span>
          <div className="bar-container">
            <div className="bar-fill black-bar" style={{width: `${blackPercent}%`}} />
          </div>
          <span className="stat-value">{Math.round(blackPercent)}%</span>
        </div>
      </div>

      <div className="total-games">
        <span className="games-label">Total Games Analyzed</span>
        <span className="games-value">{gamesAnalyzed.toLocaleString()}</span>
      </div>
      
      {averageRating && (
        <div className="average-rating">
          <span className="rating-label">Average Rating</span>
          <span className="rating-value">{averageRating}</span>
        </div>
      )}
    </div>
  );
};

export default OpeningStats;
