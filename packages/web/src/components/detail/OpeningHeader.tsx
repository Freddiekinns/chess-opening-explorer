import React, { useState, useEffect } from 'react'
import { PopularityIndicator } from '../shared/PopularityIndicator'
import '../../styles/index.css'

interface Opening {
  fen: string
  name: string
  eco: string
  moves: string
  src?: string  // Made optional to match our type
  scid?: string
  aliases?: Record<string, string>
  EcoisRoot?: boolean
  analysis?: {
    description?: string
    style_tags?: string[]
    popularity?: number
    complexity?: string
  }
}

interface ECOAnalysis {
  description: string
  complexity: string
  style_tags: string[]
  white_plans: string[]
  black_plans: string[]
}

interface OpeningHeaderProps {
  opening: Opening
  className?: string
}

export const OpeningHeader: React.FC<OpeningHeaderProps> = ({
  opening,
  className = ''
}) => {
  const [ecoAnalysis, setEcoAnalysis] = useState<ECOAnalysis | null>(null)

  // Fetch ECO analysis data - prefer FEN-based lookup for accuracy
  useEffect(() => {
    const fetchECOAnalysis = async () => {
      try {
        // If we have FEN, use the more precise FEN-based lookup
        if (opening.fen) {
          const response = await fetch('/api/openings/fen-analysis', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fen: opening.fen }),
          });
          const data = await response.json();
          
          if (data.success) {
            setEcoAnalysis(data.data);
            return;
          }
        }
        
        // Fallback to ECO code lookup
        const response = await fetch(`/api/openings/eco-analysis/${opening.eco}`)
        const data = await response.json()
        
        if (data.success) {
          setEcoAnalysis(data.data)
        }
      } catch (error) {
        console.error('Failed to fetch ECO analysis:', error)
      }
    }

    if (opening.eco) {
      fetchECOAnalysis()
    }
  }, [opening.eco])

  const getComplexity = () => {
    return ecoAnalysis?.complexity || opening.analysis?.complexity || 'Unknown'
  }

  const getPopularityScore = () => {
    return opening.analysis?.popularity || 0
  }

  const isMainline = () => {
    // Use EcoisRoot if available, otherwise fall back to heuristic
    if (typeof opening.EcoisRoot === 'boolean') {
      return opening.EcoisRoot
    }
    // Basic heuristic: ECO codes without letters are typically mainlines
    return /^[A-E]\d{2}$/.test(opening.eco)
  }

  return (
    <header className={`opening-header centered ${className}`}>
      <div className="header-main centered">
        <div className="opening-title centered">
          <h1 className="opening-name centered">{opening.name}</h1>
          <div className="primary-tags centered">
            <span className="eco-tag eco-pill">{opening.eco}</span>
            <span className={`line-type-tag ${isMainline() ? 'mainline' : 'variation'}`}>
              {isMainline() ? 'Mainline' : 'Variation'}
            </span>
            <span className={`complexity-tag complexity-pill ${getComplexity().toLowerCase()}`}>
              {getComplexity()}
            </span>
            {opening.analysis?.style_tags && opening.analysis.style_tags.length > 0 && (
              <div className="style-tags-container">
                {opening.analysis.style_tags.slice(0, 3).map((tag: string, index: number) => (
                  <span key={index} className="style-tag style-pill">{tag}</span>
                ))}
                {opening.analysis.style_tags.length > 3 && (
                  <span className="style-tag style-pill">+{opening.analysis.style_tags.length - 3} more</span>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="header-actions">
          {getPopularityScore() > 0 && (
            <PopularityIndicator 
              score={getPopularityScore()}
              variant="badge"
              className="header-popularity"
            />
          )}
        </div>
      </div>

      <div className="header-secondary">
        <div className="moves-display">
          <span className="moves-label">Moves:</span>
          <span className="moves-text">{opening.moves}</span>
        </div>
      </div>

      {/* Family Navigation - if opening has parent/child relationships */}
      {(opening.aliases && Object.keys(opening.aliases).length > 0) && (
        <div className="header-family">
          <div className="family-info">
            <span className="family-label">Also known as:</span>
            <div className="aliases-list">
              {Object.entries(opening.aliases).slice(0, 3).map(([, alias], index) => (
                <span key={index} className="alias-tag">
                  {alias}
                </span>
              ))}
              {Object.keys(opening.aliases).length > 3 && (
                <span className="more-aliases">
                  +{Object.keys(opening.aliases).length - 3} more
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

export default OpeningHeader
