/**
 * @fileoverview Practice Mode Tests
 * Tests the interactive move trainer functionality on the opening detail page
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest'
import OpeningDetailPage from '../OpeningDetailPage'
import { mockOpeningDataSimple, mockStatsData, mockVideoData } from '../../test/fixtures/openingData'

// Mock fetch API
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock opening with multiple moves for practice testing
const mockPracticeOpening = {
  ...mockOpeningDataSimple,
  name: 'Italian Game',
  eco: 'C50',
  moves: '1.e4 e5 2.Nf3 Nc6 3.Bc4',
  fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3'
}

const renderOpeningDetailPage = (fen: string) => {
  return render(
    <MemoryRouter initialEntries={[`/opening/${encodeURIComponent(fen)}`]}>
      <Routes>
        <Route path="/opening/:fen" element={<OpeningDetailPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('Practice Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })

    // Mock successful fetch responses
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/openings/fen/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockPracticeOpening
          })
        })
      }
      if (url.includes('/api/stats/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockStatsData
          })
        })
      }
      if (url.includes('/api/openings/videos/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockVideoData
          })
        })
      }
      if (url.includes('/api/openings/all')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: []
          })
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] })
      })
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Practice Button', () => {
    test('should display Practice button in navigation controls', async () => {
      await act(async () => {
        renderOpeningDetailPage(mockPracticeOpening.fen)
      })

      await waitFor(() => {
        expect(screen.getByText('Italian Game')).toBeInTheDocument()
      })

      expect(screen.getByText('Practice')).toBeInTheDocument()
    })

    test('should enter practice mode when Practice button is clicked', async () => {
      await act(async () => {
        renderOpeningDetailPage(mockPracticeOpening.fen)
      })

      await waitFor(() => {
        expect(screen.getByText('Italian Game')).toBeInTheDocument()
      })

      const practiceButton = screen.getByText('Practice')
      fireEvent.click(practiceButton)

      await waitFor(() => {
        expect(screen.getByText('Playing as:')).toBeInTheDocument()
        expect(screen.getByText('Exit')).toBeInTheDocument()
      })
    })
  })

  describe('Practice Mode Controls', () => {
    test('should show color toggle with White selected by default', async () => {
      await act(async () => {
        renderOpeningDetailPage(mockPracticeOpening.fen)
      })

      await waitFor(() => {
        expect(screen.getByText('Italian Game')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Practice'))

      await waitFor(() => {
        const whiteButton = screen.getByRole('button', { name: 'White' })
        expect(whiteButton).toHaveClass('active')
      })
    })

    test('should show move counter', async () => {
      await act(async () => {
        renderOpeningDetailPage(mockPracticeOpening.fen)
      })

      await waitFor(() => {
        expect(screen.getByText('Italian Game')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Practice'))

      await waitFor(() => {
        // The opening has 5 moves (e4, e5, Nf3, Nc6, Bc4)
        // Move counter shows "Move X of Y" where Y is ceil(5/2) = 3
        expect(screen.getByText(/Move 1 of 3/)).toBeInTheDocument()
      })
    })

    test('should show Hint button', async () => {
      await act(async () => {
        renderOpeningDetailPage(mockPracticeOpening.fen)
      })

      await waitFor(() => {
        expect(screen.getByText('Italian Game')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Practice'))

      await waitFor(() => {
        expect(screen.getByText('Hint')).toBeInTheDocument()
      })
    })

    test('should exit practice mode when Exit button is clicked', async () => {
      await act(async () => {
        renderOpeningDetailPage(mockPracticeOpening.fen)
      })

      await waitFor(() => {
        expect(screen.getByText('Italian Game')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Practice'))

      await waitFor(() => {
        expect(screen.getByText('Exit')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Exit'))

      await waitFor(() => {
        // Should show navigation controls again
        expect(screen.getByText('Practice')).toBeInTheDocument()
        expect(screen.queryByText('Playing as:')).not.toBeInTheDocument()
      })
    })
  })

  describe('Color Selection', () => {
    test('should allow switching to Black', async () => {
      await act(async () => {
        renderOpeningDetailPage(mockPracticeOpening.fen)
      })

      await waitFor(() => {
        expect(screen.getByText('Italian Game')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Practice'))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Black' })).toBeInTheDocument()
      })

      fireEvent.click(screen.getByRole('button', { name: 'Black' }))

      // After switching to Black, should wait for White's first move (auto-play)
      await act(async () => {
        vi.advanceTimersByTime(500)
      })

      await waitFor(() => {
        const blackButton = screen.getByRole('button', { name: 'Black' })
        expect(blackButton).toHaveClass('active')
      })
    })
  })

  describe('Navigation Controls Visibility', () => {
    test('should hide navigation controls in practice mode', async () => {
      await act(async () => {
        renderOpeningDetailPage(mockPracticeOpening.fen)
      })

      await waitFor(() => {
        expect(screen.getByText('Italian Game')).toBeInTheDocument()
      })

      // Before practice mode - navigation buttons should be visible
      expect(screen.getByTitle('Go to start')).toBeInTheDocument()

      fireEvent.click(screen.getByText('Practice'))

      await waitFor(() => {
        // Navigation buttons should be hidden
        expect(screen.queryByTitle('Go to start')).not.toBeInTheDocument()
        // Practice controls should be visible
        expect(screen.getByText('Playing as:')).toBeInTheDocument()
      })
    })

    test('should show navigation controls after exiting practice mode', async () => {
      await act(async () => {
        renderOpeningDetailPage(mockPracticeOpening.fen)
      })

      await waitFor(() => {
        expect(screen.getByText('Italian Game')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Practice'))

      await waitFor(() => {
        expect(screen.getByText('Exit')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Exit'))

      await waitFor(() => {
        expect(screen.getByTitle('Go to start')).toBeInTheDocument()
      })
    })
  })
})

describe('Practice Mode - Hint Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/openings/fen/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockPracticeOpening
          })
        })
      }
      if (url.includes('/api/stats/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockStatsData
          })
        })
      }
      if (url.includes('/api/openings/videos/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: []
          })
        })
      }
      if (url.includes('/api/openings/all')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: []
          })
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] })
      })
    })
  })

  test('should allow clicking Hint button', async () => {
    await act(async () => {
      renderOpeningDetailPage(mockPracticeOpening.fen)
    })

    await waitFor(() => {
      expect(screen.getByText('Italian Game')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Practice'))

    await waitFor(() => {
      expect(screen.getByText('Hint')).toBeInTheDocument()
    })

    // Should be able to click hint button
    const hintButton = screen.getByText('Hint')
    fireEvent.click(hintButton)

    // Hint button should disappear after being clicked (hint is now shown)
    await waitFor(() => {
      expect(screen.queryByText('Hint')).not.toBeInTheDocument()
    })
  })
})

describe('Practice Mode - Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/openings/fen/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: mockPracticeOpening
          })
        })
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: [] })
      })
    })
  })

  test('should have proper button titles for screen readers', async () => {
    await act(async () => {
      renderOpeningDetailPage(mockPracticeOpening.fen)
    })

    await waitFor(() => {
      expect(screen.getByText('Italian Game')).toBeInTheDocument()
    })

    const practiceButton = screen.getByText('Practice')
    expect(practiceButton).toHaveAttribute('title', 'Practice this opening')
  })

  test('should have proper button titles in practice mode', async () => {
    await act(async () => {
      renderOpeningDetailPage(mockPracticeOpening.fen)
    })

    await waitFor(() => {
      expect(screen.getByText('Italian Game')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Practice'))

    await waitFor(() => {
      const hintButton = screen.getByText('Hint')
      expect(hintButton).toHaveAttribute('title', 'Show which piece to move')
    })
  })
})
