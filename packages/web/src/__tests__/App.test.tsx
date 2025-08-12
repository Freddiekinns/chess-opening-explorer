/**
 * @fileoverview App Component Tests
 * Tests core routing functionality and main application structure
 */

import { render, screen, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, test, expect, beforeEach } from 'vitest'
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
    
    // Mock successful fetch response with proper metadata
    mockFetch.mockImplementation(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: mockOpeningsData,
        metadata: {
          response_time_ms: 150,
          total_count: mockOpeningsData.length,
          page: 1,
          limit: 20
        }
      })
    }))
  })

  describe('Routing', () => {
    test('should render landing page by default', async () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      )

      // Should show the app content
      await waitFor(() => {
        expect(screen.getByText(/Opening Book/i)).toBeInTheDocument()
      })
    })

    test('should render opening detail page for valid route', async () => {
      // Mock specific API endpoint for opening detail page
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/openings/fen/')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: {
                fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
                name: 'King\'s Pawn Game',
                eco: 'B00',
                moves: '1.e4',
                src: 'test'
              }
            })
          })
        }
        if (url.includes('/api/openings/all')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: mockOpeningsData
            })
          })
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: [] })
        })
      })

      await act(async () => {
        render(
          <MemoryRouter initialEntries={['/opening/B00']}>
            <App />
          </MemoryRouter>
        )
      })

      // Wait for the opening detail page to load
      await waitFor(() => {
        // Should show the opening name when loaded
        expect(screen.getByText("King's Pawn Game")).toBeInTheDocument()
      })
    })

    test('should handle invalid routes gracefully', async () => {
      render(
        <MemoryRouter initialEntries={['/invalid-route']}>
          <App />
        </MemoryRouter>
      )

      // Should either redirect to home or show 404 - either way it should render
      await waitFor(() => {
        expect(screen.getByText(/Opening Book/i)).toBeInTheDocument()
      })
    })
  })

  describe('Data Loading', () => {
    test('should fetch openings data on mount', async () => {
      render(
        <MemoryRouter>
          <App />
        </MemoryRouter>
      )

      expect(mockFetch).toHaveBeenCalledWith('/api/openings/popular-by-eco?limit=6')
    })

    test('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('API Error'))

      render(
        <MemoryRouter>
          <App />
        </MemoryRouter>
      )

      // Should still render without crashing
      await waitFor(() => {
        expect(screen.getByText(/Opening Book/i)).toBeInTheDocument()
      })
    })

    test('should handle empty API response', async () => {
      mockFetch.mockImplementation(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ 
          success: true, 
          data: [],
          metadata: {
            response_time_ms: 100,
            total_count: 0,
            page: 1,
            limit: 20
          }
        })
      }))

      render(
        <MemoryRouter>
          <App />
        </MemoryRouter>
      )

      // Should render without crashing, check for basic content instead
      expect(screen.getByText(/Opening Book/i)).toBeInTheDocument()
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
      await waitFor(() => {
        expect(screen.getByText(/Opening Book/i)).toBeInTheDocument()
      })
    })
  })
})
