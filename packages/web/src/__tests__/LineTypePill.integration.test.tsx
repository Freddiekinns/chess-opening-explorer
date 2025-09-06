/**
 * Integration tests for LineTypePill functionality
 * Tests the complete flow from API to frontend component
 */

import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import OpeningDetailPage from '../pages/OpeningDetailPage'

// Mock the API service
interface MockApiResponse {
  name: string
  eco: string
  fen: string
  moves: string
  isEcoRoot?: boolean | null
  description: string
  complexity: string
  style_tags: string[]
  tactical_tags: string[]
  positional_tags: string[]
  strategic_themes: string[]
  common_plans: string[]
  aliases: string[]
  src: string
  scid: string
}

const mockApiResponse: MockApiResponse = {
  name: 'Sicilian Defense',
  eco: 'B20',
  fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2',
  moves: '1.e4 c5',
  isEcoRoot: true,
  description: 'The most popular chess opening',
  complexity: 'Intermediate',
  style_tags: ['Sharp', 'Tactical'],
  tactical_tags: [],
  positional_tags: [],
  strategic_themes: [],
  common_plans: [],
  aliases: [],
  src: 'test',
  scid: ''
}

const mockVariationResponse: MockApiResponse = {
  ...mockApiResponse,
  name: 'Sicilian Defense: Alapin Variation',
  eco: 'B22',
  moves: '1.e4 c5 2.c3',
  isEcoRoot: false
}

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock useParams to return a test FEN
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({
      fen: encodeURIComponent('rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2')
    })
  }
})

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  )
}

describe('LineTypePill Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock all API calls that the OpeningDetailPage makes
    mockFetch.mockImplementation((url: string) => {
      console.log('Mocked fetch call to:', url)
      
      // Mock the all openings API for SearchBar
      if (url.includes('/api/openings/all')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: [mockApiResponse, mockVariationResponse]
          })
        })
      }
      
      // Mock the specific opening API
      if (url.includes('/api/openings/fen/')) {
        // Extract FEN from URL to determine which response to return
        const encodedFen = url.split('/api/openings/fen/')[1]
        const fen = decodeURIComponent(encodedFen)
        
        if (fen.includes('c5')) { // Sicilian Defense FEN
          const responseData = url.includes('test-variation') ? mockVariationResponse : mockApiResponse
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              data: responseData
            })
          })
        }
      }
      
      // Mock other API calls (stats, videos, etc.) to prevent errors
      if (url.includes('/api/stats/') || url.includes('/api/videos/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {}
          })
        })
      }
      
      // Default fallback
      return Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({
          success: false,
          error: 'Not found'
        })
      })
    })
  })

  describe('Mainline Opening Display', () => {
    it('should display "Mainline" pill for ECO root opening', async () => {
      // Mock API response for mainline opening
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockApiResponse
        })
      })

      renderWithRouter(<OpeningDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Sicilian Defense')).toBeInTheDocument()
      })

      // Check that the LineTypePill shows "Mainline"
      expect(screen.getByText('Mainline')).toBeInTheDocument()
      expect(screen.queryByText('Variation')).not.toBeInTheDocument()
    })

    it('should have correct tooltip for mainline opening', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockApiResponse
        })
      })

      renderWithRouter(<OpeningDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Mainline')).toBeInTheDocument()
      })

      const mainlinePill = screen.getByText('Mainline')
      expect(mainlinePill).toHaveAttribute('title', 'ECO root line (canonical main reference)')
    })
  })

  describe('Variation Opening Display', () => {
    it('should display "Variation" pill for non-ECO root opening', async () => {
      // Mock API response for variation opening
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockVariationResponse
        })
      })

      renderWithRouter(<OpeningDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Sicilian Defense: Alapin Variation')).toBeInTheDocument()
      })

      // Check that the LineTypePill shows "Variation"
      expect(screen.getByText('Variation')).toBeInTheDocument()
      expect(screen.queryByText('Mainline')).not.toBeInTheDocument()
    })

    it('should have correct tooltip for variation opening', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockVariationResponse
        })
      })

      renderWithRouter(<OpeningDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Variation')).toBeInTheDocument()
      })

      const variationPill = screen.getByText('Variation')
      expect(variationPill).toHaveAttribute('title', 'Derived variation of a mainline')
    })
  })

  describe('Missing isEcoRoot Field Handling', () => {
    it('should default to "Variation" when isEcoRoot field is missing', async () => {
      // Mock API response without isEcoRoot field
      const responseData = {
        name: 'Sicilian Defense',
        eco: 'B20',
        fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2',
        moves: '1.e4 c5',
        description: 'The most popular chess opening',
        complexity: 'Intermediate',
        style_tags: ['Sharp', 'Tactical'],
        tactical_tags: [],
        positional_tags: [],
        strategic_themes: [],
        common_plans: [],
        aliases: [],
        src: 'test',
        scid: ''
        // Note: no isEcoRoot field
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: responseData
        })
      })

      renderWithRouter(<OpeningDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Sicilian Defense')).toBeInTheDocument()
      })

      // Should default to "Variation" when isEcoRoot is missing
      expect(screen.getByText('Variation')).toBeInTheDocument()
      expect(screen.queryByText('Mainline')).not.toBeInTheDocument()
    })

    it('should handle null isEcoRoot value', async () => {
      // Mock API response with null isEcoRoot
      const responseData = {
        name: 'Sicilian Defense',
        eco: 'B20',
        fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2',
        moves: '1.e4 c5',
        isEcoRoot: null,
        description: 'The most popular chess opening',
        complexity: 'Intermediate',
        style_tags: ['Sharp', 'Tactical'],
        tactical_tags: [],
        positional_tags: [],
        strategic_themes: [],
        common_plans: [],
        aliases: [],
        src: 'test',
        scid: ''
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: responseData
        })
      })

      renderWithRouter(<OpeningDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Sicilian Defense')).toBeInTheDocument()
      })

      // Should show "Variation" for null value
      expect(screen.getByText('Variation')).toBeInTheDocument()
      expect(screen.queryByText('Mainline')).not.toBeInTheDocument()
    })
  })

  describe('API Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      // Mock API error
      mockFetch.mockRejectedValueOnce(new Error('API Error'))

      renderWithRouter(<OpeningDetailPage />)

      await waitFor(() => {
        // Should show error state, not the pills
        expect(screen.queryByText('Mainline')).not.toBeInTheDocument()
        expect(screen.queryByText('Variation')).not.toBeInTheDocument()
      })
    })

    it('should handle 404 responses gracefully', async () => {
      // Mock 404 response
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Opening not found' })
      })

      renderWithRouter(<OpeningDetailPage />)

      await waitFor(() => {
        // Should show error state, not the pills
        expect(screen.queryByText('Mainline')).not.toBeInTheDocument()
        expect(screen.queryByText('Variation')).not.toBeInTheDocument()
      })
    })
  })

  describe('Pill Visual Consistency', () => {
    it('should apply same CSS classes as other pills', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockApiResponse
        })
      })

      renderWithRouter(<OpeningDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Mainline')).toBeInTheDocument()
      })

      const mainlinePill = screen.getByText('Mainline')
      const ecoPill = screen.getByText('B20')

      // Both pills should have the correct CSS classes
      expect(mainlinePill).toHaveClass('style-pill')
      expect(ecoPill).toHaveClass('eco-pill')
    })
  })
})
