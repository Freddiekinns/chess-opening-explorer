import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { PlansDiagram } from '../PlansDiagram';
import { positionCaption } from '../../../lib/openingBook';

type BoardOptions = {
  position?: string;
  allowDragging?: boolean;
  onPieceDrop?: unknown;
  onSquareClick?: unknown;
};
let lastOptions: BoardOptions | undefined;
vi.mock('react-chessboard', () => ({
  Chessboard: ({ options }: { options: BoardOptions }) => {
    lastOptions = options;
    return <div data-testid="diagram-board" />;
  },
}));

const GIUOCO = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQK2R b KQkq - 0 5';

describe('PlansDiagram', () => {
  test('shows the page position, and it cannot be moved', () => {
    render(
      <PlansDiagram
        fen={GIUOCO}
        moves={['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3']}
      />
    );

    expect(screen.getByTestId('diagram-board')).toBeInTheDocument();
    expect(lastOptions?.position).toBe(GIUOCO);
    expect(lastOptions?.allowDragging).toBe(false);
    expect(lastOptions?.onPieceDrop).toBeUndefined();
    expect(lastOptions?.onSquareClick).toBeUndefined();
  });

  test('is a figure captioned with the last move', () => {
    render(
      <PlansDiagram
        fen={GIUOCO}
        moves={['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3']}
      />
    );

    expect(screen.getByRole('figure', { name: 'Position after 5.d3' })).toBeInTheDocument();
  });
});

describe('positionCaption', () => {
  test('numbers a White move with one dot', () => {
    expect(positionCaption(['e4', 'e5', 'Nf3'])).toBe('Position after 2.Nf3');
  });

  test('numbers a Black move with three dots', () => {
    expect(positionCaption(['e4', 'e5'])).toBe('Position after 1...e5');
  });

  test('says starting position when there are no moves', () => {
    expect(positionCaption([])).toBe('Starting position');
  });
});
