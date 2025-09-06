import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { LineTypePill } from '../../packages/web/src/components/shared/LineTypePill'

describe('LineTypePill', () => {
  describe('Mainline pill', () => {
    beforeEach(() => {
      render(<LineTypePill isMainline={true} />)
    })

    it('renders "Mainline" text', () => {
      expect(screen.getByText('Mainline')).toBeInTheDocument()
    })

    it('has mainline CSS class', () => {
      const pill = screen.getByText('Mainline').closest('.line-type-pill')
      expect(pill).toHaveClass('mainline')
    })

    it('has correct accessibility attributes', () => {
      const pill = screen.getByText('Mainline').closest('.line-type-pill')
      expect(pill).toHaveAttribute('aria-label', 'Mainline')
      expect(pill).toHaveAttribute('title', 'ECO root line (canonical main reference)')
    })

    it('renders star icon for mainline', () => {
      const icon = screen.getByText('Mainline').closest('.line-type-pill')?.querySelector('svg')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveClass('pill-icon')
      expect(icon).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('Variation pill', () => {
    beforeEach(() => {
      render(<LineTypePill isMainline={false} />)
    })

    it('renders "Variation" text', () => {
      expect(screen.getByText('Variation')).toBeInTheDocument()
    })

    it('has variation CSS class', () => {
      const pill = screen.getByText('Variation').closest('.line-type-pill')
      expect(pill).toHaveClass('variation')
    })

    it('has correct accessibility attributes', () => {
      const pill = screen.getByText('Variation').closest('.line-type-pill')
      expect(pill).toHaveAttribute('aria-label', 'Variation')
      expect(pill).toHaveAttribute('title', 'Derived variation of a mainline')
    })

    it('renders branch icon for variation', () => {
      const icon = screen.getByText('Variation').closest('.line-type-pill')?.querySelector('svg')
      expect(icon).toBeInTheDocument()
      expect(icon).toHaveClass('pill-icon')
      expect(icon).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('Custom className', () => {
    it('applies additional className when provided', () => {
      render(<LineTypePill isMainline={true} className="custom-class" />)
      const pill = screen.getByText('Mainline').closest('.line-type-pill')
      expect(pill).toHaveClass('custom-class')
    })
  })

  describe('Component structure', () => {
    it('has proper DOM structure for mainline', () => {
      render(<LineTypePill isMainline={true} />)
      const pill = screen.getByText('Mainline').closest('.line-type-pill')
      const icon = pill?.querySelector('.pill-icon')
      const text = pill?.querySelector('.pill-text')
      
      expect(pill).toBeInTheDocument()
      expect(icon).toBeInTheDocument()
      expect(text).toBeInTheDocument()
      expect(text).toHaveTextContent('Mainline')
    })

    it('has proper DOM structure for variation', () => {
      render(<LineTypePill isMainline={false} />)
      const pill = screen.getByText('Variation').closest('.line-type-pill')
      const icon = pill?.querySelector('.pill-icon')
      const text = pill?.querySelector('.pill-text')
      
      expect(pill).toBeInTheDocument()
      expect(icon).toBeInTheDocument()
      expect(text).toBeInTheDocument()
      expect(text).toHaveTextContent('Variation')
    })
  })
})
