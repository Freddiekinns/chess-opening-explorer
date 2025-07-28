import React from 'react';
import '../../../styles/index.css';

interface GameStats {
  white_wins: number;
  black_wins: number;
  draws: number;
  total_games: number;
}

interface PerformanceData {
  rating_range?: string;
  avg_rating?: number;
  performance_rating?: number;
}

interface OpeningStatsProps {
  stats?: GameStats;
  popularityScore?: number;
  ecoCode?: string;
  performance?: PerformanceData;
  lastUpdated?: string;
  className?: string;
  opening?: any; // Opening data for metadata display
  fen?: string; // FEN for popularity stats fetching
}

export const OpeningStats: React.FC<OpeningStatsProps> = ({
  stats,
  popularityScore,
  ecoCode,
  performance,
  lastUpdated,
  className = '',
  opening,
  fen // Future use: popularity stats integration
}) => {
  // Console log for development - FEN available for future popularity stats integration
  if (process.env.NODE_ENV === 'development' && fen) {
    console.debug('OpeningStats: FEN available for popularity integration:', fen)
  }
  // Calculate percentages
  const getPercentages = () => {
    if (!stats || stats.total_games === 0) {
      return { white: 0, draws: 0, black: 0 };
    }
    
    const white = Math.round((stats.white_wins / stats.total_games) * 100);
    const black = Math.round((stats.black_wins / stats.total_games) * 100);
    const draws = Math.round((stats.draws / stats.total_games) * 100);
    
    return { white, draws, black };
  };

  const { white, draws, black } = getPercentages();

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getPopularityLevel = (score?: number) => {
    if (!score) return 'Unknown';
    if (score >= 90) return 'Very Popular';
    if (score >= 70) return 'Popular';
    if (score >= 50) return 'Moderate';
    if (score >= 30) return 'Uncommon';
    return 'Rare';
  };

  const getPopularityColor = (score?: number) => {
    if (!score) return '#6c757d';
    if (score >= 90) return '#dc3545';
    if (score >= 70) return '#fd7e14';
    if (score >= 50) return '#ffc107';
    if (score >= 30) return '#20c997';
    return '#6f42c1';
  };

  return (
    <div className={`opening-stats ${className}`}>
      {/* Header */}
      <div className="stats-header">
        <h3 className="stats-title">Game Statistics</h3>
        {lastUpdated && (
          <span className="last-updated">
            Updated {new Date(lastUpdated).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Main Stats Grid */}
      <div className="stats-grid">
        {/* Win/Draw/Loss Chart */}
        {stats && stats.total_games > 0 && (
          <div className="stat-card results-chart">
            <h4 className="stat-label">Game Results</h4>
            <div className="results-bar">
              <div 
                className="result-segment white-wins"
                style={{ width: `${white}%` }}
                title={`White wins: ${white}%`}
              />
              <div 
                className="result-segment draws"
                style={{ width: `${draws}%` }}
                title={`Draws: ${draws}%`}
              />
              <div 
                className="result-segment black-wins"
                style={{ width: `${black}%` }}
                title={`Black wins: ${black}%`}
              />
            </div>
            <div className="results-legend">
              <div className="legend-item">
                <span className="legend-color white"></span>
                <span className="legend-text">White {white}%</span>
              </div>
              <div className="legend-item">
                <span className="legend-color draw"></span>
                <span className="legend-text">Draw {draws}%</span>
              </div>
              <div className="legend-item">
                <span className="legend-color black"></span>
                <span className="legend-text">Black {black}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Total Games */}
        {stats && (
          <div className="stat-card">
            <h4 className="stat-label">Total Games</h4>
            <div className="stat-value large">
              {formatNumber(stats.total_games)}
            </div>
            <div className="stat-sublabel">
              Database games analyzed
            </div>
          </div>
        )}

        {/* Popularity Score */}
        {popularityScore !== undefined && (
          <div className="stat-card">
            <h4 className="stat-label">Popularity</h4>
            <div className="popularity-display">
              <div 
                className="popularity-score"
                style={{ color: getPopularityColor(popularityScore) }}
              >
                {popularityScore}/100
              </div>
              <div className="popularity-level">
                {getPopularityLevel(popularityScore)}
              </div>
            </div>
          </div>
        )}

        {/* ECO Classification */}
        {ecoCode && (
          <div className="stat-card">
            <h4 className="stat-label">ECO Code</h4>
            <div className="stat-value">
              {ecoCode}
            </div>
            <div className="stat-sublabel">
              Opening classification
            </div>
          </div>
        )}

        {/* Performance Rating */}
        {performance?.performance_rating && (
          <div className="stat-card">
            <h4 className="stat-label">Performance</h4>
            <div className="stat-value">
              {Math.round(performance.performance_rating)}
            </div>
            <div className="stat-sublabel">
              Average rating
            </div>
          </div>
        )}

        {/* Rating Range */}
        {performance?.rating_range && (
          <div className="stat-card">
            <h4 className="stat-label">Rating Range</h4>
            <div className="stat-value small">
              {performance.rating_range}
            </div>
            <div className="stat-sublabel">
              Most common range
            </div>
          </div>
        )}
      </div>

      {/* Empty State */}
      {(!stats || stats.total_games === 0) && !popularityScore && !ecoCode && (
        <div className="empty-stats">
          <p className="empty-text">
            No statistical data available for this opening yet.
          </p>
          <p className="empty-subtext">
            Statistics will appear as more games are analyzed.
          </p>
        </div>
      )}

      {/* Opening Metadata Section */}
      {opening && (
        <div className="metadata-section">
          <h4 className="section-title">Opening Details</h4>
          <div className="metadata-grid">
            <div className="metadata-item">
              <span className="metadata-label">ECO Code:</span>
              <span className="metadata-value">{opening.eco || 'Unknown'}</span>
            </div>
            {opening.src && (
              <div className="metadata-item">
                <span className="metadata-label">Source:</span>
                <span className="metadata-value">{opening.src}</span>
              </div>
            )}
            <div className="metadata-item">
              <span className="metadata-label">Move Sequence:</span>
              <code className="moves-code">{opening.moves || 'N/A'}</code>
            </div>
            {opening.aliases && Object.keys(opening.aliases).length > 0 && (
              <div className="metadata-item aliases">
                <span className="metadata-label">Also known as:</span>
                <div className="aliases-list">
                  {Object.entries(opening.aliases).map(([source, alias], index) => (
                    <div key={index} className="alias-item">
                      {String(alias)} <span className="alias-source">({source})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OpeningStats;
