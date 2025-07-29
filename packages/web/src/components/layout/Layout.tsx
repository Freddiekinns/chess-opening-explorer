import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  
  return (
    <div className="layout">
      <nav className="main-nav">
        <div className="nav-container">
          <Link to="/" className="nav-logo">
            <h1>Chess Trainer</h1>
          </Link>
          <div className="nav-links">
            <Link 
              to="/" 
              className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
            >
              Home
            </Link>
            <Link 
              to="/trainer" 
              className={`nav-link ${location.pathname === '/trainer' ? 'active' : ''}`}
            >
              Opening Trainer
            </Link>
            <Link 
              to="/explorer" 
              className={`nav-link ${location.pathname === '/explorer' ? 'active' : ''}`}
            >
              Opening Explorer
            </Link>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  )
}
