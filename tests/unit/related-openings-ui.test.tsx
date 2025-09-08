import React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { RelatedOpeningsTeaser } from '../../packages/web/src/components/detail/RelatedOpeningsTeaser'

vi.mock('../../packages/web/src/useRelatedOpenings', () => ({
  useRelatedOpenings: vi.fn()
}))
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { useRelatedOpenings } = require('../../packages/web/src/useRelatedOpenings')

describe('Related Openings UI Components', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('Teaser shows skeleton while loading', () => {
    useRelatedOpenings.mockReturnValue({ data: null, loading: true, error: null })
    render(<RelatedOpeningsTeaser fen="FEN1" />)
    expect(screen.getByRole('heading', { name: /related openings/i })).toBeInTheDocument()
    expect(screen.getByRole('list')).toHaveClass('skeleton')
  })

  it('Teaser hides when error', () => {
    useRelatedOpenings.mockReturnValue({ data: null, loading: false, error: 'boom' })
    const { container } = render(<RelatedOpeningsTeaser fen="FEN1" />)
    expect(container.firstChild).toBeNull()
  })

  it('Teaser renders mainline + top variations + view all', () => {
    useRelatedOpenings.mockReturnValue({
      data: {
        current: { fen: 'VAR1', isEcoRoot: false },
        ecoCode: 'A00',
        mainline: { fen: 'MAIN', name: 'Mainline', isEcoRoot: true, games_analyzed: 5000 },
        siblings: [
          { fen: 'S1', name: 'Var A', isEcoRoot: false, games_analyzed: 1000 },
          { fen: 'S2', name: 'Var B', isEcoRoot: false, games_analyzed: 900 },
          { fen: 'S3', name: 'Var C', isEcoRoot: false, games_analyzed: 800 },
          { fen: 'S4', name: 'Var D', isEcoRoot: false, games_analyzed: 700 }
        ],
        counts: { siblings: 4 }
      },
      loading: false,
      error: null
    })
    render(<RelatedOpeningsTeaser fen="VAR1" />)
    expect(screen.getByText('Mainline')).toBeInTheDocument()
    expect(screen.getByText('View all (4)')).toBeInTheDocument()
  })

  // Legacy RelatedOpeningsTab removed; tab-specific tests retired.
})
