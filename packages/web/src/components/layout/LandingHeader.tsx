import { Link, useLocation } from 'react-router-dom'

export const LandingHeader: React.FC = () => {
  const location = useLocation()
  const isDiscover = location.pathname === '/' || location.pathname === ''
  const isAnalyse = location.pathname === '/analyse'

  return (
    <header className="landing-header">
      <div className="landing-header__container">
        <nav className="landing-header__nav">
          <Link
            to="/"
            className={`landing-header__link ${isDiscover ? 'is-active' : ''}`}
          >
            Discover
          </Link>
          <Link
            to="/analyse"
            className={`landing-header__link ${isAnalyse ? 'is-active' : ''}`}
          >
            Analyse Games
          </Link>
        </nav>
      </div>
    </header>
  )
}

export default LandingHeader
