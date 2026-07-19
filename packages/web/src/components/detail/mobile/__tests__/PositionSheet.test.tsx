import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import PositionSheet from '../PositionSheet';

const FEN = 'rnbqkb1r/ppp1pppp/8/3N4/8/8/PPPP1PPP/R1BQKBNR b KQkq - 0 4';

describe('PositionSheet', () => {
  test('renders nothing while closed', () => {
    const { container } = render(<PositionSheet fen={FEN} open={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  test('shows the FEN and a Lichess analysis link when open', () => {
    render(<PositionSheet fen={FEN} open onClose={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'Position tools' })).toBeInTheDocument();
    expect(screen.getByText(FEN)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Analyse on Lichess/ })).toHaveAttribute(
      'href',
      `https://lichess.org/analysis/${FEN}`
    );
  });

  test('copies the FEN to the clipboard', async () => {
    const user = userEvent.setup();
    render(<PositionSheet fen={FEN} open onClose={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'Copy FEN' }));
    expect(screen.getByRole('button', { name: 'Copied!' })).toBeInTheDocument();
    expect(await window.navigator.clipboard.readText()).toBe(FEN);
  });

  test('backdrop tap and Escape both close the sheet', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<PositionSheet fen={FEN} open onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: 'Close position tools' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
