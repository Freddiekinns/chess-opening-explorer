/**
 * Guard: the three search surfaces ask the same question and give the same
 * answer.
 *
 * They did not. `SearchBar` (hero), `TopBarSearch` and `SearchOverlay` each
 * owned a fetch, a debounce and a no-results string. Only the hero expanded
 * abbreviations, so "qgd" resolved to the Queen's Gambit Declined there and to
 * whatever the fuzzy index made of the literal three letters in the top bar —
 * and "kid" returned 12,093 results led by the Kiddie Countergambit. The
 * debounces were 300ms and 250ms for no stated reason.
 *
 * This test compares the request each surface issues and the copy each shows
 * when the search fails, which is the pair that silently drifted.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import { SearchBar } from '../SearchBar';
import SearchOverlay from '../SearchOverlay';
import TopBar from '../../layout/TopBar';

const { navigateMock } = vi.hoisted(() => ({ navigateMock: vi.fn() }));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => navigateMock };
});

/** The hero holds a local index slice; the other two surfaces never do. */
const LOCAL_INDEX = [
  {
    fen: 'fen-qgd-local',
    name: "Queen's Gambit Declined",
    eco: 'D30',
    moves: '1. d4 d5 2. c4 e6',
    src: 'test',
    games_analyzed: 9000,
  },
];

const SERVED = [
  {
    fen: 'fen-qgd-served',
    name: "Queen's Gambit Declined: Normal Defense",
    eco: 'D35',
    moves: '1. d4 d5 2. c4 e6 3. Nc3 Nf6',
    searchScore: 5.4,
  },
];

const createFetchMock = (data: unknown[]) =>
  vi.fn(async (url: string) => {
    void url;
    return { ok: true, json: async () => ({ success: true, data }) };
  });

let fetchMock: ReturnType<typeof createFetchMock>;

function stubSearch(data: unknown[]) {
  fetchMock = createFetchMock(data);
  vi.stubGlobal('fetch', fetchMock);
}

/** Every surface, in the configuration it actually ships in. */
const surfaces = [
  {
    name: 'hero',
    render: () =>
      render(
        <MemoryRouter>
          <SearchBar onSelect={vi.fn()} openingsData={LOCAL_INDEX} onSurprise={vi.fn()} />
        </MemoryRouter>
      ),
    field: () => screen.getByRole('textbox'),
  },
  {
    name: 'top bar',
    render: () =>
      render(
        <MemoryRouter>
          <TopBar />
        </MemoryRouter>
      ),
    field: () => screen.getByPlaceholderText('Search openings...'),
  },
  {
    name: 'mobile overlay',
    render: () =>
      render(
        <MemoryRouter>
          <SearchOverlay open onClose={vi.fn()} />
        </MemoryRouter>
      ),
    field: () => screen.getByPlaceholderText('Search openings...'),
  },
];

const searchRequests = () =>
  fetchMock.mock.calls
    .map(([url]) => String(url))
    .filter((url) => url.includes('/api/openings/semantic-search'));

beforeEach(() => {
  localStorage.clear();
  navigateMock.mockReset();
  vi.unstubAllGlobals();
});

describe('search surface parity', () => {
  describe.each(surfaces)('$name', (surface) => {
    it('expands "qgd" before asking the server', async () => {
      const user = userEvent.setup();
      stubSearch(SERVED);
      surface.render();

      await user.type(surface.field(), 'qgd');

      await waitFor(() => expect(searchRequests().length).toBeGreaterThan(0));
      expect(searchRequests()[0]).toContain(`q=${encodeURIComponent("Queen's Gambit Declined")}`);
    });

    it("shows the server's openings, not a local guess", async () => {
      const user = userEvent.setup();
      stubSearch(SERVED);
      surface.render();

      await user.type(surface.field(), 'qgd');

      await waitFor(() =>
        expect(screen.getByText("Queen's Gambit Declined: Normal Defense")).toBeInTheDocument()
      );
    });

    it('says the same thing when the search fails', async () => {
      const user = userEvent.setup();
      stubSearch([]);
      surface.render();

      await user.type(surface.field(), 'zzzz');

      await waitFor(() =>
        expect(screen.getByText('No openings match your search')).toBeInTheDocument()
      );
      expect(
        screen.getByText('Try an ECO code (B02) or paste a PGN on the Analyse tab.')
      ).toBeInTheDocument();
    });

    // The list has to stop answering the previous question. Left in place, the
    // old openings sit under a query that matched nothing and the dead end
    // never appears at all.
    it("clears the last query's openings when the next one matches nothing", async () => {
      const user = userEvent.setup();
      stubSearch(SERVED);
      surface.render();

      await user.type(surface.field(), 'qgd');
      await waitFor(() =>
        expect(screen.getByText("Queen's Gambit Declined: Normal Defense")).toBeInTheDocument()
      );

      stubSearch([]);
      await user.clear(surface.field());
      await user.type(surface.field(), 'zzzz');

      await waitFor(() =>
        expect(screen.getByText('No openings match your search')).toBeInTheDocument()
      );
      expect(screen.queryByText("Queen's Gambit Declined: Normal Defense")).not.toBeInTheDocument();
    });
  });

  it('promotes a saved opening over the equally-ranked one above it', async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      'chess-repertoire',
      JSON.stringify([
        { fen: 'fen-b', name: 'Sicilian Dragon', eco: 'B70', moves: '1. e4 c5', savedAt: 1 },
      ])
    );
    stubSearch([
      { fen: 'fen-a', name: 'Sicilian Najdorf', eco: 'B90', moves: '1. e4 c5', searchScore: 1.5 },
      { fen: 'fen-b', name: 'Sicilian Dragon', eco: 'B70', moves: '1. e4 c5', searchScore: 1.5 },
    ]);

    render(
      <MemoryRouter>
        <SearchOverlay open onClose={vi.fn()} />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText('Search openings...'), 'sicilian');
    await waitFor(() => expect(screen.getByText('Sicilian Dragon')).toBeInTheDocument());

    const rows = screen.getAllByRole('listitem');
    expect(within(rows[0]).getByText('Sicilian Dragon')).toBeInTheDocument();
    expect(within(rows[0]).getByText('Saved')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Sicilian Najdorf')).toBeInTheDocument();
  });
});
