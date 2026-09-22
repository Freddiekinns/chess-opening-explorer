/**
 * @fileoverview A page that failed to load is not a page that does not exist.
 *
 * The middleware pre-renders every opening's content into #root, and React
 * replaces it on mount. When the one aggregate fetch failed for any reason —
 * a cold-start timeout, a 5xx, or Googlebot's renderer declining the request —
 * the page used to render "Opening not found" over that content, which is what
 * Search Console's soft-404 classifier reads. Only the API's own 404 means the
 * position does not exist.
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import OpeningDetailPage from '../OpeningDetailPage';
import { mockOpeningDataSimple } from '../../test/fixtures/openingData';

const mockFetch = vi.fn();
global.fetch = mockFetch;

const opening = {
  ...mockOpeningDataSimple,
  name: 'Italian Game',
  eco: 'C50',
  moves: '1.e4 e5 2.Nf3 Nc6 3.Bc4',
  fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
};

const respond = (status: number, body: unknown) =>
  Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });

const pageOk = () =>
  respond(200, {
    success: true,
    data: {
      opening,
      stats: null,
      videos: [],
      courses: { courses: [], searchLinks: null },
      tree: null,
    },
  });

// Route every call; `page` decides the aggregate endpoint's answer.
const withPageResponse = (page: () => Promise<unknown>) => {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes('/sounds/')) {
      return Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) });
    }
    if (url.includes('/api/openings/page/')) return page();
    return respond(200, { success: true, data: [] });
  });
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={[`/opening/${encodeURIComponent(opening.fen)}`]}>
      <Routes>
        <Route path="/opening/:fen" element={<OpeningDetailPage />} />
      </Routes>
    </MemoryRouter>
  );

const pageCalls = () =>
  mockFetch.mock.calls.filter(([url]) => String(url).includes('/api/openings/page/')).length;

describe('Opening detail page when the load fails', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('a 404 from the API says the opening was not found', async () => {
    withPageResponse(() =>
      respond(404, { success: false, error: 'Opening not found for this position' })
    );
    await act(async () => {
      renderPage();
    });

    expect(await screen.findByRole('heading', { name: 'Opening not found' })).toBeInTheDocument();
  });

  test('a server error does not claim the opening is missing', async () => {
    withPageResponse(() => respond(500, { success: false, error: 'boom' }));
    await act(async () => {
      renderPage();
    });

    expect(
      await screen.findByRole('heading', { name: "This opening didn't load" })
    ).toBeInTheDocument();
    expect(screen.queryByText(/not found/i)).not.toBeInTheDocument();
  });

  test('a network failure does not claim the opening is missing', async () => {
    withPageResponse(() => Promise.reject(new TypeError('Failed to fetch')));
    await act(async () => {
      renderPage();
    });

    expect(
      await screen.findByRole('heading', { name: "This opening didn't load" })
    ).toBeInTheDocument();
    expect(screen.queryByText(/not found/i)).not.toBeInTheDocument();
  });

  test('Try again refetches and shows the opening', async () => {
    let attempts = 0;
    withPageResponse(() => {
      attempts += 1;
      return attempts === 1 ? respond(500, { success: false }) : pageOk();
    });
    await act(async () => {
      renderPage();
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Try again' }));

    await waitFor(() => expect(screen.getByText('Italian Game')).toBeInTheDocument());
    expect(pageCalls()).toBe(2);
  });
});
