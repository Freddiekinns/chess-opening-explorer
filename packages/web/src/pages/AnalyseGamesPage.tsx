import React, { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { LandingHeader } from '../components/layout/LandingHeader'
import { PersonalOpeningStats } from '../components/personal/PersonalOpeningStats'
import { FeedbackSection } from '../components/shared/FeedbackSection'

const AnalyseGamesPage: React.FC = () => {
  const [openingsData, setOpeningsData] = useState<any[]>([])
  const location = useLocation()

  // Apply body class for this page
  useEffect(() => {
    document.body.className = 'analyse-page'
    return () => {
      document.body.className = ''
    }
  }, [])

  // Get prefill username from URL if provided
  const params = new URLSearchParams(location.search)
  const prefillUsername = params.get('username') || ''

  // Load openings data for analysis
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/api/openings/search-index')
        const data = await response.json()
        if (data.success) {
          setOpeningsData(data.data)
        }
      } catch (error) {
        console.warn('Failed to load openings data:', error)
      }
    }
    loadData()
  }, [])

  return (
    <div className="analyse-page">
      <LandingHeader />

      {/* Hero Section */}
      <section className="analyse-hero">
        <div className="analyse-hero__content">
          <h1 className="analyse-hero__title">Analyse Your Games</h1>
          <p className="analyse-hero__subtitle">
            Review your performance and improve your openings by connecting your chess account.
          </p>
        </div>
      </section>

      {/* Personal Opening Stats */}
      <PersonalOpeningStats
        openingsData={openingsData}
        prefillUsername={prefillUsername}
      />

      <FeedbackSection source="analyse" />
    </div>
  )
}

export default AnalyseGamesPage
