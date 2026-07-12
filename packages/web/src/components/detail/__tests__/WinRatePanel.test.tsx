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
      <WinRatePanel popularityStats={popularityStats} fen={fen} band={band} />
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

/** masters 48% / club 56% for white — an 8 pp gap that triggers the strip */
function primeGapResults(topGames: ExplorerResult['topGames'] = []) {
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

  it('renders the snapshot with its date label when no level is set', async () => {
    primeGapResults();
    renderPanel(null);
    expect(screen.getByText(/Master games · updated 2025-07-15/)).toBeInTheDocument();
    expect(screen.getByText('54.3k')).toBeInTheDocument();
    // Let the level-check fetches settle so the update is act()-wrapped.
    await screen.findByRole('note');
  });

  it('titles itself and explains its role', async () => {
    primeGapResults();
    renderPanel(null);
    expect(screen.getByText('Win rates')).toBeInTheDocument();
    expect(screen.getByText('Who wins from here')).toBeInTheDocument();
    await screen.findByRole('note');
  });

  it('shows the level check strip with the level name', async () => {
    primeGapResults();
    renderPanel(null);
    const strip = await screen.findByRole('note');
    expect(strip.textContent).toContain('56%');
    expect(strip.textContent).toContain('48%');
    expect(strip.textContent).toContain('At intermediate level');
    await waitFor(() => expect(trackEvent).toHaveBeenCalledWith('level_check_view'));
  });

  it('renders no strip when the gap is under the threshold', async () => {
    fetchExplorerMock.mockResolvedValue(explorerResult(500, 200, 300));
    renderPanel(null);
    await waitFor(() => expect(fetchExplorerMock).toHaveBeenCalled());
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('shows live data with a source line for the active band', async () => {
    primeGapResults();
    renderPanel('1400');
    expect(await screen.findByText(/Lichess games, 1400–1800 · live/)).toBeInTheDocument();
  });

  it('no longer renders a move list — that lives in the opening book now', async () => {
    primeGapResults();
    renderPanel('1400');
    await screen.findByText(/Lichess games, 1400–1800 · live/);
    expect(screen.queryByText('c5')).not.toBeInTheDocument();
  });

  it('stays silent when the passive level-check fetch fails', async () => {
    const { ExplorerError } = await vi.importActual<typeof import('../../../lib/lichessExplorer')>(
      '../../../lib/lichessExplorer'
    );
    fetchExplorerMock.mockRejectedValue(new ExplorerError('boom', 401));
    renderPanel(null);

    await waitFor(() => expect(trackEvent).toHaveBeenCalledWith('explorer_error', { status: 401 }));
    expect(screen.getByText(/Master games · updated 2025-07-15/)).toBeInTheDocument();
    expect(screen.queryByText(/isn't available right now/)).not.toBeInTheDocument();
  });

  it('shows the snapshot with an unavailable note when the band fetch fails', async () => {
    const { ExplorerError } = await vi.importActual<typeof import('../../../lib/lichessExplorer')>(
      '../../../lib/lichessExplorer'
    );
    fetchExplorerMock.mockRejectedValue(new ExplorerError('boom', 429));
    renderPanel('2200');

    expect(await screen.findByText(/isn't available right now/)).toBeInTheDocument();
    expect(screen.getByText(/Master games · updated 2025-07-15/)).toBeInTheDocument();
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
    primeGapResults([topGame('game1', 'Carlsen', 'Caruana', 2850)]);
    renderPanel(null);

    const link = await screen.findByRole('link', { name: /Carlsen/ });
    expect(link).toHaveAttribute('href', 'https://lichess.org/game1');
    expect(link.textContent).toContain('1–0');
  });

  it('collapses notable games to three with a show-more toggle', async () => {
    primeGapResults([
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
    primeGapResults([]);
    renderPanel(null);
    await screen.findByRole('note');
    expect(screen.queryByText('Master games')).not.toBeInTheDocument();
  });

  it('closes with the analyse funnel link', async () => {
    primeGapResults();
    renderPanel(null);
    const link = screen.getByRole('link', { name: /analyse your own games/i });
    expect(link).toHaveAttribute('href', '/analyse');
    await screen.findByRole('note');
  });

  it('renders nothing at all with no snapshot and no fen', () => {
    const { container } = render(
      <MemoryRouter>
        <WinRatePanel popularityStats={null} fen="" band={null} />
      </MemoryRouter>
    );
    expect(container).toBeEmptyDOMElement();
  });
});
