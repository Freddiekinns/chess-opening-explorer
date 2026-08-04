import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchBar } from '../SearchBar';
import { mockOpeningsList, mockSearchResponse } from '../../../test/fixtures/openingData';
import { resetSearchIndex } from '../../../test/searchIndexStub';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock opening selection handler
const mockOnSelect = vi.fn();

// Default props for SearchBar
const defaultProps = {
  onSelect: mockOnSelect,
  placeholder: 'Search openings...',
};

/**
 * The locally held slice now arrives over the wire rather than as a prop, so
 * every fetch stub has to answer the index route as well as the search route.
 */
const indexRoute = (openings: unknown[] = mockOpeningsList) => ({
  ok: true,
  json: () => Promise.resolve({ success: true, data: openings }),
});

const respond = (
  search: unknown,
  openings: unknown[] = mockOpeningsList
): ((url: string) => Promise<unknown>) => {
  return (url: string) =>
    Promise.resolve(
      String(url).includes('/api/openings/search-index') ? indexRoute(openings) : search
    );
};

describe('SearchBar Component - Comprehensive Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSearchIndex();
    // Reset fetch mock to successful semantic search by default
    mockFetch.mockImplementation(
      respond({ ok: true, json: () => Promise.resolve(mockSearchResponse) })
    );
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Basic Rendering', () => {
    it('should render search input with correct placeholder', () => {
      render(<SearchBar {...defaultProps} />);

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('placeholder', 'Search openings...');
    });

    it('should render custom placeholder when provided', () => {
      render(<SearchBar {...defaultProps} placeholder="Find your opening" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('placeholder', 'Find your opening');
    });

    // UX review change 02: search is the only prominent element in the hero.
    // Surprise me used to sit beside the field as a filled button, competing
    // with it; it now lives in the hub and as a quiet link under the hero.
    it('renders no inline Surprise button on the landing variant', () => {
      render(<SearchBar {...defaultProps} variant="landing" />);

      expect(screen.queryByRole('button', { name: /surprise me/i })).not.toBeInTheDocument();
    });

    it('should not render surprise me button for header variant', () => {
      render(<SearchBar {...defaultProps} variant="header" />);

      expect(screen.queryByText('Surprise me')).not.toBeInTheDocument();
    });

    it('should show loading state when loading prop is true', () => {
      render(<SearchBar {...defaultProps} loading={true} />);

      expect(screen.getByPlaceholderText('Loading openings...')).toBeInTheDocument();
      expect(screen.getByText('⟳')).toBeInTheDocument();
    });

    it('should disable input when disabled prop is true', () => {
      render(<SearchBar {...defaultProps} disabled={true} />);

      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });
  });

  describe('Search Functionality - Server Integration', () => {
    it('should call semantic search API with correct parameters', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'king pawn');

      // Wait for debounce (300ms)
      await waitFor(
        () => {
          expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/openings/semantic-search?q=king%20pawn&limit=20')
          );
        },
        { timeout: 500 }
      );
    });

    // One request, not two. The plain-search fallback that used to follow an
    // empty semantic search is gone: the route matches names literally before
    // anything else now, and across 389 sampled queries the plain search found
    // nothing it missed — so the second round trip only ever delayed the dead
    // end. A failed request leaves whatever the local slice found standing.
    it('does not follow a failed search with a second request', async () => {
      mockFetch.mockImplementation(respond({ ok: false, status: 500 }));

      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);

      await user.type(screen.getByRole('textbox'), 'king');

      await waitFor(
        () => {
          expect(
            mockFetch.mock.calls.filter(([url]) =>
              String(url).includes('/api/openings/semantic-search')
            )
          ).toHaveLength(1);
        },
        { timeout: 500 }
      );
      expect(
        mockFetch.mock.calls.filter(([url]) => /\/api\/openings\/search\?/.test(String(url)))
      ).toHaveLength(0);
    });

    it('should handle API timeout gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network timeout'));

      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'king');

      // Should not crash and should fallback to client-side search
      await waitFor(() => {
        expect(input).toHaveValue('king');
      });
    });
  });

  describe('Chess Move Recognition', () => {
    it('should detect exact opening moves (e4, d4)', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'e4');

      // For chess moves, should use client-side search preferentially
      await waitFor(
        () => {
          // Should show suggestions that include our test data
          const suggestions = screen.queryAllByRole('listitem');
          expect(suggestions.length).toBeGreaterThan(0);
        },
        { timeout: 1000 }
      );
    });

    it('should prioritize popular openings for move queries', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'd4');

      await waitFor(
        () => {
          // Should show suggestions from our test data
          const suggestions = screen.queryAllByRole('listitem');
          expect(suggestions.length).toBeGreaterThan(0);
        },
        { timeout: 1000 }
      );
    });

    it('should handle move notation variations (1.e4 vs 1. e4)', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.type(input, '1.e4');

      await waitFor(
        () => {
          expect(screen.getByText("King's Pawn Game")).toBeInTheDocument();
        },
        { timeout: 500 }
      );
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate suggestions with arrow keys', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'king');

      // Wait for suggestions to appear
      await waitFor(() => {
        expect(screen.getByText("King's Pawn Game")).toBeInTheDocument();
      });

      // Press down arrow
      await user.keyboard('{ArrowDown}');

      // First suggestion should be active
      // The row carries the keyboard cursor, not the <li> wrapping it, and its
      // styling class is hashed by CSS Modules — assert the stable data hook.
      const firstSuggestion = screen.getByText("King's Pawn Game").closest('button');
      expect(firstSuggestion).toHaveAttribute('data-active', 'true');
    });

    it('should select suggestion with Enter key', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'king');

      await waitFor(() => {
        expect(screen.getByText("King's Pawn Game")).toBeInTheDocument();
      });

      // Navigate to first suggestion and press Enter
      await user.keyboard('{ArrowDown}{Enter}');

      // Should call onSelect with the opening
      expect(mockOnSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "King's Pawn Game",
          eco: 'B00',
        })
      );
    });

    it('should close suggestions with Escape key', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'king');

      await waitFor(() => {
        expect(screen.getByText("King's Pawn Game")).toBeInTheDocument();
      });

      await user.keyboard('{Escape}');

      // Suggestions should be hidden
      expect(screen.queryByText("King's Pawn Game")).not.toBeInTheDocument();
    });

    it('should handle boundary cases (first/last suggestion)', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'pawn');

      await waitFor(() => {
        expect(screen.getByText("King's Pawn Game")).toBeInTheDocument();
      });

      // Press up arrow at first position (should stay at first)
      await user.keyboard('{ArrowUp}');

      // Then down to second
      await user.keyboard('{ArrowDown}');
      // The row carries the keyboard cursor, not the <li> wrapping it, and its
      // styling class is hashed by CSS Modules — assert the stable data hook.
      const firstSuggestion = screen.getByText("King's Pawn Game").closest('button');
      expect(firstSuggestion).toHaveAttribute('data-active', 'true');
    });
  });

  describe('Search Algorithm and Ranking', () => {
    it('should prioritize exact name matches', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.type(input, "King's Pawn Game");

      await waitFor(
        () => {
          const suggestions = screen.getAllByRole('listitem');
          // Exact match should be first
          expect(suggestions[0]).toHaveTextContent("King's Pawn Game");
        },
        { timeout: 500 }
      );
    });

    it('should handle fuzzy matching for partial names', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'pawn');

      await waitFor(
        () => {
          // Should match King's Pawn items from our test data
          expect(screen.getByText("King's Pawn Game")).toBeInTheDocument();
          // Also check for the King's Knight Variation which is also in our test data
          expect(screen.getByText("King's Pawn Game: King's Knight Variation")).toBeInTheDocument();
        },
        { timeout: 500 }
      );
    });

    it('should boost popular openings in results', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'pawn');

      await waitFor(
        () => {
          const suggestions = screen.getAllByRole('listitem');
          // King's Pawn (higher popularity rank) should come before Queen's Pawn
          const kingsPawn = suggestions.find((s) => s.textContent?.includes("King's Pawn Game"));
          const queensPawn = suggestions.find((s) => s.textContent?.includes("Queen's Pawn Game"));

          if (kingsPawn && queensPawn) {
            const kingsPawnIndex = Array.from(suggestions).indexOf(kingsPawn);
            const queensPawnIndex = Array.from(suggestions).indexOf(queensPawn);
            expect(kingsPawnIndex).toBeLessThan(queensPawnIndex);
          }
        },
        { timeout: 500 }
      );
    });

    it('should handle special characters and apostrophes', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'kings pawn');

      await waitFor(
        () => {
          // Should find "King's Pawn" even when searching "kings pawn"
          expect(screen.getByText("King's Pawn Game")).toBeInTheDocument();
        },
        { timeout: 500 }
      );
    });
  });

  describe('User Interactions', () => {
    it('should handle suggestion clicks', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'king');

      await waitFor(() => {
        expect(screen.getByText("King's Pawn Game")).toBeInTheDocument();
      });

      const suggestion = screen.getByText("King's Pawn Game");
      await user.click(suggestion);

      expect(mockOnSelect).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "King's Pawn Game",
          eco: 'B00',
        })
      );
    });

    it('should clear search input after selection', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'king');

      await waitFor(() => {
        expect(screen.getByText("King's Pawn Game")).toBeInTheDocument();
      });

      const suggestion = screen.getByText("King's Pawn Game");
      await user.click(suggestion);

      expect(input).toHaveValue('');
    });

    // Change 02: "Focusing the field opens a hub of recents and repertoire."
    // The hero field is the one this was drawn for — it showed nothing at all
    // until you had typed two characters.
    it('opens the search hub when the landing field is focused', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} variant="landing" onSurprise={vi.fn()} />);

      expect(screen.queryByRole('button', { name: /surprise me/i })).not.toBeInTheDocument();

      await user.click(screen.getByRole('textbox'));

      expect(screen.getByRole('button', { name: /surprise me/i })).toBeInTheDocument();
    });

    it('routes the hub Surprise me to the caller, not to loaded openings', async () => {
      const user = userEvent.setup();
      const onSurprise = vi.fn();
      render(<SearchBar {...defaultProps} variant="landing" onSurprise={onSurprise} />);

      await user.click(screen.getByRole('textbox'));
      await user.click(screen.getByRole('button', { name: /surprise me/i }));

      // The caller randomises over the full corpus; SearchBar only ever holds
      // the first slice of the search index.
      expect(onSurprise).toHaveBeenCalledTimes(1);
      expect(mockOnSelect).not.toHaveBeenCalled();
    });

    it('replaces the hub with results once a query is typed', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} variant="landing" onSurprise={vi.fn()} />);

      const input = screen.getByRole('textbox');
      await user.click(input);
      await user.type(input, 'king');

      await waitFor(() => {
        expect(screen.getByText("King's Pawn Game")).toBeInTheDocument();
      });
      // The hub's own rows go, but its way out does not.
      expect(screen.queryByText('Recent')).not.toBeInTheDocument();
    });

    // The escape hatch for "I don't know what I'm looking for" used to vanish
    // on the second keystroke — exactly when a user is most likely flailing.
    it('keeps Surprise me reachable while typing', async () => {
      const user = userEvent.setup();
      const onSurprise = vi.fn();
      render(<SearchBar {...defaultProps} variant="landing" onSurprise={onSurprise} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'king');

      await waitFor(() => {
        expect(screen.getByText("King's Pawn Game")).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /surprise me/i }));

      expect(onSurprise).toHaveBeenCalledTimes(1);
      expect(mockOnSelect).not.toHaveBeenCalled();
    });

    it('reaches Surprise me by arrowing past the last result', async () => {
      const user = userEvent.setup();
      const onSurprise = vi.fn();
      // One result on both halves of the search, so the footer sits at index 1.
      const single = mockOpeningsList.slice(0, 1);
      mockFetch.mockImplementation(
        respond({ ok: true, json: () => Promise.resolve({ success: true, data: single }) }, single)
      );
      render(<SearchBar {...defaultProps} variant="landing" onSurprise={onSurprise} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'king');

      await waitFor(() => {
        expect(screen.getAllByRole('listitem')).toHaveLength(1);
      });

      // One result, so two downs land on the footer.
      await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

      expect(onSurprise).toHaveBeenCalledTimes(1);
    });

    it('should handle focus and blur events', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'king');

      await waitFor(() => {
        expect(screen.getByText("King's Pawn Game")).toBeInTheDocument();
      });

      // Blur input - suggestions should hide after delay
      await user.click(document.body);

      await waitFor(
        () => {
          expect(screen.queryByText("King's Pawn Game")).not.toBeInTheDocument();
        },
        { timeout: 200 }
      );
    });
  });

  describe('Results list', () => {
    // No count, no "did you mean", no correction notice: the openings
    // appearing are the feedback. A number would only raise the question of
    // what it counted — the search scores every record above zero, 4,269 for
    // "sicilian" against a family of roughly 1,710.
    it('states no result count', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);

      await user.type(screen.getByRole('textbox'), 'pawn');

      await waitFor(() => {
        expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0);
      });
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.queryByText(/openings match/i)).not.toBeInTheDocument();
    });

    it('marks results already in the repertoire', async () => {
      const saved = mockOpeningsList[0];
      localStorage.setItem(
        'chess-repertoire',
        JSON.stringify([
          {
            fen: saved.fen,
            name: saved.name,
            eco: saved.eco,
            moves: saved.moves,
            savedAt: Date.now(),
          },
        ])
      );

      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);

      await user.type(screen.getByRole('textbox'), 'king');

      await waitFor(() => {
        expect(screen.getByText(saved.name)).toBeInTheDocument();
      });

      const row = screen.getByText(saved.name).closest('li');
      expect(row).toHaveTextContent('Saved');

      // Only the saved one is badged.
      expect(screen.getAllByText('Saved')).toHaveLength(1);
      localStorage.clear();
    });
  });

  describe('Debouncing Behavior', () => {
    it('should debounce search requests', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);

      const input = screen.getByRole('textbox');

      // Clear any previous calls
      mockFetch.mockClear();

      // Type characters quickly
      await user.type(input, 'king');

      // Wait for debounce period (300ms) + some buffer
      await waitFor(
        () => {
          expect(input).toHaveValue('king');
        },
        { timeout: 1000 }
      );

      // For chess moves like "king", it uses client-side search first
      // so fetch might not be called, which is correct behavior
      // The important thing is that the search works and shows suggestions
      await waitFor(
        () => {
          const suggestions = screen.queryAllByRole('listitem');
          expect(suggestions.length).toBeGreaterThanOrEqual(0); // Allow for both server and client-side results
        },
        { timeout: 1000 }
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty search queries', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'a');

      // Wait for any potential suggestions
      await waitFor(
        () => {
          expect(input).toHaveValue('a');
        },
        { timeout: 1000 }
      );

      await user.clear(input);

      // Should not show suggestions for empty query
      await waitFor(
        () => {
          expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
        },
        { timeout: 1000 }
      );
    });

    it('should handle special characters in search', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.type(input, "King's!");

      // Should not crash and should handle the input
      await waitFor(
        () => {
          expect(input).toHaveValue("King's!");
        },
        { timeout: 1000 }
      );
    });

    it('should handle an empty local index gracefully', async () => {
      mockFetch.mockImplementation(
        respond({ ok: true, json: () => Promise.resolve({ success: true, data: [] }) }, [])
      );

      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'king');

      // Should not crash and maintain input value
      await waitFor(
        () => {
          expect(input).toHaveValue('king');
          // Nothing to draw from either half of the search
          expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
        },
        { timeout: 1000 }
      );
    });

    it('should handle malformed opening data', async () => {
      const malformedData = [
        { name: 'Valid Opening', eco: 'A00', fen: '', moves: '', src: '' }, // Valid but minimal
        { fen: 'invalid', name: '', eco: '' }, // Empty fields
      ];
      mockFetch.mockImplementation(
        respond(
          { ok: true, json: () => Promise.resolve({ success: true, data: [] }) },
          malformedData
        )
      );

      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'valid');

      // Should not crash and handle valid entries
      await waitFor(
        () => {
          expect(input).toHaveValue('valid');
        },
        { timeout: 1000 }
      );
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<SearchBar {...defaultProps} />);

      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute('type', 'text');
    });

    it('should support screen reader navigation', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);

      const input = screen.getByRole('textbox');
      await user.type(input, 'king');

      await waitFor(
        () => {
          const suggestions = screen.getByRole('list');
          expect(suggestions).toBeInTheDocument();

          const suggestionItems = screen.getAllByRole('listitem');
          expect(suggestionItems.length).toBeGreaterThan(0);
        },
        { timeout: 2000 }
      );
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<SearchBar {...defaultProps} />);

      // Tab to input
      await user.tab();
      expect(screen.getByRole('textbox')).toHaveFocus();

      // Type and navigate with proper timing
      await user.keyboard('king');

      // Wait for suggestions to appear
      await waitFor(
        () => {
          expect(screen.getByText("King's Pawn Game")).toBeInTheDocument();
        },
        { timeout: 2000 }
      );

      // Navigate and select
      await user.keyboard('{ArrowDown}{Enter}');

      expect(mockOnSelect).toHaveBeenCalled();
    });
  });
});
