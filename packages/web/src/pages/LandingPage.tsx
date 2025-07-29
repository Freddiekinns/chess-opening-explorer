import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchBar } from '../components/shared/SearchBar'
import { PopularOpeningsGrid } from '../components/landing/PopularOpeningsGrid'

interface Opening {
  fen: string
  name: string
  eco: string
  moves: string
  src: string
  scid?: string
  aliases?: Record<string, string>
  analysis_json?: {  // Changed from analysis to analysis_json to match API
    description?: string
    style_tags?: string[]
    popularity?: number
  }
  games_analyzed?: number  // Number of games this opening was played
  popularity_rank?: number // Rank based on games_analyzed
}

// Fast client-side search function (moved to SearchBar component)
// This function is now in SearchBar component

const LandingPage: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [openingsData, setOpeningsData] = useState<Opening[]>([])
  const [dataLoaded, setDataLoaded] = useState(false)
  const [popularOpenings, setPopularOpenings] = useState<Opening[]>([])
  const navigate = useNavigate()

  // Apply body class for this page
  useEffect(() => {
    document.body.className = 'landing-page-body'
    return () => {
      document.body.className = ''
    }
  }, [])

  // Load all openings data and popular openings
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        
        // Load all openings for search
        const openingsResponse = await fetch('/api/openings/all')
        const openingsData = await openingsResponse.json()
        
        if (openingsData.success) {
          setOpeningsData(openingsData.data)
          
          // Load popular openings with new optimized endpoint
          try {
            const popularResponse = await fetch('/api/openings/popular-by-eco?limit=6')
            const popularData = await popularResponse.json()
            
            if (popularData.success && popularData.data) {
              // Flatten the categorized data into a single array for PopularOpeningsGrid
              const flattenedPopular = Object.values(popularData.data).flat() as Opening[]
              setPopularOpenings(flattenedPopular)
              console.log(`✅ Loaded ${flattenedPopular.length} popular openings from optimized endpoint (${popularData.metadata.response_time_ms}ms)`)
            } else {
              // Fallback to original popular endpoint
              const fallbackResponse = await fetch('/api/openings/popular?limit=30')
              const fallbackData = await fallbackResponse.json()
              
              if (fallbackData.success && fallbackData.data.length > 0) {
                setPopularOpenings(fallbackData.data)
              } else {
                // Simple fallback: use openings with most games played
                const fallbackPopular = openingsData.data
                  .filter((opening: Opening) => opening.games_analyzed || opening.analysis_json?.popularity)
                  .sort((a: Opening, b: Opening) => {
                    // Prioritize actual game volume over popularity score
                    const gamesA = a.games_analyzed || 0
                    const gamesB = b.games_analyzed || 0
                    if (gamesA !== gamesB) return gamesB - gamesA
                    // Fallback to popularity score if no game data
                    return (b.analysis_json?.popularity || 0) - (a.analysis_json?.popularity || 0)
                  })
                  .slice(0, 30)
                
                setPopularOpenings(fallbackPopular.length > 0 ? fallbackPopular : openingsData.data.slice(0, 30))
              }
            }
          } catch (error) {
            console.warn('Popular openings endpoint not available, using fallback')
            // Simple fallback: use first 30 openings
            setPopularOpenings(openingsData.data.slice(0, 30))
          }
          
          setDataLoaded(true)
        }
      } catch (error) {
        console.error('Error loading data:', error)
      } finally {
        setLoading(false)
      }
    }
    
    loadData()
  }, [])

  const handleOpeningSelect = (opening: Opening) => {
    const encodedFen = encodeURIComponent(opening.fen)
    navigate(`/opening/${encodedFen}`)
  }

  return (
    <div className="landing-page">
      {/* Hero Section - Correct Layout to Match Reference */}
      <section className="hero-section" style={{ padding: 'var(--space-xxl) 0' }}>
        <div className="hero-content" style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 var(--space-lg)', textAlign: 'center' }}>
          {/* Small Chess Trainer header */}
          <div className="app-header" style={{ marginBottom: 'var(--space-lg)' }}>
            <h1 style={{ 
              fontSize: 'var(--font-size-h1)', 
              fontWeight: 'var(--font-weight-h1)', 
              color: 'var(--text-primary)',
              marginBottom: 'var(--space-sm)'
            }}>
              Chess Trainer
            </h1>
          </div>

          {/* Main subtitle - matching the reference image */}
          <p style={{ 
            fontSize: 'var(--font-size-h3)', 
            color: 'var(--text-secondary)',
            marginBottom: 'var(--space-xl)',
            maxWidth: '600px',
            margin: '0 auto var(--space-xl) auto'
          }}>
            Master every opening from the common to the obscure, this and much more.
          </p>

          {/* Search Component Container */}
          <div className="search-container" style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--border-radius-medium)',
            padding: 'var(--space-xl)',
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            <SearchBar
              variant="landing"
              onSelect={handleOpeningSelect}
              placeholder={loading ? "Loading openings..." : "Search for an opening by name or moves..."}
              disabled={loading}
              loading={loading}
              openingsData={openingsData}
              className="hero-search"
            />
          </div>
        </div>
      </section>

      {/* Popular Openings - Use Component's Built-in UI */}
      {dataLoaded && openingsData.length > 0 && (
        <PopularOpeningsGrid
          openings={openingsData}
          onOpeningSelect={handleOpeningSelect}
          className="main-grid"
        />
      )}
    </div>
  )
}

export default LandingPage
