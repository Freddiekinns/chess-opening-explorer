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

  useEffect(() => {
    const fetchFamilyOpenings = async () => {
      if (!ecoCode) return

      try {
        setLoading(true)
        const familyCode = ecoCode.charAt(0)
        const response = await fetch(`/api/openings/family/${familyCode}`)
        const data = await response.json()
        
        if (data.success) {
          // Filter out current opening and sort by popularity
          const relatedOpenings = data.data
            .filter((opening: FamilyOpening) => opening.fen !== currentFen)
            .sort((a: FamilyOpening, b: FamilyOpening) => (b.popularity || 0) - (a.popularity || 0))
            .slice(0, 8)
          
          setFamilyOpenings(relatedOpenings)
        }
      } catch (err) {
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
        <h4>Related Openings</h4>
        <div className="loading-state">Loading related openings...</div>
      </div>
    )
  }

  if (familyOpenings.length === 0) {
    return (
      <div className="opening-family">
        <h4>Related Openings</h4>
        <div className="empty-state">No related openings found</div>
      </div>
    )
  }

  return (
    <div className="opening-family">
      <h4>Related {ecoCode.charAt(0)} Family Openings</h4>
      
      <div className="family-grid">
        {familyOpenings.map((opening) => (
          <Link
            key={opening.fen}
            to={`/opening/${encodeURIComponent(opening.fen)}`}
            className="family-card"
          >
            <div className="family-card-header">
              <span className="eco-badge">{opening.eco}</span>
            </div>
            
            <h5 className="opening-name">{opening.name}</h5>
            
            <div className="move-sequence">
              {opening.moves.split(' ').slice(0, 4).join(' ')}
              {opening.moves.split(' ').length > 4 && '...'}
            </div>
          </Link>
        ))}
      </div>

      <Link 
        to={`/search?eco=${ecoCode.charAt(0)}`}
        className="view-all-link"
      >
        View all {ecoCode.charAt(0)} family openings →
      </Link>
    </div>
  )
}

export default OpeningFamily
