import React from 'react';
import { StarButton } from './StarButton';
import { MiniBoard } from './MiniBoard';

interface Opening {
  fen: string;
  name: string;
  eco: string;
  moves: string;
  src: string;
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
    popularity?: number;
    complexity?: string;
  };
  games_analyzed?: number;
  popularity_rank?: number;
  white_win_rate?: number;
  black_win_rate?: number;
  draw_rate?: number;
}

interface OpeningCardProps {
  opening: Opening;
  showEco?: boolean;
  showBoard?: boolean;
  variant?: 'card' | 'list-item';
  onClick?: (opening: Opening) => void;
  className?: string;
  showStar?: boolean;
  isStarred?: boolean;
  onStarClick?: (opening: Opening) => void;
}

export const OpeningCard: React.FC<OpeningCardProps> = ({
  opening,
  showEco = true,
  showBoard = false,
  variant = 'card',
  onClick,
  className = '',
  showStar = false,
  isStarred = false,
  onStarClick,
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick(opening);
    }
  };

  // Real Lichess stats or nothing — never fabricate numbers for a data product.
  const getGameStats = () => {
    if (
      opening.white_win_rate !== undefined &&
      opening.black_win_rate !== undefined &&
      opening.draw_rate !== undefined
    ) {
      return {
        white: Math.round(opening.white_win_rate * 100),
        draw: Math.round(opening.draw_rate * 100),
        black: Math.round(opening.black_win_rate * 100),
      };
    }

    return null;
  };

  const getFirstMovesDisplay = (): string => {
    const moves = opening.moves.trim();
    const movePattern = /(\d+\.\s*\S+(?:\s+\S+)?)/g;
    const moveMatches = moves.match(movePattern) || [];
    return moveMatches.slice(0, 2).join(' ');
  };

  const getComplexity = (): string => {
    return opening.analysis?.complexity || opening.analysis_json?.complexity || 'Beginner';
  };

  const formatGamesPlayed = (count: number): string => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`;
    return count.toString();
  };

  const gameStats = getGameStats();
  const firstMoves = getFirstMovesDisplay();
  const complexity = getComplexity();
  const gamesPlayed = opening.games_analyzed;

  // List-item variant (mobile layout)
  if (variant === 'list-item') {
    return (
      <div
        className={`opening-card-list-item ${className}`}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      >
        <MiniBoard fen={opening.fen} size={80} className="list-item-board" />
        <div className="list-item-info">
          <div className="list-item-header">
            <h3 className="list-item-name">{opening.name}</h3>
          </div>
          <div className="list-item-meta">
            <span className={`complexity-pill complexity-${complexity.toLowerCase()}`}>
              {complexity}
            </span>
            {showEco && <span className="eco-pill">{opening.eco}</span>}
          </div>
          <span className="list-item-moves">{firstMoves}</span>
          {gameStats && (
            <div className="list-item-stats">
              <div className="segmented-bar">
                <div
                  className="bar-segment white-segment"
                  style={{ width: `${gameStats.white}%` }}
                ></div>
                <div
                  className="bar-segment draw-segment"
                  style={{ width: `${gameStats.draw}%` }}
                ></div>
                <div
                  className="bar-segment black-segment"
                  style={{ width: `${gameStats.black}%` }}
                ></div>
              </div>
              <div className="list-item-stat-labels">
                <span className="white-label">W {gameStats.white}%</span>
                <span className="draw-label">D {gameStats.draw}%</span>
                <span className="black-label">B {gameStats.black}%</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Card variant (default — desktop grid)
  return (
    <div
      className={`opening-card compact ${showBoard ? 'has-board' : ''} ${className}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      {showBoard && (
        <div className="card-board-wrapper">
          <MiniBoard fen={opening.fen} size={280} className="card-board" />
        </div>
      )}

      <div className="card-info-column">
        {/* 1. Name — dominant, full width */}
        <div className="card-header" data-testid="card-header">
          <h3 className="title-subsection">{opening.name}</h3>
          {showStar && (
            <StarButton filled={isStarred} onClick={() => onStarClick?.(opening)} size="sm" />
          )}
        </div>

        {/* 2. Metadata row — complexity + ECO code */}
        <div className="card-meta-row">
          <span className={`complexity-pill complexity-${complexity.toLowerCase()}`}>
            {complexity}
          </span>
          {showEco && <span className="eco-pill">{opening.eco}</span>}
        </div>

        {/* 3. Moves + games count */}
        <div className="card-body">
          <div className="card-moves-line">
            <span className="card-moves">{firstMoves}</span>
            {gamesPlayed && gamesPlayed > 0 && (
              <span className="card-games">{formatGamesPlayed(gamesPlayed)} games</span>
            )}
          </div>

          {/* 4. Win rate bar — anchored to bottom, only when real stats exist */}
          {gameStats && (
            <div className="card-winrate">
              <div className="segmented-bar">
                <div
                  className="bar-segment white-segment"
                  style={{ width: `${gameStats.white}%` }}
                ></div>
                <div
                  className="bar-segment draw-segment"
                  style={{ width: `${gameStats.draw}%` }}
                ></div>
                <div
                  className="bar-segment black-segment"
                  style={{ width: `${gameStats.black}%` }}
                ></div>
              </div>
              <div className="winrate-labels">
                <span className="white-label">W {gameStats.white}%</span>
                <span className="draw-label">D {gameStats.draw}%</span>
                <span className="black-label">B {gameStats.black}%</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
