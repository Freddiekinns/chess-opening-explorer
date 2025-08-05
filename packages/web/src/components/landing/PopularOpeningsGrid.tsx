import React, { useState, useEffect } from 'react';
import { OpeningCard } from '../shared/OpeningCard';
import { ComplexityFilters } from '../filters/ComplexityFilters';

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
  white_win_rate?: number
  black_win_rate?: number
  draw_rate?: number
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
  const [selectedComplexity, setSelectedComplexity] = useState<string | null>(null)
  
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
    const loadFilteredData = async () => {
      // If complexity is selected, make API call to get filtered data
      if (selectedComplexity) {
        try {
          console.log(`🔍 Loading openings for complexity: "${selectedComplexity}"`);
          
          const params = new URLSearchParams();
          params.append('complexity', selectedComplexity);
          params.append('limit', '30'); // Get more data for better filtering
          
          const response = await fetch(`/api/openings/popular-by-eco?${params}`);
          const data = await response.json();
          
          if (data.success) {
            // Flatten the categorized data
            const flattenedOpenings = Object.values(data.data).flat() as Opening[];
            
            // Apply ECO category filter
            let filtered = flattenedOpenings;
            if (selectedCategory !== 'all') {
              filtered = flattenedOpenings.filter(opening => 
                opening.eco && opening.eco.startsWith(selectedCategory)
              );
            }
            
            // Remove invalid FEN and limit results
            filtered = filtered.filter(opening => opening.fen && opening.fen.trim().length > 0);
            
            setFilteredOpenings(filtered.slice(0, 6));
            console.log(`✅ Loaded ${filtered.length} complexity-filtered openings`);
            return;
          }
        } catch (error) {
          console.error('Error loading complexity-filtered openings:', error);
        }
      }
      
      // Fallback to client-side filtering when no complexity filter or API fails
      console.log(`🔍 Processing ${openings.length} total openings for category: "${selectedCategory}"`);
      
      let filtered = openings;
      if (selectedCategory !== 'all') {
        filtered = openings.filter(opening => {
          return opening.eco && opening.eco.startsWith(selectedCategory)
        })
        console.log(`🎯 After filtering for "${selectedCategory}": ${filtered.length} openings`);
      }
      
      // Filter out any openings without valid FEN positions
      filtered = filtered.filter(opening => opening.fen && opening.fen.trim().length > 0)
      console.log(`🎯 After filtering valid FEN positions: ${filtered.length} openings`);
      
      // Deduplicate openings by FEN
      const uniqueOpenings = filtered.reduce((acc, opening) => {
        const key = opening.fen
        if (!acc[key] || (opening.games_analyzed || 0) > (acc[key].games_analyzed || 0)) {
          acc[key] = opening
        }
        return acc
      }, {} as Record<string, Opening>)
      
      const deduplicated = Object.values(uniqueOpenings)
      console.log(`📊 After deduplication: ${deduplicated.length} unique openings`);

      // Sort by games played (descending order - most popular first)
      deduplicated.sort((a, b) => (b.games_analyzed || 0) - (a.games_analyzed || 0))

      // Limit to top 6 for all categories for consistent display
      const displayLimit = 6
      const finalResults = deduplicated.slice(0, displayLimit)
      console.log(`✅ Final results for "${selectedCategory}": ${finalResults.length} openings, showing top ${displayLimit}`);
      
      setFilteredOpenings(finalResults);
    };
    
    loadFilteredData();
  }, [openings, selectedCategory, selectedComplexity])

  // Update category counts
  useEffect(() => {
    const ecoCategories = ['A', 'B', 'C', 'D', 'E']
    
    const updatedCategories = [
      { id: 'all', label: 'All Openings', count: openings.length },
      ...ecoCategories.map(ecoLetter => {
        // Filter by ECO family first, then deduplicate within that category
        const categoryOpenings = openings.filter(opening => opening.eco && opening.eco.startsWith(ecoLetter))
        const uniqueInCategory = categoryOpenings.reduce((acc, opening) => {
          const key = opening.fen
          if (!acc[key] || (opening.games_analyzed || 0) > (acc[key].games_analyzed || 0)) {
            acc[key] = opening
          }
          return acc
        }, {} as Record<string, Opening>)
        
        return {
          id: ecoLetter,
          label: getEcoLabel(ecoLetter),
          count: Object.keys(uniqueInCategory).length
        }
      })
    ]

    setCategories(updatedCategories)
  }, [openings])

  const getEcoLabel = (ecoLetter: string): string => {
    const labels = {
      'A': 'Irregular Openings (A)',
      'B': 'Semi-Open Games (B)', 
      'C': 'Open Games (C)',
      'D': "Closed and Semi-Closed Games (D)",
      'E': 'Indian Defences (E)'
    }
    return labels[ecoLetter as keyof typeof labels] || `ECO ${ecoLetter}`
  }

  const handleCategoryChange = (categoryId: string) => {
    setSelectedCategory(categoryId)
  }

  return (
    <section className={`popular-openings-section ${className}`}>
      <div className="section-header">
        <h2>Browse Chess Openings</h2>
        <p className="section-subtitle">
          Filter by skill level and explore openings by ECO classification
        </p>
      </div>

      <div className="filters-container">
        <ComplexityFilters
          selectedComplexity={selectedComplexity}
          onComplexityChange={setSelectedComplexity}
          className="complexity-filters"
        />
        
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

      <div className="openings-grid">
        {filteredOpenings.map((opening, index) => (
          <OpeningCard
            key={opening.fen || `fallback-${opening.eco}-${opening.name}-${index}`}
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
