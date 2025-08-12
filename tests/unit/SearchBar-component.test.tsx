/**
 * @fileoverview SearchBar Component Tests
 * Tests the core search functionality including autocomplete, keyboard navigation, and API integration
 */

const React = require('react')
const { render, screen, fireEvent, waitFor } = require('@testing-library/react')
const { BrowserRouter } = require('react-router-dom')

// Import SearchBar component
const SearchBar = require('../../packages/web/src/components/shared/SearchBar').default

// Mock opening data
const mockOpenings = [
  {
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    name: 'King\'s Pawn Game',
    eco: 'B00',
    moves: '1.e4',
    src: 'test'
  },
  {
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
    name: 'King\'s Pawn Game: King\'s Knight Variation',
    eco: 'C20',
    moves: '1.e4 e5',
    src: 'test'
  }
]

const renderSearchBar = (props = {}) => {
  const defaultProps = {
    openingsData: mockOpenings,
    onSelect: jest.fn(),
    ...props
  }

  return render(
    React.createElement(BrowserRouter, {},
      React.createElement(SearchBar, defaultProps)
    )
  )
}

describe('SearchBar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render search input with placeholder', () => {
      renderSearchBar()
      
      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('placeholder', 'Search openings...')
    })

    it('should render search icon', () => {
      renderSearchBar()
      
      expect(screen.getByTestId('search-icon')).toBeInTheDocument()
    })

    it('should not show suggestions initially', () => {
      renderSearchBar()
      
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })
  })

  describe('Search Functionality', () => {
    it('should show suggestions when typing', async () => {
      renderSearchBar()
      
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'King' } })
      
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })
      
      expect(screen.getByText('King\'s Pawn Game')).toBeInTheDocument()
    })

    it('should filter suggestions based on input', async () => {
      renderSearchBar()
      
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'Knight' } })
      
      await waitFor(() => {
        expect(screen.getByText('King\'s Pawn Game: King\'s Knight Variation')).toBeInTheDocument()
      })
      
      expect(screen.queryByText('King\'s Pawn Game')).not.toBeInTheDocument()
    })

    it('should hide suggestions when input is cleared', async () => {
      renderSearchBar()
      
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'King' } })
      
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })
      
      fireEvent.change(input, { target: { value: '' } })
      
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      })
    })

    it('should show "No results found" when no matches', async () => {
      renderSearchBar()
      
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'xyz123' } })
      
      await waitFor(() => {
        expect(screen.getByText('No results found')).toBeInTheDocument()
      })
    })
  })

  describe('Keyboard Navigation', () => {
    it('should navigate down with arrow key', async () => {
      renderSearchBar()
      
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'King' } })
      
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })
      
      fireEvent.keyDown(input, { key: 'ArrowDown' })
      
      const firstOption = screen.getByRole('option', { name: /King's Pawn Game/ })
      expect(firstOption).toHaveClass('highlighted')
    })

    it('should select option with Enter key', async () => {
      const mockOnSelect = vi.fn()
      renderSearchBar({ onSelect: mockOnSelect })
      
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'King' } })
      
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })
      
      fireEvent.keyDown(input, { key: 'ArrowDown' })
      fireEvent.keyDown(input, { key: 'Enter' })
      
      expect(mockOnSelect).toHaveBeenCalledWith(mockOpenings[0])
    })

    it('should close suggestions with Escape key', async () => {
      renderSearchBar()
      
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'King' } })
      
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })
      
      fireEvent.keyDown(input, { key: 'Escape' })
      
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      })
    })
  })

  describe('Mouse Interactions', () => {
    it('should select option when clicked', async () => {
      const mockOnSelect = vi.fn()
      renderSearchBar({ onSelect: mockOnSelect })
      
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'King' } })
      
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })
      
      const option = screen.getByRole('option', { name: /King's Pawn Game/ })
      fireEvent.click(option)
      
      expect(mockOnSelect).toHaveBeenCalledWith(mockOpenings[0])
    })

    it('should highlight option on hover', async () => {
      renderSearchBar()
      
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'King' } })
      
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })
      
      const option = screen.getByRole('option', { name: /King's Pawn Game/ })
      fireEvent.mouseEnter(option)
      
      expect(option).toHaveClass('highlighted')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty openingsData gracefully', () => {
      renderSearchBar({ openingsData: [] })
      
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'test' } })
      
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })

    it('should handle null openingsData gracefully', () => {
      renderSearchBar({ openingsData: null })
      
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'test' } })
      
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })

    it('should debounce search input', async () => {
      renderSearchBar()
      
      const input = screen.getByRole('textbox')
      
      // Type multiple characters quickly
      fireEvent.change(input, { target: { value: 'K' } })
      fireEvent.change(input, { target: { value: 'Ki' } })
      fireEvent.change(input, { target: { value: 'Kin' } })
      fireEvent.change(input, { target: { value: 'King' } })
      
      // Should only show suggestions after debounce
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      }, { timeout: 1000 })
    })
  })
})
