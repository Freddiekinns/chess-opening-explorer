import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { OpeningNavigator } from '../OpeningNavigator';
import type { TreeContext, TreeNode, AncestorNode } from '../../../hooks/useOpeningTree';
import type { ExplorerResult } from '../../../lib/lichessExplorer';

function makeNode(overrides: Partial<TreeNode> = {}): TreeNode {
  return {
    fen: 'fen-test',
    name: 'Test Opening',
    eco: 'C00',
    move: '1. e4',
    moves: '1. e4',
    descendantCount: 100,
    gamesPlayed: 100,
    hasChildren: false,
    ...overrides,
  };
}

function makeAncestor(overrides: Partial<AncestorNode> = {}): AncestorNode {
  return {
    ...makeNode(),
    siblings: [],
    ...overrides,
  };
}

function renderNavigator(
  treeData: TreeContext,
  explorer: ExplorerResult | null = null,
  parentExplorer: ExplorerResult | null = null,
  extra: Partial<React.ComponentProps<typeof OpeningNavigator>> = {}
) {
  return render(
    <MemoryRouter>
      <OpeningNavigator
        treeData={treeData}
        loading={false}
        explorer={explorer}
        parentExplorer={parentExplorer}
        {...extra}
      />
    </MemoryRouter>
  );
}

function simpleTree(): TreeContext {
  return {
    current: makeNode({ fen: 'fen-current', name: 'French Defense', move: '1...e6' }),
    ancestors: [makeAncestor({ fen: 'fen-e4', name: "King's Pawn Game", move: '1. e4' })],
    children: [makeNode({ fen: 'fen-child', name: 'Advance Variation', move: '3. e5' })],
    siblings: [makeNode({ fen: 'fen-sib', name: 'Caro-Kann Defense', move: '1...c6' })],
  };
}

function explorerWithMoves(moves: ExplorerResult['moves']): ExplorerResult {
  const totals = moves.reduce((sum, m) => sum + m.games, 0);
  return {
    totalGames: totals,
    white: Math.round(totals * 0.48),
    draws: Math.round(totals * 0.05),
    black: Math.round(totals * 0.47),
    moves,
    topGames: [],
    averageRating: null,
  };
}

function explorerMove(san: string, games: number) {
  return { san, games, whitePct: 48, drawPct: 5, blackPct: 47 };
}

