import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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
  it('is a single line of guidance, not a panel', () => {
    renderSection();

    expect(screen.getByText('Star openings to build your repertoire.')).toBeInTheDocument();
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
