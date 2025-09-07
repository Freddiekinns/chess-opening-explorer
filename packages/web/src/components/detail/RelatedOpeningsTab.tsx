import React, { useState } from 'react'
import { useRelatedOpenings } from '../../useRelatedOpenings'
import { LineTypePill } from '../shared/LineTypePill'

interface Props {
  fen: string | undefined
  className?: string
}

export const RelatedOpeningsTab: React.FC<Props> = ({ fen, className = '' }) => {
  const { data, loading, error, refetch } = useRelatedOpenings(fen)
  const [expanded, setExpanded] = useState(false)

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

  const { mainline, siblings, counts } = data
  const list = expanded ? siblings : siblings.slice(0, 10)
  const needsExpand = counts.siblings > 10
  const currentIsMainline = data.current.isEcoRoot

  return (
    <div className={`related-openings-tab ${className}`.trim()}>
      <div className="tab-header">
        <h3 className="section-title">Related Openings</h3>
        {data.ecoCode && <span className="eco-pill">{data.ecoCode}</span>}
      </div>
      {(!currentIsMainline && mainline) && (
        <div className="mainline-block">
          <h4 className="group-label">Mainline</h4>
          <ul className="related-list" role="list">
            <li className="related-item mainline" role="listitem">
              <button className="related-link" onClick={() => navigateToFen(mainline.fen)}>
                <span className="name">{mainline.name}</span>
                <LineTypePill isMainline={true} className="inline-pill" />
              </button>
            </li>
          </ul>
        </div>
      )}
      <div className="variations-block">
        <h4 className="group-label">Variations ({counts.siblings})</h4>
        {counts.siblings === 0 && <p className="empty-state">No other variations in this ECO group.</p>}
        {counts.siblings > 0 && (
          <ul className="related-list" role="list">
            {list.map(o => (
              <li key={o.fen} className="related-item" role="listitem">
                <button className="related-link" onClick={() => navigateToFen(o.fen)}>
                  <span className="name">{o.name}</span>
                  <LineTypePill isMainline={o.isEcoRoot} className="inline-pill" />
                  {o.games_analyzed > 0 && <span className="meta games">{o.games_analyzed.toLocaleString()} games</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
        {needsExpand && (
          <div className="expand-container">
            <button className="expand-btn" onClick={() => setExpanded(e => !e)}>
              {expanded ? 'Collapse' : `Show All (${counts.siblings})`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function navigateToFen(fen: string) {
  window.location.href = `/openings/fen/${encodeURIComponent(fen)}`
}

export default RelatedOpeningsTab
