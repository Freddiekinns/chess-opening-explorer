/**
 * @fileoverview Unit tests for the mobile CategoryFilter dropdown.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CategoryFilter } from '../CategoryFilter';

const categories = [
  { id: 'all', label: 'All Openings' },
  { id: 'A', label: 'Irregular Openings (A)' },
  { id: 'B', label: 'Semi-Open Games (B)' },
  { id: 'C', label: 'Open Games (C)' },
  { id: 'D', label: 'Closed and Semi-Closed Games (D)' },
  { id: 'E', label: 'Indian Defences (E)' },
];

describe('CategoryFilter', () => {
  let onCategoryChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onCategoryChange = vi.fn();
  });

  const renderFilter = (selectedCategory = 'all') =>
    render(
      <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={onCategoryChange}
      />
    );

  it('shows "Category" on the trigger when nothing is selected', () => {
    renderFilter('all');
    expect(screen.getByRole('button', { name: /category/i })).toBeInTheDocument();
    // Menu is closed by default.
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('opens the menu with full, un-clipped labels on click', () => {
    renderFilter('all');
    fireEvent.click(screen.getByRole('button', { name: /category/i }));

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: /Closed and Semi-Closed Games \(D\)/i })
    ).toBeInTheDocument();
  });

  it('calls onCategoryChange and closes the menu when an option is picked', () => {
    renderFilter('all');
    fireEvent.click(screen.getByRole('button', { name: /category/i }));
    fireEvent.click(screen.getByRole('option', { name: /Open Games \(C\)/i }));

    expect(onCategoryChange).toHaveBeenCalledWith('C');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows the full category name on the trigger and marks the selected option', () => {
    renderFilter('C');
    // Trigger shows the full name (matching the menu), not an abbreviation.
    expect(screen.getByRole('button', { name: /Open Games \(C\)/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Open Games \(C\)/i }));
    expect(screen.getByRole('option', { name: /Open Games \(C\)/i })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  it('closes on Escape', () => {
    renderFilter('all');
    fireEvent.click(screen.getByRole('button', { name: /category/i }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
