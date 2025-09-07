import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRelatedOpenings } from '../../useRelatedOpenings'
import { VariationItem } from './VariationItem'

interface Props {
  fen: string | undefined
  className?: string
}

export const RelatedOpeningsTeaser: React.FC<Props> = ({ fen, className = '' }) => {
  const { data, loading, error } = useRelatedOpenings(fen)
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const listWrapperRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    if (expanded && listWrapperRef.current) {
      listWrapperRef.current.focus({ preventScroll: false })
    }
  }, [expanded])

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

  const { mainline, siblings = [] } = data as any
  // Collapsed view now shows 5 siblings (5th partially faded) to give richer preview.
  const COLLAPSED_COUNT = 5
  const fullList = (siblings || []).filter((o: any) => !mainline || o.fen !== mainline.fen)
  const top = fullList.slice(0, COLLAPSED_COUNT)
  const showToggle = fullList.length > COLLAPSED_COUNT

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
      </header>
      <div className={`related-teaser__body ${expanded ? 'is-expanded' : 'is-collapsed'}`}> 
  <ul id="related-teaser-list" className="related-teaser__list" role="list" aria-label="Related variations">
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
          {(expanded ? fullList : top).map((o: any) => (
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
        {showToggle && (
          <div className="related-teaser__gradient" aria-hidden="true" />
        )}
      </div>
      {showToggle && (
        <footer className="related-teaser__footer">
          <button
            className="related-teaser__toggle"
            onClick={() => setExpanded(e => !e)}
            aria-expanded={expanded}
            aria-controls="related-teaser-list"
          >
            <span className="related-teaser__toggle-icon" aria-hidden="true" />
            <span className="related-teaser__toggle-label">
              {expanded ? 'Collapse' : 'Show all'}
              <span className="related-teaser__count" aria-hidden={expanded}> {expanded ? '' : `(${fullList.length})`}</span>
            </span>
          </button>
        </footer>
      )}
    </section>
  )
}

export default RelatedOpeningsTeaser
