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
  const [displayLimit, setDisplayLimit] = useState(6) // Show 6 initially, then load more
  
  // Helper function to count the number of moves in a moves string
  const countMoves = (moves: string): number => {
    if (!moves || typeof moves !== 'string') return 0;
    
    // Remove move numbers (1., 2., etc.) and split by spaces
    // Example: "1. e4 e5 2. Nf3" -> ["e4", "e5", "Nf3"] = 3 moves
    const cleanMoves = moves.replace(/\d+\./g, '').trim();
    if (!cleanMoves) return 0;
    
    const moveList = cleanMoves.split(/\s+/).filter(move => move.length > 0);
    return moveList.length;
  };

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
      try {
        console.log(`🔍 Loading openings for category: "${selectedCategory}", complexity: "${selectedComplexity || 'all levels'}"`);
        
        // Strategy: Use popular-by-eco API for all scenarios to ensure good coverage
        const params = new URLSearchParams();
        if (selectedComplexity) {
          params.append('complexity', selectedComplexity);
        }
        params.append('limit', '20'); // Get 20 per category for comprehensive coverage
        
        const response = await fetch(`/api/openings/popular-by-eco?${params}`);
        const data = await response.json();
        
        if (data.success) {
          // Flatten the categorized data
          const flattenedOpenings = Object.values(data.data).flat() as Opening[];
          
          // Apply ECO category filter if specific category is selected
          let filtered = flattenedOpenings;
          if (selectedCategory !== 'all') {
            filtered = flattenedOpenings.filter(opening => 
              opening.eco && opening.eco.startsWith(selectedCategory)
            );
          }
          
          // Remove invalid FEN and openings with only 1 move
          filtered = filtered.filter(opening => {
            if (!opening.fen || opening.fen.trim().length === 0) return false;
            if (countMoves(opening.moves) <= 1) return false;
            return true;
          });
          
          // Deduplicate openings by FEN
          const uniqueOpenings = filtered.reduce((acc, opening) => {
            const key = opening.fen
            if (!acc[key] || (opening.games_analyzed || 0) > (acc[key].games_analyzed || 0)) {
              acc[key] = opening
            }
            return acc
          }, {} as Record<string, Opening>)
          
          const deduplicated = Object.values(uniqueOpenings)
          
          // Sort by games played (descending order - most popular first)
          deduplicated.sort((a, b) => (b.games_analyzed || 0) - (a.games_analyzed || 0))
          
          console.log(`✅ ${selectedCategory === 'all' ? 'All categories' : `Category "${selectedCategory}"`}: ${deduplicated.length} openings`);
          
          // If we get very few results for a specific category, try the search-index API as fallback
          if (selectedCategory !== 'all' && deduplicated.length < 5) {
            console.log(`⚠️ Low results for category "${selectedCategory}", trying search-index fallback...`);
            
            const fallbackResponse = await fetch('/api/openings/search-index?limit=500');
            const fallbackData = await fallbackResponse.json();
            
            if (fallbackData.success) {
              let fallbackFiltered = fallbackData.data.filter((opening: Opening) => 
                opening.eco && opening.eco.startsWith(selectedCategory)
              );
              
              fallbackFiltered = fallbackFiltered.filter((opening: Opening) => {
                if (!opening.fen || opening.fen.trim().length === 0) return false;
                if (countMoves(opening.moves) <= 1) return false;
                return true;
              });
              
              const fallbackUnique = fallbackFiltered.reduce((acc: Record<string, Opening>, opening: Opening) => {
                const key = opening.fen
                if (!acc[key]) {
                  acc[key] = opening
                }
                return acc
              }, {} as Record<string, Opening>)
              
              const fallbackDeduplicated = Object.values(fallbackUnique) as Opening[]
              fallbackDeduplicated.sort((a, b) => (b.games_analyzed || 0) - (a.games_analyzed || 0))
              
              if (fallbackDeduplicated.length > deduplicated.length) {
                console.log(`✅ Fallback successful: ${fallbackDeduplicated.length} openings for category "${selectedCategory}"`);
                setFilteredOpenings(fallbackDeduplicated);
                setDisplayLimit(6);
                return;
              }
            }
          }
          
          setFilteredOpenings(deduplicated);
          setDisplayLimit(6);
          return;
        }
      } catch (error) {
        console.error('Error loading openings:', error);
      }
      
      // Fallback to client-side filtering only if API fails
      console.log(`🔍 Fallback: Processing ${openings.length} total openings for category: "${selectedCategory}"`);
      
      let filtered = openings;
      if (selectedCategory !== 'all') {
        filtered = openings.filter(opening => {
          return opening.eco && opening.eco.startsWith(selectedCategory)
        })
        console.log(`🎯 After filtering for "${selectedCategory}": ${filtered.length} openings`);
      }
      
      // Filter out any openings without valid FEN positions and openings with only 1 move
      filtered = filtered.filter(opening => {
        if (!opening.fen || opening.fen.trim().length === 0) return false;
        if (countMoves(opening.moves) <= 1) return false;
        return true;
      })
      console.log(`🎯 After filtering valid FEN positions and multi-move openings: ${filtered.length} openings`);
      
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

      // Show all valid openings instead of limiting to 6
      console.log(`✅ Final results for "${selectedCategory}": ${deduplicated.length} openings`);
      
      setFilteredOpenings(deduplicated);
      setDisplayLimit(6); // Reset display limit when filters change
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
          Filter by skill level and explore openings by type
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
            </button>
          ))}
        </div>
      </div>

      <div className="openings-grid" key={`${selectedCategory}-${selectedComplexity}-${displayLimit}`}>
        {filteredOpenings.slice(0, displayLimit).map((opening, index) => (
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

      {filteredOpenings.length > displayLimit && (
        <div className="load-more-section">
          <button 
            onClick={() => setDisplayLimit(prev => prev + 6)}
            className="load-more-btn"
          >
            Load More Openings ({filteredOpenings.length - displayLimit} remaining)
          </button>
        </div>
      )}

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
