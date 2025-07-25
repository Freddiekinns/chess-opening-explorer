/**
 * @fileoverview Enhanced Opening Detail Page Component
 * PRD-F14 Phase 3: Advanced detail page with tabbed content and comprehensive information
 */

import React, { useState, useCallback, memo } from 'react'
import { useParams } from 'react-router-dom'
import { 
  BookOpen, 
  BarChart3, 
  Play, 
  Video, 
  Star,
  BookmarkPlus,
  TrendingUp,
  Users,
  Clock,
  Target
} from 'lucide-react'

interface OpeningDetailProps {
  className?: string
}

interface TabContent {
  id: string
  label: string
  icon: React.ReactNode
  content: React.ReactNode
}

export const EnhancedOpeningDetail: React.FC<OpeningDetailProps> = memo(({ className = '' }) => {
  const { eco } = useParams<{ eco: string }>()
  const [activeTab, setActiveTab] = useState('overview')
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [personalNotes, setPersonalNotes] = useState('')

  console.log('Opening ECO:', eco) // Using eco param for potential future API calls

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId)
  }, [])

  const handleBookmark = useCallback(() => {
    setIsBookmarked(prev => !prev)
  }, [])

  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPersonalNotes(e.target.value)
  }, [])

  // Mock data - in real app would come from props/API
  const openingData = {
    name: 'Sicilian Defense',
    eco: 'B20-B99',
    moves: '1.e4 c5',
    description: 'The Sicilian Defense is a chess opening that begins with the moves 1.e4 c5. The Sicilian is the most popular and best-scoring response to White\'s first move 1.e4.',
    popularity: 52,
    winRates: { white: 38, draws: 34, black: 28 },
    keyConcepts: [
      'Central control with c5',
      'Asymmetrical pawn structure',
      'Counter-attacking possibilities',
      'Rich tactical opportunities'
    ]
  }

  const tabs: TabContent[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <BookOpen size={18} />,
      content: (
        <div className="overview-tab">
          <div className="opening-header">
            <div className="header-main">
              <h1 className="opening-name">{openingData.name}</h1>
              <div className="opening-meta">
                <span className="opening-eco">{openingData.eco}</span>
                <span className="opening-moves">{openingData.moves}</span>
              </div>
            </div>
            <div className="header-actions">
              <button 
                className={`bookmark-button ${isBookmarked ? 'bookmarked' : ''}`}
                onClick={handleBookmark}
                data-bookmarked={isBookmarked}
                aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
              >
                {isBookmarked ? <Star size={20} fill="currentColor" /> : <BookmarkPlus size={20} />}
                {isBookmarked ? 'Bookmarked' : 'Bookmark'}
              </button>
            </div>
          </div>

          <div className="opening-description">
            <p>{openingData.description}</p>
          </div>

          <div className="key-concepts">
            <h3>Key Concepts</h3>
            <ul className="concept-list">
              {openingData.keyConcepts.map((concept, index) => (
                <li key={index} className="concept-item">
                  <Target size={16} />
                  <span>{concept}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="quick-stats">
            <div className="stat-card">
              <div className="stat-icon">
                <TrendingUp size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{openingData.popularity}%</div>
                <div className="stat-label">Popularity</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <Users size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">15,432</div>
                <div className="stat-label">Games Played</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">
                <BarChart3 size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">2156</div>
                <div className="stat-label">Avg Rating</div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'analysis',
      label: 'Analysis',
      icon: <BarChart3 size={18} />,
      content: (
        <div className="analysis-tab">
          <div className="move-tree-container">
            <h3>Move Tree Analysis</h3>
            <div className="move-tree" data-testid="move-tree">
              <div className="move-node root" data-move="start">
                <div className="move-display">Starting Position</div>
                <div className="move-children">
                  <div className="move-node" data-move="e4">
                    <button className="move-button" tabIndex={0} aria-label="Play move e4">1.e4</button>
                    <div className="move-stats">52% popularity</div>
                  </div>
                  <div className="move-node" data-move="d4">
                    <button className="move-button" tabIndex={0} aria-label="Play move d4">1.d4</button>
                    <div className="move-stats">31% popularity</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="tree-controls">
              <button className="expand-all">Expand All</button>
              <button className="collapse-all">Collapse All</button>
            </div>
          </div>

          <div className="move-statistics">
            <div className="stat-panel">
              <h4>Move Popularity</h4>
              <div className="popularity-bar">
                <div className="popularity-fill" style={{ width: `${openingData.popularity}%` }}></div>
                <span className="popularity-text">{openingData.popularity}%</span>
              </div>
            </div>
            <div className="stat-panel">
              <h4>Win Rate Distribution</h4>
              <div className="win-rate-display">
                <div className="win-segment white">
                  <span className="white-wins">{openingData.winRates.white}%</span>
                  <span className="label">White</span>
                </div>
                <div className="win-segment draws">
                  <span className="draws">{openingData.winRates.draws}%</span>
                  <span className="label">Draws</span>
                </div>
                <div className="win-segment black">
                  <span className="black-wins">{openingData.winRates.black}%</span>
                  <span className="label">Black</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'games',
      label: 'Games',
      icon: <Play size={18} />,
      content: (
        <div className="games-tab">
          <div className="game-history-panel">
            <div className="history-filters">
              <select className="rating-filter">
                <option value="">All Ratings</option>
                <option value="2000+">2000+</option>
                <option value="1800-2000">1800-2000</option>
                <option value="1600-1800">1600-1800</option>
              </select>
              <select className="time-filter">
                <option value="">All Time Controls</option>
                <option value="blitz">Blitz</option>
                <option value="rapid">Rapid</option>
                <option value="classical">Classical</option>
              </select>
              <input 
                type="text" 
                className="player-search" 
                placeholder="Search players..."
                tabIndex={0}
                aria-label="Search games"
              />
            </div>
            <div className="game-list">
              <div className="game-item" data-rating="2156" data-timecontrol="blitz">
                <div className="players">Carlsen, M vs Nakamura, H</div>
                <div className="result">1-0</div>
                <div className="meta">
                  <span className="date">2024-01-15</span>
                  <span className="time-control">Blitz</span>
                  <span className="rating">2156</span>
                </div>
              </div>
              <div className="game-item" data-rating="2245" data-timecontrol="rapid">
                <div className="players">Firouzja, A vs Ding, L</div>
                <div className="result">0-1</div>
                <div className="meta">
                  <span className="date">2024-01-14</span>
                  <span className="time-control">Rapid</span>
                  <span className="rating">2245</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'videos',
      label: 'Videos',
      icon: <Video size={18} />,
      content: (
        <div className="videos-tab">
          <div className="video-grid">
            <div className="video-card">
              <div className="video-thumbnail">
                <Play size={48} />
              </div>
              <div className="video-info">
                <h4>Sicilian Defense Complete Guide</h4>
                <p>Master the key concepts and main variations</p>
                <div className="video-meta">
                  <span className="duration">
                    <Clock size={14} />
                    25:30
                  </span>
                  <span className="views">15.2K views</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ]

  return (
    <div className={`opening-detail-page ${className}`}>
      <div className="detail-tabs" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            role="tab"
            tabIndex={0}
            aria-selected={activeTab === tab.id}
            aria-label={`${tab.label} tab`}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="tab-content">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`tab-panel ${activeTab === tab.id ? 'active' : ''}`}
            role="tabpanel"
            aria-hidden={activeTab !== tab.id}
            id={`panel-${tab.id}`}
          >
            {activeTab === tab.id && tab.content}
          </div>
        ))}
      </div>

      <div className="personal-features">
        <div className="notes-section">
          <h4>Personal Notes</h4>
          <textarea 
            className="personal-notes"
            value={personalNotes}
            onChange={handleNotesChange}
            placeholder="Add your notes about this opening..."
            tabIndex={0}
            aria-label="Personal notes"
          />
          <button className="save-notes">Save Notes</button>
        </div>
        
        <div className="study-plan">
          <h4>Study Plan</h4>
          <div className="plan-item">
            <input type="checkbox" className="plan-checkbox" id="plan-1" />
            <label htmlFor="plan-1">Master key pawn structures</label>
          </div>
          <div className="plan-item">
            <input type="checkbox" className="plan-checkbox" id="plan-2" />
            <label htmlFor="plan-2">Practice tactical motifs</label>
          </div>
          <div className="plan-item">
            <input type="checkbox" className="plan-checkbox" id="plan-3" />
            <label htmlFor="plan-3">Study master games</label>
          </div>
        </div>
      </div>
    </div>
  )
})

EnhancedOpeningDetail.displayName = 'EnhancedOpeningDetail'

export default EnhancedOpeningDetail
