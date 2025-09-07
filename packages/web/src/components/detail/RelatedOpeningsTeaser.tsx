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
  const bodyRef = useRef<HTMLDivElement | null>(null)
  const animatingRef = useRef(false)
  useEffect(() => {
    if (expanded && bodyRef.current) {
      bodyRef.current.focus({ preventScroll: false })
    }
  }, [expanded])

  if (!fen) return null
  if (loading) {
    return (
      <div className={`related-teaser surface surface--compact ${className}`.trim()} aria-busy="true">
  <h3 className="section-title section-title--sub">Related Openings</h3>
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
  // Determine if we are currently at the mainline first
  const currentIsMainline = !!(data.current && (data.current as any).isEcoRoot)
  // Show at most 4 total rows (including mainline if displayed) when collapsed
  const COLLAPSED_TOTAL = 4
  const fullList = (siblings || []).filter((o: any) => !mainline || o.fen !== mainline.fen)
  const mainlineRowCount = !currentIsMainline && mainline ? 1 : 0
  const remainingSlots = COLLAPSED_TOTAL - mainlineRowCount
  const top = fullList.slice(0, remainingSlots)
  const showToggle = fullList.length > remainingSlots

  return (
    <section 
      className={`related-teaser surface surface--compact ${className}`.trim()} 
      aria-labelledby="related-teaser-heading"
    >
      <header className="related-teaser__header card-header">
        <h3 id="related-teaser-heading" className="card-header__title card-header__title--accent">Related Openings {data.ecoCode && <span className="eco-pill related-teaser__eco">{data.ecoCode}</span>}</h3>
      </header>
      <div 
        ref={bodyRef}
        className={`related-teaser__body ${expanded ? 'is-expanded' : 'is-collapsed'}`}
        data-animating={animatingRef.current ? 'true' : 'false'}
      > 
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
  {/* Gradient removed for cleaner UX; no spacer element needed */}
      </div>
      {showToggle && (
        <footer className="related-teaser__footer">
          <button
            className="related-teaser__toggle"
            onClick={() => {
              const el = bodyRef.current
              if (!el || animatingRef.current) return
              const mm = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
                ? window.matchMedia('(prefers-reduced-motion: reduce)')
                : ({ matches: false } as any)
              const prefersReduced = mm.matches
              // If reduced motion, just toggle without animation
              if (prefersReduced) {
                setExpanded(e => !e)
                return
              }
              animatingRef.current = true
              const targetExpanded = !expanded
              const prevHeight = el.scrollHeight
              // Apply next state (synchronously queues React update)
              setExpanded(targetExpanded)
              requestAnimationFrame(() => {
                // If component unmounted or no longer animating, abort
                if (!el) return
                const nextHeight = el.scrollHeight
                // If heights equal, skip animation
                if (prevHeight === nextHeight) {
                  animatingRef.current = false
                  return
                }
                  // Set explicit start height, hide overflow to mask list growth
                  el.style.overflow = 'hidden'
                  el.style.height = prevHeight + 'px'
                // Force reflow
                void el.offsetHeight
                el.style.transition = 'height 320ms cubic-bezier(.4,0,.2,1)'
                el.style.height = nextHeight + 'px'
                const cleanup = () => {
                  if (!el) return
                  el.style.height = ''
                  el.style.transition = ''
                    el.style.overflow = ''
                  animatingRef.current = false
                }
                const onEnd = (ev: TransitionEvent) => {
                  if (ev.propertyName === 'height') {
                    el.removeEventListener('transitionend', onEnd)
                    cleanup()
                  }
                }
                el.addEventListener('transitionend', onEnd)
                // Fallback cleanup (in case transitionend doesn't fire)
                setTimeout(() => {
                  if (animatingRef.current) {
                    el.removeEventListener('transitionend', onEnd)
                    cleanup()
                  }
                }, 400)
              })
            }}
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
