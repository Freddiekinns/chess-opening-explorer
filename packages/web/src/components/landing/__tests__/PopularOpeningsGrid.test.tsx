import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PopularOpeningsGrid } from '../PopularOpeningsGrid';

const openings = [
  {
    fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    name: 'Sicilian Defence',
    eco: 'B20',
    moves: '1. e4 c5',
    src: 'eco',
  },
];

beforeEach(() => {
  localStorage.clear();
  // The grid refetches on mount; fail the fetch so it falls back to the prop.
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
});

describe('PopularOpeningsGrid stars', () => {
  it('lets a user save without leaving the page', async () => {
    render(
      <MemoryRouter>
        <PopularOpeningsGrid openings={openings} />
      </MemoryRouter>
    );

    const star = await screen.findByRole('button', { name: 'Save to repertoire' });
    await userEvent.click(star);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Remove from repertoire' })).toBeInTheDocument()
    );
    expect(screen.getByRole('status')).toHaveTextContent('Added to your repertoire');
  });

  it('undo puts it back', async () => {
    render(
      <MemoryRouter>
        <PopularOpeningsGrid openings={openings} />
      </MemoryRouter>
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Save to repertoire' }));
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));

    expect(screen.getByRole('button', { name: 'Save to repertoire' })).toBeInTheDocument();
  });
});
