import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { SearchBar } from '../components/shared/SearchBar/SearchBar'
import { PopularOpeningsGrid } from '../components/landing/PopularOpeningsGrid/PopularOpeningsGrid'
import { StatisticsShowcase } from '../components/landing/StatisticsShowcase/StatisticsShowcase'
import './LandingPage.css'

interface Opening {
  fen: string
  name: string
  eco: string
  moves: string
  src: string
  scid?: string
  aliases?: Record<string, string>
  analysis?: {
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
  const [statistics, setStatistics] = useState({
    totalOpenings: 0,
    totalVideos: 0,
    avgRating: 2000
  })
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
          
          // Try to load popular openings from API first
          try {
            const popularResponse = await fetch('/api/openings/popular?limit=12')
            const popularData = await popularResponse.json()
            
            if (popularData.success && popularData.data.length > 0) {
              setPopularOpenings(popularData.data)
            } else {
              // Fallback: Extract most popular openings from all data
              const fallbackPopular = [...openingsData.data]
                .filter(opening => opening.analysis?.popularity && opening.analysis.popularity > 0)
                .sort((a, b) => {
                  // Sort by games_analyzed if available, otherwise by popularity score
                  const gamesA = (a as any).games_analyzed || 0
                  const gamesB = (b as any).games_analyzed || 0
                  if (gamesA > 0 || gamesB > 0) {
                    const gamesDiff = gamesB - gamesA
                    if (gamesDiff !== 0) return gamesDiff
                    return a.name.localeCompare(b.name)
                  }
                  // Fallback to popularity score, then alphabetical
                  const popDiff = (b.analysis?.popularity || 0) - (a.analysis?.popularity || 0)
                  if (popDiff !== 0) return popDiff
                  return a.name.localeCompare(b.name)
                })
                .slice(0, 12)
              
              // If no popularity data, show some well-known openings
              if (fallbackPopular.length === 0) {
                const wellKnownOpenings = openingsData.data.filter((opening: Opening) => 
                  ['e4', 'd4', 'Nf3', 'c4'].includes(opening.moves.split(' ')[0]) ||
                  opening.name.toLowerCase().includes('sicilian') ||
                  opening.name.toLowerCase().includes('queen') ||
                  opening.name.toLowerCase().includes('ruy lopez') ||
                  opening.name.toLowerCase().includes('italian') ||
                  opening.name.toLowerCase().includes('french') ||
                  opening.name.toLowerCase().includes('caro-kann') ||
                  opening.name.toLowerCase().includes('english')
                ).slice(0, 12)
                setPopularOpenings(wellKnownOpenings)
              } else {
                setPopularOpenings(fallbackPopular)
              }
            }
          } catch (error) {
            console.warn('Popular openings endpoint not available, using fallback')
            // Use fallback approach
            const fallbackPopular = [...openingsData.data]
              .filter((opening: Opening) => 
                ['e4', 'd4', 'Nf3', 'c4'].includes(opening.moves.split(' ')[0]) ||
                opening.name.toLowerCase().includes('sicilian') ||
                opening.name.toLowerCase().includes('queen') ||
                opening.name.toLowerCase().includes('ruy lopez') ||
                opening.name.toLowerCase().includes('italian') ||
                opening.name.toLowerCase().includes('french') ||
                opening.name.toLowerCase().includes('caro-kann') ||
                opening.name.toLowerCase().includes('english')
              ).slice(0, 12)
            setPopularOpenings(fallbackPopular)
          }
          
          // Set statistics
          setStatistics({
            totalOpenings: openingsData.data.length,
            totalVideos: 1222, // From PRD
            avgRating: 2000
          })
          
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
      {/* Hero Section with Logo and Search */}
      <div className="hero-section">
        <div className="logo-container">
          <i className="fas fa-chess-knight"></i>
          <h1>Chess Trainer</h1>
        </div>
        <p className="tagline">Master every opening, from the common to the obscure. Find your next move.</p>

        <SearchBar
          variant="landing"
          onSelect={handleOpeningSelect}
          placeholder={loading ? "Loading openings..." : "Search for a chess opening..."}
          disabled={loading}
          loading={loading}
          openingsData={openingsData}
          className="hero-search"
        />
      </div>

      {/* Popular Openings Grid */}
      {dataLoaded && popularOpenings.length > 0 && (
        <PopularOpeningsGrid
          openings={popularOpenings}
          onOpeningSelect={handleOpeningSelect}
          className="main-grid"
        />
      )}

      {/* Statistics Showcase */}
      <StatisticsShowcase
        stats={statistics}
        className="main-stats"
      />
    </div>
  )
}

export default LandingPage
