import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import SearchOverlay from '../SearchOverlay';
import { recordRecentOpening } from '../../../lib/recentOpenings';

const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

function seedRepertoire(count: number) {
  const entries = Array.from({ length: count }, (_, i) => ({
    fen: `rep-fen-${i}`,
    name: `Repertoire Opening ${i}`,
    eco: 'C00',
    moves: '1. e4 e6',
    savedAt: count - i,
  }));
  localStorage.setItem('chess-repertoire', JSON.stringify(entries));
}

function renderOverlay(open = true, onClose = vi.fn()) {
  return {
    onClose,
    ...render(
      <MemoryRouter>
        <SearchOverlay open={open} onClose={onClose} />
      </MemoryRouter>
    ),
  };
}

beforeEach(() => {
  localStorage.clear();
  navigateMock.mockReset();
  vi.unstubAllGlobals();
});

describe('SearchOverlay', () => {
  test('renders nothing while closed', () => {
    const { container } = renderOverlay(false);
    expect(container.firstChild).toBeNull();
  });

  test('empty state shows recents, repertoire (capped at 5) and Surprise me', () => {
    recordRecentOpening({ fen: 'rec-1', name: 'Caro-Kann Defence', eco: 'B12', moves: '1. e4 c6' });
    seedRepertoire(7);
    renderOverlay();

    expect(screen.getByText('Recent')).toBeInTheDocument();
    expect(screen.getByText('Caro-Kann Defence')).toBeInTheDocument();
    expect(screen.getByText('Your repertoire')).toBeInTheDocument();
    expect(screen.getAllByText(/Repertoire Opening/)).toHaveLength(5);
    expect(screen.getByRole('button', { name: /Surprise me/ })).toBeInTheDocument();
  });

  test('hides empty sections when there is nothing to show', () => {
    renderOverlay();
    expect(screen.queryByText('Recent')).not.toBeInTheDocument();
    expect(screen.queryByText('Your repertoire')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Surprise me/ })).toBeInTheDocument();
  });

  test('tapping a repertoire row navigates to the opening and closes', async () => {
    const user = userEvent.setup();
    seedRepertoire(1);
    const { onClose } = renderOverlay();

    await user.click(screen.getByRole('button', { name: /Repertoire Opening 0/ }));
    expect(navigateMock).toHaveBeenCalledWith(`/opening/${encodeURIComponent('rep-fen-0')}`);
    expect(onClose).toHaveBeenCalled();
  });

  test('typing two characters fetches and lists results', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          success: true,
          data: [{ fen: 'res-fen', name: 'Alekhine Defense', eco: 'B02', moves: '1. e4 Nf6' }],
        }),
      }))
    );
    renderOverlay();

    await user.type(screen.getByPlaceholderText('Search openings...'), 'al');
    await waitFor(() => expect(screen.getByText('Alekhine Defense')).toBeInTheDocument());
    // Empty-state sections give way to results
    expect(screen.queryByRole('button', { name: /Surprise me/ })).not.toBeInTheDocument();
  });

  test('shows the no-results hint when the search comes back empty', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: true, json: async () => ({ success: true, data: [] }) }))
    );
    renderOverlay();

    await user.type(screen.getByPlaceholderText('Search openings...'), 'zzzz');
    await waitFor(() =>
      expect(screen.getByText('No openings match your search')).toBeInTheDocument()
    );
    expect(screen.getByText(/Try an ECO code/)).toBeInTheDocument();
  });

  test('Cancel and Escape both close the overlay', async () => {
    const user = userEvent.setup();
    const { onClose } = renderOverlay();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
