import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterSheet } from '../FilterSheet';
import { browseResponse } from '../../../test/fixtures/browseResponse';

const facets = browseResponse().facets;
const noFilters = { level: null, style: null, family: null, sort: 'popular' };

const setup = (props = {}) => {
  const onFacetChange = vi.fn();
  const onClear = vi.fn();
  render(
    <FilterSheet
      facets={facets}
      filters={noFilters}
      total={30}
      activeCount={0}
      loading={false}
      onFacetChange={onFacetChange}
      onClear={onClear}
      {...props}
    />
  );
  return { onFacetChange, onClear };
};

afterEach(() => {
  document.body.style.overflow = '';
});

describe('FilterSheet', () => {
  it('collapses to one control with the result count beside it', () => {
    setup();

    expect(screen.getByRole('button', { name: /Filters/ })).toBeInTheDocument();
    expect(screen.getByText('30 openings')).toHaveAttribute('aria-live', 'polite');
  });

  it('badges how many facets are active', () => {
    setup({ filters: { ...noFilters, level: 'Beginner', family: 'london' }, activeCount: 2 });

    expect(screen.getByRole('button', { name: 'Filters 2 active' })).toBeInTheDocument();
  });

  it('does not badge a zero', () => {
    setup({ activeCount: 0 });

    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument();
  });

  it('opens one sheet holding every facet, not one sheet per facet', async () => {
    setup();

    await userEvent.click(screen.getByRole('button', { name: 'Filters' }));

    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Level' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Style' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Sort' })).toBeInTheDocument();
    expect(screen.getByLabelText('Search families')).toBeInTheDocument();
  });

  it('applies a choice immediately, so the footer count is always true', async () => {
    const { onFacetChange } = setup();

    await userEvent.click(screen.getByRole('button', { name: 'Filters' }));
    await userEvent.click(screen.getByRole('button', { name: /^Advanced/ }));

    expect(onFacetChange).toHaveBeenCalledWith('level', 'Advanced');
    // Still open: the sheet is for setting several facets in one visit.
    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument();
  });

  it('the footer button reveals the result and says how many', async () => {
    setup({ total: 3 });

    await userEvent.click(screen.getByRole('button', { name: 'Filters' }));
    await userEvent.click(screen.getByRole('button', { name: 'Show 3 openings' }));

    expect(screen.queryByRole('dialog', { name: 'Filters' })).not.toBeInTheDocument();
  });

  it('says so when the combination matches nothing', async () => {
    setup({ total: 0, activeCount: 2 });

    await userEvent.click(screen.getByRole('button', { name: 'Filters 2 active' }));

    expect(screen.getByRole('button', { name: 'No openings match' })).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    setup();

    await userEvent.click(screen.getByRole('button', { name: 'Filters' }));
    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog', { name: 'Filters' })).not.toBeInTheDocument();
  });

  it('renders the sheet outside the grid, not inside it', async () => {
    // `position: fixed` resolves against the nearest transformed ancestor, and
    // the grid's parent (.popular-openings-section) animates `sectionReveal`,
    // whose keyframes carry translateY. Rendered in place the sheet is
    // positioned relative to that section and lands ~1000px down the page.
    const { container } = render(
      <FilterSheet
        facets={facets}
        filters={noFilters}
        total={30}
        activeCount={0}
        loading={false}
        onFacetChange={vi.fn()}
        onClear={vi.fn()}
      />
    );

    await userEvent.click(screen.getAllByRole('button', { name: 'Filters' })[0]);

    const sheet = screen.getByRole('dialog', { name: 'Filters' });
    expect(container.contains(sheet)).toBe(false);
    expect(document.body.contains(sheet)).toBe(true);
  });

  it('locks the page behind the sheet and releases it on close', async () => {
    setup();

    await userEvent.click(screen.getByRole('button', { name: 'Filters' }));
    expect(document.body.style.overflow).toBe('hidden');

    await userEvent.keyboard('{Escape}');
    expect(document.body.style.overflow).toBe('');
  });

  it('clears every facet from inside the sheet', async () => {
    const { onClear } = setup({ filters: { ...noFilters, level: 'Beginner' }, activeCount: 1 });

    await userEvent.click(screen.getByRole('button', { name: 'Filters 1 active' }));
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));

    expect(onClear).toHaveBeenCalled();
  });
});
