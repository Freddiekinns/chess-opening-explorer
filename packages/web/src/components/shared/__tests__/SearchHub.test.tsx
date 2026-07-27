import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchHub } from '../SearchHub';

const saved = [
  { fen: 'fen-sicilian', name: 'Sicilian Defence', eco: 'B20', moves: '1. e4 c5', savedAt: 1 },
];

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('chess-repertoire', JSON.stringify(saved));
  localStorage.setItem(
    'chess-recent-openings',
    JSON.stringify([
      { fen: 'fen-french', name: 'French Defence', eco: 'C00', moves: '1. e4 e6', viewedAt: 2 },
    ])
  );
});

describe('SearchHub', () => {
  it('answers "where was I?" before the user types', () => {
    render(<SearchHub onSelect={() => {}} onSurprise={() => {}} />);

    expect(screen.getByText('Recent')).toBeInTheDocument();
    expect(screen.getByText('French Defence')).toBeInTheDocument();
  });

  it('surfaces the repertoire', () => {
    render(<SearchHub onSelect={() => {}} onSurprise={() => {}} />);

    expect(screen.getByText('Your repertoire')).toBeInTheDocument();
    expect(screen.getByText('Sicilian Defence')).toBeInTheDocument();
  });

  it('reports the chosen opening by fen', async () => {
    const onSelect = vi.fn();
    render(<SearchHub onSelect={onSelect} onSurprise={() => {}} />);

    await userEvent.click(screen.getByText('French Defence'));

    expect(onSelect).toHaveBeenCalledWith('fen-french');
  });

  it('offers Surprise me', async () => {
    const onSurprise = vi.fn();
    render(<SearchHub onSelect={() => {}} onSurprise={onSurprise} />);

    await userEvent.click(screen.getByRole('button', { name: /surprise me/i }));

    expect(onSurprise).toHaveBeenCalledTimes(1);
  });

  it('still offers Surprise me when there is no history at all', () => {
    localStorage.clear();
    render(<SearchHub onSelect={() => {}} onSurprise={() => {}} />);

    expect(screen.queryByText('Recent')).not.toBeInTheDocument();
    expect(screen.queryByText('Your repertoire')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /surprise me/i })).toBeInTheDocument();
  });
});
