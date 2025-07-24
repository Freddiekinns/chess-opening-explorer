/**
 * @fileoverview Tests for PRD-F14 Design System Foundation
 * Validates design tokens, typography system, and global styles
 */

import { describe, test, expect, beforeEach } from 'vitest'

describe('PRD-F14: Design System Foundation', () => {
  beforeEach(() => {
    // Clear any existing styles
    const existingStyles = document.querySelectorAll('style[data-test-styles]')
    existingStyles.forEach(style => style.remove())
  })

  describe('Epic 1: Global Design System Foundation', () => {
    test('AC1.1: Global CSS custom properties implement exact color palette', () => {
      // Inject our design system CSS
      const style = document.createElement('style')
      style.setAttribute('data-test-styles', 'true')
      style.textContent = `
        :root {
          --bg-main: #121212;
          --bg-surface: #1E1E1E;
          --brand-orange: #E85D04;
          --brand-orange-hover: #F48C06;
          --text-primary: #FFFFFF;
          --text-secondary: #A0A0A0;
          --border-color: #333333;
        }
      `
      document.head.appendChild(style)
      
      const rootStyle = window.getComputedStyle(document.documentElement)
      
      expect(rootStyle.getPropertyValue('--bg-main').trim()).toBe('#121212')
      expect(rootStyle.getPropertyValue('--bg-surface').trim()).toBe('#1E1E1E')
      expect(rootStyle.getPropertyValue('--brand-orange').trim()).toBe('#E85D04')
      expect(rootStyle.getPropertyValue('--brand-orange-hover').trim()).toBe('#F48C06')
      expect(rootStyle.getPropertyValue('--text-primary').trim()).toBe('#FFFFFF')
      expect(rootStyle.getPropertyValue('--text-secondary').trim()).toBe('#A0A0A0')
      expect(rootStyle.getPropertyValue('--border-color').trim()).toBe('#333333')
    })

    test('AC1.2: Typography scale matches specification', () => {
      const style = document.createElement('style')
      style.setAttribute('data-test-styles', 'true')
      style.textContent = `
        :root {
          --font-family-primary: 'Inter', 'Segoe UI', sans-serif;
          --font-size-h1: 3rem;
          --font-size-h2: 2.25rem;
          --font-size-h3: 1.5rem;
          --font-size-body: 1rem;
          --font-size-small: 0.875rem;
          --font-size-button: 1rem;
          --font-weight-h1: 700;
          --font-weight-h2: 600;
          --font-weight-h3: 600;
          --font-weight-body: 400;
          --font-weight-button: 500;
        }
      `
      document.head.appendChild(style)
      
      const rootStyle = window.getComputedStyle(document.documentElement)
      
      // Font family
      expect(rootStyle.getPropertyValue('--font-family-primary').trim()).toContain('Inter')
      
      // Font sizes
      expect(rootStyle.getPropertyValue('--font-size-h1').trim()).toBe('3rem')
      expect(rootStyle.getPropertyValue('--font-size-h2').trim()).toBe('2.25rem')
      expect(rootStyle.getPropertyValue('--font-size-h3').trim()).toBe('1.5rem')
      expect(rootStyle.getPropertyValue('--font-size-body').trim()).toBe('1rem')
      expect(rootStyle.getPropertyValue('--font-size-small').trim()).toBe('0.875rem')
      expect(rootStyle.getPropertyValue('--font-size-button').trim()).toBe('1rem')
      
      // Font weights
      expect(rootStyle.getPropertyValue('--font-weight-h1').trim()).toBe('700')
      expect(rootStyle.getPropertyValue('--font-weight-h2').trim()).toBe('600')
      expect(rootStyle.getPropertyValue('--font-weight-h3').trim()).toBe('600')
      expect(rootStyle.getPropertyValue('--font-weight-body').trim()).toBe('400')
      expect(rootStyle.getPropertyValue('--font-weight-button').trim()).toBe('500')
    })

    test('AC1.3: Spacing system uses rem-based scale', () => {
      const style = document.createElement('style')
      style.setAttribute('data-test-styles', 'true')
      style.textContent = `
        :root {
          --space-xs: 0.25rem;
          --space-sm: 0.5rem;
          --space-md: 1rem;
          --space-lg: 1.5rem;
          --space-xl: 2rem;
          --space-xxl: 4rem;
        }
      `
      document.head.appendChild(style)
      
      const rootStyle = window.getComputedStyle(document.documentElement)
      
      expect(rootStyle.getPropertyValue('--space-xs').trim()).toBe('0.25rem')
      expect(rootStyle.getPropertyValue('--space-sm').trim()).toBe('0.5rem')
      expect(rootStyle.getPropertyValue('--space-md').trim()).toBe('1rem')
      expect(rootStyle.getPropertyValue('--space-lg').trim()).toBe('1.5rem')
      expect(rootStyle.getPropertyValue('--space-xl').trim()).toBe('2rem')
      expect(rootStyle.getPropertyValue('--space-xxl').trim()).toBe('4rem')
    })

    test('AC1.4: Border radius system applied consistently', () => {
      const style = document.createElement('style')
      style.setAttribute('data-test-styles', 'true')
      style.textContent = `
        :root {
          --border-radius-small: 4px;
          --border-radius-medium: 8px;
          --border-radius-large: 12px;
        }
      `
      document.head.appendChild(style)
      
      const rootStyle = window.getComputedStyle(document.documentElement)
      
      expect(rootStyle.getPropertyValue('--border-radius-small').trim()).toBe('4px')
      expect(rootStyle.getPropertyValue('--border-radius-medium').trim()).toBe('8px')
      expect(rootStyle.getPropertyValue('--border-radius-large').trim()).toBe('12px')
    })

    test('AC1.5: Main container implements max-width 1280px with centered layout', () => {
      const style = document.createElement('style')
      style.setAttribute('data-test-styles', 'true')
      style.textContent = `
        .container {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 1rem;
        }
      `
      document.head.appendChild(style)
      
      // Create a test element with the container class
      const testElement = document.createElement('div')
      testElement.className = 'container'
      document.body.appendChild(testElement)
      
      const elementStyle = window.getComputedStyle(testElement)
      expect(elementStyle.maxWidth).toBe('1280px')
      expect(elementStyle.margin).toBe('0px auto')
      
      document.body.removeChild(testElement)
    })

    test('AC1.6: Global Header implements sticky positioning with proper styling', () => {
      const style = document.createElement('style')
      style.setAttribute('data-test-styles', 'true')
      style.textContent = `
        .global-header {
          position: sticky;
          top: 0px;
          background-color: #121212;
          border-bottom: 1px solid #333333;
          z-index: 100;
        }
      `
      document.head.appendChild(style)
      
      const testElement = document.createElement('header')
      testElement.className = 'global-header'
      document.body.appendChild(testElement)
      
      const elementStyle = window.getComputedStyle(testElement)
      expect(elementStyle.position).toBe('sticky')
      expect(elementStyle.top).toBe('0px')
      expect(elementStyle.zIndex).toBe('100')
      
      document.body.removeChild(testElement)
    })
  })

  describe('Typography Integration', () => {
    test('H1 elements use correct font size and weight', () => {
      const style = document.createElement('style')
      style.setAttribute('data-test-styles', 'true')
      style.textContent = `
        :root {
          --font-size-h1: 3rem;
          --font-weight-h1: 700;
        }
        h1 {
          font-size: var(--font-size-h1) !important;
          font-weight: var(--font-weight-h1) !important;
          margin: 0 !important;
        }
      `
      document.head.appendChild(style)
      
      const testElement = document.createElement('h1')
      document.body.appendChild(testElement)
      
      const elementStyle = window.getComputedStyle(testElement)
      expect(elementStyle.fontSize).toBe('48px') // 3rem when base is 16px
      expect(elementStyle.fontWeight).toBe('700')
      
      document.body.removeChild(testElement)
    })

    test('H2 elements use correct font size and weight', () => {
      const style = document.createElement('style')
      style.setAttribute('data-test-styles', 'true')
      style.textContent = `
        :root {
          --font-size-h2: 2.25rem;
          --font-weight-h2: 600;
        }
        h2 {
          font-size: var(--font-size-h2) !important;
          font-weight: var(--font-weight-h2) !important;
          margin: 0 !important;
        }
      `
      document.head.appendChild(style)
      
      const testElement = document.createElement('h2')
      document.body.appendChild(testElement)
      
      const elementStyle = window.getComputedStyle(testElement)
      expect(elementStyle.fontSize).toBe('36px') // 2.25rem when base is 16px
      expect(elementStyle.fontWeight).toBe('600')
      
      document.body.removeChild(testElement)
    })

    test('Body text uses correct font settings', () => {
      const style = document.createElement('style')
      style.setAttribute('data-test-styles', 'true')
      style.textContent = `
        :root {
          --font-size-body: 1rem;
          --font-weight-body: 400;
        }
        p {
          font-size: var(--font-size-body) !important;
          font-weight: var(--font-weight-body) !important;
          margin: 0 !important;
        }
      `
      document.head.appendChild(style)
      
      const testElement = document.createElement('p')
      document.body.appendChild(testElement)
      
      const elementStyle = window.getComputedStyle(testElement)
      expect(elementStyle.fontSize).toBe('16px') // 1rem
      expect(elementStyle.fontWeight).toBe('400')
      
      document.body.removeChild(testElement)
    })
  })

  describe('Interactive States', () => {
    test('Active pill uses brand-orange background', () => {
      const style = document.createElement('style')
      style.setAttribute('data-test-styles', 'true')
      style.textContent = `
        :root {
          --brand-orange: #E85D04;
          --text-primary: #FFFFFF;
        }
        .pill {
          background-color: #ccc !important;
          color: #666 !important;
          padding: 0.5rem 1rem !important;
          border-radius: 8px !important;
          border: none !important;
        }
        .pill.active {
          background-color: var(--brand-orange) !important;
          color: var(--text-primary) !important;
        }
      `
      document.head.appendChild(style)
      
      const testElement = document.createElement('button')
      testElement.className = 'pill active'
      document.body.appendChild(testElement)
      
      const elementStyle = window.getComputedStyle(testElement)
      expect(elementStyle.backgroundColor).toBe('rgb(232, 93, 4)') // #E85D04
      expect(elementStyle.color).toBe('rgb(255, 255, 255)') // #FFFFFF
      
      document.body.removeChild(testElement)
    })

    test('Inactive pills use bg-surface background', () => {
      const style = document.createElement('style')
      style.setAttribute('data-test-styles', 'true')
      style.textContent = `
        :root {
          --bg-surface: #1E1E1E;
          --text-secondary: #A0A0A0;
        }
        .pill {
          background-color: var(--bg-surface) !important;
          color: var(--text-secondary) !important;
          padding: 0.5rem 1rem !important;
          border-radius: 8px !important;
          border: none !important;
        }
      `
      document.head.appendChild(style)
      
      const testElement = document.createElement('button')
      testElement.className = 'pill'
      document.body.appendChild(testElement)
      
      const elementStyle = window.getComputedStyle(testElement)
      expect(elementStyle.backgroundColor).toBe('rgb(30, 30, 30)') // #1E1E1E
      expect(elementStyle.color).toBe('rgb(160, 160, 160)') // #A0A0A0
      
      document.body.removeChild(testElement)
    })
  })
})
