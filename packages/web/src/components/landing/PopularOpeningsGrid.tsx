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
  analysis_json?: {  // Changed from analysis to analysis_json to match API
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

  // Available categories based on ECO codes
  const [categories, setCategories] = useState([
    { id: 'all', label: 'All Openings', count: 0 },
    { id: 'A', label: 'Flank Openings (A)', count: 0 },
    { id: 'B', label: 'Semi-Open Games (B)', count: 0 },
    { id: 'C', label: 'French & Others (C)', count: 0 },
    { id: 'D', label: "Queen's Gambit (D)", count: 0 },
    { id: 'E', label: 'Indian Systems (E)', count: 0 }
  ])

  // Update filtered openings when filters change
  useEffect(() => {
    console.log(`🔍 Processing ${openings.length} total openings for category: "${selectedCategory}"`);
    
    // First, deduplicate openings by name + eco combination to prevent duplicates
    const uniqueOpenings = openings.reduce((acc, opening) => {
      const key = `${opening.name}-${opening.eco}`
      if (!acc[key] || (opening.games_analyzed || 0) > (acc[key].games_analyzed || 0)) {
        acc[key] = opening
      }
      return acc
    }, {} as Record<string, Opening>)
    
    let filtered = Object.values(uniqueOpenings)
    console.log(`📊 After deduplication: ${filtered.length} unique openings`);

    // Apply ECO category filter FIRST, before any limiting
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(opening => {
        return opening.eco && opening.eco.startsWith(selectedCategory)
      })
      console.log(`🎯 After filtering for "${selectedCategory}": ${filtered.length} openings`);
    }

    // Sort by games played (descending order - most popular first)
    filtered.sort((a, b) => (b.games_analyzed || 0) - (a.games_analyzed || 0))

    // Now limit to top 6 for specific categories, 12 for "all"
    const displayLimit = selectedCategory === 'all' ? 12 : 6
    const finalResults = filtered.slice(0, displayLimit)
    console.log(`✅ Final results for "${selectedCategory}": ${finalResults.length} openings, showing top ${displayLimit}`);
    
    // Debug: Log the actual games_analyzed values for the final results
    console.log('🎯 Final sorted results with games_analyzed:');
    finalResults.forEach((opening, index) => {
      console.log(`  ${index + 1}. "${opening.name}" (${opening.eco}) - ${opening.games_analyzed || 0} games`);
    });
    
    setFilteredOpenings(finalResults)
  }, [openings, selectedCategory])

  // Update category counts
  useEffect(() => {
    // First deduplicate openings for accurate counts
    const uniqueOpenings = openings.reduce((acc, opening) => {
      const key = `${opening.name}-${opening.eco}`
      if (!acc[key] || (opening.games_analyzed || 0) > (acc[key].games_analyzed || 0)) {
        acc[key] = opening
      }
      return acc
    }, {} as Record<string, Opening>)
    
    const deduplicatedOpenings = Object.values(uniqueOpenings)
    const ecoCategories = ['A', 'B', 'C', 'D', 'E']
    
    const updatedCategories = [
      { id: 'all', label: 'All Openings', count: deduplicatedOpenings.length },
      ...ecoCategories.map(ecoLetter => {
        const matchingOpenings = deduplicatedOpenings.filter(opening => opening.eco && opening.eco.startsWith(ecoLetter))
        return {
          id: ecoLetter,
          label: getEcoLabel(ecoLetter),
          count: matchingOpenings.length
        }
      })
    ]

    setCategories(updatedCategories)
  }, [openings])

  const getEcoLabel = (ecoLetter: string): string => {
    const labels = {
      'A': 'Flank Openings (A)',
      'B': 'Semi-Open Games (B)', 
      'C': 'French & Others (C)',
      'D': "Queen's Gambit (D)",
      'E': 'Indian Systems (E)'
    }
    return labels[ecoLetter as keyof typeof labels] || `ECO ${ecoLetter}`
  }

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId)
  }

  return (
    <section className={`popular-openings-section ${className}`}>
      <div className="section-header">
        <h2>Popular Openings</h2>
        <p className="section-subtitle">
          Explore openings by ECO classification - from flank openings to Indian systems
        </p>
      </div>

      <div className="filters-container">
        <div className="category-filters">
        <div className="category-filters">
          {categories.slice(0, 6).map(category => (
            <button
              key={category.id}
              className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
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
        {filteredOpenings.map((opening, index) => (
          <OpeningCard
            key={`${opening.eco}-${opening.name}-${opening.fen?.substring(0, 10) || index}`}
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
          <p>No openings found in the selected ECO category.</p>
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
