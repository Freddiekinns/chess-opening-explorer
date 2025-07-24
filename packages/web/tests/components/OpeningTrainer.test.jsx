import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import '@testing-library/jest-dom';
import OpeningTrainer from '../../src/components/OpeningTrainer';

// Mock fetch to simulate API responses
global.fetch = vi.fn();

describe('OpeningTrainer Component Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should load ECO categories on mount', async () => {
    const mockCategories = ['A00', 'A01', 'B00', 'B01', 'C00'];
    
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockCategories
      })
    });

    render(<OpeningTrainer />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/openings/categories');
    });

    // Should display ECO selector
    expect(screen.getByLabelText(/ECO Code/i)).toBeInTheDocument();
  });

  it('should load and display a random opening with real ECO data structure', async () => {
    // Mock categories response
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: ['A00', 'B00', 'C00']
      })
    });

    // Mock random opening response with real ECO structure
    const mockOpening = {
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      eco: 'B00',
      name: "King's Pawn Game",
      moves: '1. e4',
      src: 'eco_tsv',
      aliases: {
        scid: "King's Pawn Opening"
      }
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockOpening
      })
    });

    render(<OpeningTrainer />);

    // Wait for categories to load
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/openings/categories');
    });

    // Click "New Random Opening" button
    const randomButton = screen.getByText(/New Random Opening/i);
    fireEvent.click(randomButton);

    // Wait for opening to load
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/openings/random');
    });

    // Should display opening name and ECO code
    expect(screen.getByText("King's Pawn Game")).toBeInTheDocument();
    expect(screen.getByText('B00')).toBeInTheDocument();
    
    // Should display source information
    expect(screen.getByText(/Source:/)).toBeInTheDocument();
    expect(screen.getByText('eco_tsv')).toBeInTheDocument();

    // Should display aliases
    expect(screen.getByText(/Also known as:/)).toBeInTheDocument();
    expect(screen.getByText("King's Pawn Opening")).toBeInTheDocument();
  });

  it('should handle move navigation correctly with real move sequences', async () => {
    // Mock categories response
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: ['A00']
      })
    });

    // Mock opening with multiple moves
    const mockOpening = {
      fen: 'rnbqkb1r/pppp1ppp/5n2/4p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 2 3',
      eco: 'C50',
      name: 'Italian Game',
      moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4',
      src: 'eco_tsv'
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockOpening
      })
    });

    render(<OpeningTrainer />);

    // Wait for categories and click random opening
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/openings/categories');
    });

    const randomButton = screen.getByText(/New Random Opening/i);
    fireEvent.click(randomButton);

    await waitFor(() => {
      expect(screen.getByText('Italian Game')).toBeInTheDocument();
    });

    // Should have move navigation controls
    expect(screen.getByText(/⏮ Reset/)).toBeInTheDocument();
    expect(screen.getByText(/⏪ Previous/)).toBeInTheDocument();
    expect(screen.getByText(/⏩ Next/)).toBeInTheDocument();
    expect(screen.getByText(/⏭ End/)).toBeInTheDocument();

    // Test move navigation
    const nextButton = screen.getByText(/⏩ Next/);
    fireEvent.click(nextButton);

    // Should update move index (we can test this by checking if buttons become enabled/disabled)
    const previousButton = screen.getByText(/⏪ Previous/);
    expect(previousButton).not.toBeDisabled();
  });

  it('should filter openings by ECO code', async () => {
    // Mock categories response
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: ['A00', 'B00', 'C00']
      })
    });

    // Mock ECO-specific opening response
    const mockEcoOpenings = [
      {
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        eco: 'A00',
        name: 'Van Kruijs Opening',
        moves: '1. e3',
        src: 'eco_tsv'
      }
    ];

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockEcoOpenings
      })
    });

    render(<OpeningTrainer />);

    // Wait for categories to load
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/openings/categories');
    });

    // Select an ECO code
    const ecoSelect = screen.getByLabelText(/ECO Code/i);
    fireEvent.change(ecoSelect, { target: { value: 'A00' } });

    // Should make API call for specific ECO code
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/openings/eco/A00');
    });

    // Should display the opening
    expect(screen.getByText('Van Kruijs Opening')).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    // Mock failed categories response
    fetch.mockRejectedValueOnce(new Error('API Error'));

    render(<OpeningTrainer />);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/Error loading ECO categories/)).toBeInTheDocument();
    });
  });

  it('should toggle solution display', async () => {
    // Mock responses
    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: ['A00'] })
    });

    const mockOpening = {
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      eco: 'B00',
      name: "King's Pawn Game",
      moves: '1. e4',
      src: 'eco_tsv'
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockOpening })
    });

    render(<OpeningTrainer />);

    // Load an opening
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/openings/categories');
    });

    const randomButton = screen.getByText(/New Random Opening/i);
    fireEvent.click(randomButton);

    await waitFor(() => {
      expect(screen.getByText("King's Pawn Game")).toBeInTheDocument();
    });

    // Initially solution should be hidden
    expect(screen.queryByText(/Move sequence:/)).not.toBeInTheDocument();

    // Toggle solution display
    const solutionButton = screen.getByText(/Show Solution/);
    fireEvent.click(solutionButton);

    // Should show solution
    expect(screen.getByText(/Move sequence:/)).toBeInTheDocument();
    expect(screen.getByText('1. e4')).toBeInTheDocument();

    // Button text should change
    expect(screen.getByText(/Hide Solution/)).toBeInTheDocument();
  });
});
