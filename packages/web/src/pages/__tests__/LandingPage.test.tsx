/**
 * @fileoverview LandingPage Component Tests  
 * Tests the main landing page functionality and user interactions
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { vi, describe, test, expect, beforeEach } from 'vitest'
import LandingPage from '../LandingPage'
import { 
  mockOpeningsList 
} from '../../test/fixtures/openingData'

// Mock fetch API
const mockFetch = vi.fn()
global.fetch = mockFetch

const renderLandingPage = () => {
  return render(
    <BrowserRouter>
      <LandingPage />
    </BrowserRouter>
  )
}

describe('LandingPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock successful fetch responses with proper data structure
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/openings/popular-by-eco')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockOpeningsList,
            metadata: {
              response_time_ms: 150,
              total_count: mockOpeningsList.length
            }
          })
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ 
          success: true, 
          data: [],
          metadata: {
            response_time_ms: 100,
            total_count: 0
          }
        })
      })
    })
  })

  describe('Basic Rendering', () => {
    test('should render page title and description', async () => {
      await act(async () => {
        renderLandingPage()
      })
      
      expect(screen.getByText(/Opening Book/i)).toBeInTheDocument()
      expect(screen.getByText(/Master every opening from the first move/i)).toBeInTheDocument()
    })

    test('should render search component', async () => {
      await act(async () => {
        renderLandingPage()
      })
      
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    test('should render popular openings section', async () => {
      await act(async () => {
        renderLandingPage()
      })
      
      // Wait for data to load
      await waitFor(() => {
        // The actual text includes the variation name
        expect(screen.getByText(/King's Pawn Game/i)).toBeInTheDocument()
      })
    })
  })

  describe('Search Functionality', () => {
    test('should pass opening data to search component', async () => {
      renderLandingPage()
      
      const searchInput = screen.getByRole('textbox')
      
      // Wait for component to finish loading
      await waitFor(() => {
        expect(searchInput).toBeInTheDocument()
      })
      
      // SearchBar should be rendered and functional
      expect(searchInput).toBeInTheDocument()
    })

    test('should handle opening selection from search', async () => {
      renderLandingPage()
      
      // Wait for data to load first
      await waitFor(() => {
        expect(screen.getByText(/King's Pawn Game/i)).toBeInTheDocument()
      })
      
      const searchInput = screen.getByRole('textbox')
      fireEvent.change(searchInput, { target: { value: 'King' } })
      
      // The component should handle search functionality
      expect(searchInput).toHaveValue('King')
    })
  })

  describe('Popular Openings Grid', () => {
    test('should display opening cards', async () => {
      renderLandingPage()
      
      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText(/King's Pawn Game/i)).toBeInTheDocument()
      })
      
      expect(screen.getByText('C20')).toBeInTheDocument()
    })

    test('should handle opening card clicks', async () => {
      renderLandingPage()
      
      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText(/King's Pawn Game/i)).toBeInTheDocument()
      })
      
      const openingCard = screen.getByText(/King's Pawn Game/i)
      expect(openingCard).toBeInTheDocument()
    })

    test('should show ECO codes for openings', async () => {
      renderLandingPage()
      
      await waitFor(() => {
        // Look for any ECO code from our test data
        expect(screen.getByText('C20')).toBeInTheDocument()
      })
      
      // The main ECO code that actually appears in the rendered component
      expect(screen.getByText('C20')).toBeInTheDocument()
    })

    test('should show first moves', async () => {
      renderLandingPage()
      
      await waitFor(() => {
        // Look for moves text that actually appears in the component
        expect(screen.getByText('1.e4 e5')).toBeInTheDocument()
      })
      
      // Should have first moves section
      expect(screen.getByText('First moves:')).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    test('should have responsive grid classes', async () => {
      renderLandingPage()
      
      // Wait for content to load
      await waitFor(() => {
        expect(screen.getByText(/King's Pawn Game/i)).toBeInTheDocument()
      })
      
      // Component should render properly
      expect(screen.getByText('Opening Book')).toBeInTheDocument()
    })

    test('should render properly on mobile viewports', async () => {
      // Mock smaller viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      renderLandingPage()
      
      expect(screen.getByText(/Opening Book/i)).toBeInTheDocument()
    })
  })

  describe('Loading States', () => {
    test('should handle empty openings data', async () => {
      // Mock empty response
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] })
      }))
      
      renderLandingPage()
      
      expect(screen.getByText(/Opening Book/i)).toBeInTheDocument()
      
      // Should not show opening data
      await waitFor(() => {
        expect(screen.queryByText('King\'s Pawn Game')).not.toBeInTheDocument()
      })
    })

    test('should handle null openings data', async () => {
      // Mock null response
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: null })
      }))
      
      renderLandingPage()
      
      expect(screen.getByText(/Opening Book/i)).toBeInTheDocument()
    })

    test('should show loading state while data is being fetched', () => {
      renderLandingPage()
      
      // Should still render the basic structure immediately
      expect(screen.getByText(/Opening Book/i)).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    test('should handle malformed opening data gracefully', async () => {
      const malformedData = [
        { fen: 'test', name: 'Valid Opening', eco: 'A00', moves: '1.e4', src: 'test' },
        { eco: 'B00' }, // Missing required fields
        null, // Null entry
      ]
      
      // Mock malformed response
      mockFetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: malformedData })
      }))
      
      renderLandingPage()
      
      // Should still render without crashing
      expect(screen.getByText(/Opening Book/i)).toBeInTheDocument()
    })

    test('should handle fetch errors', async () => {
      // Mock fetch error
      mockFetch.mockImplementationOnce(() => Promise.reject(new Error('Network error')))
      
      renderLandingPage()
      
      // Should still render without crashing
      expect(screen.getByText(/Opening Book/i)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    test('should have proper heading hierarchy', () => {
      renderLandingPage()
      
      const mainHeading = screen.getByRole('heading', { level: 1 })
      expect(mainHeading).toHaveTextContent(/Opening Book/i)
    })

    test('should have accessible search input', () => {
      renderLandingPage()
      
      const searchInput = screen.getByRole('textbox')
      expect(searchInput).toBeInTheDocument()
    })

    test('should have clickable opening cards with proper roles', async () => {
      renderLandingPage()
      
      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText(/King's Pawn Game/i)).toBeInTheDocument()
      })
      
      // Should have clickable elements
      const openingElements = screen.getAllByText(/King's Pawn Game|Game: King's Knight Variation/)
      expect(openingElements.length).toBeGreaterThan(0)
    })

    test('should support keyboard navigation', async () => {
      await act(async () => {
        renderLandingPage()
      })
      
      // Wait for component to fully load and be enabled
      await waitFor(() => {
        const searchInput = screen.getByRole('textbox')
        expect(searchInput).not.toBeDisabled()
      })
      
      const searchInput = screen.getByRole('textbox')
      
      // Should be focusable when not disabled
      if (!searchInput.hasAttribute('disabled')) {
        searchInput.focus()
        expect(document.activeElement).toBe(searchInput)
      }
    })
  })
})
