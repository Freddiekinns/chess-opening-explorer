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
  const [expandedSearchLoaded, setExpandedSearchLoaded] = useState(false)
  const navigate = useNavigate()

  // Apply body class for this page
  useEffect(() => {
    document.body.className = 'landing-page-body'
    return () => {
      document.body.className = ''
    }
  }, [])

  // Progressive search expansion function
  const handleExpandSearch = async () => {
    if (expandedSearchLoaded) return
    
    try {
      console.log('🔍 Expanding search index...')
      const response = await fetch('/api/openings/search-index') // Load full index
      const data = await response.json()
      
      if (data.success) {
        setOpeningsData(data.data)
        setExpandedSearchLoaded(true)
        console.log(`✅ Expanded search index: ${data.count} openings (${data.searchTime})`)
      }
    } catch (error) {
      console.warn('Failed to expand search index:', error)
    }
  }

  // Load openings data and popular openings with optimized loading strategy
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        
        // Load popular openings first (most critical for UX)
        const popularResponse = await fetch('/api/openings/popular-by-eco?limit=6')
        const popularData = await popularResponse.json()
        
        if (popularData.success && popularData.data) {
          // Flatten the categorized data into a single array for PopularOpeningsGrid
          const flattenedPopular = Object.values(popularData.data).flat() as Opening[]
          setPopularOpenings(flattenedPopular)
          console.log(`✅ Loaded ${flattenedPopular.length} popular openings (${popularData.metadata.response_time_ms}ms)`)
          setDataLoaded(true) // Allow page to render with popular openings
        }
        
        // Load search index in parallel (non-blocking for initial render)
        const searchPromise = fetch('/api/openings/search-index?limit=1000')
          .then(response => response.json())
          .then(searchData => {
            if (searchData.success) {
              setOpeningsData(searchData.data)
              console.log(`✅ Loaded search index: ${searchData.count} openings (${searchData.searchTime})`)
              
              // If popular openings didn't load, use fallback from search data
              if (!popularData.success || !popularData.data) {
                const fallbackPopular = searchData.data
                  .filter((opening: Opening) => opening.games_analyzed || opening.analysis_json?.popularity)
                  .sort((a: Opening, b: Opening) => {
                    const gamesA = a.games_analyzed || 0
                    const gamesB = b.games_analyzed || 0
                    if (gamesA !== gamesB) return gamesB - gamesA
                    return (b.analysis_json?.popularity || 0) - (a.analysis_json?.popularity || 0)
                  })
                  .slice(0, 30)
                
                setPopularOpenings(fallbackPopular)
                setDataLoaded(true)
              }
            }
          })
          .catch(error => {
            console.warn('Search index loading failed, using minimal fallback:', error)
            // Minimal fallback - just use popular openings for search too
            if (popularData.success && popularData.data) {
              const flattenedPopular = Object.values(popularData.data).flat() as Opening[]
              setOpeningsData(flattenedPopular)
            }
          })
        
        // Don't wait for search index to complete page loading
        await searchPromise
        
      } catch (error) {
        console.error('Error loading data:', error)
        setDataLoaded(true) // Still allow page to render
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
      {/* Hero Section - Clean centered design */}
      <section className="hero-section">
        <div className="hero-content">
          {/* Main title */}
          <h1 className="hero-title">Chess Trainer</h1>
          
          {/* Subtitle */}
          <p className="hero-subtitle">
            Master every opening from the first move - discover, learn, and track chess openings with AI analysis and much more.
          </p>

          {/* Search bar */}
          <div className="hero-search-wrapper">
            <SearchBar
              variant="landing"
              onSelect={handleOpeningSelect}
              placeholder="Look for an opening by move or name..."
              disabled={loading}
              loading={loading}
              openingsData={openingsData}
              onExpandSearch={handleExpandSearch}
              className="hero-search"
            />
          </div>
        </div>
      </section>

      {/* Popular Openings - Use Component's Built-in UI */}
      {dataLoaded && popularOpenings.length > 0 && (
        <PopularOpeningsGrid
          openings={popularOpenings}
          onOpeningSelect={handleOpeningSelect}
          className="main-grid"
        />
      )}
    </div>
  )
}

export default LandingPage
