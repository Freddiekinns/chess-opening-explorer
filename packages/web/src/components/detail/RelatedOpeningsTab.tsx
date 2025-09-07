import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRelatedOpenings } from '../../useRelatedOpenings'
import { LineTypePill } from '../shared/LineTypePill'
import { VariationItem } from './VariationItem'

interface Props {
  fen: string | undefined
  className?: string
}

export const RelatedOpeningsTab: React.FC<Props> = ({ fen, className = '' }) => {
  const { data, loading, error, refetch } = useRelatedOpenings(fen)
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const liveRef = useRef<HTMLDivElement | null>(null)

  if (!fen) return null

  if (loading) {
    return (
      <div className={`related-openings-tab ${className}`.trim()} aria-busy="true">
        <h3 className="section-title">Related Openings</h3>
        <div className="skeleton-text short" />
        <div className="skeleton-text medium" />
        <div className="skeleton-text long" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`related-openings-tab ${className}`.trim()} role="alert">
        <p className="error-state">Failed to load related openings.</p>
        <button onClick={refetch} className="retry-btn">Retry</button>
      </div>
    )
  }

  if (!data) return null

  const { mainline, siblings = [], counts } = data as any
  const safeSiblings = Array.isArray(siblings) ? siblings : []
  const safeCounts = counts || { siblings: safeSiblings.length }
  const list = expanded ? safeSiblings : safeSiblings.slice(0, 10)
  const needsExpand = safeCounts.siblings > 10
  const currentIsMainline = !!(data.current && (data.current as any).isEcoRoot)

  return (
  <section className={`related-openings-tab ${className}`.trim()} aria-labelledby="related-openings-tab-heading">
      <div className="tab-header">
    <h3 id="related-openings-tab-heading" className="section-title">Related Openings</h3>
        {data.ecoCode && <span className="eco-pill">{data.ecoCode}</span>}
      </div>
      {/* Contextual callout when the user is currently on a variation (not the ECO root) */}
      {!currentIsMainline && mainline && (
        <div className="mainline-callout" role="note" aria-label="Mainline reference">
          <span className="mainline-callout__text">Viewing a variation. Mainline:</span>{' '}
          <button
            className="mainline-callout__link"
            onClick={() => navigate(`/opening/${encodeURIComponent(mainline.fen)}`)}
          >
            {mainline.name}
          </button>
        </div>
      )}
      {(!currentIsMainline && mainline) && (
        <div className="mainline-block">
          <h4 className="group-label">Mainline</h4>
          <ul className="related-list" role="list">
            <li className="related-item mainline" role="listitem">
        <button className="related-link" onClick={() => navigate(`/opening/${encodeURIComponent(mainline.fen)}`)}>
                <span className="name">{mainline.name}</span>
                <LineTypePill isMainline={true} className="inline-pill" />
              </button>
            </li>
          </ul>
        </div>
      )}
      <div className="variations-block">
  <h4 className="group-label">Variations ({safeCounts.siblings})</h4>
  {/* Static sort descriptor bar per scope decision: fixed sorting by games analyzed */}
  <div className="sort-descriptor" aria-label="Sorting description">Sorted by games analyzed</div>
  {safeCounts.siblings === 0 && <p className="empty-state">No other variations in this ECO group.</p>}
  {safeCounts.siblings > 0 && (
          <ul className={`related-list variation-grid cols-${expanded ? 'full' : 'partial'}`} role="list">
            {list.map(o => (
              <VariationItem
                key={o.fen}
                fen={o.fen}
                name={o.name}
                isEcoRoot={o.isEcoRoot}
                games_analyzed={o.games_analyzed}
                complexity={o.complexity}
                onNavigate={(toFen) => navigate(`/opening/${encodeURIComponent(toFen)}`)}
                showLineTypePill={true}
              />
            ))}
          </ul>
        )}
        {needsExpand && (
          <div className="expand-container">
            <button
              className="expand-btn"
              onClick={() => {
                setExpanded(e => {
                  const next = !e
                  // Announce change for screen readers
                  if (liveRef.current) {
                    liveRef.current.textContent = next
                      ? `Expanded list to show all ${safeCounts.siblings} variations.`
                      : 'Collapsed list to show top variations.'
                  }
                  return next
                })
              }}
              aria-expanded={expanded}
            >
              {expanded ? 'Collapse' : `Show All (${safeCounts.siblings})`}
            </button>
          </div>
        )}
        <div className="sr-only" aria-live="polite" ref={liveRef} />
      </div>
  </section>
  )
}
export default RelatedOpeningsTab
