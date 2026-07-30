import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import TopBar from '../TopBar';

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
  it('keeps Surprise me and counts the results once typing starts', async () => {
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
    expect(screen.getByRole('status')).toHaveTextContent('2 openings match');
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
