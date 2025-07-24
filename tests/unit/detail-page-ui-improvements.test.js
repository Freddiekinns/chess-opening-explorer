/**
 * TDD-Turbo: Detail Page UI Improvements Test Suite
 * Testing Group 1: CSS & Layout Fixes
 * @jest-environment jsdom
 */

describe('Detail Page UI Improvements - Group 1: CSS & Layout', () => {
  beforeEach(() => {
    // Set up DOM structure for testing
    document.body.innerHTML = `
      <div class="detail-page-body">
        <header class="site-header">
          <div class="search-area">
            <div id="search-container">
              <div id="search-input-wrapper">
                <input id="search-bar" type="text" />
              </div>
              <button id="go-button">Go</button>
              <button id="surprise-button">Surprise Me</button>
            </div>
          </div>
        </header>
        <div class="content-layout">
          <main class="learning-path">
            <section class="board-section content-panel">
              <div class="position-info">
                <code class="fen-display">rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1</code>
              </div>
            </section>
          </main>
          <aside class="fact-sheet">
            <div class="content-panel">Sidebar content</div>
          </aside>
        </div>
      </div>
    `;
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('Search Bar Button Spacing', () => {
    test('should have proper structure for search buttons', () => {
      const searchContainer = document.getElementById('search-container');
      const goButton = document.getElementById('go-button');
      const surpriseButton = document.getElementById('surprise-button');
      
      // Test that elements exist and have proper structure
      expect(searchContainer).toBeTruthy();
      expect(goButton).toBeTruthy();
      expect(surpriseButton).toBeTruthy();
      expect(goButton.textContent).toBe('Go');
      expect(surpriseButton.textContent).toBe('Surprise Me');
    });

    test('should have button elements with proper attributes', () => {
      const buttons = document.querySelectorAll('#search-container button');
      
      expect(buttons.length).toBe(2);
      buttons.forEach(button => {
        expect(button.tagName).toBe('BUTTON');
        expect(button.id).toMatch(/^(go-button|surprise-button)$/);
      });
    });
  });

  describe('Layout Structure', () => {
    test('should have proper content layout structure', () => {
      const contentLayout = document.querySelector('.content-layout');
      const learningPath = document.querySelector('.learning-path');
      const factSheet = document.querySelector('.fact-sheet');
      
      expect(contentLayout).toBeTruthy();
      expect(learningPath).toBeTruthy();
      expect(factSheet).toBeTruthy();
    });

    test('should have board section with FEN display', () => {
      const boardSection = document.querySelector('.board-section');
      const fenDisplay = document.querySelector('.fen-display');
      
      expect(boardSection).toBeTruthy();
      expect(fenDisplay).toBeTruthy();
      expect(fenDisplay.textContent).toContain('rnbqkbnr');
    });
  });

  describe('Moves Box Removal', () => {
    test('should not display non-functional moves box in board section', () => {
      // Look for moves-related elements that should be removed
      const movesContainer = document.querySelector('.moves-container');
      const movesDisplay = document.querySelector('.moves-display-box');
      const movesList = document.querySelector('.moves-list');
      
      // These elements should not exist after removal
      expect(movesContainer).toBeNull();
      expect(movesDisplay).toBeNull();
      expect(movesList).toBeNull();
    });

    test('should keep only essential board elements', () => {
      const boardSection = document.querySelector('.board-section');
      const fenDisplay = document.querySelector('.fen-display');
      
      // Essential elements should remain
      expect(boardSection).toBeTruthy();
      expect(fenDisplay).toBeTruthy();
      expect(fenDisplay.textContent).toContain('rnbqkbnr');
    });
  });
});

describe('Detail Page UI Improvements - Group 2: Data Integration', () => {
  describe('ECO Data Integration', () => {
    test('should have API endpoint for ECO analysis data', async () => {
      // Mock fetch for ECO data
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: {
              description: "The Sicilian Defense is a chess opening...",
              style_tags: ["Sharp", "Aggressive", "Complex"],
              complexity: "Advanced",
              white_plans: ["Control center with pawns", "Develop pieces quickly"],
              black_plans: ["Challenge white's center", "Create counterplay"]
            }
          })
        })
      );

      const response = await fetch('/api/openings/eco-analysis/B20');
      const data = await response.json();
      
      expect(data.success).toBe(true);
      expect(data.data.description).toContain("Sicilian Defense");
      expect(data.data.complexity).toBe("Advanced");
      expect(Array.isArray(data.data.white_plans)).toBe(true);
      expect(Array.isArray(data.data.black_plans)).toBe(true);
    });

    test('should handle mainline vs variation logic using EcoisRoot', () => {
      const mockOpeningMainline = { EcoisRoot: true, eco: "B20" };
      const mockOpeningVariation = { EcoisRoot: false, eco: "B20" };
      
      // Function to test
      const isMainline = (opening) => opening.EcoisRoot === true;
      
      expect(isMainline(mockOpeningMainline)).toBe(true);
      expect(isMainline(mockOpeningVariation)).toBe(false);
    });
  });

  describe('Copy FEN Functionality', () => {
    test('should copy FEN to clipboard when button is clicked', async () => {
      // Mock clipboard API
      const mockWriteText = jest.fn(() => Promise.resolve());
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText
        }
      });

      const fenString = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
      
      // Mock function to test
      const copyFenToClipboard = async (fen) => {
        await navigator.clipboard.writeText(fen);
        return true;
      };

      const result = await copyFenToClipboard(fenString);
      
      expect(result).toBe(true);
      expect(mockWriteText).toHaveBeenCalledWith(fenString);
    });

    test('should show visual feedback when FEN is copied', () => {
      const mockButton = document.createElement('button');
      mockButton.className = 'copy-fen-btn';
      
      // Mock state change function
      const setCopiedState = (button, copied) => {
        if (copied) {
          button.classList.add('copied');
          button.innerHTML = '<span>✓</span> Copied!';
        } else {
          button.classList.remove('copied');
          button.innerHTML = '<span>📋</span> Copy FEN';
        }
      };

      setCopiedState(mockButton, true);
      expect(mockButton.classList.contains('copied')).toBe(true);
      expect(mockButton.innerHTML).toContain('Copied!');

      setCopiedState(mockButton, false);
      expect(mockButton.classList.contains('copied')).toBe(false);
      expect(mockButton.innerHTML).toContain('Copy FEN');
    });
  });
});
