import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TopBar from '../TopBar';

beforeEach(() => localStorage.clear());

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
});
