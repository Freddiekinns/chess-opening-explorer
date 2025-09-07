import React from 'react'
import { useRelatedOpenings } from '../../useRelatedOpenings'
import { LineTypePill } from '../shared/LineTypePill'

interface Props {
  fen: string | undefined
  onViewAll?: () => void
  className?: string
}

export const RelatedOpeningsTeaser: React.FC<Props> = ({ fen, onViewAll, className = '' }) => {
  const { data, loading, error } = useRelatedOpenings(fen)

  if (!fen) return null
  if (loading) {
    return (
      <div className={`related-teaser surface surface--compact ${className}`.trim()} aria-busy="true">
        <h3 className="section-title">Related Openings</h3>
        <ul className="teaser-list skeleton">
          <li className="skeleton-text short" />
          <li className="skeleton-text medium" />
          <li className="skeleton-text long" />
        </ul>
      </div>
    )
  }
  if (error || !data) return null

  const { mainline, siblings = [], counts } = data as any
  const safeCounts = counts || { siblings: siblings.length }
  const top = Array.isArray(siblings) ? siblings.slice(0, 3) : []
  const showViewAll = safeCounts.siblings > 3

  // Avoid duplicating mainline if it's also the current; if current is variation, highlight mainline separately
  const currentIsMainline = !!(data.current && (data.current as any).isEcoRoot)

  return (
    <div className={`related-teaser surface surface--compact ${className}`.trim()}>
      <div className="teaser-header">
        <h3 className="section-title">Related Openings</h3>
        {data.ecoCode && <span className="eco-pill">{data.ecoCode}</span>}
      </div>
      <ul className="related-list" role="list">
        {!currentIsMainline && mainline && (
          <li className="related-item mainline" role="listitem">
            <button className="related-link" onClick={() => navigateToFen(mainline.fen)}>
              <span className="name">{mainline.name}</span>
              <LineTypePill isMainline={true} className="inline-pill" />
            </button>
          </li>
        )}
        {top.map(o => (
          <li key={o.fen} className="related-item" role="listitem">
            <button className="related-link" onClick={() => navigateToFen(o.fen)}>
              <span className="name">{o.name}</span>
              <LineTypePill isMainline={o.isEcoRoot} className="inline-pill" />
            </button>
          </li>
        ))}
      </ul>
      {showViewAll && (
        <div className="teaser-footer">
          <button className="view-all-link" onClick={onViewAll}>
            View all ({safeCounts.siblings})
          </button>
        </div>
      )}
    </div>
  )
}

function navigateToFen(fen: string) {
  // Navigate to canonical opening detail route
  window.location.href = `/opening/${encodeURIComponent(fen)}`
}

export default RelatedOpeningsTeaser
