import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import { RelatedOpeningsTeaser } from '../RelatedOpeningsTeaser'
import { RelatedOpeningsTab } from '../RelatedOpeningsTab'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'

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
  let assignedHref: string | null = null
  const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'location')

  beforeEach(() => {
    assignedHref = null
    // Mock only the href setter
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        set href(val: string) { assignedHref = val },
        get href() { return 'http://localhost/' },
      }
    })
  })

  afterAll(() => {
    if (originalDescriptor) Object.defineProperty(window, 'location', originalDescriptor)
  })

  it('teaser navigates with /opening/ path', () => {
    render(<RelatedOpeningsTeaser fen="current-fen" />)
    fireEvent.click(screen.getByText('Sicilian Defense'))
    expect(assignedHref).toMatch(/\/opening\//)
  })

  it('tab navigates with /opening/ path', () => {
    render(<RelatedOpeningsTab fen="current-fen" />)
    fireEvent.click(screen.getByText('Sicilian Defense'))
    expect(assignedHref).toMatch(/\/opening\//)
  })
})
