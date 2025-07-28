import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import '../../styles/index.css'

interface FamilyOpening {
  fen: string
  name: string
  eco: string
  moves: string
  popularity?: number
}

interface OpeningFamilyProps {
  ecoCode: string
  currentFen: string
}

export const OpeningFamily: React.FC<OpeningFamilyProps> = ({ ecoCode, currentFen }) => {
  const [familyOpenings, setFamilyOpenings] = useState<FamilyOpening[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchFamilyOpenings = async () => {
      if (!ecoCode) return

      try {
        setLoading(true)
        setError(null)
        
        // Get the ECO family code (first letter)
        const familyCode = ecoCode.charAt(0)
        
        const response = await fetch(`/api/openings/family/${familyCode}`)
        const data = await response.json()
        
        if (data.success) {
          // Filter out current opening and limit to top 8 related openings
          const relatedOpenings = data.data
            .filter((opening: FamilyOpening) => opening.fen !== currentFen)
            .sort((a: FamilyOpening, b: FamilyOpening) => (b.popularity || 0) - (a.popularity || 0))
            .slice(0, 8)
          
          setFamilyOpenings(relatedOpenings)
        } else {
          setError('Failed to load related openings')
        }
      } catch (err) {
        setError('Error loading opening family')
        console.error('Error fetching family openings:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchFamilyOpenings()
  }, [ecoCode, currentFen])

  if (loading) {
    return (
      <div className="opening-family">
        <h4 className="family-title">Related Openings</h4>
        <div className="loading-state">
          <span>Loading related openings...</span>
        </div>
      </div>
    )
  }

  if (error || familyOpenings.length === 0) {
    return (
      <div className="opening-family">
        <h4 className="family-title">Related Openings</h4>
        <div className="empty-state">
          <span>{error || 'No related openings found'}</span>
        </div>
      </div>
    )
  }

  const getPopularityColor = (popularity?: number) => {
    if (!popularity) return '#6c757d'
    if (popularity >= 80) return '#dc3545'
    if (popularity >= 60) return '#fd7e14'
    if (popularity >= 40) return '#ffc107'
    if (popularity >= 20) return '#20c997'
    return '#6f42c1'
  }

  return (
    <div className="opening-family">
      <h4 className="family-title">
        Related {ecoCode.charAt(0)} Family Openings
      </h4>
      
      <div className="family-grid">
        {familyOpenings.map((opening) => (
          <Link
            key={opening.fen}
            to={`/opening/${encodeURIComponent(opening.fen)}`}
            className="family-card"
          >
            <div className="family-card-header">
              <span className="eco-badge">{opening.eco}</span>
              {opening.popularity && (
                <span 
                  className="popularity-dot"
                  style={{ backgroundColor: getPopularityColor(opening.popularity) }}
                  title={`Popularity: ${opening.popularity}%`}
                />
              )}
            </div>
            
            <h5 className="opening-name">{opening.name}</h5>
            
            <div className="move-sequence">
              {opening.moves.split(' ').slice(0, 4).join(' ')}
              {opening.moves.split(' ').length > 4 && '...'}
            </div>
          </Link>
        ))}
      </div>

      <div className="family-footer">
        <Link 
          to={`/search?eco=${ecoCode.charAt(0)}`}
          className="view-all-link"
        >
          View all {ecoCode.charAt(0)} family openings →
        </Link>
      </div>
    </div>
  )
}

export default OpeningFamily
