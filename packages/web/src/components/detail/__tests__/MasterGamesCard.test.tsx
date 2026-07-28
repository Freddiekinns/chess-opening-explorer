import { describe, expect, test, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import MasterGamesCard from '../MasterGamesCard';
import type { ExplorerResult, ExplorerTopGame } from '../../../lib/lichessExplorer';

vi.mock('../../../lib/analytics', () => ({ trackEvent: vi.fn() }));

const { fetchExplorerMock } = vi.hoisted(() => ({ fetchExplorerMock: vi.fn() }));
vi.mock('../../../lib/lichessExplorer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/lichessExplorer')>();
  return { ...actual, fetchExplorer: fetchExplorerMock };
});

const FEN = 'rnbqkb1r/ppp1pppp/8/3N4/8/8/PPPP1PPP/R1BQKBNR b KQkq - 0 4';

function game(id: string, white: string, black: string, rating: number): ExplorerTopGame {
  return {
    id,
    white: { name: white, rating },
    black: { name: black, rating: rating - 20 },
    winner: 'white',
    year: 1987,
  };
}

function masters(topGames: ExplorerTopGame[]): ExplorerResult {
  return {
    totalGames: 1912,
    white: 840,
    draws: 516,
    black: 556,
    moves: [],
    topGames,
    averageRating: 2446,
  };
}

const FIVE = [
  game('g1', 'A1', 'B1', 2800),
  game('g2', 'A2', 'B2', 2790),
  game('g3', 'A3', 'B3', 2780),
  game('g4', 'A4', 'B4', 2770),
  game('g5', 'A5', 'B5', 2760),
];

beforeEach(() => {
  fetchExplorerMock.mockReset();
});

describe('MasterGamesCard', () => {
  test('always asks the masters DB, whatever level the page is on', async () => {
    fetchExplorerMock.mockResolvedValue(masters([game('g1', 'Tal', 'Botvinnik', 2700)]));
    render(<MasterGamesCard fen={FEN} />);
    await waitFor(() => expect(fetchExplorerMock).toHaveBeenCalledWith(FEN, 'masters'));
    expect(fetchExplorerMock).toHaveBeenCalledTimes(1);
  });

  test('states its source without inventing a rating floor', async () => {
    fetchExplorerMock.mockResolvedValue(masters([game('g1', 'Tal', 'Botvinnik', 2700)]));
    render(<MasterGamesCard fen={FEN} />);
    expect(await screen.findByText('Over-the-board masters')).toBeInTheDocument();
    expect(screen.queryByText(/2,?400/)).toBeNull();
  });

  test('links each game to Lichess with its result and year', async () => {
    fetchExplorerMock.mockResolvedValue(masters([game('g1', 'Tal', 'Botvinnik', 2700)]));
    render(<MasterGamesCard fen={FEN} />);

    const link = await screen.findByRole('link', { name: /Tal – Botvinnik/ });
    expect(link).toHaveAttribute('href', 'https://lichess.org/g1');
    expect(link).toHaveTextContent('1–0 · 1987');
  });

  test('collapses to three and names the payload of the reveal', async () => {
    const user = userEvent.setup();
    fetchExplorerMock.mockResolvedValue(masters(FIVE));
    render(<MasterGamesCard fen={FEN} />);

    await screen.findByRole('link', { name: /A1/ });
    expect(screen.queryByRole('link', { name: /A4/ })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Show 2 more games' }));
    expect(screen.getByRole('link', { name: /A4/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show fewer' })).toBeInTheDocument();
  });

  test('omits the reveal when everything already fits', async () => {
    fetchExplorerMock.mockResolvedValue(masters(FIVE.slice(0, 3)));
    render(<MasterGamesCard fen={FEN} />);
    await screen.findByRole('link', { name: /A3/ });
    expect(screen.queryByRole('button', { name: /Show/ })).toBeNull();
  });

  test('renders no card at all when the position has no master games', async () => {
    fetchExplorerMock.mockResolvedValue(masters([]));
    render(<MasterGamesCard fen={FEN} />);
    await waitFor(() => expect(fetchExplorerMock).toHaveBeenCalled());
    expect(screen.queryByText('Master games')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  test('renders no card when the masters fetch fails', async () => {
    fetchExplorerMock.mockRejectedValue(new Error('boom'));
    render(<MasterGamesCard fen={FEN} />);
    await waitFor(() => expect(fetchExplorerMock).toHaveBeenCalled());
    expect(screen.queryByText('Master games')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  test('the accordion variant is collapsed, counted, and expands to the full list', async () => {
    const user = userEvent.setup();
    fetchExplorerMock.mockResolvedValue(masters(FIVE));
    render(<MasterGamesCard fen={FEN} variant="accordion" />);

    const header = await screen.findByRole('button', { name: /Master games/ });
    expect(header).toHaveTextContent('(5)');
    expect(header).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('link', { name: /A1/ })).toBeNull();

    await user.click(header);
    expect(screen.getByRole('link', { name: /A1/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /A5/ })).toBeInTheDocument();
  });

  // jsdom has no IntersectionObserver, so every test above takes the
  // "observer unavailable" fallback and the gate itself goes unexercised.
  // It is the gate that decides whether the card ever loads in a real
  // browser: point it at a hidden or zero-area element and the fetch never
  // fires. This stubs the observer to pin that contract.
  test('gates the fetch on a sentinel that a real observer can actually see', async () => {
    const observed: Element[] = [];
    let fire: (() => void) | undefined;
    class FakeIO {
      constructor(private cb: (entries: { isIntersecting: boolean }[], obs: FakeIO) => void) {}
      observe(el: Element) {
        observed.push(el);
        fire = () => this.cb([{ isIntersecting: true }], this);
      }
      disconnect() {}
    }
    vi.stubGlobal('IntersectionObserver', FakeIO);
    fetchExplorerMock.mockResolvedValue(masters([game('g1', 'Tal', 'Botvinnik', 2700)]));

    try {
      render(<MasterGamesCard fen={FEN} />);

      // Nothing fetched until the sentinel is seen.
      expect(fetchExplorerMock).not.toHaveBeenCalled();

      const sentinel = observed[0] as HTMLElement;
      expect(sentinel).toBeInTheDocument();
      // A hidden sentinel never intersects, so the card would never load.
      expect(sentinel.hidden).toBe(false);
      expect(sentinel.style.display).not.toBe('none');

      act(() => fire?.());
      expect(await screen.findByRole('link', { name: /Tal/ })).toBeInTheDocument();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test('drops the previous position’s games when the fen changes', async () => {
    fetchExplorerMock.mockResolvedValue(masters([game('g1', 'Tal', 'Botvinnik', 2700)]));
    const { rerender } = render(<MasterGamesCard fen={FEN} />);
    await screen.findByRole('link', { name: /Tal/ });

    fetchExplorerMock.mockResolvedValue(masters([game('g9', 'Kramnik', 'Leko', 2750)]));
    rerender(<MasterGamesCard fen="8/8/8/8/8/8/8/K6k w - - 0 1" />);

    expect(await screen.findByRole('link', { name: /Kramnik/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Tal/ })).toBeNull();
  });
});
