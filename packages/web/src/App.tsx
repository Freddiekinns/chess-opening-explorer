import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import OpeningDetailPage from './pages/OpeningDetailPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/opening/:fen" element={<OpeningDetailPage />} />
      <Route path="*" element={<LandingPage />} />
    </Routes>
  )
}

export default App
