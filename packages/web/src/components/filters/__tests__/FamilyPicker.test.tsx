import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FamilyPicker } from '../FamilyPicker';

const families = [
  { value: 'sicilian', label: 'Sicilian Defense', count: 1710, first_move: 'e4' },
  { value: 'french', label: 'French Defense', count: 531, first_move: 'e4' },
  { value: 'london', label: 'London System', count: 70, first_move: 'd4' },
  { value: 'uncategorised', label: 'Other', count: 192, first_move: null },
];

describe('FamilyPicker', () => {
  it('groups families under their first move', () => {
    render(<FamilyPicker families={families} value={null} onSelect={vi.fn()} />);

    expect(screen.getByText('1. e4')).toBeInTheDocument();
    expect(screen.getByText('1. d4')).toBeInTheDocument();
  });

  it('puts families with no dominant first move in a trailing catch-all', () => {
    render(<FamilyPicker families={families} value={null} onSelect={vi.fn()} />);

    const headings = screen.getAllByTestId('family-group-heading').map((h) => h.textContent);
    // 1. e4 leads on 2,241 openings, then 1. d4 on 70 — and the catch-all is
    // last however big it gets, because it is not a first move.
    expect(headings).toEqual(['1. e4', '1. d4', 'Other openings']);
  });

  it('shows each family count', () => {
    render(<FamilyPicker families={families} value={null} onSelect={vi.fn()} />);

    expect(screen.getByRole('button', { name: /Sicilian Defense/ })).toHaveTextContent('1,710');
  });

  it('filters the list as the user types', async () => {
    render(<FamilyPicker families={families} value={null} onSelect={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('Search families'), 'lond');

    expect(screen.getByRole('button', { name: /London System/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Sicilian Defense/ })).not.toBeInTheDocument();
  });

  it('says so when nothing matches rather than showing an empty list', async () => {
    render(<FamilyPicker families={families} value={null} onSelect={vi.fn()} />);

    await userEvent.type(screen.getByLabelText('Search families'), 'zzz');

    expect(screen.getByText(/No families match/)).toBeInTheDocument();
  });

  it('reports the chosen family and the reset', async () => {
    const onSelect = vi.fn();
    render(<FamilyPicker families={families} value="london" onSelect={onSelect} />);

    await userEvent.click(screen.getByRole('button', { name: /Sicilian Defense/ }));
    expect(onSelect).toHaveBeenCalledWith('sicilian');

    await userEvent.click(screen.getByRole('button', { name: 'Any family' }));
    expect(onSelect).toHaveBeenCalledWith(null);
  });

  it('marks the active family as pressed', () => {
    render(<FamilyPicker families={families} value="london" onSelect={vi.fn()} />);

    expect(screen.getByRole('button', { name: /London System/ })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });
});
