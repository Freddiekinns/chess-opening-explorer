import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { WinRatePanel } from '../WinRatePanel';
import type { BandId, ExplorerResult } from '../../../lib/lichessExplorer';

vi.mock('../../../lib/analytics', () => ({
  trackEvent: vi.fn(),
  getAnonId: () => 'test-anon',
}));

const { fetchExplorerMock } = vi.hoisted(() => ({
  fetchExplorerMock: vi.fn(),
}));

vi.mock('../../../lib/lichessExplorer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../lib/lichessExplorer')>();
  return { ...actual, fetchExplorer: fetchExplorerMock };
});

import { trackEvent } from '../../../lib/analytics';

const FEN = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 1';

const SNAPSHOT = {
  games_analyzed: 54321,
  white_win_rate: 0.5,
  black_win_rate: 0.45,
  draw_rate: 0.05,
  avg_rating: 2016,
  analysis_date: '2025-07-15',
};

function renderPanel(band: BandId | null = null, popularityStats = SNAPSHOT, fen = FEN) {
  return render(
    <MemoryRouter>
      <WinRatePanel
        popularityStats={popularityStats}
        fen={fen}
        band={band}
        onBandChange={vi.fn()}
      />
    </MemoryRouter>
  );
}

function explorerResult(
  white: number,
  draws: number,
  black: number,
  extra: Partial<ExplorerResult> = {}
): ExplorerResult {
  return {
    totalGames: white + draws + black,
    white,
    draws,
    black,
    moves: [
      { san: 'c5', games: 500, whitePct: 60, drawPct: 20, blackPct: 20 },
      { san: 'e5', games: 350, whitePct: 55, drawPct: 25, blackPct: 20 },
    ],
    topGames: [],
    averageRating: null,
    ...extra,
  };
}

function topGame(id: string, whiteName: string, blackName: string, rating = 2800) {
  return {
    id,
    white: { name: whiteName, rating },
    black: { name: blackName, rating },
    winner: 'white' as const,
    year: 2019,
  };
}

/** masters + a club band, both healthy samples */
function primeResults(topGames: ExplorerResult['topGames'] = []) {
  fetchExplorerMock.mockImplementation((_fen: string, band: BandId) =>
    Promise.resolve(
      band === 'masters'
        ? explorerResult(380, 200, 420, { topGames })
        : explorerResult(460, 200, 340)
    )
  );
}

