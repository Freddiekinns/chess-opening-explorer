import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import OpeningDetailPage from '../OpeningDetailPage'

// Mock the chess libraries
vi.mock('chess.js', () => ({
  Chess: vi.fn(() => ({
    fen: () => 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    history: () => [],
    reset: vi.fn(),
    load: vi.fn(),
    move: vi.fn()
  }))
}))

// Mock react-chessboard - this should initially fail
vi.mock('react-chessboard', () => ({
  Chessboard: vi.fn(() => <div data-testid="chessboard">Mock Chessboard</div>)
}))

// Mock fetch for API calls
global.fetch = vi.fn()

const mockOpening = {
  fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
  name: 'King\'s Pawn Opening',
  eco: 'B00',
  moves: '1. e4',
  src: 'eco_tsv'
}

// Mock useParams to return a FEN
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ fen: encodeURIComponent(mockOpening.fen) }),
    useNavigate: () => vi.fn()
  }
})

describe('OpeningDetailPage - Chessboard Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock successful API response
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockOpening
      })
    })
  })

  it('should import and render react-chessboard component', async () => {
    render(
      <BrowserRouter>
        <OpeningDetailPage />
      </BrowserRouter>
    )

    // Wait for the component to load the opening data
    await waitFor(() => {
      expect(screen.getByText('King\'s Pawn Opening')).toBeInTheDocument()
    })

    // Test that the chessboard is rendered instead of placeholder
    const chessboard = screen.getByTestId('chessboard')
    expect(chessboard).toBeInTheDocument()
    
    // Verify the chessboard receives the correct position
    expect(chessboard).toHaveAttribute('data-position', mockOpening.fen)
  })

  it('should update chessboard position when move navigation is used', async () => {
    render(
      <BrowserRouter>
        <OpeningDetailPage />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('King\'s Pawn Opening')).toBeInTheDocument()
    })

    // The chessboard should initially show the opening position
    const chessboard = screen.getByTestId('chessboard')
    expect(chessboard).toHaveAttribute('data-position', mockOpening.fen)

    // TODO: Add tests for move navigation buttons
    // This will be implemented in the next phase
  })

  it('should handle invalid FEN positions gracefully', async () => {
    // Mock an invalid FEN response
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { ...mockOpening, fen: 'invalid-fen' }
      })
    })

    render(
      <BrowserRouter>
        <OpeningDetailPage />
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('King\'s Pawn Opening')).toBeInTheDocument()
    })

    // The component should handle invalid FEN gracefully
    // Either show an error message or default to starting position
    expect(screen.getByTestId('chessboard')).toBeInTheDocument()
  })
})
