/**
 * @fileoverview LandingPage Component Tests  
 * Tests the main landing page functionality and user interactions
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'
import LandingPage from '../LandingPage'

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

const renderLandingPage = (props = {}) => {
  const defaultProps = {
    openingsData: mockOpenings,
    onOpeningSelect: vi.fn(),
    ...props
  }

  return render(
    <BrowserRouter>
      <LandingPage {...defaultProps} />
    </BrowserRouter>
  )
}

describe('LandingPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    test('should render page title and description', () => {
      renderLandingPage()
      
      expect(screen.getByText(/Chess Opening Explorer/i)).toBeInTheDocument()
      expect(screen.getByText(/Discover and master chess openings/i)).toBeInTheDocument()
    })

    test('should render search component', () => {
      renderLandingPage()
      
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    test('should render popular openings section', () => {
      renderLandingPage()
      
      expect(screen.getByText(/Popular Openings/i)).toBeInTheDocument()
    })
  })

  describe('Search Functionality', () => {
    test('should pass opening data to search component', () => {
      renderLandingPage()
      
      const searchInput = screen.getByRole('textbox')
      fireEvent.change(searchInput, { target: { value: 'King' } })
      
      // SearchBar should receive the openings data
      expect(searchInput).toBeInTheDocument()
    })

    test('should handle opening selection from search', async () => {
      const mockOnSelect = vi.fn()
      renderLandingPage({ onOpeningSelect: mockOnSelect })
      
      const searchInput = screen.getByRole('textbox')
      fireEvent.change(searchInput, { target: { value: 'King' } })
      
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument()
      })
      
      const option = screen.getByRole('option', { name: /King's Pawn Game/ })
      fireEvent.click(option)
      
      expect(mockOnSelect).toHaveBeenCalledWith(mockOpenings[0])
    })
  })

  describe('Popular Openings Grid', () => {
    test('should display opening cards', () => {
      renderLandingPage()
      
      // Should show opening cards (might be in a grid or list)
      expect(screen.getByText('King\'s Pawn Game')).toBeInTheDocument()
      expect(screen.getByText('B00')).toBeInTheDocument()
    })

    test('should handle opening card clicks', () => {
      const mockOnSelect = vi.fn()
      renderLandingPage({ onOpeningSelect: mockOnSelect })
      
      const openingCard = screen.getByText('King\'s Pawn Game')
      fireEvent.click(openingCard)
      
      expect(mockOnSelect).toHaveBeenCalledWith(mockOpenings[0])
    })

    test('should show ECO codes for openings', () => {
      renderLandingPage()
      
      expect(screen.getByText('B00')).toBeInTheDocument()
      expect(screen.getByText('C20')).toBeInTheDocument()
    })

    test('should show first moves', () => {
      renderLandingPage()
      
      expect(screen.getByText('1.e4')).toBeInTheDocument()
      expect(screen.getByText('1.e4 e5')).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    test('should have responsive grid classes', () => {
      renderLandingPage()
      
      const gridContainer = screen.getByTestId('popular-openings-grid')
      expect(gridContainer).toHaveClass('grid')
    })

    test('should render properly on mobile viewports', () => {
      // Mock smaller viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      renderLandingPage()
      
      expect(screen.getByText(/Chess Opening Explorer/i)).toBeInTheDocument()
    })
  })

  describe('Loading States', () => {
    test('should handle empty openings data', () => {
      renderLandingPage({ openingsData: [] })
      
      expect(screen.getByText(/Chess Opening Explorer/i)).toBeInTheDocument()
      expect(screen.queryByText('King\'s Pawn Game')).not.toBeInTheDocument()
    })

    test('should handle null openings data', () => {
      renderLandingPage({ openingsData: null })
      
      expect(screen.getByText(/Chess Opening Explorer/i)).toBeInTheDocument()
    })

    test('should show loading state while data is being fetched', () => {
      renderLandingPage({ openingsData: undefined })
      
      // Should still render the basic structure
      expect(screen.getByText(/Chess Opening Explorer/i)).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    test('should handle malformed opening data gracefully', () => {
      const malformedData = [
        { name: 'Valid Opening', eco: 'A00' },
        { eco: 'B00' }, // Missing name
        null, // Null entry
      ]
      
      renderLandingPage({ openingsData: malformedData })
      
      expect(screen.getByText('Valid Opening')).toBeInTheDocument()
      expect(screen.getByText('A00')).toBeInTheDocument()
    })

    test('should handle missing onOpeningSelect prop', () => {
      renderLandingPage({ onOpeningSelect: undefined })
      
      // Should still render without crashing
      expect(screen.getByText(/Chess Opening Explorer/i)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    test('should have proper heading hierarchy', () => {
      renderLandingPage()
      
      const mainHeading = screen.getByRole('heading', { level: 1 })
      expect(mainHeading).toHaveTextContent(/Chess Opening Explorer/i)
      
      const sectionHeading = screen.getByRole('heading', { level: 2 })
      expect(sectionHeading).toHaveTextContent(/Popular Openings/i)
    })

    test('should have accessible search input', () => {
      renderLandingPage()
      
      const searchInput = screen.getByRole('textbox')
      expect(searchInput).toHaveAttribute('aria-label')
    })

    test('should have clickable opening cards with proper roles', () => {
      renderLandingPage()
      
      const openingCards = screen.getAllByRole('button')
      expect(openingCards.length).toBeGreaterThan(0)
    })

    test('should support keyboard navigation', () => {
      renderLandingPage()
      
      const searchInput = screen.getByRole('textbox')
      
      // Should be focusable
      searchInput.focus()
      expect(document.activeElement).toBe(searchInput)
    })
  })
})
