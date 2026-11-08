import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { PlansWithDiagram } from '../PlansWithDiagram';

type BoardOptions = {
  arrows?: { startSquare: string; endSquare: string; color: string }[];
  squareStyles?: Record<string, unknown>;
};
let lastOptions: BoardOptions | undefined;
vi.mock('react-chessboard', () => ({
  Chessboard: ({ options }: { options: BoardOptions }) => {
    lastOptions = options;
    return <div data-testid="diagram-board" />;
  },
}));

const GIUOCO = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2PP1N2/PP3PPP/RNBQK2R b KQkq - 0 5';
const MOVES = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd3'];
const PLANS = ['White: the Italian maneuver Nbd2-f1-g3', 'Black: play Qh7 at once'];

const caption = () => screen.getByRole('figure').querySelector('figcaption')?.textContent;

describe('PlansWithDiagram', () => {
  beforeEach(() => {
    lastOptions = undefined;
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  const renderIt = (props: Partial<React.ComponentProps<typeof PlansWithDiagram>> = {}) =>
    render(
      <PlansWithDiagram fen={GIUOCO} moves={MOVES} plans={PLANS} variant="desktop" {...props} />
    );

  test('references that pass the check are buttons; ones that fail are text', () => {
    renderIt();
    expect(screen.getByRole('button', { name: 'Nbd2-f1-g3' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Qh7' })).toBeNull();
    expect(screen.getByText(/Qh7/)).toBeInTheDocument();
  });

  test('at rest the caption names the position and invites a pick', () => {
    renderIt();
    expect(caption()).toBe(
      'Position after 5.d3. Pick a move or square in the plans to see it here.'
    );
    expect(lastOptions?.arrows ?? []).toEqual([]);
  });

  test('hovering previews only after a 200ms pause', () => {
    renderIt();
    const ref = screen.getByRole('button', { name: 'Nbd2-f1-g3' });
    fireEvent.mouseEnter(ref);
    act(() => vi.advanceTimersByTime(150));
    expect(caption()).toMatch(/^Position after/);
    act(() => vi.advanceTimersByTime(60));
    expect(caption()).toBe('Knight from b1 to d2, then f1, then g3');
    expect(lastOptions?.arrows).toHaveLength(3);
    fireEvent.mouseLeave(ref);
    expect(caption()).toMatch(/^Position after/);
  });

  test('leaving before the pause shows nothing', () => {
    renderIt();
    const ref = screen.getByRole('button', { name: 'Nbd2-f1-g3' });
    fireEvent.mouseEnter(ref);
    act(() => vi.advanceTimersByTime(100));
    fireEvent.mouseLeave(ref);
    act(() => vi.advanceTimersByTime(300));
    expect(caption()).toMatch(/^Position after/);
  });

  test('click pins the reference, and a second click clears it', () => {
    renderIt();
    const ref = screen.getByRole('button', { name: 'Nbd2-f1-g3' });
    fireEvent.click(ref);
    expect(ref).toHaveAttribute('aria-pressed', 'true');
    expect(caption()).toBe('Knight from b1 to d2, then f1, then g3');
    expect(lastOptions?.arrows?.map((a) => [a.startSquare, a.endSquare])).toEqual([
      ['b1', 'd2'],
      ['d2', 'f1'],
      ['f1', 'g3'],
    ]);
    fireEvent.click(ref);
    expect(ref).toHaveAttribute('aria-pressed', 'false');
    expect(caption()).toMatch(/^Position after/);
  });

  test('focus previews at once, like hover', () => {
    renderIt();
    fireEvent.focus(screen.getByRole('button', { name: 'Nbd2-f1-g3' }));
    expect(caption()).toBe('Knight from b1 to d2, then f1, then g3');
  });

  test('not interactive: plain text and no invitation', () => {
    renderIt({ interactive: false });
    expect(screen.queryByRole('button', { name: 'Nbd2-f1-g3' })).toBeNull();
    expect(caption()).toBe('Position after 5.d3');
  });

  test('mobile: a tap pins the reference on the diagram above the plans', () => {
    renderIt({ variant: 'mobile' });
    fireEvent.click(screen.getByRole('button', { name: 'Nbd2-f1-g3' }));
    expect(caption()).toBe('Knight from b1 to d2, then f1, then g3');
  });
});
