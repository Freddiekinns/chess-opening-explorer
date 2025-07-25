import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import OpeningDetailPagePRD from './pages/OpeningDetailPagePRD'

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/opening/:fen" element={<OpeningDetailPagePRD />} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </div>
  )
}

export default App
