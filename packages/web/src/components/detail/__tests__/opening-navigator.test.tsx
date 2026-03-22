import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { OpeningNavigator } from '../OpeningNavigator';
import type { TreeContext, TreeNode, AncestorNode } from '../../../hooks/useOpeningTree';

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

function renderNavigator(treeData: TreeContext) {
  return render(
    <MemoryRouter>
      <OpeningNavigator treeData={treeData} loading={false} />
    </MemoryRouter>
  );
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
    expect(screen.getByRole('button', { name: 'Show 2 more' })).toBeInTheDocument();
  });
});
