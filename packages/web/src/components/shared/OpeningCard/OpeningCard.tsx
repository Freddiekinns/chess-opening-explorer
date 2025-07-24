import React from 'react'
import { PopularityIndicator } from '../PopularityIndicator/PopularityIndicator'
import './OpeningCard.css'

interface Opening {
  fen: string
  name: string
  eco: string
  moves: string
  src: string
  scid?: string
  aliases?: Record<string, string>
  analysis?: {
    description?: string
    style_tags?: string[]
    popularity?: number
    complexity?: string
  }
  games_analyzed?: number  // Number of games this opening was played
  popularity_rank?: number // Rank based on games_analyzed
}

interface OpeningCardProps {
  opening: Opening
  variant?: 'featured' | 'compact' | 'list'
  showPopularity?: boolean
  showEco?: boolean
  onClick?: (opening: Opening) => void
  className?: string
}

export const OpeningCard: React.FC<OpeningCardProps> = ({
  opening,
  variant = 'compact',
  showPopularity = true,
  showEco = true,
  onClick,
  className = ''
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick(opening)
    }
  }

  const getPopularityScore = () => {
    return opening.analysis?.popularity || 0
  }

  const getComplexity = () => {
    return opening.analysis?.complexity || 'Unknown'
  }

  const getStyleTags = () => {
    return opening.analysis?.style_tags?.slice(0, 2) || []
  }

  if (variant === 'featured') {
    return (
      <div 
        className={`opening-card featured ${className}`}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      >
        <div className="card-header">
          <h3 className="opening-name">{opening.name}</h3>
          {showEco && (
            <span className="eco-badge">{opening.eco}</span>
          )}
        </div>
        
        <div className="card-content">
          <div className="moves-preview">
            {opening.moves.split(' ').slice(0, 6).join(' ')}
            {opening.moves.split(' ').length > 6 && '...'}
          </div>
          
          {opening.analysis?.description && (
            <p className="opening-description">
              {opening.analysis.description.substring(0, 120)}
              {opening.analysis.description.length > 120 && '...'}
            </p>
          )}
        </div>

        <div className="card-footer">
          {showPopularity && (
            <PopularityIndicator 
              score={getPopularityScore()} 
              variant="badge"
              className="card-popularity"
            />
          )}
          <div className="style-tags">
            {getStyleTags().map((tag, index) => (
              <span key={index} className="style-tag">{tag}</span>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'list') {
    return (
      <div 
        className={`opening-card list ${className}`}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      >
        <div className="card-main">
          <div className="opening-info">
            <h4 className="opening-name">{opening.name}</h4>
            <div className="opening-meta">
              {showEco && (
                <span className="eco-badge">{opening.eco}</span>
              )}
              <span className="complexity">{getComplexity()}</span>
            </div>
          </div>
          <div className="moves-preview">
            {opening.moves.split(' ').slice(0, 4).join(' ')}
            {opening.moves.split(' ').length > 4 && '...'}
          </div>
        </div>
        
        <div className="card-aside">
          {showPopularity && (
            <PopularityIndicator 
              score={getPopularityScore()} 
              variant="badge"
              showLabel={false}
              className="card-popularity"
            />
          )}
        </div>
      </div>
    )
  }

  // Default: compact variant
  return (
    <div 
      className={`opening-card compact ${className}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      <div className="card-header">
        <h3 className="opening-name">{opening.name}</h3>
        {showEco && (
          <span className="eco-badge">{opening.eco}</span>
        )}
      </div>
      
      <div className="card-content">
        <div className="moves-preview">
          {opening.moves.split(' ').slice(0, 4).join(' ')}
          {opening.moves.split(' ').length > 4 && '...'}
        </div>
        
        <div className="complexity-indicator">
          {getComplexity()}
        </div>
      </div>

      <div className="card-footer">
        {showPopularity && (
          <PopularityIndicator 
            score={getPopularityScore()} 
            variant="badge"
            showLabel={false}
            className="card-popularity"
          />
        )}
        <div className="style-tags">
          {getStyleTags().map((tag, index) => (
            <span key={index} className="style-tag">{tag}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

export default OpeningCard
