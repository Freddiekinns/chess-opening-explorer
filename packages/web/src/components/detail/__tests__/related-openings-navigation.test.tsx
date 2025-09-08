import { describe, it, expect, vi } from 'vitest'
import { RelatedOpeningsTeaser } from '../RelatedOpeningsTeaser'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Mock react-router navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual: any = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

// Mock hook to supply deterministic data
vi.mock('../../../useRelatedOpenings', () => ({
  useRelatedOpenings: () => ({
    data: {
      ecoCode: 'B20',
      current: { fen: 'current-fen', name: 'Current Opening', isEcoRoot: false },
      mainline: { fen: 'mainline-fen', name: 'Sicilian Defense', isEcoRoot: true },
      siblings: [
        { fen: 'sib1', name: 'Sicilian Line A', isEcoRoot: false, games_analyzed: 1000 },
        { fen: 'sib2', name: 'Sicilian Line B', isEcoRoot: false, games_analyzed: 900 }
      ],
      counts: { siblings: 2 }
    },
    loading: false,
    error: null,
    refetch: vi.fn()
  })
}))

describe('Related Openings navigation', () => {
  it('teaser navigates with /opening/ path', () => {
    render(<MemoryRouter><RelatedOpeningsTeaser fen="current-fen" /></MemoryRouter>)
    fireEvent.click(screen.getByText('Sicilian Defense'))
    expect(mockNavigate).toHaveBeenCalled()
    expect(mockNavigate.mock.calls[0][0]).toMatch(/\/opening\//)
  })

  // Legacy tab component removed; navigation validated via teaser only.
})
