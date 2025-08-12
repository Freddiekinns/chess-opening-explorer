import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createElement } from 'react'

// Simple compatibility test for React 19 + testing library
describe('React 19 Compatibility Test', () => {
  it('should render a simple div', () => {
    const SimpleDiv = () => createElement('div', { 'data-testid': 'simple-div' }, 'Hello World')
    
    render(createElement(SimpleDiv))
    
    const element = screen.getByTestId('simple-div')
    expect(element).toBeInTheDocument()
    expect(element).toHaveTextContent('Hello World')
  })

  it('should render JSX component', () => {
    const SimpleJSX = () => <div data-testid="simple-jsx">JSX Works</div>
    
    render(<SimpleJSX />)
    
    const element = screen.getByTestId('simple-jsx')
    expect(element).toBeInTheDocument()
    expect(element).toHaveTextContent('JSX Works')
  })
})
