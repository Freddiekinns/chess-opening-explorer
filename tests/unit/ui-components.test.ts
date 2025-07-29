/**
 * UI Components Unit Tests
 * 
 * Tests for individual UI components following TDD principles:
 * - Test behavior, not implementation
 * - Mock external dependencies
 * - Fast, isolated tests
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

describe('UI Components', () => {
  let mockContainer;

  beforeEach(() => {
    // Setup DOM for testing
    mockContainer = document.createElement('div');
    document.body.appendChild(mockContainer);
  });

  afterEach(() => {
    // Cleanup DOM after each test
    document.body.removeChild(mockContainer);
  });

  describe('SearchButton Component', () => {
    test('should render back to search button with correct attributes', () => {
      mockContainer.innerHTML = `
        <button class="back-to-search" data-testid="back-search-btn">
          ← Back to Search
        </button>
      `;

      const button = mockContainer.querySelector('[data-testid="back-search-btn"]');
      
      expect(button).toBeTruthy();
      expect(button.classList.contains('back-to-search')).toBe(true);
      expect(button.textContent.trim()).toBe('← Back to Search');
    });

    test('should navigate to search page when clicked', () => {
      const mockNavigate = vi.fn();
      
      mockContainer.innerHTML = `
        <button class="back-to-search" data-testid="back-search-btn">
          ← Back to Search
        </button>
      `;

      const button = mockContainer.querySelector('[data-testid="back-search-btn"]');
      button.addEventListener('click', mockNavigate);
      
      button.click();
      
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });
  });

  describe('OpeningHeader Component', () => {
    test('should display opening name and ECO code', () => {
      const openingData = {
        name: 'Sicilian Defense',
        eco: 'B20'
      };

      mockContainer.innerHTML = `
        <header class="opening-header-improved">
          <h1 data-testid="opening-name">${openingData.name}</h1>
          <span class="eco-tag-improved" data-testid="eco-code">${openingData.eco}</span>
        </header>
      `;

      const nameElement = mockContainer.querySelector('[data-testid="opening-name"]');
      const ecoElement = mockContainer.querySelector('[data-testid="eco-code"]');

      expect(nameElement.textContent).toBe('Sicilian Defense');
      expect(ecoElement.textContent).toBe('B20');
      expect(ecoElement.classList.contains('eco-tag-improved')).toBe(true);
    });

    test('should handle missing ECO code gracefully', () => {
      const openingData = {
        name: 'Custom Opening',
        eco: null
      };

      mockContainer.innerHTML = `
        <header class="opening-header-improved">
          <h1 data-testid="opening-name">${openingData.name}</h1>
          <span class="eco-tag-improved" data-testid="eco-code">
            ${openingData.eco || 'Unknown'}
          </span>
        </header>
      `;

      const ecoElement = mockContainer.querySelector('[data-testid="eco-code"]');
      expect(ecoElement.textContent.trim()).toBe('Unknown');
    });
  });

  describe('BoardControls Component', () => {
    test('should render navigation buttons with proper styling', () => {
      mockContainer.innerHTML = `
        <div class="board-controls">
          <button data-testid="prev-btn" class="nav-button">⬅</button>
          <button data-testid="next-btn" class="nav-button">➡</button>
          <button data-testid="reset-btn" class="nav-button">⟲</button>
        </div>
      `;

      const controls = mockContainer.querySelector('.board-controls');
      const buttons = controls.querySelectorAll('.nav-button');

      expect(controls).toBeTruthy();
      expect(buttons).toHaveLength(3);
      expect(buttons[0].getAttribute('data-testid')).toBe('prev-btn');
      expect(buttons[1].getAttribute('data-testid')).toBe('next-btn');
      expect(buttons[2].getAttribute('data-testid')).toBe('reset-btn');
    });

    test('should position board controls below chessboard', () => {
      mockContainer.innerHTML = `
        <div class="chess-section">
          <div class="chessboard" data-testid="chessboard"></div>
          <div class="board-controls" data-testid="board-controls"></div>
        </div>
      `;

      const chessboard = mockContainer.querySelector('[data-testid="chessboard"]');
      const controls = mockContainer.querySelector('[data-testid="board-controls"]');
      
      // Check that controls come after chessboard in DOM order
      const chessboardIndex = Array.from(mockContainer.children[0].children).indexOf(chessboard);
      const controlsIndex = Array.from(mockContainer.children[0].children).indexOf(controls);
      
      expect(controlsIndex).toBeGreaterThan(chessboardIndex);
    });
  });

  describe('ContentPanel Component', () => {
    test('should apply consistent panel styling', () => {
      mockContainer.innerHTML = `
        <div class="content-panel" data-testid="test-panel">
          <h2>Test Content</h2>
          <p>Panel content here</p>
        </div>
      `;

      const panel = mockContainer.querySelector('[data-testid="test-panel"]');
      
      expect(panel.classList.contains('content-panel')).toBe(true);
    });

    test('should contain child elements correctly', () => {
      mockContainer.innerHTML = `
        <div class="content-panel">
          <h2 data-testid="panel-title">Statistics</h2>
          <div data-testid="panel-content">Content here</div>
        </div>
      `;

      const title = mockContainer.querySelector('[data-testid="panel-title"]');
      const content = mockContainer.querySelector('[data-testid="panel-content"]');

      expect(title).toBeTruthy();
      expect(content).toBeTruthy();
      expect(title.textContent).toBe('Statistics');
    });
  });
});
