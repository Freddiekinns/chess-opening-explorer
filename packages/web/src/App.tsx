import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import LandingPage from './pages/LandingPage'
import AnalyseGamesPage from './pages/AnalyseGamesPage'
import OpeningDetailPage from './pages/OpeningDetailPage'

const AnalyseRedirect = () => {
  useEffect(() => {
    window.location.replace('/analyse')
  }, [])
  return null
}

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/analyse" element={<AnalyseGamesPage />} />
        <Route path="/personal-explorer" element={<AnalyseRedirect />} />
        <Route path="/opening/:fen" element={<OpeningDetailPage />} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
      <Analytics />
    </div>
  )
}

export default App
