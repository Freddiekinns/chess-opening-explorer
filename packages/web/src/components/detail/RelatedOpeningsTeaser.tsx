import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useRelatedOpenings } from '../../useRelatedOpenings'
import { VariationItem } from './VariationItem'

interface Props {
  fen: string | undefined
  onViewAll?: () => void
  className?: string
}

export const RelatedOpeningsTeaser: React.FC<Props> = ({ fen, onViewAll, className = '' }) => {
  const { data, loading, error } = useRelatedOpenings(fen)
  const navigate = useNavigate()

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
    <section 
      className={`related-teaser surface surface--compact ${className}`.trim()} 
      aria-labelledby="related-teaser-heading"
    >
      <header className="related-teaser__header">
        <div className="related-teaser__title-group">
          <h3 id="related-teaser-heading" className="section-title">Related Openings</h3>
          {data.ecoCode && <span className="eco-pill related-teaser__eco">{data.ecoCode}</span>}
        </div>
  <p className="related-teaser__descriptor">Top variations (games analyzed) with complexity</p>
      </header>
      <ul className="related-teaser__list" role="list">
        {!currentIsMainline && mainline && (
          <VariationItem
            fen={mainline.fen}
            name={mainline.name}
            isEcoRoot={true}
            complexity={(mainline as any).complexity}
            onNavigate={(toFen) => navigate(`/opening/${encodeURIComponent(toFen)}`)}
            className="related-teaser__item related-teaser__item--mainline"
            showComplexityTag={true}
          />
        )}
        {top.map(o => (
          <VariationItem
            key={o.fen}
            fen={o.fen}
            name={o.name}
            isEcoRoot={o.isEcoRoot}
            complexity={o.complexity}
            onNavigate={(toFen) => navigate(`/opening/${encodeURIComponent(toFen)}`)}
            className="related-teaser__item"
            showLineTypePill={false}
            showComplexityTag={true}
          />
        ))}
      </ul>
      {showViewAll && (
        <footer className="related-teaser__footer">
          <button className="view-all-link" onClick={onViewAll} aria-label={`View all ${safeCounts.siblings} related openings`}>
            View all ({safeCounts.siblings})
          </button>
        </footer>
      )}
    </section>
  )
}

export default RelatedOpeningsTeaser
