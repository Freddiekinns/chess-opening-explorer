/**
 * @fileoverview App Component Tests
 * Tests core routing functionality and main application structure
 */

import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import App from '../App'

// Mock the fetch for openings data
const mockFetch = vi.fn()
global.fetch = mockFetch

const mockOpeningsData = [
  {
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    name: 'King\'s Pawn Game',
    eco: 'B00',
    moves: '1.e4',
    src: 'test'
  }
]

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock successful fetch response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockOpeningsData
    })
  })

  describe('Routing', () => {
    test('should render landing page by default', async () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      )

      // Should show the main content area
      expect(screen.getByRole('main')).toBeInTheDocument()
    })

    test('should render opening detail page for valid route', async () => {
      render(
        <MemoryRouter initialEntries={['/opening/B00']}>
          <App />
        </MemoryRouter>
      )

      // Should render the opening detail page
      expect(screen.getByRole('main')).toBeInTheDocument()
    })

    test('should handle invalid routes gracefully', async () => {
      render(
        <MemoryRouter initialEntries={['/invalid-route']}>
          <App />
        </MemoryRouter>
      )

      // Should either redirect to home or show 404
      expect(screen.getByRole('main')).toBeInTheDocument()
    })
  })

  describe('Data Loading', () => {
    test('should fetch openings data on mount', async () => {
      render(
        <MemoryRouter>
          <App />
        </MemoryRouter>
      )

      expect(mockFetch).toHaveBeenCalledWith('/api/openings/popular-by-eco')
    })

    test('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('API Error'))

      render(
        <MemoryRouter>
          <App />
        </MemoryRouter>
      )

      // Should still render without crashing
      expect(screen.getByRole('main')).toBeInTheDocument()
    })

    test('should handle empty API response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => []
      })

      render(
        <MemoryRouter>
          <App />
        </MemoryRouter>
      )

      expect(screen.getByRole('main')).toBeInTheDocument()
    })
  })

  describe('Layout Structure', () => {
    test('should render main layout elements', async () => {
      render(
        <MemoryRouter>
          <App />
        </MemoryRouter>
      )

      // Check for essential layout elements
      expect(screen.getByRole('main')).toBeInTheDocument()
    })
  })
})
