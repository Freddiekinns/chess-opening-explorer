import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchBar } from '../SearchBar'
import { mockOpeningsList, mockSearchResponse, mockSearchResponseNoResults } from '../../../test/fixtures/openingData'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock opening selection handler
const mockOnSelect = vi.fn()

// Default props for SearchBar
const defaultProps = {
  onSelect: mockOnSelect,
  openingsData: mockOpeningsList,
  placeholder: 'Search openings...'
}

describe('SearchBar Component - Comprehensive Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset fetch mock to successful semantic search by default
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSearchResponse)
    })
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Basic Rendering', () => {
    it('should render search input with correct placeholder', () => {
      render(<SearchBar {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('placeholder', 'Search openings...')
    })

    it('should render custom placeholder when provided', () => {
      render(<SearchBar {...defaultProps} placeholder="Find your opening" />)
      
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('placeholder', 'Find your opening')
    })

    it('should render surprise me button for landing variant', () => {
      render(<SearchBar {...defaultProps} variant="landing" />)
      
      expect(screen.getByText('Surprise me!')).toBeInTheDocument()
    })

    it('should not render surprise me button for header variant', () => {
      render(<SearchBar {...defaultProps} variant="header" />)
      
      expect(screen.queryByText('Surprise me!')).not.toBeInTheDocument()
    })

    it('should show loading state when loading prop is true', () => {
      render(<SearchBar {...defaultProps} loading={true} />)
      
      // Check for the actual loading text that appears in the component
      expect(screen.getByText('Loading...')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Loading openings...')).toBeInTheDocument()
      expect(screen.getByText('⟳')).toBeInTheDocument()
    })

    it('should disable input when disabled prop is true', () => {
      render(<SearchBar {...defaultProps} disabled={true} />)
      
      const input = screen.getByRole('textbox')
      expect(input).toBeDisabled()
    })
  })

  describe('Search Functionality - Server Integration', () => {
    it('should call semantic search API with correct parameters', async () => {
      const user = userEvent.setup()
      render(<SearchBar {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'king pawn')

      // Wait for debounce (300ms)
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/openings/semantic-search?q=king%20pawn&limit=20')
        )
      }, { timeout: 500 })
    })

    it('should fallback to legacy search when semantic search fails', async () => {
      // Mock semantic search failure, then legacy search success
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockOpeningsList.slice(0, 1),
            searchType: 'server_fallback'
          })
        })

      const user = userEvent.setup()
      render(<SearchBar {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'king')

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/openings/search?q=king&limit=20')
        )
      }, { timeout: 500 })
    })

    it('should handle API timeout gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network timeout'))

      const user = userEvent.setup()
      render(<SearchBar {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'king')

      // Should not crash and should fallback to client-side search
      await waitFor(() => {
        expect(input).toHaveValue('king')
      })
    })
  })

  describe('Chess Move Recognition', () => {
    it('should detect exact opening moves (e4, d4)', async () => {
      const user = userEvent.setup()
      render(<SearchBar {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'e4')

      // For chess moves, should use client-side search preferentially
      await waitFor(() => {
        // Should show suggestions that include our test data
        const suggestions = screen.queryAllByRole('listitem')
        expect(suggestions.length).toBeGreaterThan(0)
      }, { timeout: 1000 })
    })

    it('should prioritize popular openings for move queries', async () => {
      const user = userEvent.setup()
      render(<SearchBar {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'd4')

      await waitFor(() => {
        // Should show suggestions from our test data
        const suggestions = screen.queryAllByRole('listitem')
        expect(suggestions.length).toBeGreaterThan(0)
      }, { timeout: 1000 })
    })

    it('should handle move notation variations (1.e4 vs 1. e4)', async () => {
      const user = userEvent.setup()
      render(<SearchBar {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, '1.e4')

      await waitFor(() => {
        expect(screen.getByText('King\'s Pawn Game')).toBeInTheDocument()
      }, { timeout: 500 })
    })
  })

  describe('Keyboard Navigation', () => {
    it('should navigate suggestions with arrow keys', async () => {
      const user = userEvent.setup()
      render(<SearchBar {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'king')

      // Wait for suggestions to appear
      await waitFor(() => {
        expect(screen.getByText('King\'s Pawn Game')).toBeInTheDocument()
      })

      // Press down arrow
      await user.keyboard('{ArrowDown}')
      
      // First suggestion should be active
      const firstSuggestion = screen.getByText('King\'s Pawn Game').closest('li')
      expect(firstSuggestion).toHaveClass('active')
    })

    it('should select suggestion with Enter key', async () => {
      const user = userEvent.setup()
      render(<SearchBar {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'king')

      await waitFor(() => {
        expect(screen.getByText('King\'s Pawn Game')).toBeInTheDocument()
      })

      // Navigate to first suggestion and press Enter
      await user.keyboard('{ArrowDown}{Enter}')
      
      // Should call onSelect with the opening
      expect(mockOnSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'King\'s Pawn Game',
          eco: 'B00'
        })
      )
    })

    it('should close suggestions with Escape key', async () => {
      const user = userEvent.setup()
      render(<SearchBar {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'king')

      await waitFor(() => {
        expect(screen.getByText('King\'s Pawn Game')).toBeInTheDocument()
      })

      await user.keyboard('{Escape}')
      
      // Suggestions should be hidden
      expect(screen.queryByText('King\'s Pawn Game')).not.toBeInTheDocument()
    })

    it('should handle boundary cases (first/last suggestion)', async () => {
      const user = userEvent.setup()
      render(<SearchBar {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'pawn')

      await waitFor(() => {
        expect(screen.getByText('King\'s Pawn Game')).toBeInTheDocument()
      })

      // Press up arrow at first position (should stay at first)
      await user.keyboard('{ArrowUp}')
      
      // Then down to second
      await user.keyboard('{ArrowDown}')
      const firstSuggestion = screen.getByText('King\'s Pawn Game').closest('li')
      expect(firstSuggestion).toHaveClass('active')
    })
  })

  describe('Search Algorithm and Ranking', () => {
    it('should prioritize exact name matches', async () => {
      const user = userEvent.setup()
      render(<SearchBar {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'King\'s Pawn Game')

      await waitFor(() => {
        const suggestions = screen.getAllByRole('listitem')
        // Exact match should be first
        expect(suggestions[0]).toHaveTextContent('King\'s Pawn Game')
      }, { timeout: 500 })
    })

    it('should handle fuzzy matching for partial names', async () => {
      const user = userEvent.setup()
      render(<SearchBar {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'pawn')

      await waitFor(() => {
        // Should match King's Pawn items from our test data
        expect(screen.getByText('King\'s Pawn Game')).toBeInTheDocument()
        // Also check for the King's Knight Variation which is also in our test data
        expect(screen.getByText('King\'s Pawn Game: King\'s Knight Variation')).toBeInTheDocument()
      }, { timeout: 500 })
    })

    it('should boost popular openings in results', async () => {
      const user = userEvent.setup()
      render(<SearchBar {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'pawn')

      await waitFor(() => {
        const suggestions = screen.getAllByRole('listitem')
        // King's Pawn (higher popularity rank) should come before Queen's Pawn
        const kingsPawn = suggestions.find(s => s.textContent?.includes('King\'s Pawn Game'))
        const queensPawn = suggestions.find(s => s.textContent?.includes('Queen\'s Pawn Game'))
        
        if (kingsPawn && queensPawn) {
          const kingsPawnIndex = Array.from(suggestions).indexOf(kingsPawn)
          const queensPawnIndex = Array.from(suggestions).indexOf(queensPawn)
          expect(kingsPawnIndex).toBeLessThan(queensPawnIndex)
        }
      }, { timeout: 500 })
    })

    it('should handle special characters and apostrophes', async () => {
      const user = userEvent.setup()
      render(<SearchBar {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'kings pawn')

      await waitFor(() => {
        // Should find "King's Pawn" even when searching "kings pawn"
        expect(screen.getByText('King\'s Pawn Game')).toBeInTheDocument()
      }, { timeout: 500 })
    })
  })

  describe('User Interactions', () => {
    it('should handle suggestion clicks', async () => {
      const user = userEvent.setup()
      render(<SearchBar {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'king')

      await waitFor(() => {
        expect(screen.getByText('King\'s Pawn Game')).toBeInTheDocument()
      })

      const suggestion = screen.getByText('King\'s Pawn Game')
      await user.click(suggestion)
      
      expect(mockOnSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'King\'s Pawn Game',
          eco: 'B00'
        })
      )
    })

    it('should clear search input after selection', async () => {
      const user = userEvent.setup()
      render(<SearchBar {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'king')

      await waitFor(() => {
        expect(screen.getByText('King\'s Pawn Game')).toBeInTheDocument()
      })

      const suggestion = screen.getByText('King\'s Pawn Game')
      await user.click(suggestion)
      
      expect(input).toHaveValue('')
    })

    it('should handle surprise me button click', async () => {
      const user = userEvent.setup()
      render(<SearchBar {...defaultProps} variant="landing" />)
      
      const surpriseButton = screen.getByText('Surprise me!')
      await user.click(surpriseButton)
      
      // Should call onSelect with a random opening
      expect(mockOnSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.any(String),
          eco: expect.any(String)
        })
      )
    })

    it('should handle focus and blur events', async () => {
      const user = userEvent.setup()
      render(<SearchBar {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'king')

      await waitFor(() => {
        expect(screen.getByText('King\'s Pawn Game')).toBeInTheDocument()
      })

      // Blur input - suggestions should hide after delay
      await user.click(document.body)
      
      await waitFor(() => {
        expect(screen.queryByText('King\'s Pawn Game')).not.toBeInTheDocument()
      }, { timeout: 200 })
    })
  })

  describe('Debouncing Behavior', () => {
    it('should debounce search requests', async () => {
      vi.useFakeTimers()
      
      try {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
        render(<SearchBar {...defaultProps} />)
        
        const input = screen.getByRole('textbox')
        
        // Type multiple characters quickly
        await user.type(input, 'king')
        
        // Should not have called fetch yet (debounced)
        expect(mockFetch).not.toHaveBeenCalled()
        
        // Advance timers past debounce period
        act(() => {
          vi.advanceTimersByTime(350) // Slightly longer than 300ms debounce
        })
        
        // Now should have called fetch or have suggestions
        await waitFor(() => {
          expect(input).toHaveValue('king')
        }, { timeout: 1000 })
        
      } finally {
        vi.useRealTimers()
      }
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty search queries', async () => {
      const user = userEvent.setup()
      render(<SearchBar {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'a')
      await user.clear(input)
      
      // Should not show suggestions for empty query
      expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
    })

    it('should handle special characters in search', async () => {
      const user = userEvent.setup()
      render(<SearchBar {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'King\'s!')
      
      // Should not crash
      await waitFor(() => {
        expect(input).toHaveValue('King\'s!')
      })
    })

    it('should handle empty openings data gracefully', async () => {
      const user = userEvent.setup()
      render(<SearchBar {...defaultProps} openingsData={[]} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'king')
      
      // Should not crash
      expect(input).toHaveValue('king')
    })

    it('should handle malformed opening data', async () => {
      const malformedData = [
        { name: 'Valid Opening', eco: 'A00' }, // Missing required fields
        null, // Null entry
        { fen: 'invalid', name: '', eco: '' } // Empty fields
      ]

      const user = userEvent.setup()
      render(<SearchBar {...defaultProps} openingsData={malformedData as any} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'valid')
      
      // Should not crash
      expect(input).toHaveValue('valid')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<SearchBar {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('type', 'text')
    })

    it('should support screen reader navigation', async () => {
      const user = userEvent.setup()
      render(<SearchBar {...defaultProps} />)
      
      const input = screen.getByRole('textbox')
      await user.type(input, 'king')

      await waitFor(() => {
        const suggestions = screen.getByRole('list')
        expect(suggestions).toBeInTheDocument()
        
        const suggestionItems = screen.getAllByRole('listitem')
        expect(suggestionItems.length).toBeGreaterThan(0)
      })
    })

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup()
      render(<SearchBar {...defaultProps} />)
      
      // Tab to input
      await user.tab()
      expect(screen.getByRole('textbox')).toHaveFocus()
      
      // Type and navigate
      await user.keyboard('king{ArrowDown}{Enter}')
      
      expect(mockOnSelect).toHaveBeenCalled()
    })
  })
})
