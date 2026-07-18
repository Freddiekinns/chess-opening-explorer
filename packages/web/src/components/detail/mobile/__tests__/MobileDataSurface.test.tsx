import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import MobileDataSurface from '../MobileDataSurface';
import type { ExplorerQuery } from '../../../../hooks/useExplorerResult';
import type { TreeContext, TreeNode, AncestorNode } from '../../../../hooks/useOpeningTree';
import type { ExplorerResult } from '../../../../lib/lichessExplorer';

vi.mock('../../../../lib/analytics', () => ({
  trackEvent: vi.fn(),
}));

const FEN = 'rnbqkb1r/ppp1pppp/8/3N4/8/8/PPPP1PPP/R1BQKBNR b KQkq - 0 4';

const SNAPSHOT = {
  games_analyzed: 54321,
  white_win_rate: 0.5,
  black_win_rate: 0.45,
  draw_rate: 0.05,
  avg_rating: 2016,
  analysis_date: '2025-07-15',
};

function makeNode(overrides: Partial<TreeNode> = {}): TreeNode {
  return {
    fen: 'fen-test',
    name: 'Test Opening',
    eco: 'B02',
    move: '4. Nxd5',
    moves: '1. e4 Nf6 2. Nc3 d5 3. exd5 Nxd5 4. Nxd5',
    descendantCount: 10,
    gamesPlayed: 1000,
    hasChildren: false,
    ...overrides,
  };
}

function makeAncestor(overrides: Partial<AncestorNode> = {}): AncestorNode {
  return { ...makeNode(), siblings: [], ...overrides };
}

function makeTree(): TreeContext {
  return {
    current: makeNode({ fen: FEN, name: 'Alekhine: Scandinavian, Exchange, 4.Nxd5' }),
    ancestors: [
      makeAncestor({ fen: 'fen-a1', name: "King's Pawn Game", move: '1. e4' }),
      makeAncestor({ fen: 'fen-a2', name: 'Alekhine Defense', move: '1...Nf6' }),
      makeAncestor({ fen: 'fen-a3', name: 'Alekhine: Scandinavian, Exchange', move: '3. exd5' }),
    ],
    children: [
      makeNode({
        fen: 'fen-child',
        name: 'Exchange, 4...Qxd5',
        move: '4...Qxd5',
        gamesPlayed: 900,
      }),
    ],
    siblings: [
      makeNode({ fen: 'fen-sib', name: 'Exchange, 4.Bc4', move: '4. Bc4', gamesPlayed: 400 }),
    ],
  };
}

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

function renderSurface(props: Partial<React.ComponentProps<typeof MobileDataSurface>> = {}) {
  const defaults: React.ComponentProps<typeof MobileDataSurface> = {
    fen: FEN,
    band: '1400',
    onBandChange: vi.fn(),
    popularityStats: SNAPSHOT,
    explorer: query({ result: explorerResult() }),
    parentExplorer: null,
    treeData: makeTree(),
  };
  const merged = { ...defaults, ...props };
  return {
    onBandChange: merged.onBandChange,
    ...render(
      <MemoryRouter>
        <MobileDataSurface {...merged} />
      </MemoryRouter>
    ),
  };
}

describe('MobileDataSurface', () => {
  test('renders live level stats with W/D/L legend and live meta', () => {
    renderSurface();
    expect(screen.getByText('Games at this level')).toBeInTheDocument();
    expect(screen.getByText('1k')).toBeInTheDocument();
    expect(screen.getByText('Average Elo')).toBeInTheDocument();
    expect(screen.getByText('1,604')).toBeInTheDocument();
    expect(screen.getByText('White 42%')).toBeInTheDocument();
    expect(screen.getByText('Draws 6%')).toBeInTheDocument();
    expect(screen.getByText('Black 52%')).toBeInTheDocument();
    expect(screen.getByText('Lichess games, 1400–1800 · live')).toBeInTheDocument();
  });

  test('level pills call onBandChange', async () => {
    const user = userEvent.setup();
    const { onBandChange } = renderSurface();
    await user.click(screen.getByRole('button', { name: 'Masters' }));
    expect(onBandChange).toHaveBeenCalledWith('masters');
  });

  test('falls back to the snapshot with a note when the live fetch fails', () => {
    renderSurface({ explorer: query({ failed: true }) });
    expect(screen.getByText('Total games')).toBeInTheDocument();
    expect(screen.getByText('54.3k')).toBeInTheDocument();
    expect(screen.getByText(/showing a saved snapshot/)).toBeInTheDocument();
    expect(screen.getByText('All Lichess games · updated 2025-07-15')).toBeInTheDocument();
  });

  test('says so when the level has too few games for reliable numbers', () => {
    renderSurface({ explorer: query({ result: explorerResult({ totalGames: 40 }) }) });
    expect(screen.getByText(/Not enough games at this level/)).toBeInTheDocument();
  });

  test('shows a loading state before the first live result', () => {
    renderSurface({ explorer: query({ loading: true }) });
    expect(screen.getByText('Loading Lichess data…')).toBeInTheDocument();
  });

  test('renders continuations and anchored alternatives with book rows as links', () => {
    renderSurface();
    expect(screen.getByText('Continuations')).toBeInTheDocument();
    expect(screen.getByText('Instead of 4.Nxd5')).toBeInTheDocument();
    expect(screen.getByText('Most popular alternatives')).toBeInTheDocument();

    const contLink = screen.getByRole('link', { name: /4\.\.\.Qxd5/ });
    expect(contLink).toHaveAttribute('href', `/opening/${encodeURIComponent('fen-child')}`);
    expect(screen.getByRole('link', { name: /4\.Bc4/ })).toBeInTheDocument();
  });

  test('marks popular unnamed explorer moves as off-book', () => {
    renderSurface({
      explorer: query({
        result: explorerResult({
          moves: [
            { san: 'Qxd5', games: 800, whitePct: 42, drawPct: 6, blackPct: 52 },
            { san: 'e6', games: 200, whitePct: 48, drawPct: 5, blackPct: 47 },
          ],
        }),
      }),
    });
    expect(screen.getByText('off-book')).toBeInTheDocument();
  });

  test('breadcrumb collapses to one line and expands into ancestor links', async () => {
    const user = userEvent.setup();
    renderSurface();

    const closed = screen.getByRole('button', { name: 'Show opening hierarchy' });
    expect(closed).toHaveTextContent("King's Pawn Game");
    expect(closed).toHaveTextContent('4.Nxd5');
    // Middle crumbs collapse behind an ellipsis
    expect(closed).toHaveTextContent('…');

    await user.click(closed);
    expect(screen.getByRole('link', { name: 'Alekhine Defense' })).toBeInTheDocument();
    expect(screen.getByText('Alekhine: Scandinavian, Exchange, 4.Nxd5')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Collapse opening hierarchy' }));
    expect(screen.getByRole('button', { name: 'Show opening hierarchy' })).toBeInTheDocument();
  });

  test('renders nothing without stats or book data', () => {
    const { container } = renderSurface({
      popularityStats: null,
      band: null,
      explorer: query(),
      treeData: null,
    });
    expect(container.firstChild).toBeNull();
  });
});
