import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import MobileMasterGames from '../MobileMasterGames';
import type { ExplorerResult } from '../../../../lib/lichessExplorer';

const { fetchExplorerMock } = vi.hoisted(() => ({
  fetchExplorerMock: vi.fn(),
}));

vi.mock('../../../../lib/lichessExplorer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../lib/lichessExplorer')>();
  return { ...actual, fetchExplorer: fetchExplorerMock };
});

const FEN = 'rnbqkb1r/ppp1pppp/8/3N4/8/8/PPPP1PPP/R1BQKBNR b KQkq - 0 4';

function mastersResult(topGames: ExplorerResult['topGames']): ExplorerResult {
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

function topGame(id: string, white: string, black: string) {
  return {
    id,
    white: { name: white, rating: 2600 },
    black: { name: black, rating: 2580 },
    winner: 'black' as const,
    year: 1987,
  };
}

beforeEach(() => {
  fetchExplorerMock.mockReset();
});

describe('MobileMasterGames', () => {
  test('stays hidden when the masters DB has no games', async () => {
    fetchExplorerMock.mockResolvedValue(mastersResult([]));
    const { container } = render(<MobileMasterGames fen={FEN} />);
    await waitFor(() => expect(fetchExplorerMock).toHaveBeenCalledWith(FEN, 'masters'));
    expect((container.firstChild as HTMLElement).hidden).toBe(true);
  });

  test('collapsed by default with a count; expanding lists linked games', async () => {
    const user = userEvent.setup();
    fetchExplorerMock.mockResolvedValue(
      mastersResult([topGame('g1', 'Smyslov, Vassily', 'Vaganian, Rafael A')])
    );
    render(<MobileMasterGames fen={FEN} />);

    const header = await screen.findByRole('button', { name: /Master games/ });
    expect(header).toHaveTextContent('(1)');
    expect(screen.queryByText(/Smyslov/)).not.toBeInTheDocument();

    await user.click(header);
    const link = screen.getByRole('link', { name: /Smyslov, Vassily – Vaganian, Rafael A/ });
    expect(link).toHaveAttribute('href', 'https://lichess.org/g1');
    expect(link).toHaveTextContent('0–1 · 1987');
  });
});
