import { describe, expect, test, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import ExplorerCard from '../ExplorerCard';
import type { ExplorerQuery } from '../../../hooks/useExplorerResult';
import type { TreeContext, TreeNode, AncestorNode } from '../../../hooks/useOpeningTree';
import type { ExplorerResult } from '../../../lib/lichessExplorer';

vi.mock('../../../lib/analytics', () => ({ trackEvent: vi.fn() }));

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

function makeTree(): TreeContext {
  return {
    current: makeNode({ fen: FEN, name: 'Alekhine: Scandinavian, Exchange, 4.Nxd5' }),
    ancestors: [
      { ...makeNode({ fen: 'fen-a1', name: "King's Pawn Game", move: '1. e4' }), siblings: [] },
    ] as AncestorNode[],
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

function renderCard(props: Partial<React.ComponentProps<typeof ExplorerCard>> = {}) {
  const defaults: React.ComponentProps<typeof ExplorerCard> = {
    fen: FEN,
    band: '1400',
    onBandChange: vi.fn(),
    popularityStats: SNAPSHOT,
    explorer: query({ result: explorerResult() }),
    parentExplorer: null,
    treeData: makeTree(),
    treeLoading: false,
  };
  const merged = { ...defaults, ...props };
  return {
    onBandChange: merged.onBandChange,
    ...render(
      <MemoryRouter>
        <ExplorerCard {...merged} />
      </MemoryRouter>
    ),
  };
}

describe('ExplorerCard', () => {
  test('is titled Opening explorer, matching Lichess', () => {
    renderCard();
    expect(screen.getByRole('heading', { name: 'Opening explorer' })).toBeInTheDocument();
    expect(screen.queryByText('Opening book')).toBeNull();
  });

  test('the level pills and everything they govern share one border', () => {
    const { container } = renderCard();
    const card = container.firstChild as HTMLElement;

    // The filter itself
    expect(within(card).getByRole('button', { name: 'Intermediate' })).toBeInTheDocument();
    // The stats it filters
    expect(within(card).getByText('Games · 1400–1800')).toBeInTheDocument();
    // The move lists it filters
    expect(within(card).getByText('Next moves')).toBeInTheDocument();
    expect(within(card).getByText('Instead of 4.Nxd5')).toBeInTheDocument();
  });

  test('master games are NOT inside the card — the filter does not reach them', () => {
    renderCard();
    expect(screen.queryByText('Master games')).toBeNull();
  });

  test('the header names Lichess and the level when the data is live', () => {
    renderCard();
    expect(screen.getByText('Lichess · 1400–1800')).toBeInTheDocument();
  });

  test('the header never claims live data while serving the snapshot', () => {
    renderCard({ explorer: query({ failed: true }) });
    expect(screen.getByText('Saved snapshot · updated 2025-07-15')).toBeInTheDocument();
    expect(screen.queryByText('Lichess · 1400–1800')).toBeNull();
  });

  test('pressing a pill reports the new level to the page', async () => {
    const user = userEvent.setup();
    const { onBandChange } = renderCard();
    await user.click(screen.getByRole('button', { name: 'Masters' }));
    expect(onBandChange).toHaveBeenCalledWith('masters');
  });

  test('renders nothing when the position has neither stats nor a book', () => {
    const { container } = renderCard({
      band: null,
      popularityStats: null,
      explorer: query(),
      treeData: null,
    });
    expect(container).toBeEmptyDOMElement();
  });
});