describe('OpeningNavigator', () => {
  test('orders continuations and alternatives by popularity', () => {
    const treeData: TreeContext = {
      current: makeNode({
        fen: 'fen-current',
        name: 'French Defense',
        move: '1...e6',
      }),
      ancestors: [
        makeAncestor({
          fen: 'fen-e4',
          name: "King's Pawn Game",
          move: '1. e4',
        }),
      ],
      children: [
        makeNode({
          fen: 'fen-rubinstein',
          name: 'Rubinstein Variation',
          move: '3...dxe4',
          gamesPlayed: 125000,
        }),
        makeNode({
          fen: 'fen-classical',
          name: 'Classical Variation',
          move: '3...Nf6',
          gamesPlayed: 420000,
        }),
        makeNode({
          fen: 'fen-burn',
          name: 'Burn Variation',
          move: '3...Be7',
          gamesPlayed: 230000,
        }),
      ],
      siblings: [
        makeNode({
          fen: 'fen-caro-kann',
          name: 'Caro-Kann Defense',
          move: '1...c6',
          gamesPlayed: 910000,
        }),
        makeNode({
          fen: 'fen-sicilian',
          name: 'Sicilian Defense',
          move: '1...c5',
          gamesPlayed: 1450000,
        }),
        makeNode({
          fen: 'fen-pirc',
          name: 'Pirc Defense',
          move: '1...d6',
          gamesPlayed: 180000,
        }),
      ],
    };

    renderNavigator(treeData);

    const classicalLink = screen.getByRole('link', { name: /classical variation/i });
    const burnLink = screen.getByRole('link', { name: /burn variation/i });
    const rubinsteinLink = screen.getByRole('link', { name: /rubinstein variation/i });

    expect(classicalLink.compareDocumentPosition(burnLink)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(burnLink.compareDocumentPosition(rubinsteinLink)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    const sicilianLink = screen.getByRole('link', { name: /sicilian defense/i });
    const caroKannLink = screen.getByRole('link', { name: /caro-kann defense/i });
    const pircLink = screen.getByRole('link', { name: /pirc defense/i });

    expect(sicilianLink.compareDocumentPosition(caroKannLink)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(caroKannLink.compareDocumentPosition(pircLink)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  test('shows only the most popular five continuations before expansion', () => {
    const children = Array.from({ length: 7 }, (_, index) =>
      makeNode({
        fen: `fen-child-${index}`,
        name: `Variation ${index + 1}`,
        move: `3.${index + 1}`,
        gamesPlayed: (7 - index) * 1000,
      })
    );

    const treeData: TreeContext = {
      current: makeNode({ fen: 'fen-current', name: 'French Defense' }),
      ancestors: [],
      children,
      siblings: [],
    };

    renderNavigator(treeData);

    expect(screen.getByRole('link', { name: /variation 1/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /variation 5/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /variation 6/i })).toBeNull();
    expect(screen.getByRole('button', { name: 'Show 2 more moves' })).toBeInTheDocument();
  });

  test('echoes the active level in both captions when live data drives the lists', () => {
    renderNavigator(simpleTree(), null, null, { band: '1400', live: true });
    expect(screen.getByText('Most popular at 1400–1800')).toBeInTheDocument();
    expect(screen.getByText('Most popular alternatives at 1400–1800')).toBeInTheDocument();
  });

  test('claims no level when the rows come from the snapshot', () => {
    renderNavigator(simpleTree(), null, null, { band: '1400', live: false });
    expect(screen.getByText('Most popular next moves')).toBeInTheDocument();
    expect(screen.getByText('Most popular alternatives')).toBeInTheDocument();
  });

  test('carries no card chrome or title of its own — the explorer card owns both', () => {
    renderNavigator(simpleTree());
    expect(screen.queryByText('Opening book')).toBeNull();
  });

  test('labels the sections with their roles', () => {
    const treeData: TreeContext = {
      current: makeNode({ fen: 'fen-current', name: 'French Defense', move: '1...e6' }),
      ancestors: [makeAncestor({ fen: 'fen-e4', name: "King's Pawn Game", move: '1. e4' })],
      children: [makeNode({ fen: 'fen-child', name: 'Advance Variation', move: '3. e5' })],
      siblings: [makeNode({ fen: 'fen-sib', name: 'Caro-Kann Defense', move: '1...c6' })],
    };

    renderNavigator(treeData);

    expect(screen.getByText('Next moves')).toBeInTheDocument();
    expect(screen.getByText('Instead of 1...e6')).toBeInTheDocument();
    // Popularity captions clarify each list is ordered by how often moves are played.
    expect(screen.getByText('Most popular next moves')).toBeInTheDocument();
    expect(screen.getByText('Most popular alternatives')).toBeInTheDocument();
  });

  describe('with live explorer data', () => {
    const treeData: TreeContext = {
      current: makeNode({ fen: 'fen-current', name: 'French Defense', move: '1...e6' }),
      ancestors: [makeAncestor({ fen: 'fen-e4', name: "King's Pawn Game", move: '1. e4' })],
      children: [
        makeNode({
          fen: 'fen-rubinstein',
          name: 'Rubinstein Variation',
          move: '3...dxe4',
          gamesPlayed: 900_000,
        }),
        makeNode({
          fen: 'fen-classical',
          name: 'Classical Variation',
          move: '3...Nf6',
          gamesPlayed: 400_000,
        }),
      ],
      siblings: [
        makeNode({
          fen: 'fen-sicilian',
          name: 'Sicilian Defense',
          move: '1...c5',
          gamesPlayed: 1_450_000,
        }),
      ],
    };

    test('re-ranks next moves by live play at the chosen level', () => {
      renderNavigator(
        treeData,
        explorerWithMoves([explorerMove('Nf6', 50_000), explorerMove('dxe4', 20_000)])
      );

      const classical = screen.getByRole('link', { name: /classical variation/i });
      const rubinstein = screen.getByRole('link', { name: /rubinstein variation/i });
      expect(classical.compareDocumentPosition(rubinstein)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
      expect(classical.textContent).toContain('50k games');
      // The white-win figure anchors the W/D/L bar with a readable number.
      expect(classical.textContent).toContain('48%');
    });

    test('shows popular unnamed moves as inert off-book rows', () => {
      renderNavigator(
        treeData,
        explorerWithMoves([explorerMove('Nf6', 50_000), explorerMove('h6', 10_000)])
      );

      const tag = screen.getByText('off-book');
      expect(tag).toBeInTheDocument();
      // The off-book row is data, not navigation.
      expect(tag.closest('a')).toBeNull();
      expect(tag.closest('div')?.parentElement?.textContent).toContain('h6');
    });

    test('never shows the move just played as an off-book alternative', () => {
      renderNavigator(
        treeData,
        null,
        explorerWithMoves([explorerMove('e6', 800_000), explorerMove('c5', 1_000_000)])
      );

      // c5 matches the Sicilian book row; e6 is the current move and must not
      // reappear as an off-book alternative to itself.
      expect(screen.queryByText('off-book')).toBeNull();
      expect(screen.getByRole('link', { name: /sicilian defense/i }).textContent).toContain(
        '1M games'
      );
    });
  });
});
