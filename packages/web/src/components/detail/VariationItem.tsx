import React from 'react'
import { LineTypePill } from '../shared/LineTypePill'

interface VariationItemProps {
  fen: string
  name: string
  isEcoRoot?: boolean
  games_analyzed?: number
  complexity?: string | null
  onNavigate: (fen: string) => void
  className?: string
  showLineTypePill?: boolean // allow hiding in teaser
  showComplexityTag?: boolean // allow enabling complexity tag
}

// Presentational item used in both teaser & tab for consistency
export const VariationItem: React.FC<VariationItemProps> = ({ fen, name, isEcoRoot, games_analyzed, complexity, onNavigate, className = '', showLineTypePill = true, showComplexityTag = false }) => {
  return (
    <li className={`variation-item ${className}`.trim()} role="listitem">
      <button className="variation-item__link" onClick={() => onNavigate(fen)}>
        <span className="variation-item__name">{name}</span>
        {showLineTypePill && <LineTypePill isMainline={!!isEcoRoot} className="inline-pill" />}
        {showComplexityTag && complexity && (
          <span
            className={`complexity-tag complexity-${complexity.toLowerCase().replace(/[^a-z]/g,'')}`}
            aria-label={`Complexity: ${complexity}`}
          >
            {complexity}
          </span>
        )}
        {typeof games_analyzed === 'number' && games_analyzed > 0 && (
          <span className="variation-item__games" aria-label={`${games_analyzed.toLocaleString()} games analyzed`}>
            {games_analyzed.toLocaleString()} games
          </span>
        )}
      </button>
    </li>
  )
}

export default VariationItem
