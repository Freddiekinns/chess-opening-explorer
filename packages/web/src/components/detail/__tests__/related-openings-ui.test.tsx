import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '@testing-library/jest-dom'

import { RelatedOpeningsTeaser } from '../RelatedOpeningsTeaser'
import { RelatedOpeningsTab } from '../RelatedOpeningsTab'

vi.mock('../../../useRelatedOpenings', () => ({
  useRelatedOpenings: vi.fn()
}))

import { useRelatedOpenings } from '../../../useRelatedOpenings'

describe('Related Openings UI Components', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('Teaser shows skeleton while loading', () => {
    ;(useRelatedOpenings as any).mockReturnValue({ data: null, loading: true, error: null })
  const { container } = render(<MemoryRouter><RelatedOpeningsTeaser fen="FEN1" /></MemoryRouter>)
  expect(screen.getByRole('heading', { name: /related openings/i })).toBeInTheDocument()
  // skeleton loading indicators (divs with skeleton-text class)
  const skeletons = container.querySelectorAll('.skeleton-text')
  expect(skeletons.length).toBeGreaterThan(0)
  })

  test('Teaser hides when error', () => {
    ;(useRelatedOpenings as any).mockReturnValue({ data: null, loading: false, error: 'boom' })
  const { container } = render(<MemoryRouter><RelatedOpeningsTeaser fen="FEN1" /></MemoryRouter>)
    expect(container.firstChild).toBeNull()
  })

  test('Teaser renders complexity tags and view all', () => {
    ;(useRelatedOpenings as any).mockReturnValue({
      data: {
        current: { fen: 'VAR1', isEcoRoot: false },
        ecoCode: 'A00',
        mainline: { fen: 'MAIN', name: 'Mainline', isEcoRoot: true, games_analyzed: 5000, complexity: 'Intermediate' },
        siblings: [
          { fen: 'S1', name: 'Var A', isEcoRoot: false, games_analyzed: 1000, complexity: 'Advanced' },
          { fen: 'S2', name: 'Var B', isEcoRoot: false, games_analyzed: 900, complexity: 'Intermediate' },
          { fen: 'S3', name: 'Var C', isEcoRoot: false, games_analyzed: 800, complexity: 'Beginner' },
          { fen: 'S4', name: 'Var D', isEcoRoot: false, games_analyzed: 700, complexity: 'Advanced' }
        ],
        counts: { siblings: 4 }
      },
      loading: false,
      error: null
    })
    render(<MemoryRouter><RelatedOpeningsTeaser fen="VAR1" /></MemoryRouter>)
    // Complexity tags should be present
    const complexityTags = screen.getAllByLabelText(/Complexity:/i)
    expect(complexityTags.length).toBeGreaterThan(0)
    // View all button still present
    expect(screen.getByRole('button', { name: /view all 4 related openings/i })).toBeInTheDocument()
  })

  test('Tab renders expand control when more than 10 siblings', () => {
    const siblings = Array.from({ length: 12 }).map((_, i) => ({
      fen: `F${i}`,
      name: `Var ${i}`,
      isEcoRoot: false,
      games_analyzed: 100 - i
    }))
    ;(useRelatedOpenings as any).mockReturnValue({
      data: {
        current: { fen: 'MAIN', isEcoRoot: true },
        ecoCode: 'B01',
        mainline: { fen: 'MAIN', name: 'Some Mainline', isEcoRoot: true, games_analyzed: 9000 },
        siblings,
        counts: { siblings: siblings.length }
      },
      loading: false,
      error: null
    })
  render(<MemoryRouter><RelatedOpeningsTab fen="MAIN" /></MemoryRouter>)
    expect(screen.getByText(/Variations \(12\)/i)).toBeInTheDocument()
    // Show all button present
    const btn = screen.getByRole('button', { name: /show all \(12\)/i })
    fireEvent.click(btn)
    expect(screen.getByRole('button', { name: /collapse/i })).toBeInTheDocument()
  })

  test('Tab shows error state with retry button', () => {
    ;(useRelatedOpenings as any).mockReturnValue({ data: null, loading: false, error: 'X' })
  render(<MemoryRouter><RelatedOpeningsTab fen="X" /></MemoryRouter>)
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })
})
