import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import TopBar from '../TopBar';
import BottomTabBar from '../BottomTabBar';

beforeEach(() => localStorage.clear());
afterEach(() => {
  vi.unstubAllGlobals();
});

const stubSearch = (data: { fen: string; name: string; eco: string; moves: string }[]) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ success: true, data, totalResults: data.length }),
    }))
  );

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <TopBar />
    </MemoryRouter>
  );

describe('TopBar search', () => {
  it('is available on Discover', () => {
    renderAt('/');

    expect(screen.getByPlaceholderText('Search openings...')).toBeInTheDocument();
  });

  it('is available on Analyse', () => {
    renderAt('/analyse');

    expect(screen.getByPlaceholderText('Search openings...')).toBeInTheDocument();
  });

  it('is available on a detail page', () => {
    renderAt('/opening/abc');

    expect(screen.getByPlaceholderText('Search openings...')).toBeInTheDocument();
  });

  it('no longer carries Surprise me as a bar button', () => {
    renderAt('/opening/abc');

    expect(screen.queryByRole('button', { name: 'Surprise me!' })).not.toBeInTheDocument();
  });

  it('shows the hub before any typing, so the field is useful on focus', () => {
    localStorage.setItem(
      'chess-repertoire',
      JSON.stringify([
        { fen: 'fen-a', name: 'Sicilian Defence', eco: 'B20', moves: '1. e4 c5', savedAt: 1 },
      ])
    );
    renderAt('/');

    fireEvent.focus(screen.getByPlaceholderText('Search openings...'));

    expect(screen.getByText('Your repertoire')).toBeInTheDocument();
    expect(screen.getByText('Sicilian Defence')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /surprise me/i })).toBeInTheDocument();
  });

  it('keeps focus on the field when the hub is pressed, so the row survives to be clicked', () => {
    localStorage.setItem(
      'chess-repertoire',
      JSON.stringify([
        { fen: 'fen-a', name: 'Sicilian Defence', eco: 'B20', moves: '1. e4 c5', savedAt: 1 },
      ])
    );
    renderAt('/');
    fireEvent.focus(screen.getByPlaceholderText('Search openings...'));

    const cancelled = !fireEvent.mouseDown(screen.getByText('Sicilian Defence'));

    expect(cancelled).toBe(true);
  });

  // All three search surfaces used to drop the hub — and Surprise me with it —
  // the moment a second character arrived.
  it('keeps Surprise me once typing starts, and states no count', async () => {
    const user = userEvent.setup();
    stubSearch([
      { fen: 'fen-a', name: 'Sicilian Defence', eco: 'B20', moves: '1. e4 c5' },
      { fen: 'fen-b', name: 'Sicilian Najdorf', eco: 'B90', moves: '1. e4 c5 2. Nf3 d6' },
    ]);
    renderAt('/');

    await user.type(screen.getByPlaceholderText('Search openings...'), 'sic');

    await waitFor(() => expect(screen.getByText('Sicilian Najdorf')).toBeInTheDocument());
    expect(screen.queryByText('Your repertoire')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /surprise me/i })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('badges a result that is already saved', async () => {
    const user = userEvent.setup();
    localStorage.setItem(
      'chess-repertoire',
      JSON.stringify([
        { fen: 'fen-a', name: 'Sicilian Defence', eco: 'B20', moves: '1. e4 c5', savedAt: 1 },
      ])
    );
    stubSearch([
      { fen: 'fen-a', name: 'Sicilian Defence', eco: 'B20', moves: '1. e4 c5' },
      { fen: 'fen-b', name: 'Sicilian Najdorf', eco: 'B90', moves: '1. e4 c5 2. Nf3 d6' },
    ]);
    renderAt('/');

    await user.type(screen.getByPlaceholderText('Search openings...'), 'sic');

    await waitFor(() => expect(screen.getByText('Sicilian Najdorf')).toBeInTheDocument());
    expect(screen.getAllByText('Saved')).toHaveLength(1);
    expect(screen.getByText('Sicilian Defence').closest('li')).toHaveTextContent('Saved');
  });
});

// The overlay lives inside the sticky TopBar's stacking context, so the bottom
// tab bar paints — and hit-tests — above it. A tab therefore navigates while
// search is open, and the overlay has to get out of the way or the new page is
// invisible under it and the tabs read as broken.
describe('mobile search overlay', () => {
  const renderWithTabs = () =>
    render(
      <MemoryRouter initialEntries={['/']}>
        <TopBar />
        <BottomTabBar />
      </MemoryRouter>
    );

  it('closes when a bottom tab navigates away', async () => {
    const user = userEvent.setup();
    renderWithTabs();
    await user.click(screen.getByRole('button', { name: 'Search openings' }));
    expect(screen.getByRole('dialog', { name: 'Search openings' })).toBeInTheDocument();

    await user.click(screen.getByRole('link', { name: /repertoire/i }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Search openings' })).not.toBeInTheDocument()
    );
  });

  it('reopens empty after navigating away mid-search', async () => {
    const user = userEvent.setup();
    stubSearch([{ fen: 'fen-a', name: 'Sicilian Defence', eco: 'B20', moves: '1. e4 c5' }]);
    renderWithTabs();
    await user.click(screen.getByRole('button', { name: 'Search openings' }));
    const overlayInput = () =>
      within(screen.getByRole('dialog', { name: 'Search openings' })).getByPlaceholderText(
        'Search openings...'
      );
    await user.type(overlayInput(), 'sic');
    await waitFor(() => expect(screen.getByText('Sicilian Defence')).toBeInTheDocument());

    await user.click(screen.getByRole('link', { name: /repertoire/i }));
    await user.click(screen.getByRole('button', { name: 'Search openings' }));

    expect(overlayInput()).toHaveValue('');
  });
});
