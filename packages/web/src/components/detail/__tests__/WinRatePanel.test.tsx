import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WinRatePanel } from '../WinRatePanel';
import type { ExplorerQuery } from '../../../hooks/useExplorerResult';
import type { BandId, ExplorerResult } from '../../../lib/lichessExplorer';

vi.mock('../../../lib/analytics', () => ({ trackEvent: vi.fn() }));

const SNAPSHOT = {
  games_analyzed: 54321,
  white_win_rate: 0.5,
  black_win_rate: 0.45,
  draw_rate: 0.05,
  avg_rating: 2016,
  analysis_date: '2025-07-15',
};

function explorerResult(overrides: Partial<ExplorerResult> = {}): ExplorerResult {
  return {
    totalGames: 1000,
    white: 420,
    draws: 60,
    black: 520,
    moves: [],
    topGames: [],
    averageRating: 1604,
    ...overrides,
  };
}

function query(overrides: Partial<ExplorerQuery> = {}): ExplorerQuery {
  return { result: null, loading: false, failed: false, ...overrides };
}

function renderPanel(
  band: BandId | null = '1400',
  explorer: ExplorerQuery = query({ result: explorerResult() }),
  popularityStats: typeof SNAPSHOT | null = SNAPSHOT
) {
  return render(<WinRatePanel popularityStats={popularityStats} band={band} explorer={explorer} />);
}

describe('WinRatePanel', () => {
  it('scopes the games figure to the active level', () => {
    renderPanel();
    expect(screen.getByText('Games · 1400–1800')).toBeInTheDocument();
    expect(screen.getByText('1k')).toBeInTheDocument();
    expect(screen.getByText('Average Elo')).toBeInTheDocument();
    expect(screen.getByText('1,604')).toBeInTheDocument();
  });

  it('renders the result split with its legend', () => {
    renderPanel();
    expect(screen.getByText('White wins 42%')).toBeInTheDocument();
    expect(screen.getByText('Draws 6%')).toBeInTheDocument();
    expect(screen.getByText('Black wins 52%')).toBeInTheDocument();
  });

  it('holds a loading state rather than flashing the snapshot first', () => {
    renderPanel('all', query({ loading: true }));
    expect(screen.getByRole('status')).toHaveTextContent('Loading Lichess data…');
    expect(screen.queryByText('54.3k')).not.toBeInTheDocument();
  });

  it('holds that state on the first render too, before the effect runs', () => {
    renderPanel('all', query());
    expect(screen.getByRole('status')).toHaveTextContent('Loading Lichess data…');
  });

  it('falls back to the snapshot with a note when the band fetch fails', () => {
    renderPanel('2200', query({ failed: true }));
    expect(screen.getByText(/isn't available right now/)).toBeInTheDocument();
    expect(screen.getByText('Total games')).toBeInTheDocument();
    expect(screen.getByText('54.3k')).toBeInTheDocument();
  });

  it('says so instead of publishing numbers from a thin sample', () => {
    renderPanel('u1400', query({ result: explorerResult({ totalGames: 40 }) }));
    expect(screen.getByText(/Not enough games at this level/)).toBeInTheDocument();
  });

  it('shows the snapshot when no level is set', () => {
    renderPanel(null, query());
    expect(screen.getByText('Total games')).toBeInTheDocument();
    expect(screen.getByText('54.3k')).toBeInTheDocument();
  });

  it('no longer owns the level pills — the card header does', () => {
    renderPanel();
    expect(screen.queryByRole('button', { name: 'Intermediate' })).toBeNull();
  });

  it('no longer owns master games — MasterGamesCard does', () => {
    renderPanel();
    expect(screen.queryByText('Master games')).toBeNull();
  });

  it('renders nothing with neither live data nor a snapshot', () => {
    const { container } = renderPanel(null, query(), null);
    expect(container).toBeEmptyDOMElement();
  });
});
