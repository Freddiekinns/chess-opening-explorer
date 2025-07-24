import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import OpeningDetailPageMinimal from '../OpeningDetailPageMinimal'

describe('Minimal Test', () => {
  it('should render minimal component', () => {
    expect(() => {
      render(
        <MemoryRouter>
          <OpeningDetailPageMinimal />
        </MemoryRouter>
      )
    }).not.toThrow()
  })
})
