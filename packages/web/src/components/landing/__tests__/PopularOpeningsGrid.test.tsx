import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PopularOpeningsGrid } from '../PopularOpeningsGrid';
import { MOBILE_QUERY } from '../../../hooks/useMediaQuery';
import { browseResponse, browseItem } from '../../../test/fixtures/browseResponse';

// Every test here renders the whole grid, and three of the ten cost more than
// 1.5s locally — 2653ms for Load more, 2066ms for the accessibility-tree query
// in `cards stay real links`, 1642ms for the save flow. A loaded CI runner
// takes the file from ~11s to ~28s, which puts those three over the 5000ms
// per-test default: across the 2026-08-31 dependency batch it went red four
// times, on two different tests, on branches whose installed tree was
// byte-identical to a green `main`. Widened for this file and nowhere else,
// because the deadline is the wrong size here, not in the suite.
vi.setConfig({ testTimeout: 15000 });

const renderGrid = (initialEntry = '/') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <PopularOpeningsGrid />
    </MemoryRouter>
  );

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, json: async () => browseResponse() })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PopularOpeningsGrid', () => {
  it('renders the openings the browse endpoint returned', async () => {
    renderGrid();

    expect(await screen.findByText('Sicilian Defence')).toBeInTheDocument();
    expect(screen.getByText('Ruy Lopez')).toBeInTheDocument();
  });

  it('dates the counts by the window the browse response covers', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => browseResponse({ window: { since: '2026-07', until: '2026-09' } }),
      })
    );
    renderGrid();
    const note = await screen.findByText('Lichess · Jul–Sep 2026');
    // A small note beside the count, not a second subtitle under the heading.
    expect(note.closest('.section-header')).toBeNull();
  });

  // The heading names the players; the range sits beside the numbers it
  // scopes, in the detail page's source-line form.
  it('states the Lichess range in the note beside the count', async () => {
    localStorage.setItem('openingbook:my-level', '1400');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => browseResponse({ window: { since: '2026-07', until: '2026-09' } }),
      })
    );
    renderGrid();
    expect(await screen.findByText('Lichess · 1400–1800 · Jul–Sep 2026')).toBeInTheDocument();
  });

  it('leaves the date off on mobile, where the cards show no game counts', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === MOBILE_QUERY,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => browseResponse({ window: { since: '2026-07', until: '2026-09' } }),
      })
    );
    renderGrid();
    await screen.findByText('Sicilian Defence');
    expect(screen.queryByText(/Jul–Sep 2026/)).toBeNull();
  });

  // The heading is the one place the level is named; the subtitle and the
  // cards under it don't repeat it.
  it('heading reads Popular with intermediate players', async () => {
    localStorage.setItem('openingbook:my-level', '1400');
    renderGrid();

    expect(
      await screen.findByRole('heading', { name: 'Popular with intermediate players' })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'The most popular openings for every style of play, from classic variations to hypermodern'
      )
    ).toBeInTheDocument();
    expect(await screen.findAllByText('1K games')).toHaveLength(2);
    expect(screen.queryByText(/games at/)).toBeNull();
  });

  it('keeps the level in lower case mid-sentence', async () => {
    localStorage.setItem('openingbook:my-level', 'u1400');
    renderGrid();

    expect(
      await screen.findByRole('heading', { name: 'Popular with beginners' })
    ).toBeInTheDocument();
  });

  it('keeps the plain heading with no level saved', async () => {
    renderGrid();
    expect(await screen.findByRole('heading', { name: 'Popular openings' })).toBeInTheDocument();
    expect(await screen.findAllByText('1K games')).toHaveLength(2);
  });

  it('says nothing about dates when the response has no window', async () => {
    renderGrid();
    await screen.findByText('Sicilian Defence');
    expect(screen.queryByText(/Lichess ·/)).toBeNull();
  });

  it('the count on screen is the filtered total from the same request', async () => {
    renderGrid();

    await screen.findByText('Sicilian Defence');
    // 30 total, 2 shown — the count states the whole result set, not the page.
    expect(screen.getByText('30 openings')).toBeInTheDocument();
  });

  it('Load more states the true remainder', async () => {
    renderGrid();

    await screen.findByText('Sicilian Defence');
    expect(screen.getByRole('button', { name: 'Load more (28 remaining)' })).toBeInTheDocument();
  });

  it('Load more appends rather than replacing', async () => {
    renderGrid();
    await screen.findByText('Sicilian Defence');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () =>
          browseResponse({
            items: [browseItem('French Defence', 'fen-3')],
            page: 2,
            offset: 12,
            remaining: 17,
          }),
      })
    );
    await userEvent.click(screen.getByRole('button', { name: 'Load more (28 remaining)' }));

    expect(await screen.findByText('French Defence')).toBeInTheDocument();
    expect(screen.getByText('Sicilian Defence')).toBeInTheDocument();
  });

  it('hides Load more when nothing remains', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => browseResponse({ total: 2, remaining: 0 }),
      })
    );
    renderGrid();

    await screen.findByText('Sicilian Defence');
    expect(screen.queryByRole('button', { name: /Load more/ })).not.toBeInTheDocument();
  });

  it('cards stay real links so 12,000 pages keep their internal links', async () => {
    renderGrid();

    const link = await screen.findByRole('link', { name: /Sicilian Defence/ });
    expect(link).toHaveAttribute('href', '/opening/fen-1');
  });

  it('applies a filter from the URL without the user touching a control', async () => {
    renderGrid('/?style=gambit');

    await screen.findByText('Sicilian Defence');
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('style=gambit');
    expect(screen.getByRole('button', { name: 'Style Gambit' })).toBeInTheDocument();
  });

  // #206 retired the Difficulty facet. Old shared links still load; the
  // parameter is ignored rather than filtering with no control to undo it.
  it('loads an old ?level= link unfiltered', async () => {
    renderGrid('/?level=Beginner');

    await screen.findByText('Sicilian Defence');
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).not.toContain('level=');
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
  });

  it('says the filters matched nothing, and offers a way out', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => browseResponse({ items: [], total: 0, remaining: 0 }),
      })
    );
    renderGrid('/?style=gambit');

    expect(await screen.findByText('No openings match these filters.')).toBeInTheDocument();
    // Deliberately not "Clear filters": the bar above already carries that
    // label, and two identically-named buttons is a coin toss.
    expect(screen.getByRole('button', { name: 'Show all openings' })).toBeInTheDocument();
  });

  it('says the load failed rather than showing an empty grid as a result', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    renderGrid();

    expect(await screen.findByText(/Could not load openings/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('still lets a user save from a card, with undo', async () => {
    renderGrid();

    const stars = await screen.findAllByRole('button', { name: 'Save to repertoire' });
    await userEvent.click(stars[0]);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Remove from repertoire' })).toBeInTheDocument()
    );
    expect(screen.getByRole('status')).toHaveTextContent('Added to your repertoire');

    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getAllByRole('button', { name: 'Save to repertoire' })).toHaveLength(2);
  });
});
