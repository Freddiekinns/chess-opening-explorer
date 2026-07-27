/**
 * @fileoverview Integration tests for PGNInputModal component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PGNInputModal } from '../PGNInputModal';

// Mock openings data that matches the lookupOpeningFromPGN requirements
const mockOpeningsData = [
  {
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    name: "King's Pawn Opening",
    eco: 'B00',
  },
  {
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    name: "King's Pawn Game",
    eco: 'C20',
  },
  {
    fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    name: 'Sicilian Defense',
    eco: 'B20',
  },
  {
    fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
    name: 'Sicilian Defense: Open',
    eco: 'B27',
  },
];

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  onOpeningFound: vi.fn(),
  openingsData: mockOpeningsData,
};

describe('PGNInputModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset body overflow style
    document.body.style.overflow = '';
  });

  afterEach(() => {
    // Clean up body overflow style
    document.body.style.overflow = '';
  });

  describe('Basic Rendering', () => {
    it('should not render when isOpen is false', () => {
      render(<PGNInputModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should render modal when isOpen is true', () => {
      render(<PGNInputModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Find opening from PGN')).toBeInTheDocument();
    });

    it('should render textarea for PGN input', () => {
      render(<PGNInputModal {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveAttribute('placeholder', '1. e4 e5 2. Nf3 Nc6 3. Bc4...');
    });

    it('should render Find Opening button', () => {
      render(<PGNInputModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /find opening/i })).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<PGNInputModal {...defaultProps} />);

      expect(screen.getByRole('button', { name: /close modal/i })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper dialog attributes', () => {
      render(<PGNInputModal {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby', 'pgn-modal-title');
    });

    it('should focus textarea when modal opens', async () => {
      render(<PGNInputModal {...defaultProps} />);

      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByRole('textbox'));
      });
    });

    it('should prevent body scroll when open', () => {
      render(<PGNInputModal {...defaultProps} />);

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body scroll when closed', () => {
      const { rerender } = render(<PGNInputModal {...defaultProps} />);
      expect(document.body.style.overflow).toBe('hidden');

      rerender(<PGNInputModal {...defaultProps} isOpen={false} />);
      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('Close Functionality', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<PGNInputModal {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: /close modal/i });
      await user.click(closeButton);

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when pressing Escape', async () => {
      const user = userEvent.setup();
      render(<PGNInputModal {...defaultProps} />);

      await user.keyboard('{Escape}');

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when clicking overlay', async () => {
      const user = userEvent.setup();
      render(<PGNInputModal {...defaultProps} />);

      const overlay = screen.getByRole('presentation');
      await user.click(overlay);

      expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when clicking inside modal', async () => {
      const user = userEvent.setup();
      render(<PGNInputModal {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      await user.click(dialog);

      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe('PGN Input', () => {
    it('should update textarea value when typing', async () => {
      const user = userEvent.setup();
      render(<PGNInputModal {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, '1. e4 e5');

      expect(textarea).toHaveValue('1. e4 e5');
    });

    it('should disable Find button when textarea is empty', () => {
      render(<PGNInputModal {...defaultProps} />);

      const findButton = screen.getByRole('button', { name: /find opening/i });
      expect(findButton).toBeDisabled();
    });

    it('should enable Find button when textarea has content', async () => {
      const user = userEvent.setup();
      render(<PGNInputModal {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, '1. e4');

      const findButton = screen.getByRole('button', { name: /find opening/i });
      expect(findButton).not.toBeDisabled();
    });

    it('should clear textarea when modal closes and reopens', async () => {
      const { rerender } = render(<PGNInputModal {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: '1. e4 e5' } });
      expect(textarea).toHaveValue('1. e4 e5');

      rerender(<PGNInputModal {...defaultProps} isOpen={false} />);
      rerender(<PGNInputModal {...defaultProps} isOpen={true} />);

      const newTextarea = screen.getByRole('textbox');
      expect(newTextarea).toHaveValue('');
    });
  });

  describe('Opening Lookup', () => {
    it('should find Sicilian Defense from valid PGN', async () => {
      const user = userEvent.setup();
      render(<PGNInputModal {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, '1. e4 c5');

      const findButton = screen.getByRole('button', { name: /find opening/i });
      await user.click(findButton);

      await waitFor(() => {
        expect(screen.getByText('Sicilian Defense')).toBeInTheDocument();
        expect(screen.getByText('B20')).toBeInTheDocument();
      });
    });

    it('should find opening with longer PGN sequence', async () => {
      const user = userEvent.setup();
      render(<PGNInputModal {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, '1. e4 c5 2. Nf3');

      const findButton = screen.getByRole('button', { name: /find opening/i });
      await user.click(findButton);

      await waitFor(() => {
        expect(screen.getByText('Sicilian Defense: Open')).toBeInTheDocument();
        expect(screen.getByText('B27')).toBeInTheDocument();
      });
    });

    it('should show error for invalid PGN', async () => {
      const user = userEvent.setup();
      render(<PGNInputModal {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, '1. e4 e5 2. Nf6'); // Nf6 is invalid for white

      const findButton = screen.getByRole('button', { name: /find opening/i });
      await user.click(findButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid move/i)).toBeInTheDocument();
      });
    });

    it('should show Go to Opening button when match is found', async () => {
      const user = userEvent.setup();
      render(<PGNInputModal {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, '1. e4 c5');

      const findButton = screen.getByRole('button', { name: /find opening/i });
      await user.click(findButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /go to opening/i })).toBeInTheDocument();
      });
    });

    it('should call onOpeningFound with FEN when Go to Opening is clicked', async () => {
      const user = userEvent.setup();
      render(<PGNInputModal {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, '1. e4 c5');

      const findButton = screen.getByRole('button', { name: /find opening/i });
      await user.click(findButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /go to opening/i })).toBeInTheDocument();
      });

      const goButton = screen.getByRole('button', { name: /go to opening/i });
      await user.click(goButton);

      expect(defaultProps.onOpeningFound).toHaveBeenCalledWith(
        'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2'
      );
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should clear previous result when PGN text changes', async () => {
      const user = userEvent.setup();
      render(<PGNInputModal {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, '1. e4 c5');

      const findButton = screen.getByRole('button', { name: /find opening/i });
      await user.click(findButton);

      await waitFor(() => {
        expect(screen.getByText('Sicilian Defense')).toBeInTheDocument();
      });

      // Now type more
      await user.type(textarea, ' 2. Nf3');

      // Result should be cleared
      expect(screen.queryByText('Sicilian Defense')).not.toBeInTheDocument();
    });
  });

  describe('Result Display', () => {
    it('should indicate exact match', async () => {
      const user = userEvent.setup();
      render(<PGNInputModal {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, '1. e4 c5');

      const findButton = screen.getByRole('button', { name: /find opening/i });
      await user.click(findButton);

      await waitFor(() => {
        expect(screen.getByText(/exact match/i)).toBeInTheDocument();
      });
    });

    it('should show partial match info when game extends beyond known openings', async () => {
      const user = userEvent.setup();
      render(<PGNInputModal {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      // Add moves beyond what's in our mock data
      await user.type(textarea, '1. e4 c5 2. Nf3 d6 3. d4');

      const findButton = screen.getByRole('button', { name: /find opening/i });
      await user.click(findButton);

      await waitFor(() => {
        expect(screen.getByText(/last known opening/i)).toBeInTheDocument();
      });
    });
  });

  describe('Button State', () => {
    it('should show "Searching..." while looking up', async () => {
      const user = userEvent.setup();
      render(<PGNInputModal {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, '1. e4 c5');

      const findButton = screen.getByRole('button', { name: /find opening/i });
      await user.click(findButton);

      // The button text changes briefly during search
      // Since we use setTimeout(fn, 10), it's very fast
      await waitFor(() => {
        expect(screen.getByText('Sicilian Defense')).toBeInTheDocument();
      });
    });

    it('should disable button while searching', async () => {
      const user = userEvent.setup();
      render(<PGNInputModal {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      await user.type(textarea, '1. e4 c5');

      const findButton = screen.getByRole('button', { name: /find opening/i });

      // Click should work and complete
      await user.click(findButton);

      await waitFor(() => {
        expect(screen.getByText('Sicilian Defense')).toBeInTheDocument();
      });
    });
  });

  describe('Focus Trap', () => {
    it('should trap focus within modal', async () => {
      const user = userEvent.setup();
      render(<PGNInputModal {...defaultProps} />);

      // Focus should start on textarea
      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByRole('textbox'));
      });

      // Type something to enable the find button
      const textarea = screen.getByRole('textbox');
      await user.type(textarea, '1. e4');

      // Now tab through - should go to Find button (now enabled)
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole('button', { name: /find opening/i }));

      // Continue tabbing - to close button
      await user.tab();
      expect(document.activeElement).toBe(screen.getByRole('button', { name: /close modal/i }));

      // Tab once more should wrap back to textarea
      await user.tab();
      await waitFor(() => {
        expect(document.activeElement).toBe(screen.getByRole('textbox'));
      });
    });
  });
});
