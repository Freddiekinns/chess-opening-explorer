import { Routes, Route } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import LandingPage from './pages/LandingPage'
import OpeningDetailPage from './pages/OpeningDetailPage'

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/opening/:fen" element={<OpeningDetailPage />} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
      <Analytics />
    </div>
  )
}

export default App
