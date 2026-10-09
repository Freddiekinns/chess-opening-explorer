import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';

import { ScrollToTop } from '../App';
import { OpeningNavigator } from '../components/detail/OpeningNavigator';
import MobileDataSurface from '../components/detail/mobile/MobileDataSurface';
import type { TreeContext, TreeNode, AncestorNode } from '../hooks/useOpeningTree';

vi.mock('../lib/analytics', () => ({ trackEvent: vi.fn() }));

/* Walking a line is the explorer's whole job, and every step used to be a
   route change that ScrollToTop answered by jumping to the top of the page —
   800px away from the move rows. Steps inside the explorer keep the offset;
   every other navigation still starts at the top. */

const node = (overrides: Partial<TreeNode> = {}): TreeNode => ({
  fen: 'fen-current',
  name: 'French Defense',
  eco: 'C00',
  move: '1...e6',
  moves: '1. e4 e6',
  descendantCount: 10,
  gamesPlayed: 100,
  hasChildren: true,
  ...overrides,
});

const ancestor = (overrides: Partial<TreeNode> = {}): AncestorNode => ({
  ...node(overrides),
  siblings: [],
});

const tree: TreeContext = {
  current: node(),
  ancestors: [ancestor({ fen: 'fen-e4', name: "King's Pawn Game", move: '1. e4' })],
  children: [node({ fen: 'fen-child', name: 'Advance Variation', move: '3. e5' })],
  siblings: [node({ fen: 'fen-sib', name: 'Caro-Kann Defense', move: '1...c6' })],
};

function renderAt(explorer: React.ReactElement) {
  render(
    <MemoryRouter initialEntries={['/opening/fen-current']}>
      <ScrollToTop />
      <Routes>
        <Route
          path="/opening/:fen"
          element={
            <>
              {explorer}
              <Link to="/analyse">Analyse</Link>
            </>
          }
        />
        <Route path="/analyse" element={<p>Analyse page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

const desktop = () =>
  renderAt(
    <OpeningNavigator treeData={tree} loading={false} explorer={null} parentExplorer={null} />
  );

const mobile = () =>
  renderAt(
    <MobileDataSurface
      fen="fen-current"
      band={null}
      onBandChange={vi.fn()}
      popularityStats={null}
      explorer={{ result: null, loading: false, failed: false }}
      parentExplorer={null}
      treeData={tree}
    />
  );

describe('explorer steps keep the scroll position', () => {
  let scrollTo: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scrollTo = vi.fn();
    window.scrollTo = scrollTo as unknown as typeof window.scrollTo;
  });

  test('a next-move row on desktop', async () => {
    desktop();
    scrollTo.mockClear();
    await userEvent.click(screen.getByRole('link', { name: /Advance Variation/ }));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  test('an alternative row on desktop', async () => {
    desktop();
    scrollTo.mockClear();
    await userEvent.click(screen.getByRole('link', { name: /Caro-Kann Defense/ }));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  test('a breadcrumb on desktop', async () => {
    desktop();
    scrollTo.mockClear();
    await userEvent.click(screen.getByRole('link', { name: "King's Pawn Game" }));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  test('a next-move row on mobile', async () => {
    mobile();
    scrollTo.mockClear();
    await userEvent.click(screen.getByRole('link', { name: /Advance Variation/ }));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  test('any other navigation still starts at the top', async () => {
    desktop();
    scrollTo.mockClear();
    await userEvent.click(screen.getByRole('link', { name: 'Analyse' }));
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });
});
