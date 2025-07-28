import React from 'react';
import '../../../styles/index.css';

interface PopularityIndicatorProps {
  score: number  // 1-10 popularity score
  variant?: 'badge' | 'bar' | 'detailed'
  showLabel?: boolean
  className?: string
}

export const PopularityIndicator: React.FC<PopularityIndicatorProps> = ({
  score,
  variant = 'badge',
  showLabel = true,
  className = ''
}) => {
  // Convert score to popularity level and color
  const getPopularityInfo = (score: number) => {
    if (score >= 9) return { level: 'Very Popular', color: 'very-popular', intensity: 'highest' }
    if (score >= 7) return { level: 'Popular', color: 'popular', intensity: 'high' }
    if (score >= 5) return { level: 'Common', color: 'common', intensity: 'medium' }
    if (score >= 3) return { level: 'Uncommon', color: 'uncommon', intensity: 'low' }
    if (score >= 1) return { level: 'Rare', color: 'rare', intensity: 'lowest' }
    return { level: 'Unknown', color: 'unknown', intensity: 'none' }
  }

  const popularityInfo = getPopularityInfo(score)

  if (variant === 'badge') {
    return (
      <span className={`popularity-indicator badge ${popularityInfo.color} ${className}`}>
        {showLabel && (
          <span className="popularity-label">{popularityInfo.level}</span>
        )}
        <span className="popularity-score">{score.toFixed(1)}</span>
      </span>
    )
  }

  if (variant === 'bar') {
    const percentage = Math.min((score / 10) * 100, 100)
    return (
      <div className={`popularity-indicator bar ${popularityInfo.color} ${className}`}>
        {showLabel && (
          <span className="popularity-label">{popularityInfo.level}</span>
        )}
        <div className="popularity-bar-container">
          <div 
            className="popularity-bar-fill" 
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="popularity-score">{score.toFixed(1)}</span>
      </div>
    )
  }

  // Detailed variant (for future use)
  return (
    <div className={`popularity-indicator detailed ${popularityInfo.color} ${className}`}>
      <div className="popularity-header">
        <span className="popularity-label">{popularityInfo.level}</span>
        <span className="popularity-score">{score.toFixed(1)}/10</span>
      </div>
      <div className="popularity-bar-container">
        <div 
          className="popularity-bar-fill" 
          style={{ width: `${Math.min((score / 10) * 100, 100)}%` }}
        />
      </div>
    </div>
  )
}

export default PopularityIndicator
