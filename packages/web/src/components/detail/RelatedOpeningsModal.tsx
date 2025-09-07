import React, { useEffect, useRef } from 'react'
import { VariationItem } from './VariationItem'

interface RelatedOpeningsModalProps {
  fen: string
  isOpen: boolean
  onClose: () => void
  className?: string
}

interface RelatedOpeningItem {
  fen: string
  name: string
  eco?: string
  games_analyzed?: number
  isCurrent?: boolean
  isMainline?: boolean
  complexity?: string
}

interface RelatedResponse {
  success: boolean
  data: {
    current: RelatedOpeningItem
    mainline?: RelatedOpeningItem
    siblings: RelatedOpeningItem[]
  }
}

export const RelatedOpeningsModal: React.FC<RelatedOpeningsModalProps> = ({ fen, isOpen, onClose, className = '' }) => {
  const [data, setData] = React.useState<RelatedResponse['data'] | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const lastFocusedRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      lastFocusedRef.current = document.activeElement as HTMLElement
      fetchData()
      // trap focus start
      requestAnimationFrame(() => {
        dialogRef.current?.focus()
      })
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
        if (e.key === 'Tab') handleTabKey(e)
      }
      document.addEventListener('keydown', handleKey)
      document.body.style.overflow = 'hidden'
      return () => {
        document.removeEventListener('keydown', handleKey)
        document.body.style.overflow = ''
        lastFocusedRef.current?.focus()
      }
    }
  }, [isOpen])

  const handleTabKey = (e: KeyboardEvent) => {
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    if (!focusable || focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (e.shiftKey) {
      if (document.activeElement === first) {
        last.focus()
        e.preventDefault()
      }
    } else if (document.activeElement === last) {
      first.focus()
      e.preventDefault()
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/openings/fen/${encodeURIComponent(fen)}/related`)
      const json: RelatedResponse = await res.json()
      if (json.success) {
        setData(json.data)
      } else {
        setError('Failed to load related openings')
      }
    } catch (e) {
      setError('Failed to load related openings')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="related-modal-overlay" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="related-openings-title"
        className={`related-modal ${className}`}
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="related-modal-header">
          <h2 id="related-openings-title">Related Openings</h2>
          <button onClick={onClose} className="close-btn" aria-label="Close related openings">×</button>
        </div>
        <div className="related-modal-body">
          {loading && <p className="loading">Loading...</p>}
          {error && <p role="alert" className="error">{error}</p>}
          {data && (
            <div className="related-full-list" aria-live="polite">
              {data.mainline && !data.mainline.isCurrent && (
                <div className="mainline-callout" role="note">
                  <strong>Mainline:</strong>
                  <VariationItem
                    fen={data.mainline.fen}
                    name={data.mainline.name}
                    games_analyzed={data.mainline.games_analyzed}
                    isEcoRoot={true}
                    showLineTypePill={false}
                    complexity={data.mainline.complexity}
                    showComplexityTag={!!data.mainline.complexity}
                    onNavigate={(nextFen) => { window.location.href = `/opening/${encodeURIComponent(nextFen)}` }}
                  />
                </div>
              )}
              <div className="siblings-grid">
                {data.siblings.map(sib => (
                  <VariationItem
                    key={sib.fen}
                    fen={sib.fen}
                    name={sib.name}
                    games_analyzed={sib.games_analyzed}
                    isEcoRoot={sib.isMainline}
                    complexity={sib.complexity}
                    showComplexityTag={!!sib.complexity}
                    showLineTypePill={false}
                    onNavigate={(nextFen) => { window.location.href = `/opening/${encodeURIComponent(nextFen)}` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RelatedOpeningsModal
