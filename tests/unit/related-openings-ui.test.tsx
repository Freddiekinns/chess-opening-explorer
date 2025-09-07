import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Components / hooks
import { RelatedOpeningsTeaser } from '../../packages/web/src/components/detail/RelatedOpeningsTeaser';
import { RelatedOpeningsTab } from '../../packages/web/src/components/detail/RelatedOpeningsTab';

// Mock the hook so we can control states
jest.mock('../../packages/web/src/useRelatedOpenings', () => ({
  useRelatedOpenings: jest.fn()
}));

const { useRelatedOpenings } = require('../../packages/web/src/useRelatedOpenings');

describe('Related Openings UI Components', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Teaser shows skeleton while loading', () => {
    useRelatedOpenings.mockReturnValue({ data: null, loading: true, error: null });
    render(<RelatedOpeningsTeaser fen="FEN1" />);
    expect(screen.getByRole('heading', { name: /related openings/i })).toBeInTheDocument();
    expect(screen.getByRole('list')).toHaveClass('skeleton');
  });

  test('Teaser hides when error', () => {
    useRelatedOpenings.mockReturnValue({ data: null, loading: false, error: 'boom' });
    const { container } = render(<RelatedOpeningsTeaser fen="FEN1" />);
    // component returns null
    expect(container.firstChild).toBeNull();
  });

  test('Teaser renders mainline + top variations + view all', () => {
    useRelatedOpenings.mockReturnValue({
      data: {
        current: { fen: 'VAR1', isEcoRoot: false },
        ecoCode: 'A00',
        mainline: { fen: 'MAIN', name: 'Mainline', isEcoRoot: true, games_analyzed: 5000 },
        siblings: [
          { fen: 'S1', name: 'Var A', isEcoRoot: false, games_analyzed: 1000 },
          { fen: 'S2', name: 'Var B', isEcoRoot: false, games_analyzed: 900 },
          { fen: 'S3', name: 'Var C', isEcoRoot: false, games_analyzed: 800 },
          { fen: 'S4', name: 'Var D', isEcoRoot: false, games_analyzed: 700 }
        ],
        counts: { siblings: 4 }
      },
      loading: false,
      error: null
    });
    render(<RelatedOpeningsTeaser fen="VAR1" />);
    expect(screen.getByText('Mainline')).toBeInTheDocument();
    expect(screen.getByText('View all (4)')).toBeInTheDocument();
  });

  test('Tab renders expand control when more than 10 siblings', () => {
    const siblings = Array.from({ length: 12 }).map((_, i) => ({
      fen: `F${i}`, name: `Var ${i}`, isEcoRoot: false, games_analyzed: 100 - i
    }));
    useRelatedOpenings.mockReturnValue({
      data: {
        current: { fen: 'MAIN', isEcoRoot: true },
        ecoCode: 'B01',
        mainline: { fen: 'MAIN', name: 'Some Mainline', isEcoRoot: true, games_analyzed: 9000 },
        siblings,
        counts: { siblings: siblings.length }
      },
      loading: false,
      error: null
    });
    render(<RelatedOpeningsTab fen="MAIN" />);
    expect(screen.getByText(/Variations \(12\)/i)).toBeInTheDocument();
    // Initially only first 10 rendered
    siblings.slice(0, 10).forEach(s => {
      expect(screen.getByText(s.name)).toBeInTheDocument();
    });
    expect(screen.queryByText('Var 11')).not.toBeNull();
    const btn = screen.getByRole('button', { name: /show all/i });
    fireEvent.click(btn);
    expect(screen.getByRole('button', { name: /collapse/i })).toBeInTheDocument();
  });

  test('Tab shows error state with retry button', () => {
    useRelatedOpenings.mockReturnValue({ data: null, loading: false, error: 'X' });
    render(<RelatedOpeningsTab fen="X" />);
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
