import React from 'react';
import '../../styles/index.css';

interface StatisticsShowcaseProps {
  stats: {
    totalOpenings: number
    totalVideos: number
    avgRating?: number
  }
  className?: string
}

export const StatisticsShowcase: React.FC<StatisticsShowcaseProps> = ({
  stats,
  className = ''
}) => {
  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}K+`
    }
    return num.toString()
  }

  const statisticsData = [
    {
      id: 'openings',
      value: formatNumber(stats.totalOpenings),
      label: 'Chess Openings',
      description: 'Complete ECO classification with AI analysis',
      icon: '♛',
      color: 'primary'
    },
    {
      id: 'videos',
      value: formatNumber(stats.totalVideos),
      label: 'Related Videos',
      description: 'Curated YouTube lessons from chess masters',
      icon: '📹',
      color: 'secondary'
    },
    {
      id: 'analysis',
      value: '100%',
      label: 'AI-Enriched',
      description: 'Machine learning analysis for every opening',
      icon: '🧠',
      color: 'tertiary'
    },
    {
      id: 'statistics',
      value: 'Live',
      label: 'Popularity Stats',
      description: 'Real game data from millions of chess matches',
      icon: '📊',
      color: 'quaternary'
    }
  ]

  return (
    <section className={`statistics-showcase ${className}`}>
      <div className="showcase-header">
        <h2>Comprehensive Chess Opening Database</h2>
        <p className="showcase-subtitle">
          Powered by advanced AI analysis and real game statistics
        </p>
      </div>

      <div className="stats-grid">
        {statisticsData.map((stat) => (
          <div key={stat.id} className={`stat-card ${stat.color}`}>
            <div className="stat-icon">
              {stat.icon}
            </div>
            <div className="stat-content">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
              <div className="stat-description">{stat.description}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="showcase-footer">
        <div className="feature-highlights">
          <div className="highlight">
            <span className="highlight-icon">⚡</span>
            <span>Instant Search</span>
          </div>
          <div className="highlight">
            <span className="highlight-icon">🎯</span>
            <span>Expert Analysis</span>
          </div>
          <div className="highlight">
            <span className="highlight-icon">📱</span>
            <span>Mobile Optimized</span>
          </div>
          <div className="highlight">
            <span className="highlight-icon">🆓</span>
            <span>Completely Free</span>
          </div>
        </div>
      </div>
    </section>
  )
}

export default StatisticsShowcase
