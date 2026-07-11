import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('renders the snapshot with its date label by default', async () => {
    primeGapResults();
    render(<WinRatePanel popularityStats={SNAPSHOT} fen={FEN} />);
    expect(screen.getByText(/Master games · updated 2025-07-15/)).toBeInTheDocument();
    expect(screen.getByText('54.3k')).toBeInTheDocument();
    // Let the level-check fetches settle so the update is act()-wrapped.
    await screen.findByText(/Level check:/);
  });

  it('shows the level check strip when the gap is significant', async () => {
    primeGapResults();
    render(<WinRatePanel popularityStats={SNAPSHOT} fen={FEN} />);
    const strip = await screen.findByText(/Level check:/);
    expect(strip.textContent).toContain('56%');
    expect(strip.textContent).toContain('48%');
    expect(strip.textContent).toContain('1400–1800');
    await waitFor(() => expect(trackEvent).toHaveBeenCalledWith('level_check_view'));
  });

  it('renders no strip when the gap is under the threshold', async () => {
    fetchExplorerMock.mockResolvedValue(explorerResult(500, 200, 300));
    render(<WinRatePanel popularityStats={SNAPSHOT} fen={FEN} />);
    await waitFor(() => expect(fetchExplorerMock).toHaveBeenCalled());
    expect(screen.queryByText(/Level check:/)).not.toBeInTheDocument();
  });

  it('swaps to live data with a source line when a band is selected', async () => {
    primeGapResults();
    const user = userEvent.setup();
    render(<WinRatePanel popularityStats={SNAPSHOT} fen={FEN} />);

    await user.click(screen.getByRole('button', { name: '1400–1800' }));

    expect(await screen.findByText(/Lichess games, 1400–1800 · live/)).toBeInTheDocument();
    expect(screen.getByText('c5')).toBeInTheDocument(); // continuations list
    expect(localStorage.getItem('openingbook:my-level')).toBe('1400');
    expect(trackEvent).toHaveBeenCalledWith('band_select', { band: '1400' });
  });

  it('falls back to the snapshot silently when the explorer fails', async () => {
    const { ExplorerError } = await vi.importActual<typeof import('../../../lib/lichessExplorer')>(
      '../../../lib/lichessExplorer'
    );
    fetchExplorerMock.mockRejectedValue(new ExplorerError('boom', 429));
    const user = userEvent.setup();
    render(<WinRatePanel popularityStats={SNAPSHOT} fen={FEN} />);

    await user.click(screen.getByRole('button', { name: '2200+' }));

    await waitFor(() =>
      expect(screen.getByText(/Master games · updated 2025-07-15/)).toBeInTheDocument()
    );
    expect(trackEvent).toHaveBeenCalledWith('explorer_error', { status: 429 });
  });

  it('shows an honesty note instead of numbers for thin live samples', async () => {
    fetchExplorerMock.mockImplementation((_fen: string, band: BandId) =>
      Promise.resolve(
        band === 'masters' ? explorerResult(380, 200, 420) : explorerResult(20, 10, 15)
      )
    );
    const user = userEvent.setup();
    render(<WinRatePanel popularityStats={SNAPSHOT} fen={FEN} />);

    await user.click(screen.getByRole('button', { name: 'Under 1400' }));

    expect(await screen.findByText(/Not enough games at this level/)).toBeInTheDocument();
  });

  it('renders notable games from masters data and links to lichess', async () => {
    primeGapResults([
      {
        id: 'game1',
        white: { name: 'Carlsen', rating: 2850 },
        black: { name: 'Caruana', rating: 2800 },
        winner: 'white',
        year: 2019,
      },
    ]);
    render(<WinRatePanel popularityStats={SNAPSHOT} fen={FEN} />);

    const link = await screen.findByRole('link', { name: /Carlsen/ });
    expect(link).toHaveAttribute('href', 'https://lichess.org/game1');
    expect(link.textContent).toContain('1–0');
  });

  it('omits the notable games section when topGames is empty', async () => {
    primeGapResults([]);
    render(<WinRatePanel popularityStats={SNAPSHOT} fen={FEN} />);
    await screen.findByText(/Level check:/);
    expect(screen.queryByText(/Notable games/)).not.toBeInTheDocument();
  });

  it('preselects the saved my-level band', async () => {
    localStorage.setItem('openingbook:my-level', '1400');
    primeGapResults();
    render(<WinRatePanel popularityStats={SNAPSHOT} fen={FEN} />);
    expect(await screen.findByText(/Lichess games, 1400–1800 · live/)).toBeInTheDocument();
  });

  it('clears the preference and returns to the snapshot on reset', async () => {
    primeGapResults();
    const user = userEvent.setup();
    render(<WinRatePanel popularityStats={SNAPSHOT} fen={FEN} />);

    await user.click(screen.getByRole('button', { name: '1400–1800' }));
    await screen.findByText(/Lichess games, 1400–1800 · live/);
    await user.click(screen.getByRole('button', { name: /reset/i }));

    expect(screen.getByText(/Master games · updated 2025-07-15/)).toBeInTheDocument();
    expect(localStorage.getItem('openingbook:my-level')).toBeNull();
  });

  it('renders nothing at all with no snapshot and no fen', () => {
    const { container } = render(<WinRatePanel popularityStats={null} fen="" />);
    expect(container).toBeEmptyDOMElement();
  });
});
