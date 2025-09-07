import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '@testing-library/jest-dom'

import { RelatedOpeningsTeaser } from '../RelatedOpeningsTeaser'

vi.mock('../../../useRelatedOpenings', () => ({
  useRelatedOpenings: vi.fn()
}))

import { useRelatedOpenings } from '../../../useRelatedOpenings'

describe('Related Openings Teaser (inline expansion)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('Teaser shows skeleton while loading', () => {
    ;(useRelatedOpenings as any).mockReturnValue({ data: null, loading: true, error: null })
    const { container } = render(<MemoryRouter><RelatedOpeningsTeaser fen="FEN1" /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: /related openings/i })).toBeInTheDocument()
    const skeletons = container.querySelectorAll('.skeleton-text')
    expect(skeletons.length).toBeGreaterThan(0)
  })

  test('Teaser hides when error', () => {
    ;(useRelatedOpenings as any).mockReturnValue({ data: null, loading: false, error: 'boom' })
    const { container } = render(<MemoryRouter><RelatedOpeningsTeaser fen="FEN1" /></MemoryRouter>)
    expect(container.firstChild).toBeNull()
  })

  test('Teaser renders complexity tags and expands inline', () => {
    ;(useRelatedOpenings as any).mockReturnValue({
      data: {
        current: { fen: 'VAR1', isEcoRoot: false },
        ecoCode: 'A00',
        mainline: { fen: 'MAIN', name: 'Mainline', isEcoRoot: true, games_analyzed: 5000, complexity: 'Intermediate' },
        siblings: [
          { fen: 'S1', name: 'Var A', isEcoRoot: false, games_analyzed: 1000, complexity: 'Advanced' },
          { fen: 'S2', name: 'Var B', isEcoRoot: false, games_analyzed: 900, complexity: 'Intermediate' },
          { fen: 'S3', name: 'Var C', isEcoRoot: false, games_analyzed: 800, complexity: 'Beginner' },
          { fen: 'S4', name: 'Var D', isEcoRoot: false, games_analyzed: 700, complexity: 'Advanced' },
          { fen: 'S5', name: 'Var E', isEcoRoot: false, games_analyzed: 600, complexity: 'Advanced' },
          { fen: 'S6', name: 'Var F', isEcoRoot: false, games_analyzed: 500, complexity: 'Intermediate' }
        ],
        counts: { siblings: 6 }
      },
      loading: false,
      error: null
    })
    render(<MemoryRouter><RelatedOpeningsTeaser fen="VAR1" /></MemoryRouter>)
  const showAllBtn = screen.getByRole('button', { name: /show all/i })
    fireEvent.click(showAllBtn)
    expect(showAllBtn).toHaveAttribute('aria-expanded', 'true')
  expect(showAllBtn).toHaveTextContent(/collapse/i)
  })
})
