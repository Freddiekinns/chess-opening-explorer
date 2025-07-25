/**
 * @fileoverview Tests for PRD-F14 Phase 2: Global Header & Enhanced Landing Page
 * Tests Epic 2 acceptance criteria for header component and landing page enhancements
 */

import { describe, test, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Import components we'll create
import { GlobalHeader } from '../components/layout/GlobalHeader'
import { EnhancedLanding } from '../pages/EnhancedLanding'

describe('PRD-F14 Phase 2: Global Header & Enhanced Landing Page', () => {
  beforeEach(() => {
    // Clear any existing styles and mocks
    const existingStyles = document.querySelectorAll('style[data-test-styles]')
    existingStyles.forEach(style => style.remove())
    vi.clearAllMocks()
  })

  describe('Epic 2.1: Global Header Component', () => {
    test('AC2.1.1: Header implements sticky positioning with proper z-index', () => {
      render(
        <MemoryRouter>
          <GlobalHeader />
        </MemoryRouter>
      )
      
      const header = screen.getByRole('banner')
      const headerStyle = window.getComputedStyle(header)
      
      expect(headerStyle.position).toBe('sticky')
      expect(headerStyle.top).toBe('0px')
      expect(parseInt(headerStyle.zIndex)).toBeGreaterThanOrEqual(100)
      expect(headerStyle.backgroundColor).toBe('rgb(18, 18, 18)') // --bg-main: #121212
    })

    test('AC2.1.2: Header contains logo, navigation, and search elements', () => {
      render(
        <MemoryRouter>
          <GlobalHeader />
        </MemoryRouter>
      )
      
      // Logo/brand element
      expect(screen.getByRole('link', { name: /chess trainer/i })).toBeInTheDocument()
      
      // Navigation elements
      expect(screen.getByRole('link', { name: /openings/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /training/i })).toBeInTheDocument()
      
      // Search input
      expect(screen.getByRole('textbox', { name: /search openings/i })).toBeInTheDocument()
    })

    test('AC2.1.3: Header is fully responsive with mobile navigation', () => {
      render(
        <MemoryRouter>
          <GlobalHeader />
        </MemoryRouter>
      )
      
      // Mobile menu toggle should be present but potentially hidden
      const menuToggle = screen.getByRole('button', { name: /menu/i })
      expect(menuToggle).toBeInTheDocument()
      
      // Test mobile menu toggle functionality
      fireEvent.click(menuToggle)
      
      // Mobile navigation should be visible after click
      const mobileNav = screen.getByRole('navigation', { name: /mobile navigation/i })
      expect(mobileNav).toBeInTheDocument()
    })

    test('AC2.1.4: Search input has proper accessibility and interaction', () => {
      const mockOnSearch = vi.fn()
      
      render(
        <MemoryRouter>
          <GlobalHeader onSearch={mockOnSearch} />
        </MemoryRouter>
      )
      
      const searchInput = screen.getByRole('textbox', { name: /search openings/i })
      
      // Test accessibility attributes
      expect(searchInput).toHaveAttribute('placeholder', 'Search openings...')
      expect(searchInput).toHaveAttribute('aria-label', 'Search openings')
      
      // Test search functionality
      fireEvent.change(searchInput, { target: { value: 'Sicilian Defense' } })
      expect(mockOnSearch).toHaveBeenCalledWith('Sicilian Defense')
    })

    test('AC2.1.5: Header integrates design system colors and typography', () => {
      render(
        <MemoryRouter>
          <GlobalHeader />
        </MemoryRouter>
      )
      
      const header = screen.getByRole('banner')
      const headerStyle = window.getComputedStyle(header)
      
      // Background should use design system variable
      expect(headerStyle.backgroundColor).toBe('rgb(18, 18, 18)') // --bg-main
      
      // Border should use design system variable  
      expect(headerStyle.borderBottomColor).toBe('rgb(51, 51, 51)') // --border-color
      
      // Text elements should use proper typography
      const logoLink = screen.getByRole('link', { name: /chess trainer/i })
      const logoStyle = window.getComputedStyle(logoLink)
      expect(logoStyle.fontSize).toBe('24px') // 1.5rem when base is 16px
      expect(logoStyle.fontWeight).toBe('600')
    })
  })

  describe('Epic 2.2: Enhanced Landing Page', () => {
    test('AC2.2.1: Landing page has prominent hero section with search', () => {
      render(
        <MemoryRouter>
          <EnhancedLanding />
        </MemoryRouter>
      )
      
      // Hero section should be present
      const heroSection = screen.getByRole('region', { name: /hero section/i })
      expect(heroSection).toBeInTheDocument()
      
      // Main heading
      expect(screen.getByRole('heading', { level: 1, name: /master chess openings/i })).toBeInTheDocument()
      
      // Prominent search input
      const searchInput = screen.getByRole('textbox', { name: /search openings/i })
      expect(searchInput).toBeInTheDocument()
      
      // Hero section should have proper styling
      const heroStyle = window.getComputedStyle(heroSection)
      expect(parseInt(heroStyle.paddingTop)).toBeGreaterThanOrEqual(64) // Prominent spacing
    })

    test('AC2.2.2: Popular openings section displays trending openings', () => {
      const mockPopularOpenings = [
        { eco: 'B20', name: 'Sicilian Defense', games: 150000, rating: 1800 },
        { eco: 'C65', name: "Ruy Lopez", games: 120000, rating: 1850 },
        { eco: 'D07', name: "Queen's Gambit", games: 110000, rating: 1900 }
      ]
      
      render(
        <MemoryRouter>
          <EnhancedLanding popularOpenings={mockPopularOpenings} />
        </MemoryRouter>
      )
      
      // Popular openings section
      const popularSection = screen.getByRole('region', { name: /popular openings/i })
      expect(popularSection).toBeInTheDocument()
      
      // Section heading
      expect(screen.getByRole('heading', { level: 2, name: /popular openings/i })).toBeInTheDocument()
      
      // Opening cards should be present
      expect(screen.getByText('Sicilian Defense')).toBeInTheDocument()
      expect(screen.getByText("Ruy Lopez")).toBeInTheDocument()
      expect(screen.getByText("Queen's Gambit")).toBeInTheDocument()
      
      // Opening cards should have proper stats
      expect(screen.getByText('150,000 games')).toBeInTheDocument()
      expect(screen.getByText('Avg Rating: 1800')).toBeInTheDocument()
    })

    test('AC2.2.3: Landing page integrates with Global Header', () => {
      render(
        <MemoryRouter>
          <div>
            <GlobalHeader />
            <EnhancedLanding />
          </div>
        </MemoryRouter>
      )
      
      // Header should be present
      expect(screen.getByRole('banner')).toBeInTheDocument()
      
      // Main content should have proper spacing to account for sticky header
      const mainContent = screen.getByRole('main')
      expect(mainContent).toBeInTheDocument()
      
      const mainStyle = window.getComputedStyle(mainContent)
      expect(parseInt(mainStyle.paddingTop)).toBeGreaterThanOrEqual(0) // Proper spacing
    })

    test('AC2.2.4: Landing page is mobile responsive', () => {
      render(
        <MemoryRouter>
          <EnhancedLanding />
        </MemoryRouter>
      )
      
      const heroSection = screen.getByRole('region', { name: /hero section/i })
      const popularSection = screen.getByRole('region', { name: /popular openings/i })
      
      // Sections should have responsive styling
      const heroStyle = window.getComputedStyle(heroSection)
      const popularStyle = window.getComputedStyle(popularSection)
      
      // Should use responsive padding/margins
      expect(heroStyle.padding).toBeTruthy()
      expect(popularStyle.padding).toBeTruthy()
      
      // Grid layout should be responsive
      const openingGrid = within(popularSection).getByRole('list')
      const gridStyle = window.getComputedStyle(openingGrid)
      expect(gridStyle.display).toBe('grid')
    })

    test('AC2.2.5: Landing page implements proper semantic HTML structure', () => {
      render(
        <MemoryRouter>
          <EnhancedLanding />
        </MemoryRouter>
      )
      
      // Proper semantic structure
      expect(screen.getByRole('main')).toBeInTheDocument()
      expect(screen.getByRole('region', { name: /hero section/i })).toBeInTheDocument()
      expect(screen.getByRole('region', { name: /popular openings/i })).toBeInTheDocument()
      
      // Proper heading hierarchy
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
      
      // Navigation and links should be properly accessible
      const openingLinks = screen.getAllByRole('link')
      expect(openingLinks.length).toBeGreaterThan(0)
    })
  })

  describe('Epic 2.3: Integration & Performance', () => {
    test('AC2.3.1: Header and landing page work together seamlessly', () => {
      const mockOnSearch = vi.fn()
      
      render(
        <MemoryRouter>
          <div>
            <GlobalHeader onSearch={mockOnSearch} />
            <EnhancedLanding />
          </div>
        </MemoryRouter>
      )
      
      // Search from header should be functional
      const headerSearch = screen.getAllByRole('textbox', { name: /search openings/i })[0]
      fireEvent.change(headerSearch, { target: { value: 'English Opening' } })
      expect(mockOnSearch).toHaveBeenCalledWith('English Opening')
      
      // Layout should be cohesive
      const header = screen.getByRole('banner')
      const main = screen.getByRole('main')
      
      expect(header).toBeInTheDocument()
      expect(main).toBeInTheDocument()
    })

    test('AC2.3.2: Components use design system consistently', () => {
      render(
        <MemoryRouter>
          <div>
            <GlobalHeader />
            <EnhancedLanding />
          </div>
        </MemoryRouter>
      )
      
      // Header background
      const header = screen.getByRole('banner')
      const headerStyle = window.getComputedStyle(header)
      expect(headerStyle.backgroundColor).toBe('rgb(18, 18, 18)') // --bg-main
      
      // Main content background
      const main = screen.getByRole('main')
      const mainStyle = window.getComputedStyle(main)
      expect(mainStyle.backgroundColor).toBe('rgb(18, 18, 18)') // --bg-main
      
      // Typography consistency
      const h1 = screen.getByRole('heading', { level: 1 })
      const h1Style = window.getComputedStyle(h1)
      expect(h1Style.fontSize).toBe('48px') // 3rem when base is 16px
      expect(h1Style.fontWeight).toBe('700')
    })
  })
})
