/**
 * Simplified Integration tests for LineTypePill functionality
 * Tests the complete flow from API to frontend component
 */

import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BrowserRouter } from 'react-router-dom'
import OpeningDetailPage from '../pages/OpeningDetailPage'

// Mock fetch globally
global.fetch = vi.fn()

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

const mockMainlineResponse = {
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

describe('LineTypePill Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock all API calls that the OpeningDetailPage makes
    ;(global.fetch as any).mockImplementation((url: string) => {
      // Mock the all openings API for SearchBar
      if (url.includes('/api/openings/all')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: [mockMainlineResponse]
          })
        })
      }
      
      // Mock the specific opening API
      if (url.includes('/api/openings/fen/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: mockMainlineResponse
          })
        })
      }
      
      // Mock other API calls (stats, videos, etc.) to prevent errors
      return Promise.resolve({
        ok: true,
        json: async () => ({
          success: true,
          data: {}
        })
      })
    })
  })

  describe('Basic Functionality', () => {
    it('should display "Mainline" pill for ECO root opening', async () => {
      renderWithRouter(<OpeningDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Sicilian Defense')).toBeInTheDocument()
      }, { timeout: 5000 })

      // Check that the LineTypePill shows "Mainline"
      expect(screen.getByText('Mainline')).toBeInTheDocument()
      expect(screen.queryByText('Variation')).not.toBeInTheDocument()
    })

    it('should have correct tooltip for mainline opening', async () => {
      renderWithRouter(<OpeningDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Mainline')).toBeInTheDocument()
      }, { timeout: 5000 })

      const mainlinePill = screen.getByText('Mainline')
      expect(mainlinePill).toHaveAttribute('title', 'ECO root line (canonical main reference)')
    })

    it('should apply correct CSS classes', async () => {
      renderWithRouter(<OpeningDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Mainline')).toBeInTheDocument()
      }, { timeout: 5000 })

      const mainlinePill = screen.getByText('Mainline')
      expect(mainlinePill).toHaveClass('style-pill')
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      // Override mock to simulate API error
      ;(global.fetch as any).mockImplementation(() => {
        throw new Error('API Error')
      })

      renderWithRouter(<OpeningDetailPage />)

      await waitFor(() => {
        expect(screen.getByText('Opening not found')).toBeInTheDocument()
      }, { timeout: 5000 })
    })
  })
})
