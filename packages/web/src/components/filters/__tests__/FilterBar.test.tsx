import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterBar } from '../FilterBar';
import { resultCountLabel } from '../resultCount';
import { browseResponse } from '../../../test/fixtures/browseResponse';

const facets = browseResponse().facets;
const noFilters = { style: null, family: null, sort: 'popular' };

const setup = (props = {}) => {
  const onFacetChange = vi.fn();
  const onClear = vi.fn();
  const onBandChange = vi.fn();
  render(
    <FilterBar
      facets={facets}
      filters={noFilters}
      total={30}
      activeCount={0}
      loading={false}
      onFacetChange={onFacetChange}
      onClear={onClear}
      band={null}
      onBandChange={onBandChange}
      {...props}
    />
  );
  return { onFacetChange, onClear, onBandChange };
};

describe('FilterBar', () => {
  it('level is first in the bar with a divider', () => {
    setup();
    const buttons = screen.getAllByRole('button');
    expect(buttons[0]).toHaveAccessibleName('Your level All levels');
    expect(document.querySelector('[data-testid="level-divider"]')).toBeInTheDocument();
  });

  it('names a saved level by its name', () => {
    setup({ band: '1400' });
    expect(screen.getByRole('button', { name: 'Your level Intermediate' })).toBeInTheDocument();
  });

  it('offers every level by name, with its Lichess rating beside it', async () => {
    const user = userEvent.setup();
    const { onBandChange } = setup();
    await user.click(screen.getByRole('button', { name: 'Your level All levels' }));

    const menu = screen.getByRole('dialog', { name: 'Rank by your level' });
    expect(menu).toHaveTextContent('Lichess rating');
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'All levels',
      'Beginner Under 1400',
      'Intermediate 1400–1800',
      'Advanced 1800–2200',
      'Expert 2200+',
    ]);

    await user.click(screen.getByRole('option', { name: /^Advanced/ }));
    expect(onBandChange).toHaveBeenCalledWith('1800');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('every facet button states what it filters and what it is set to', () => {
    setup();

    expect(screen.getByRole('button', { name: 'Style Any' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Family Any' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sort Most played' })).toBeInTheDocument();
  });

  it('has no Difficulty facet: level words name players, not openings (#206)', () => {
    setup();
    expect(screen.queryByRole('button', { name: /Difficulty/ })).not.toBeInTheDocument();
  });

  it('shows the active value on the trigger, not a generic label', () => {
    setup({ filters: { ...noFilters, style: 'gambit' }, activeCount: 1 });

    expect(screen.getByRole('button', { name: 'Style Gambit' })).toBeInTheDocument();
  });

  it('still labels a selection whose count has fallen to zero', () => {
    // The API keeps the applied value in its own facet list at count 0 exactly
    // so the trigger can name it; without that this would read "Style Any"
    // while the grid was filtered to Gambit.
    const zeroed = {
      ...facets,
      style: [{ value: 'gambit', label: 'Gambit', count: 0 }],
    };
    setup({
      facets: zeroed,
      filters: { ...noFilters, style: 'gambit' },
      activeCount: 1,
      total: 0,
    });

    expect(screen.getByRole('button', { name: 'Style Gambit' })).toBeInTheDocument();
  });

  it('opens a menu of options with their counts and reports the choice', async () => {
    const { onFacetChange } = setup();

    await userEvent.click(screen.getByRole('button', { name: 'Style Any' }));
    const option = screen.getByRole('option', { name: /Sharp/ });
    expect(option).toHaveTextContent('18');

    await userEvent.click(option);
    expect(onFacetChange).toHaveBeenCalledWith('style', 'sharp');
  });

  it('closes the menu after a choice', async () => {
    setup();

    await userEvent.click(screen.getByRole('button', { name: 'Style Any' }));
    await userEvent.click(screen.getByRole('option', { name: /Sharp/ }));

    expect(screen.queryByRole('option', { name: /Sharp/ })).not.toBeInTheDocument();
  });

  it('lets a user reset one facet from its own menu', async () => {
    const { onFacetChange } = setup({
      filters: { ...noFilters, style: 'gambit' },
      activeCount: 1,
    });

    await userEvent.click(screen.getByRole('button', { name: 'Style Gambit' }));
    await userEvent.click(screen.getByRole('option', { name: 'Any style' }));

    expect(onFacetChange).toHaveBeenCalledWith('style', null);
  });

  it('closes the menu on Escape', async () => {
    setup();

    await userEvent.click(screen.getByRole('button', { name: 'Style Any' }));
    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('option', { name: /Sharp/ })).not.toBeInTheDocument();
  });

  it('announces the result count to screen readers', () => {
    setup();

    const count = screen.getByText('30 openings');
    expect(count).toHaveAttribute('aria-live', 'polite');
    // NOT role="status" — Toast owns that role in this section, and a second
    // one would make getByRole('status') ambiguous.
    expect(count).not.toHaveAttribute('role');
  });

  it('offers Clear only when something is filtered', () => {
    setup({ activeCount: 0 });

    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument();
  });

  it('clears every facet at once', async () => {
    const { onClear } = setup({ filters: { ...noFilters, level: 'Beginner' }, activeCount: 1 });

    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(onClear).toHaveBeenCalled();
  });

  it('sort is not clearable — it always has a value', async () => {
    setup();

    await userEvent.click(screen.getByRole('button', { name: 'Sort Most played' }));

    expect(screen.getByRole('option', { name: 'A–Z' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /^Any/ })).not.toBeInTheDocument();
  });
});

describe('resultCountLabel', () => {
  it('counts honestly, including the singular and the empty case', () => {
    expect(resultCountLabel(0)).toBe('No openings');
    expect(resultCountLabel(1)).toBe('1 opening');
    expect(resultCountLabel(12377)).toBe('12,377 openings');
  });
});
