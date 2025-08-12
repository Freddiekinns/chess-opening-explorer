import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

// Simple test component
const SimpleComponent = () => {
  return <div>Hello Test</div>
}

describe('Simple Test', () => {
  it('should render without errors', () => {
    render(<SimpleComponent />)
    expect(screen.getByText('Hello Test')).toBeInTheDocument()
  })
})