describe('WinRatePanel', () => {
  beforeEach(() => {
    localStorage.clear();
    fetchExplorerMock.mockReset();
    vi.mocked(trackEvent).mockClear();
  });

  it('renders the level pills at the top of the card', async () => {
    primeResults();
    renderPanel(null);
    expect(screen.getByRole('button', { name: 'Intermediate' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Masters' })).toBeInTheDocument();
    // Let the masters fetch settle so the state update is act()-wrapped.
    await waitFor(() => expect(fetchExplorerMock).toHaveBeenCalled());
  });

  it('renders the snapshot with its date label when no level is set', async () => {
    primeResults();
    renderPanel(null);
    expect(screen.getByText(/All Lichess games · updated 2025-07-15/)).toBeInTheDocument();
    expect(screen.getByText('54.3k')).toBeInTheDocument();
    // Let the masters fetch settle so the update is act()-wrapped.
    await waitFor(() => expect(fetchExplorerMock).toHaveBeenCalled());
  });

  it('shows live data with a source line for the active band', async () => {
    primeResults();
    renderPanel('1400');
    expect(await screen.findByText(/Lichess games, 1400–1800 · live/)).toBeInTheDocument();
  });

  it('labels the All band as every level of Lichess play', async () => {
    primeResults();
    renderPanel('all');
    expect(await screen.findByText(/All Lichess games · live/)).toBeInTheDocument();
  });

  it('shows the games-weighted Average Elo for a live band', async () => {
    fetchExplorerMock.mockImplementation((_fen: string, band: BandId) =>
      Promise.resolve(
        band === 'masters'
          ? explorerResult(380, 200, 420)
          : explorerResult(460, 200, 340, { averageRating: 1652 })
      )
    );
    renderPanel('1400');
    expect(await screen.findByText('1,652')).toBeInTheDocument();
  });

  it('no longer renders a move list — that lives in the opening book now', async () => {
    primeResults();
    renderPanel('1400');
    await screen.findByText(/Lichess games, 1400–1800 · live/);
    expect(screen.queryByText('c5')).not.toBeInTheDocument();
  });

  it('stays silent when the passive masters fetch fails', async () => {
    const { ExplorerError } = await vi.importActual<typeof import('../../../lib/lichessExplorer')>(
      '../../../lib/lichessExplorer'
    );
    fetchExplorerMock.mockRejectedValue(new ExplorerError('boom', 401));
    renderPanel(null);

    await waitFor(() => expect(trackEvent).toHaveBeenCalledWith('explorer_error', { status: 401 }));
    expect(screen.getByText(/All Lichess games · updated 2025-07-15/)).toBeInTheDocument();
    expect(screen.queryByText(/isn't available right now/)).not.toBeInTheDocument();
  });

  it('holds a loading state — never the snapshot — while the band fetch is pending', () => {
    fetchExplorerMock.mockReturnValue(new Promise(() => {})); // never resolves
    renderPanel('all');

    expect(screen.getByRole('status')).toHaveTextContent('Loading Lichess data…');
    expect(screen.queryByText(/All Lichess games · updated 2025-07-15/)).not.toBeInTheDocument();
    expect(screen.queryByText('54.3k')).not.toBeInTheDocument();
  });

  it('shows the snapshot with an unavailable note when the band fetch fails', async () => {
    const { ExplorerError } = await vi.importActual<typeof import('../../../lib/lichessExplorer')>(
      '../../../lib/lichessExplorer'
    );
    fetchExplorerMock.mockRejectedValue(new ExplorerError('boom', 429));
    renderPanel('2200');

    expect(await screen.findByText(/isn't available right now/)).toBeInTheDocument();
    expect(screen.getByText(/All Lichess games · updated 2025-07-15/)).toBeInTheDocument();
    expect(trackEvent).toHaveBeenCalledWith('explorer_error', { status: 429 });
  });

  it('shows an honesty note instead of numbers for thin live samples', async () => {
    fetchExplorerMock.mockImplementation((_fen: string, band: BandId) =>
      Promise.resolve(
        band === 'masters' ? explorerResult(380, 200, 420) : explorerResult(20, 10, 15)
      )
    );
    renderPanel('u1400');
    expect(await screen.findByText(/Not enough games at this level/)).toBeInTheDocument();
  });

  it('renders notable games from masters data and links to lichess', async () => {
    primeResults([topGame('game1', 'Carlsen', 'Caruana', 2850)]);
    renderPanel(null);

    const link = await screen.findByRole('link', { name: /Carlsen/ });
    expect(link).toHaveAttribute('href', 'https://lichess.org/game1');
    expect(link.textContent).toContain('1–0');
  });

  it('collapses notable games to three with a show-more toggle', async () => {
    primeResults([
      topGame('g1', 'A1', 'B1', 2800),
      topGame('g2', 'A2', 'B2', 2790),
      topGame('g3', 'A3', 'B3', 2780),
      topGame('g4', 'A4', 'B4', 2770),
      topGame('g5', 'A5', 'B5', 2760),
    ]);
    const user = userEvent.setup();
    renderPanel(null);

    await screen.findByRole('link', { name: /A1/ });
    expect(screen.queryByRole('link', { name: /A4/ })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Show 2 more' }));
    expect(screen.getByRole('link', { name: /A4/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show fewer' })).toBeInTheDocument();
  });

  it('omits the master games section when topGames is empty', async () => {
    primeResults([]);
    renderPanel(null);
    await waitFor(() => expect(fetchExplorerMock).toHaveBeenCalled());
    expect(screen.queryByText('Master games')).not.toBeInTheDocument();
  });

  it('renders nothing at all with no snapshot and no fen', () => {
    const { container } = render(
      <MemoryRouter>
        <WinRatePanel popularityStats={null} fen="" band={null} onBandChange={vi.fn()} />
      </MemoryRouter>
    );
    expect(container).toBeEmptyDOMElement();
  });
});
