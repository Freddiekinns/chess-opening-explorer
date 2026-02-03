import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { SearchBar } from '../components/shared/SearchBar'
import { PopularOpeningsGrid } from '../components/landing/PopularOpeningsGrid'
import { FeedbackSection } from '../components/shared/FeedbackSection'
import { PGNInputModal } from '../components/shared/PGNInputModal'
import { PersonalOpeningStats } from '../components/personal/PersonalOpeningStats'

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
  white_win_rate?: number
  black_win_rate?: number
  draw_rate?: number
}

// Fast client-side search function (moved to SearchBar component)
// This function is now in SearchBar component

const LandingPage: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [openingsData, setOpeningsData] = useState<Opening[]>([])
  const [dataLoaded, setDataLoaded] = useState(false)
  const [popularOpenings, setPopularOpenings] = useState<Opening[]>([])
  const [expandedSearchLoaded, setExpandedSearchLoaded] = useState(false)
  const [isPGNModalOpen, setIsPGNModalOpen] = useState(false)
  const location = useLocation()
  const [view, setView] = useState<'global' | 'personal'>('global')
  const [personalUsernamePrefill, setPersonalUsernamePrefill] = useState('')
  const navigate = useNavigate()

  // Apply body class for this page
  useEffect(() => {
    document.body.className = 'landing-page'
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

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    setView(params.get('view') === 'personal' ? 'personal' : 'global')
    setPersonalUsernamePrefill(params.get('username') || '')
  }, [location.search])

  const setViewAndUpdateUrl = (nextView: 'global' | 'personal') => {
    const params = new URLSearchParams(location.search)

    if (nextView === 'personal') {
      params.set('view', 'personal')
    } else {
      params.delete('view')
    }

    const qs = params.toString()
    navigate({ pathname: '/', search: qs ? `?${qs}` : '' }, { replace: true })
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

  const handlePGNOpeningFound = (fen: string) => {
    const encodedFen = encodeURIComponent(fen)
    navigate(`/opening/${encodedFen}`)
  }

  const effectiveOpeningsData = useMemo(() => {
    // Personal analysis uses the full index. If we're still on the limited index, allow the user
    // to trigger the expansion via SearchBar.
    return openingsData
  }, [openingsData])

  return (
    <div className="landing-page">
      {/* Hero Section - Clean centered design */}
      <section className="hero-section">
        <div className="hero-content">
          {/* Main title */}
          <h1 className="hero-title">Opening Book</h1>
          
          {/* Subtitle */}
          <p className="hero-subtitle">
            Discover, explore and learn chess openings.
          </p>

          {/* Search bar */}
          <div className="hero-search-wrapper">
            <SearchBar
              variant="landing"
              onSelect={handleOpeningSelect}
              placeholder="Try: 'aggressive openings' or 'popular responses to d4'"
              disabled={loading}
              loading={loading}
              openingsData={openingsData}
              onExpandSearch={handleExpandSearch}
              className="hero-search"
            />
            <div className="pgn-search-link-wrapper">
              <button
                className="pgn-search-link"
                onClick={() => setIsPGNModalOpen(true)}
              >
                Or search by PGN
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section Header with View Toggle */}
      <div className="content-section-header">
        <div className="view-toggle" role="tablist" aria-label="Explore view">
          <button
            type="button"
            className={`view-toggle__btn ${view === 'global' ? 'is-active' : ''}`}
            onClick={() => setViewAndUpdateUrl('global')}
            role="tab"
            aria-selected={view === 'global'}
          >
            Most Popular
          </button>
          <button
            type="button"
            className={`view-toggle__btn ${view === 'personal' ? 'is-active' : ''}`}
            onClick={() => {
              setViewAndUpdateUrl('personal')
              void handleExpandSearch()
            }}
            role="tab"
            aria-selected={view === 'personal'}
          >
            Your Games
          </button>
        </div>
      </div>

      {/* Popular Openings - Always reserve space to prevent layout shift */}
      <div className="popular-openings-container">
        {view === 'personal' ? (
          <PersonalOpeningStats openingsData={effectiveOpeningsData} prefillUsername={personalUsernamePrefill} />
        ) : (
          <>
            {dataLoaded && popularOpenings.length > 0 ? (
              <PopularOpeningsGrid
                openings={popularOpenings}
                onOpeningSelect={handleOpeningSelect}
                className="main-grid"
              />
            ) : (
              <div className="popular-openings-placeholder">
                {/* Reserved space for Popular Openings to prevent layout shift */}
              </div>
            )}
          </>
        )}
      </div>
      <FeedbackSection source="landing" />

      <PGNInputModal
        isOpen={isPGNModalOpen}
        onClose={() => setIsPGNModalOpen(false)}
        onOpeningFound={handlePGNOpeningFound}
        openingsData={openingsData}
      />
    </div>
  )
}

export default LandingPage
