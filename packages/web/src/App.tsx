import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import LandingPage from './pages/LandingPage'
import OpeningDetailPage from './pages/OpeningDetailPage'

const PersonalRedirect = () => {
  useEffect(() => {
    window.location.replace('/?view=personal')
  }, [])
  return null
}

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/personal-explorer" element={<PersonalRedirect />} />
        <Route path="/opening/:fen" element={<OpeningDetailPage />} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
      <Analytics />
    </div>
  )
}

export default App
