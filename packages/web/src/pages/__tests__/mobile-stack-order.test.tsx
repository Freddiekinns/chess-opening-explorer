/**
 * Guard for the ≤767px block order on the opening detail page.
 *
 * The order is a design decision, not an accident: the explorer surface and
 * master games are both data about the position, and everything after them
 * leads away from the page — how to play it, then go watch someone explain
 * it, then go search for yourself.
 *
 * It has already been decided both ways. The UX-review spec's decision table
 * put master games last, below even the search pills, and phase 4 implemented
 * that; it was reversed on 2026-07-30 because the stated reason ("makes both
 * breakpoints agree") was false — desktop has always rendered master games
 * above the resources. Reordering a JSX stack is a one-line change no other
 * test notices, which is why a decision with that history gets its own test.
 *
 * Canonical references: §3.2 of
 * `docs/superpowers/specs/2026-07-27-ux-review-implementation-design.md` and
 * `design-system/project/preview/components-opening-detail-mobile.html`.
 */

import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import OpeningDetailPage from '../OpeningDetailPage';
import { MOBILE_QUERY } from '../../hooks/useMediaQuery';
import type { ExplorerResult } from '../../lib/lichessExplorer';

vi.mock('../../lib/analytics', () => ({ trackEvent: vi.fn() }));

const { fetchExplorerMock } = vi.hoisted(() => ({ fetchExplorerMock: vi.fn() }));
vi.mock('../../lib/lichessExplorer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/lichessExplorer')>();
  return { ...actual, fetchExplorer: fetchExplorerMock };
});

const FEN = 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2';

/** Every block the stack can render, so order is the only variable. */
const opening = {
  fen: FEN,
  name: "King's Pawn Game: King's Knight Variation",
  eco: 'C20',
  moves: '1.e4 e5',
  description: 'A symmetrical reply that keeps the game classical.',
  // Top-level only — the page reads plans from the exact position.
  common_plans: ['Develop knight to f3', 'Castle kingside'],
  games_analyzed: 12000,
};

const explorerResult: ExplorerResult = {
  totalGames: 1912,
  white: 840,
  draws: 516,
  black: 556,
  moves: [],
  topGames: [
    {
      id: 'g1',
      white: { name: 'Tal', rating: 2700 },
      black: { name: 'Botvinnik', rating: 2680 },
      winner: 'white',
      year: 1960,
    },
  ],
  averageRating: 2446,
};

const json = (data: unknown) => Promise.resolve({ ok: true, json: () => Promise.resolve(data) });

/** Does `a` come before `b` in the rendered document? */
const precedes = (a: Element, b: Element) =>
  Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('opening detail — mobile block order', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === MOBILE_QUERY,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));

    fetchExplorerMock.mockReset();
    fetchExplorerMock.mockResolvedValue(explorerResult);

    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('/api/openings/page/')) {
          return json({
            success: true,
            data: {
              opening,
              stats: null,
              videos: [{ id: 'v1', title: 'e5 explained', matchReason: 'variation' }],
              courses: {
                courses: [{ id: 's1', name: 'Open games', match: { reason: 'covers-position' } }],
                searchLinks: {
                  lichess: 'https://lichess.org/study',
                  chessable: 'https://chessable.com',
                },
              },
              tree: null,
            },
          });
        }
        return json({ success: true, data: [] });
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const renderPage = async () => {
    await act(async () => {
      render(
        <MemoryRouter initialEntries={[`/opening/${encodeURIComponent(FEN)}`]}>
          <Routes>
            <Route path="/opening/:fen" element={<OpeningDetailPage />} />
          </Routes>
        </MemoryRouter>
      );
    });
  };

  test('runs from position data outwards: explorer, master games, plans, resources, search', async () => {
    await renderPage();

    const overview = await screen.findByRole('heading', { name: 'Overview' });
    const explorer = screen.getByRole('heading', { name: 'Opening explorer' });
    const masterGames = await screen.findByRole('button', { name: /Master games/ });
    const plans = screen.getByRole('heading', { name: 'Common plans' });
    const videos = screen.getByRole('button', { name: /Videos \(1\)/ });
    const studies = screen.getByRole('button', { name: /Studies \(1\)/ });
    const searchPill = screen.getByRole('link', { name: /Search YouTube/ });

    const stack = [overview, explorer, masterGames, plans, videos, studies, searchPill];
    for (let i = 0; i < stack.length - 1; i++) {
      expect(
        precedes(stack[i], stack[i + 1]),
        `${stack[i].textContent?.slice(0, 24)} should come before ${stack[i + 1].textContent?.slice(0, 24)}`
      ).toBe(true);
    }
  });

  test('master games is a collapsed disclosure, like videos and studies', async () => {
    await renderPage();

    const masterGames = await screen.findByRole('button', { name: /Master games/ });
    expect(masterGames).toHaveAttribute('aria-expanded', 'false');
    expect(masterGames).toHaveTextContent('(1)');
    // Sitting directly under the level-filtered surface, it has to say what it
    // is, or the level pills above look like they govern it.
    expect(masterGames).toHaveTextContent('Over-the-board masters');
    expect(screen.queryByRole('link', { name: /Tal/ })).toBeNull();
  });
});
