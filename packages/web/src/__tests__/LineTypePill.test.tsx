import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { LineTypePill } from '../components/shared/LineTypePill'

describe('LineTypePill', () => {
  describe('Mainline Display', () => {
    it('should display "Mainline" when isMainline is true', () => {
      render(<LineTypePill isMainline={true} />)
      expect(screen.getByText('Mainline')).toBeInTheDocument()
    })

    it('should have correct tooltip for mainline', () => {
      render(<LineTypePill isMainline={true} />)
      const pill = screen.getByText('Mainline')
      expect(pill).toHaveAttribute('title', 'ECO root line (canonical main reference)')
    })

    it('should apply style-pill class for mainline', () => {
      render(<LineTypePill isMainline={true} />)
      const pill = screen.getByText('Mainline')
      expect(pill).toHaveClass('style-pill')
    })
  })

  describe('Variation Display', () => {
    it('should display "Variation" when isMainline is false', () => {
      render(<LineTypePill isMainline={false} />)
      expect(screen.getByText('Variation')).toBeInTheDocument()
    })

    it('should have correct tooltip for variation', () => {
      render(<LineTypePill isMainline={false} />)
      const pill = screen.getByText('Variation')
      expect(pill).toHaveAttribute('title', 'Derived variation of a mainline')
    })

    it('should apply style-pill class for variation', () => {
      render(<LineTypePill isMainline={false} />)
      const pill = screen.getByText('Variation')
      expect(pill).toHaveClass('style-pill')
    })
  })

  describe('Custom Styling', () => {
    it('should accept additional className prop', () => {
      render(<LineTypePill isMainline={true} className="custom-class" />)
      const pill = screen.getByText('Mainline')
      expect(pill).toHaveClass('style-pill', 'custom-class')
    })

    it('should handle empty className prop', () => {
      render(<LineTypePill isMainline={true} className="" />)
      const pill = screen.getByText('Mainline')
      expect(pill).toHaveClass('style-pill')
      expect(pill.className).toBe('style-pill')
    })

    it('should handle undefined className prop', () => {
      render(<LineTypePill isMainline={true} />)
      const pill = screen.getByText('Mainline')
      expect(pill).toHaveClass('style-pill')
    })
  })

  describe('Accessibility', () => {
    it('should render as a span element', () => {
      render(<LineTypePill isMainline={true} />)
      const pill = screen.getByText('Mainline')
      expect(pill.tagName).toBe('SPAN')
    })

    it('should provide descriptive tooltip text for screen readers', () => {
      render(<LineTypePill isMainline={true} />)
      const pill = screen.getByText('Mainline')
      expect(pill).toHaveAttribute('title')
      expect(pill.getAttribute('title')).toContain('ECO root line')
    })
  })

  describe('Edge Cases', () => {
    it('should handle isMainline as undefined (should default to variation)', () => {
      render(<LineTypePill isMainline={undefined as any} />)
      expect(screen.getByText('Variation')).toBeInTheDocument()
    })

    it('should handle isMainline as null (should default to variation)', () => {
      render(<LineTypePill isMainline={null as any} />)
      expect(screen.getByText('Variation')).toBeInTheDocument()
    })
  })
})
