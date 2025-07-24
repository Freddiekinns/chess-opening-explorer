import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'

// Mock everything
vi.mock('chess.js', () => ({
  Chess: vi.fn(() => ({
    fen: () => 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    history: () => [],
    reset: vi.fn(),
    load: vi.fn(),
    move: vi.fn()
  }))
}))

vi.mock('react-chessboard', () => ({
  Chessboard: () => <div data-testid="chessboard">Mock Chessboard</div>
}))

// Mock CSS files
vi.mock('../OpeningDetailPage.css', () => ({}))

global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({
    success: true,
    data: {
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      name: 'King\'s Pawn Opening',
      eco: 'B00',
      moves: '1. e4',
      src: 'test'
    }
  })
})

describe('OpeningDetailPage Simple Test', () => {
  it('should render without crashing', async () => {
    const OpeningDetailPage = await import('../OpeningDetailPage').then(m => m.default)
    
    expect(() => {
      render(
        <BrowserRouter>
          <OpeningDetailPage />
        </BrowserRouter>
      )
    }).not.toThrow()
  })
})
