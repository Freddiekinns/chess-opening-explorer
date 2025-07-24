import React, { useState, useEffect } from 'react'
import { OpeningCard } from '../../shared/OpeningCard/OpeningCard'
import './PopularOpeningsGrid.css'

interface Opening {
  fen: string
  name: string
  eco: string
  moves: string
  src: string
  scid?: string
  aliases?: Record<string, string>
  analysis?: {
    description?: string
    style_tags?: string[]
    popularity?: number
    complexity?: string
  }
  games_analyzed?: number  // Number of games this opening was played
  popularity_rank?: number // Rank based on games_analyzed
}

interface PopularOpeningsGridProps {
  openings: Opening[]
  onOpeningSelect: (opening: Opening) => void
  className?: string
}

export const PopularOpeningsGrid: React.FC<PopularOpeningsGridProps> = ({
  openings,
  onOpeningSelect,
  className = ''
}) => {
  const [filteredOpenings, setFilteredOpenings] = useState<Opening[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'popularity' | 'complexity' | 'name'>('popularity')

  // Available categories based on style_tags
  const categories = [
    { id: 'all', label: 'All Openings', count: openings.length },
    { id: 'aggressive', label: 'Aggressive', count: 0 },
    { id: 'positional', label: 'Positional', count: 0 },
    { id: 'tactical', label: 'Tactical', count: 0 },
    { id: 'gambit', label: 'Gambit', count: 0 },
    { id: 'solid', label: 'Solid', count: 0 }
  ]

  // Update filtered openings when filters change
  useEffect(() => {
    let filtered = [...openings]

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(opening => {
        const styleTags = opening.analysis?.style_tags?.map(tag => tag.toLowerCase()) || []
        return styleTags.some(tag => tag.includes(selectedCategory.toLowerCase()))
      })
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'popularity':
          // Prefer games_analyzed over popularity score for more accurate sorting
          const gamesA = (a as any).games_analyzed || 0
          const gamesB = (b as any).games_analyzed || 0
          if (gamesA > 0 || gamesB > 0) {
            // If we have games_analyzed data, sort by that (descending), then alphabetically
            const gamesDiff = gamesB - gamesA
            if (gamesDiff !== 0) return gamesDiff
            return a.name.localeCompare(b.name)
          }
          // Fallback to old popularity score method
          const popA = a.analysis?.popularity || 0
          const popB = b.analysis?.popularity || 0
          const popDiff = popB - popA
          if (popDiff !== 0) return popDiff
          return a.name.localeCompare(b.name)
        case 'complexity':
          const complexityOrder = { 'Beginner': 1, 'Intermediate': 2, 'Advanced': 3 }
          const compA = complexityOrder[a.analysis?.complexity as keyof typeof complexityOrder] || 2
          const compB = complexityOrder[b.analysis?.complexity as keyof typeof complexityOrder] || 2
          const compDiff = compA - compB
          if (compDiff !== 0) return compDiff
          return a.name.localeCompare(b.name)
        case 'name':
          return a.name.localeCompare(b.name)
        default:
          return 0
      }
    })

    // Limit to top results for performance
    setFilteredOpenings(filtered.slice(0, 12))
  }, [openings, selectedCategory, sortBy])

  // Update category counts
  useEffect(() => {
    categories.forEach(category => {
      if (category.id === 'all') {
        category.count = openings.length
      } else {
        category.count = openings.filter(opening => {
          const styleTags = opening.analysis?.style_tags?.map(tag => tag.toLowerCase()) || []
          return styleTags.some(tag => tag.includes(category.id.toLowerCase()))
        }).length
      }
    })
  }, [openings])

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId)
  }

  const handleSortChange = (sortType: 'popularity' | 'complexity' | 'name') => {
    setSortBy(sortType)
  }

  return (
    <section className={`popular-openings-section ${className}`}>
      <div className="section-header">
        <h2>Popular Chess Openings</h2>
        <p className="section-subtitle">
          Discover the most played openings, ranked by absolute number of times played and strategic value
        </p>
      </div>

      <div className="filters-container">
        <div className="category-filters">
          <span className="filter-label">Category:</span>
          <div className="category-tabs">
            {categories.slice(0, 6).map(category => (
              <button
                key={category.id}
                className={`category-tab ${selectedCategory === category.id ? 'active' : ''}`}
                onClick={() => handleCategoryChange(category.id)}
              >
                {category.label}
                <span className="category-count">({category.count})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="sort-controls">
          <span className="filter-label">Sort by:</span>
          <select 
            value={sortBy} 
            onChange={(e) => handleSortChange(e.target.value as 'popularity' | 'complexity' | 'name')}
            className="sort-select"
          >
            <option value="popularity">Popularity</option>
            <option value="complexity">Complexity</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      <div className="openings-grid">
        {filteredOpenings.map((opening, index) => (
          <OpeningCard
            key={`${opening.fen}-${index}`}
            opening={opening}
            variant="compact"
            showPopularity={true}
            showEco={true}
            onClick={onOpeningSelect}
            className="grid-card"
          />
        ))}
      </div>

      {filteredOpenings.length === 0 && (
        <div className="empty-state">
          <p>No openings found for the selected category.</p>
          <button 
            onClick={() => setSelectedCategory('all')}
            className="reset-filter-btn"
          >
            Show All Openings
          </button>
        </div>
      )}
    </section>
  )
}

export default PopularOpeningsGrid
