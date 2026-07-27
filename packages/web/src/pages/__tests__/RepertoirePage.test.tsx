import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import RepertoirePage from '../RepertoirePage';

const entries = [
  { fen: 'fen-a', name: 'Sicilian Defence', eco: 'B20', moves: '1. e4 c5', savedAt: 100 },
  { fen: 'fen-b', name: 'French Defence', eco: 'C00', moves: '1. e4 e6', savedAt: 200 },
];

const renderPage = () =>
  render(
    <MemoryRouter>
      <RepertoirePage />
    </MemoryRouter>
  );

describe('RepertoirePage', () => {
  beforeEach(() => localStorage.clear());

  it('invites the user to start when nothing is saved', () => {
    renderPage();

    expect(screen.getByText('Nothing saved yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Browse openings' })).toHaveAttribute('href', '/');
  });

  it('lists saved openings, most recently saved first', () => {
    localStorage.setItem('chess-repertoire', JSON.stringify(entries));
    renderPage();

    const names = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(names).toEqual(['French Defence', 'Sicilian Defence']);
  });

  it('counts what is saved', () => {
    localStorage.setItem('chess-repertoire', JSON.stringify(entries));
    renderPage();

    expect(screen.getByText('2 openings saved.')).toBeInTheDocument();
  });

  it('unsaving from the page offers undo', async () => {
    localStorage.setItem('chess-repertoire', JSON.stringify(entries));
    renderPage();

    await userEvent.click(screen.getAllByRole('button', { name: 'Remove from repertoire' })[0]);

    expect(screen.getByRole('status')).toHaveTextContent('Removed from your repertoire');
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(2);
  });

  it('keeps itself out of the index — personal, device-local and thin', () => {
    localStorage.setItem('chess-repertoire', JSON.stringify(entries));
    renderPage();

    // React hoists metadata tags into the document head.
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex'
    );
  });
});
