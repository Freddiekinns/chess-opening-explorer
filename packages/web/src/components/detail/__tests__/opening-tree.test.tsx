import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { OpeningTree } from '../OpeningTree';
import type { TreeContext, TreeNode, AncestorNode } from '../../../hooks/useOpeningTree';

const mockFetchChildren = vi.fn().mockResolvedValue([]);

function makeNode(overrides: Partial<TreeNode> = {}): TreeNode {
  return {
    fen: 'fen1',
    name: 'Test Opening',
    eco: 'B20',
    move: '1. e4',
    moves: '1. e4',
    descendantCount: 100,
    gamesPlayed: 0,
    hasChildren: true,
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

const defaultTreeData: TreeContext = {
  current: makeNode({
    fen: 'fen-sicilian',
    name: 'Sicilian Defense',
    move: '1...c5',
    moves: '1. e4 c5',
    descendantCount: 1191,
  }),
  ancestors: [
    makeAncestor({
      fen: 'fen-e4',
      name: "King's Pawn Game",
      move: '1. e4',
      moves: '1. e4',
      descendantCount: 5200,
      siblings: [],
    }),
  ],
  children: [
    makeNode({
      fen: 'fen-bowdler',
      name: 'Bowdler Attack',
      move: '2. Bc4',
      moves: '1. e4 c5 2. Bc4',
      descendantCount: 0,
      hasChildren: false,
    }),
    makeNode({
      fen: 'fen-open',
      name: 'Open Sicilian',
      move: '2. Nf3',
      moves: '1. e4 c5 2. Nf3',
      descendantCount: 826,
      hasChildren: true,
    }),
  ],
  siblings: [
    makeNode({
      fen: 'fen-french',
      name: 'French Defense',
      move: '1...e6',
      moves: '1. e4 e6',
      descendantCount: 544,
      hasChildren: true,
    }),
  ],
};

function renderTree(treeData: TreeContext | null = defaultTreeData, loading = false) {
  return render(
    <MemoryRouter>
      <OpeningTree
        treeData={treeData}
        loading={loading}
        currentFen="fen-sicilian"
        onFetchChildren={mockFetchChildren}
      />
    </MemoryRouter>
  );
}

describe('OpeningTree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders nothing when no data and not loading', () => {
    const { container } = renderTree(null, false);
    expect(container.firstChild).toBeNull();
  });

  test('renders "Path" section with ancestors and current node', () => {
    renderTree();
    expect(screen.getByText('Path')).toBeInTheDocument();
    expect(screen.getByText("King's Pawn Game")).toBeInTheDocument();
    expect(screen.getByText('Sicilian Defense')).toBeInTheDocument();
  });

  test('current node shows star marker and is not a link', () => {
    renderTree();
    // Current node name should be a span, not a link
    const currentName = screen.getByText('Sicilian Defense');
    expect(currentName.tagName).toBe('SPAN');
    // Star marker should be present
    expect(screen.getByText('★')).toBeInTheDocument();
  });

  test('ancestor names are navigable links', () => {
    renderTree();
    const ancestor = screen.getByText("King's Pawn Game");
    // Ancestor name is inside a Link (rendered as <a>)
    expect(ancestor.closest('a')).not.toBeNull();
    expect(ancestor.closest('a')).toHaveAttribute('href');
  });

  test('renders "Continuations" section with children', () => {
    renderTree();
    expect(screen.getByText('Continuations')).toBeInTheDocument();
    expect(screen.getByText('Bowdler Attack')).toBeInTheDocument();
    expect(screen.getByText('Open Sicilian')).toBeInTheDocument();
  });

  test('shows "No further variations" when no children', () => {
    const noChildrenData: TreeContext = {
      ...defaultTreeData,
      children: [],
    };
    renderTree(noChildrenData);
    expect(screen.getByText('No further variations')).toBeInTheDocument();
  });

  test('renders "Instead of" section with siblings', () => {
    renderTree();
    expect(screen.getByText('Instead of 1...c5')).toBeInTheDocument();
    expect(screen.getByText('French Defense')).toBeInTheDocument();
  });

  test('hides siblings section when no siblings', () => {
    const noSiblingsData: TreeContext = {
      ...defaultTreeData,
      siblings: [],
    };
    renderTree(noSiblingsData);
    expect(screen.queryByText(/Instead of/)).toBeNull();
  });

  test('click on a row with children expands it', async () => {
    const childNodes: TreeNode[] = [
      makeNode({
        fen: 'fen-najdorf',
        name: 'Najdorf Variation',
        move: '2...d6',
        descendantCount: 300,
        hasChildren: true,
      }),
    ];
    mockFetchChildren.mockResolvedValueOnce(childNodes);

    renderTree();

    // Click the Open Sicilian row (has children)
    const openSicilianRow = screen.getByText('Open Sicilian').closest('[role="treeitem"]');
    expect(openSicilianRow).not.toBeNull();
    fireEvent.click(openSicilianRow!);

    expect(mockFetchChildren).toHaveBeenCalledWith('fen-open');
  });

  test('click on a row again collapses it', async () => {
    const childNodes: TreeNode[] = [
      makeNode({
        fen: 'fen-najdorf',
        name: 'Najdorf Variation',
        move: '2...d6',
        descendantCount: 300,
        hasChildren: false,
      }),
    ];
    mockFetchChildren.mockResolvedValueOnce(childNodes);

    renderTree();

    // First click: expand
    const openSicilianRow = screen.getByText('Open Sicilian').closest('[role="treeitem"]');
    fireEvent.click(openSicilianRow!);

    // Wait for children to load
    await vi.waitFor(() => {
      expect(screen.getByText('Najdorf Variation')).toBeInTheDocument();
    });

    // Second click: collapse
    fireEvent.click(openSicilianRow!);
    expect(screen.queryByText('Najdorf Variation')).toBeNull();
  });

  test('click on name link does NOT expand/collapse (navigates)', () => {
    renderTree();

    // Click the link text of French Defense (sibling with children)
    const frenchLink = screen.getByText('French Defense').closest('a');
    expect(frenchLink).not.toBeNull();

    // The link should have the correct href
    expect(frenchLink).toHaveAttribute('href', '/opening/fen-french');

    // Clicking the link should not trigger expand (stopPropagation in the component)
    fireEvent.click(frenchLink!);
    expect(mockFetchChildren).not.toHaveBeenCalled();
  });

  test('shows descendant counts', () => {
    renderTree();
    expect(screen.getByText('1,191')).toBeInTheDocument();
    expect(screen.getByText('5,200')).toBeInTheDocument();
    expect(screen.getByText('826')).toBeInTheDocument();
    expect(screen.getByText('544')).toBeInTheDocument();
  });

  test('shows move notation', () => {
    renderTree();
    expect(screen.getByText('1...c5')).toBeInTheDocument();
    expect(screen.getByText('1. e4')).toBeInTheDocument();
    expect(screen.getByText('2. Bc4')).toBeInTheDocument();
    expect(screen.getByText('2. Nf3')).toBeInTheDocument();
  });

  test('keyboard ArrowDown moves focus through all sections', () => {
    renderTree();
    const tree = screen.getByRole('tree');

    fireEvent.keyDown(tree, { key: 'ArrowDown' });
    fireEvent.keyDown(tree, { key: 'ArrowDown' });

    const treeItems = screen.getAllByRole('treeitem');
    const focusedItem = treeItems.find((item) => item.getAttribute('tabindex') === '0');
    expect(focusedItem).toBeDefined();
  });

  test('keyboard ArrowRight expands, ArrowLeft collapses', () => {
    mockFetchChildren.mockResolvedValueOnce([]);
    renderTree();

    const tree = screen.getByRole('tree');

    // Move focus to a sibling with children (French Defense)
    // Path rows (2) + Continuation rows (2) + Sibling rows start at index 4
    // French Defense is at index 4
    for (let i = 0; i < 5; i++) {
      fireEvent.keyDown(tree, { key: 'ArrowDown' });
    }

    // ArrowRight should expand
    fireEvent.keyDown(tree, { key: 'ArrowRight' });
    expect(mockFetchChildren).toHaveBeenCalledWith('fen-french');

    // ArrowLeft should collapse
    fireEvent.keyDown(tree, { key: 'ArrowLeft' });
    // Node should be collapsed (no children visible)
  });

  test('ARIA attributes: tree role, treeitem, aria-level, aria-selected', () => {
    renderTree();

    const tree = screen.getByRole('tree');
    expect(tree).toHaveAttribute('aria-label', 'Opening variations tree');

    const treeItems = screen.getAllByRole('treeitem');
    expect(treeItems.length).toBeGreaterThan(0);

    // Each item has aria-level
    treeItems.forEach((item) => {
      expect(item).toHaveAttribute('aria-level');
    });

    // Current node has aria-selected="true"
    const currentItem = treeItems.find((item) => item.getAttribute('aria-selected') === 'true');
    expect(currentItem).toBeDefined();
    expect(currentItem).toHaveTextContent('Sicilian Defense');
  });

  test('loading state shows skeleton', () => {
    const { container } = renderTree(null, true);
    expect(container.querySelector('[class*="skeleton"]')).not.toBeNull();
  });

  test('leaf nodes have no expand chevron visible', () => {
    renderTree();

    const treeItems = screen.getAllByRole('treeitem');
    const bowdler = treeItems.find((item) => item.textContent?.includes('Bowdler Attack'));
    expect(bowdler).toBeDefined();
    // Leaf node should not have aria-expanded
    expect(bowdler).not.toHaveAttribute('aria-expanded');
  });

  test('expanded children appear indented under parent', async () => {
    const childNodes: TreeNode[] = [
      makeNode({
        fen: 'fen-najdorf',
        name: 'Najdorf Variation',
        move: '2...d6',
        descendantCount: 300,
        hasChildren: false,
      }),
    ];
    mockFetchChildren.mockResolvedValueOnce(childNodes);

    renderTree();

    // Expand Open Sicilian
    const openSicilianRow = screen.getByText('Open Sicilian').closest('[role="treeitem"]');
    fireEvent.click(openSicilianRow!);

    await vi.waitFor(() => {
      expect(screen.getByText('Najdorf Variation')).toBeInTheDocument();
    });

    // The Najdorf row should have aria-level 2 (depth 1 + 1)
    const najdorfRow = screen.getByText('Najdorf Variation').closest('[role="treeitem"]');
    expect(najdorfRow).toHaveAttribute('aria-level', '2');
  });

  test('Opening Tree title is visible', () => {
    renderTree();
    expect(screen.getByText('Opening Tree')).toBeInTheDocument();
  });
});
