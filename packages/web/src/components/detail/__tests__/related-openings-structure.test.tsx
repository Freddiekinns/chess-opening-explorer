import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RelatedOpeningsTab } from '../RelatedOpeningsTab'

// Mock react-router navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual: any = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

// Helper to build mock hook return in two scenarios
function mockHook(currentIsMainline: boolean, siblingCount = 12) {
  const siblings = Array.from({ length: siblingCount }, (_, i) => ({
    fen: `sib-${i}`,
    name: `Variation ${i + 1}`,
    isEcoRoot: false,
    games_analyzed: 1000 - i * 10
  }))
  return {
    data: {
      ecoCode: 'B20',
      current: { fen: 'current-fen', name: 'Current', isEcoRoot: currentIsMainline },
      mainline: { fen: 'mainline-fen', name: 'Sicilian Defense', isEcoRoot: true },
      siblings,
      counts: { siblings: siblings.length }
    },
    loading: false,
    error: null,
    refetch: vi.fn()
  }
}

vi.mock('../../../useRelatedOpenings', () => ({
  useRelatedOpenings: () => mockHook(false) // default variation view
}))

describe('RelatedOpeningsTab structure & accessibility', () => {
  it('shows mainline contextual callout when viewing a variation', () => {
    render(<MemoryRouter><RelatedOpeningsTab fen="current-fen" /></MemoryRouter>)
    expect(screen.getByRole('note', { name: /mainline reference/i })).toBeInTheDocument()
  })

  it('announces expand/collapse via aria-live', () => {
    render(<MemoryRouter><RelatedOpeningsTab fen="current-fen" /></MemoryRouter>)
    const expandBtn = screen.getByRole('button', { name: /show all/i })
    fireEvent.click(expandBtn)
    const liveRegion = screen.getByText(/Expanded list to show all/i)
    expect(liveRegion).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /collapse/i }))
    expect(screen.getByText(/Collapsed list to show top variations/i)).toBeInTheDocument()
  })
})
