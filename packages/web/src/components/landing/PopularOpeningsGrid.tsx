import React, { useState, useEffect } from 'react';
import { OpeningCard } from '../shared/OpeningCard';

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

  // Available categories based on style_tags
  const [categories, setCategories] = useState([
    { id: 'all', label: 'All Openings', count: 0 },
    { id: 'aggressive', label: 'Aggressive', count: 0 },
    { id: 'positional', label: 'Positional', count: 0 },
    { id: 'tactical', label: 'Tactical', count: 0 },
    { id: 'gambit', label: 'Gambit', count: 0 },
    { id: 'solid', label: 'Solid', count: 0 }
  ])

  // Update filtered openings when filters change
  useEffect(() => {
    let filtered = [...openings]

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(opening => {
        const styleTags = opening.analysis?.style_tags || []
        return styleTags.some(tag => tag.toLowerCase() === selectedCategory.toLowerCase())
      })
    }

    // Simplified sorting - prioritize game volume, then popularity score, then name
    filtered.sort((a, b) => {
      // Prioritize actual game volume over popularity score
      const gamesA = a.games_analyzed || 0
      const gamesB = b.games_analyzed || 0
      if (gamesA !== gamesB) return gamesB - gamesA
      // Fallback to popularity score if no game data
      const popA = a.analysis?.popularity || 0
      const popB = b.analysis?.popularity || 0
      if (popA !== popB) return popB - popA
      // Final fallback to alphabetical
      return a.name.localeCompare(b.name)
    })

    // Limit to top results for performance
    setFilteredOpenings(filtered.slice(0, 12))
  }, [openings, selectedCategory])

  // Update category counts
  useEffect(() => {
    const categoryIds = ['aggressive', 'positional', 'tactical', 'gambit', 'solid']
    
    const updatedCategories = [
      { id: 'all', label: 'All Openings', count: openings.length },
      ...categoryIds.map(categoryId => ({
        id: categoryId,
        label: categoryId.charAt(0).toUpperCase() + categoryId.slice(1),
        count: openings.filter(opening => 
          opening.analysis?.style_tags?.some(tag => 
            tag.toLowerCase() === categoryId.toLowerCase()
          )
        ).length
      }))
    ]

    setCategories(updatedCategories)
  }, [openings])

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId)
  }

  return (
    <section className={`popular-openings-section ${className}`}>
      <div className="section-header">
        <h2>Popular Openings</h2>
        <p className="section-subtitle">
          Discover the most played openings by millions of chess players
        </p>
      </div>

      <div className="filters-container">
        <div className="category-filters">
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
      </div>

      <div className="openings-grid">
        {filteredOpenings.map((opening) => (
                    <OpeningCard
            key={opening.name}
            opening={opening}
            showPopularity={true}
            showEco={true}
            onClick={onOpeningSelect}
            className="opening-grid-item"
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
