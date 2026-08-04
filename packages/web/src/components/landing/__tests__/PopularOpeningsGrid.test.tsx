import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PopularOpeningsGrid } from '../PopularOpeningsGrid';
import { browseResponse, browseItem } from '../../../test/fixtures/browseResponse';

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
    renderGrid('/?level=Beginner');

    await screen.findByText('Sicilian Defence');
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('level=Beginner');
    expect(screen.getByRole('button', { name: 'Level Beginner' })).toBeInTheDocument();
  });

  it('says the filters matched nothing, and offers a way out', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => browseResponse({ items: [], total: 0, remaining: 0 }),
      })
    );
    renderGrid('/?level=Beginner');

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
