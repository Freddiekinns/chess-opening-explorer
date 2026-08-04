import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RepertoireSection } from '../RepertoireSection';

beforeEach(() => localStorage.clear());

const renderSection = () =>
  render(
    <MemoryRouter>
      <RepertoireSection />
    </MemoryRouter>
  );

describe('RepertoireSection empty state', () => {
  // What change 03 bought was height: no title, no hint, no CTA — one line
  // where a dashed panel used to stand. The container is not what it dropped,
  // so nothing here asserts its absence.
  it('is one line of guidance, not a titled empty-state panel', () => {
    renderSection();

    expect(screen.getByText(/Star openings to build your repertoire\./)).toBeInTheDocument();
    expect(screen.queryByText('Nothing saved yet')).not.toBeInTheDocument();
  });

  it('carries the star it is naming', () => {
    const { container } = renderSection();

    expect(container.querySelector('svg[aria-hidden="true"]')).toBeInTheDocument();
  });

  it('offers no link, because there is nowhere to go yet', () => {
    renderSection();

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('shows no heading when empty, so Popular openings leads the page', () => {
    renderSection();

    expect(screen.queryByRole('heading', { name: 'Your repertoire' })).not.toBeInTheDocument();
  });
});

describe('RepertoireSection populated', () => {
  beforeEach(() => {
    localStorage.setItem(
      'chess-repertoire',
      JSON.stringify([
        { fen: 'fen-a', name: 'Sicilian Defence', eco: 'B20', moves: '1. e4 c5', savedAt: 1 },
      ])
    );
  });

  it('names the section and counts what is in it', () => {
    renderSection();

    expect(screen.getByRole('heading', { name: 'Your repertoire' })).toBeInTheDocument();
    expect(screen.getByText('1 opening')).toBeInTheDocument();
  });

  // This row is the only place in the product where one tap destroys
  // something the user built. It removed silently while the grid, the detail
  // page and the mobile Repertoire tab all confirmed with an Undo.
  it('confirms a removal and offers Undo', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole('button', { name: /repertoire/i }));

    expect(screen.getByText('Removed from your repertoire')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
  });

  it('puts the opening back when Undo is pressed', async () => {
    const user = userEvent.setup();
    renderSection();

    await user.click(screen.getByRole('button', { name: /repertoire/i }));
    expect(screen.queryByText('Sicilian Defence')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Undo' }));

    expect(screen.getByText('Sicilian Defence')).toBeInTheDocument();
  });

  it('pluralises the count', () => {
    localStorage.setItem(
      'chess-repertoire',
      JSON.stringify([
        { fen: 'fen-a', name: 'Sicilian Defence', eco: 'B20', moves: '1. e4 c5', savedAt: 1 },
        { fen: 'fen-b', name: 'French Defence', eco: 'C00', moves: '1. e4 e6', savedAt: 2 },
      ])
    );
    renderSection();

    expect(screen.getByText('2 openings')).toBeInTheDocument();
  });
});
