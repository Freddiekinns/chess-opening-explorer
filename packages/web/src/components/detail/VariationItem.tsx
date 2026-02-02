import React from 'react'
import { LineTypePill } from '../shared/LineTypePill'

interface VariationItemProps {
  fen: string
  name: string
  moves?: string
  isEcoRoot?: boolean
  games_analyzed?: number
  complexity?: string | null
  onNavigate: (fen: string) => void
  className?: string
  showLineTypePill?: boolean // allow hiding in teaser
  showComplexityTag?: boolean // allow enabling complexity tag
  showMoves?: boolean // show move sequence below name
}

/**
 * Truncates a move string for display.
 * Desktop: up to 8 moves, Mobile: up to 5 moves (handled via CSS).
 * Returns both truncated and full versions for title tooltip.
 */
function formatMoves(moves: string | undefined, maxMoves: number = 8): { display: string; full: string } {
  if (!moves || !moves.trim()) {
    return { display: '', full: '' }
  }

  const full = moves.trim()

  // Split by spaces, keeping move numbers with their moves
  // Format can be "1.e4 c6 2.d4 d5" or "1. e4 c6 2. d4 d5" or "e4 c6 d4 d5"
  const tokens = full.split(/\s+/)

  // Count actual moves (excluding pure move numbers like "1." or "2.")
  let moveCount = 0
  let lastIncludedIndex = -1

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    // Skip pure move numbers (e.g., "1." or "2.")
    if (/^\d+\.?$/.test(token)) {
      lastIncludedIndex = i
      continue
    }
    moveCount++
    lastIncludedIndex = i
    if (moveCount >= maxMoves) {
      break
    }
  }

  // If we didn't need to truncate
  if (moveCount < maxMoves || lastIncludedIndex >= tokens.length - 1) {
    return { display: full, full }
  }

  // Truncate and add ellipsis
  const display = tokens.slice(0, lastIncludedIndex + 1).join(' ') + ' …'
  return { display, full }
}

// Presentational item used in both teaser & tab for consistency
export const VariationItem: React.FC<VariationItemProps> = ({ fen, name, moves, isEcoRoot, games_analyzed, complexity, onNavigate, className = '', showLineTypePill = true, showComplexityTag = false, showMoves = false }) => {
  const formattedMoves = showMoves ? formatMoves(moves) : { display: '', full: '' }

  return (
    <li className={`variation-item ${className}`.trim()} role="listitem">
      <button className="variation-item__link" onClick={() => onNavigate(fen)}>
        <span className="variation-item__content">
          <span className="variation-item__name">{name}</span>
          {showMoves && formattedMoves.display && (
            <span
              className="variation-item__moves"
              title={formattedMoves.full}
              aria-label={`Moves: ${formattedMoves.full}`}
            >
              {formattedMoves.display}
            </span>
          )}
        </span>
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
