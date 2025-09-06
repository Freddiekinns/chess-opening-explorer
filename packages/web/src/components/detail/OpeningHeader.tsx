import React, { useState, useEffect } from 'react'
import { PopularityIndicator } from '../shared/PopularityIndicator'
import { LineTypePill } from '../shared/LineTypePill'

interface Opening {
  fen: string
  name: string
  eco: string
  moves: string
  src?: string
  scid?: string
  aliases?: Record<string, string>
  isEcoRoot?: boolean // corrected naming; backwards compatibility preserved
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

  // Simplified ECO analysis fetch - just use ECO code
  useEffect(() => {
    const fetchECOAnalysis = async () => {
      try {
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
    return ecoAnalysis?.complexity || opening.analysis?.complexity || 'Medium'
  }

  const getPopularityScore = () => {
    return opening.analysis?.popularity || 0
  }

  const isMainline = () => opening.isEcoRoot === true || /^[A-E]\d{2}$/.test(opening.eco)

  return (
    <header className={`opening-header ${className}`}>
      <div className="header-main">
        <div className="opening-title">
          <h1 className="opening-name">{opening.name}</h1>
          <div className="primary-tags">
            <span className="eco-tag">{opening.eco}</span>
            <LineTypePill isMainline={isMainline()} />
            <span className="complexity-tag">{getComplexity()}</span>
          </div>
        </div>
        
        {getPopularityScore() > 0 && (
          <PopularityIndicator 
            score={getPopularityScore()}
            className="header-popularity"
          />
        )}
      </div>

      <div className="moves-display">
        <span className="moves-label">Moves:</span>
        <span className="moves-text">{opening.moves}</span>
      </div>
    </header>
  )
}

export default OpeningHeader
