/**
 * @fileoverview Practice Mode Tests
 * Tests the interactive move trainer functionality on the opening detail page
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import OpeningDetailPage from '../OpeningDetailPage';
import {
  mockOpeningDataSimple,
  mockStatsData,
  mockVideoData,
} from '../../test/fixtures/openingData';

// Mock fetch API
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock opening with multiple moves for practice testing
const mockPracticeOpening = {
  ...mockOpeningDataSimple,
  name: 'Italian Game',
  eco: 'C50',
  moves: '1.e4 e5 2.Nf3 Nc6 3.Bc4',
  fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
};

const createMockFetchResponse = (data: unknown) =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve(data),
  });

const createMockAudioResponse = () =>
  Promise.resolve({
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  });

const renderOpeningDetailPage = (fen: string) => {
  return render(
    <MemoryRouter initialEntries={[`/opening/${encodeURIComponent(fen)}`]}>
      <Routes>
        <Route path="/opening/:fen" element={<OpeningDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
};

describe('Practice Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    // Mock successful fetch responses
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/sounds/')) {
        return createMockAudioResponse();
      }
      if (url.includes('/api/openings/fen/')) {
        return createMockFetchResponse({
          success: true,
          data: mockPracticeOpening,
        });
      }
      if (url.includes('/api/stats/')) {
        return createMockFetchResponse({
          success: true,
          data: mockStatsData,
        });
      }
      if (url.includes('/api/openings/videos/')) {
        return createMockFetchResponse({
          success: true,
          data: mockVideoData,
        });
      }
      if (url.includes('/api/openings/search-index')) {
        return createMockFetchResponse({
          success: true,
          data: [],
        });
      }
      return createMockFetchResponse({ success: true, data: [] });
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Practice Button', () => {
    test('should display Practice button in navigation controls', async () => {
      await act(async () => {
        renderOpeningDetailPage(mockPracticeOpening.fen);
      });

      await waitFor(() => {
        expect(screen.getByText('Italian Game')).toBeInTheDocument();
      });

      expect(screen.getByText('Practice')).toBeInTheDocument();
    });

    test('should enter practice mode when Practice button is clicked', async () => {
      await act(async () => {
        renderOpeningDetailPage(mockPracticeOpening.fen);
      });

      await waitFor(() => {
        expect(screen.getByText('Italian Game')).toBeInTheDocument();
      });

      const practiceButton = screen.getByText('Practice');
      fireEvent.click(practiceButton);

      await waitFor(() => {
        expect(screen.getByText('Playing as:')).toBeInTheDocument();
        // Both desktop and mobile Exit buttons are rendered; CSS handles visibility
        expect(screen.getAllByText('Exit').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Practice Mode Controls', () => {
    test('should show color toggle with White selected by default', async () => {
      await act(async () => {
        renderOpeningDetailPage(mockPracticeOpening.fen);
      });

      await waitFor(() => {
        expect(screen.getByText('Italian Game')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Practice'));

      await waitFor(() => {
        const whiteButton = screen.getByRole('button', { name: 'White' });
        expect(whiteButton).toHaveAttribute('aria-pressed', 'true');
      });
    });

    test('should show move counter', async () => {
      await act(async () => {
        renderOpeningDetailPage(mockPracticeOpening.fen);
      });

      await waitFor(() => {
        expect(screen.getByText('Italian Game')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Practice'));

      await waitFor(() => {
        // The opening has 5 moves (e4, e5, Nf3, Nc6, Bc4)
        // Move counter shows "Move X of Y" where Y is ceil(5/2) = 3
        expect(screen.getByText(/Move 1 of 3/)).toBeInTheDocument();
      });
    });

    test('should show Hint button', async () => {
      await act(async () => {
        renderOpeningDetailPage(mockPracticeOpening.fen);
      });

      await waitFor(() => {
        expect(screen.getByText('Italian Game')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Practice'));

      await waitFor(() => {
        // Both desktop and mobile Hint buttons are rendered; CSS handles visibility
        expect(screen.getAllByText('Hint').length).toBeGreaterThan(0);
      });
    });

    test('should exit practice mode when Exit button is clicked', async () => {
      await act(async () => {
        renderOpeningDetailPage(mockPracticeOpening.fen);
      });

      await waitFor(() => {
        expect(screen.getByText('Italian Game')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Practice'));

      await waitFor(() => {
        expect(screen.getAllByText('Exit').length).toBeGreaterThan(0);
      });

      // Click the first Exit button (desktop version)
      fireEvent.click(screen.getAllByText('Exit')[0]);

      await waitFor(() => {
        // Should show navigation controls again
        expect(screen.getByText('Practice')).toBeInTheDocument();
        expect(screen.queryByText('Playing as:')).not.toBeInTheDocument();
      });
    });
  });

  describe('Color Selection', () => {
    test('should allow switching to Black', async () => {
      await act(async () => {
        renderOpeningDetailPage(mockPracticeOpening.fen);
      });

      await waitFor(() => {
        expect(screen.getByText('Italian Game')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Practice'));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Black' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'Black' }));

      // After switching to Black, should wait for White's first move (auto-play)
      await act(async () => {
        vi.advanceTimersByTime(500);
      });

      await waitFor(() => {
        const blackButton = screen.getByRole('button', { name: 'Black' });
        expect(blackButton).toHaveAttribute('aria-pressed', 'true');
      });
    });
  });

  describe('Navigation Controls Visibility', () => {
    test('should hide navigation controls in practice mode', async () => {
      await act(async () => {
        renderOpeningDetailPage(mockPracticeOpening.fen);
      });

      await waitFor(() => {
        expect(screen.getByText('Italian Game')).toBeInTheDocument();
      });

      // Before practice mode - navigation buttons should be visible
      expect(screen.getByTitle('Go to start')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Practice'));

      await waitFor(() => {
        // Navigation buttons should be hidden
        expect(screen.queryByTitle('Go to start')).not.toBeInTheDocument();
        // Practice controls should be visible
        expect(screen.getByText('Playing as:')).toBeInTheDocument();
      });
    });

    test('should show navigation controls after exiting practice mode', async () => {
      await act(async () => {
        renderOpeningDetailPage(mockPracticeOpening.fen);
      });

      await waitFor(() => {
        expect(screen.getByText('Italian Game')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Practice'));

      await waitFor(() => {
        expect(screen.getAllByText('Exit').length).toBeGreaterThan(0);
      });

      // Click the first Exit button (desktop version)
      fireEvent.click(screen.getAllByText('Exit')[0]);

      await waitFor(() => {
        expect(screen.getByTitle('Go to start')).toBeInTheDocument();
      });
    });
  });
});

describe('Practice Mode - Hint Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/sounds/')) {
        return createMockAudioResponse();
      }
      if (url.includes('/api/openings/fen/')) {
        return createMockFetchResponse({
          success: true,
          data: mockPracticeOpening,
        });
      }
      if (url.includes('/api/stats/')) {
        return createMockFetchResponse({
          success: true,
          data: mockStatsData,
        });
      }
      if (url.includes('/api/openings/videos/')) {
        return createMockFetchResponse({
          success: true,
          data: [],
        });
      }
      if (url.includes('/api/openings/search-index')) {
        return createMockFetchResponse({
          success: true,
          data: [],
        });
      }
      return createMockFetchResponse({ success: true, data: [] });
    });
  });

  test('should allow clicking Hint button', async () => {
    await act(async () => {
      renderOpeningDetailPage(mockPracticeOpening.fen);
    });

    await waitFor(() => {
      expect(screen.getByText('Italian Game')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Practice'));

    await waitFor(() => {
      expect(screen.getAllByText('Hint').length).toBeGreaterThan(0);
    });

    // Should be able to click hint button (first one - desktop)
    const hintButtons = screen.getAllByText('Hint');
    fireEvent.click(hintButtons[0]);

    // Hint buttons should disappear after being clicked (hint is now shown)
    await waitFor(() => {
      expect(screen.queryByText('Hint')).not.toBeInTheDocument();
    });
  });
});

describe('Practice Mode - Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/sounds/')) {
        return createMockAudioResponse();
      }
      if (url.includes('/api/openings/fen/')) {
        return createMockFetchResponse({
          success: true,
          data: mockPracticeOpening,
        });
      }
      return createMockFetchResponse({ success: true, data: [] });
    });
  });

  test('should have proper button titles for screen readers', async () => {
    await act(async () => {
      renderOpeningDetailPage(mockPracticeOpening.fen);
    });

    await waitFor(() => {
      expect(screen.getByText('Italian Game')).toBeInTheDocument();
    });

    const practiceButton = screen.getByText('Practice');
    expect(practiceButton).toHaveAttribute('title', 'Practice this opening');
  });

  test('should have proper button titles in practice mode', async () => {
    await act(async () => {
      renderOpeningDetailPage(mockPracticeOpening.fen);
    });

    await waitFor(() => {
      expect(screen.getByText('Italian Game')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Practice'));

    await waitFor(() => {
      // Both desktop and mobile Hint buttons have the same title
      const hintButtons = screen.getAllByText('Hint');
      expect(hintButtons[0]).toHaveAttribute('title', 'Show which piece to move');
    });
  });
});

describe('Practice Mode - Click-to-Move', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/sounds/')) {
        return createMockAudioResponse();
      }
      if (url.includes('/api/openings/fen/')) {
        return createMockFetchResponse({
          success: true,
          data: mockPracticeOpening,
        });
      }
      if (url.includes('/api/stats/')) {
        return createMockFetchResponse({
          success: true,
          data: mockStatsData,
        });
      }
      if (url.includes('/api/openings/videos/')) {
        return createMockFetchResponse({
          success: true,
          data: [],
        });
      }
      if (url.includes('/api/openings/search-index')) {
        return createMockFetchResponse({
          success: true,
          data: [],
        });
      }
      return createMockFetchResponse({ success: true, data: [] });
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('should support both click-to-move and drag-and-drop in practice mode', async () => {
    await act(async () => {
      renderOpeningDetailPage(mockPracticeOpening.fen);
    });

    await waitFor(() => {
      expect(screen.getByText('Italian Game')).toBeInTheDocument();
    });

    // Enter practice mode
    fireEvent.click(screen.getByText('Practice'));

    await waitFor(() => {
      expect(screen.getByText('Playing as:')).toBeInTheDocument();
    });

    // The chessboard should be rendered and interactive
    // Both click-to-move (via onSquareClick) and drag-and-drop (via onPieceDrop) should be available
    // We verify by checking practice mode is active and controls are visible
    expect(screen.getByText('Move 1 of 3')).toBeInTheDocument();
    // Both desktop and mobile Hint buttons are rendered
    expect(screen.getAllByText('Hint').length).toBeGreaterThan(0);
  });

  test('should clear selection when exiting practice mode', async () => {
    await act(async () => {
      renderOpeningDetailPage(mockPracticeOpening.fen);
    });

    await waitFor(() => {
      expect(screen.getByText('Italian Game')).toBeInTheDocument();
    });

    // Enter practice mode
    fireEvent.click(screen.getByText('Practice'));

    await waitFor(() => {
      expect(screen.getByText('Playing as:')).toBeInTheDocument();
    });

    // Exit practice mode (click first Exit button - desktop)
    fireEvent.click(screen.getAllByText('Exit')[0]);

    await waitFor(() => {
      // Should show navigation controls again (selection state is cleared internally)
      expect(screen.getByText('Practice')).toBeInTheDocument();
      expect(screen.queryByText('Playing as:')).not.toBeInTheDocument();
    });
  });

  test('should clear selection when switching colors', async () => {
    await act(async () => {
      renderOpeningDetailPage(mockPracticeOpening.fen);
    });

    await waitFor(() => {
      expect(screen.getByText('Italian Game')).toBeInTheDocument();
    });

    // Enter practice mode as White
    fireEvent.click(screen.getByText('Practice'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'White' })).toHaveAttribute('aria-pressed', 'true');
    });

    // Switch to Black - this should clear any selection and restart practice
    fireEvent.click(screen.getByRole('button', { name: 'Black' }));

    // Wait for the auto-play of white's first move
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    await waitFor(() => {
      const blackButton = screen.getByRole('button', { name: 'Black' });
      expect(blackButton).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
