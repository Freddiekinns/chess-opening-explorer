import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
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
    expect(screen.getByRole('button', { expanded: false, name: /family/i })).toBeInTheDocument();
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

describe('FilterSheet - the family list is opt-in', () => {
  const familyToggle = () => screen.getByRole('button', { name: /family/i, expanded: undefined });

  it('opens showing one row for family, not twenty-nine', async () => {
    setup();

    await userEvent.click(screen.getByRole('button', { name: 'Filters' }));

    // Every level/style/sort option is on screen; the families are behind a
    // row that states the current one. Expanded by default, the sheet opened
    // at ~2,000px of scroll for a facet most visits never touch.
    expect(screen.getByRole('button', { name: 'All levels' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Search families')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Any family/ })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  it('states the applied family in the collapsed row', async () => {
    setup({ filters: { ...noFilters, family: 'sicilian' }, activeCount: 1 });

    await userEvent.click(screen.getByRole('button', { name: 'Filters 1 active' }));

    expect(
      screen.getByRole('button', { name: /Sicilian Defense/, expanded: false })
    ).toBeInTheDocument();
  });

  it('expands to the full picker, and collapses again once a family is chosen', async () => {
    const { onFacetChange } = setup();

    await userEvent.click(screen.getByRole('button', { name: 'Filters' }));
    await userEvent.click(screen.getByRole('button', { name: /^Any family/ }));

    expect(screen.getByLabelText('Search families')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^Sicilian Defense/ }));

    expect(onFacetChange).toHaveBeenCalledWith('family', 'sicilian');
    expect(screen.queryByLabelText('Search families')).not.toBeInTheDocument();
  });

  it('starts collapsed again on the next visit', async () => {
    setup();

    await userEvent.click(screen.getByRole('button', { name: 'Filters' }));
    await userEvent.click(screen.getByRole('button', { name: /^Any family/ }));
    expect(screen.getByLabelText('Search families')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: 'Filters' }));

    expect(screen.queryByLabelText('Search families')).not.toBeInTheDocument();
    expect(familyToggle()).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('FilterSheet - the grabber is not decoration', () => {
  const openSheet = () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }));
    return screen.getByRole('dialog', { name: 'Filters' });
  };

  /**
   * The drag zone, not the grabber button: the handlers live on the wrapper so
   * a gesture that starts on the title still drags. Reached by class because
   * it is a presentational wrapper — giving it a role to satisfy a test would
   * put a lie in the accessibility tree.
   */
  const dragZone = (sheet: HTMLElement) => sheet.firstElementChild as HTMLElement;

  /**
   * jsdom has no PointerEvent, so `fireEvent.pointerDown` degrades to a bare
   * Event carrying no coordinates — every drag would read as zero movement and
   * these tests would pass against a sheet that never moves. A MouseEvent has
   * the coordinates, and React reads `pointerId` straight off the native
   * event, so one added property makes it a pointer event to the handler.
   */
  const pointer = (type: string, target: Element, clientY: number) => {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientY });
    Object.defineProperty(event, 'pointerId', { value: 1 });
    fireEvent(target, event);
  };

  const drag = (sheet: HTMLElement, { to, overMs }: { to: number; overMs: number }) => {
    const zone = dragZone(sheet);
    pointer('pointerdown', zone, 0);
    vi.advanceTimersByTime(overMs);
    pointer('pointermove', zone, to);
    pointer('pointerup', zone, to);
  };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('closes the sheet when tapped, for anyone who taps what looks draggable', () => {
    openSheet();

    fireEvent.click(screen.getByRole('button', { name: 'Close filters' }));

    expect(screen.queryByRole('dialog', { name: 'Filters' })).not.toBeInTheDocument();
  });

  const settle = () => act(() => vi.advanceTimersByTime(250));

  it('dismisses on a drag past the threshold', () => {
    const sheet = openSheet();

    drag(sheet, { to: 200, overMs: 600 });
    // The sheet finishes the journey the finger started before it unmounts.
    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument();
    settle();

    expect(screen.queryByRole('dialog', { name: 'Filters' })).not.toBeInTheDocument();
  });

  it('dismisses on a short flick, which is a dismissal at speed', () => {
    const sheet = openSheet();

    drag(sheet, { to: 40, overMs: 50 });
    settle();

    expect(screen.queryByRole('dialog', { name: 'Filters' })).not.toBeInTheDocument();
  });

  it('springs back from a slow drag that did not commit', () => {
    const sheet = openSheet();

    drag(sheet, { to: 30, overMs: 600 });
    settle();

    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument();
    expect(sheet.style.transform).toBe('');
  });

  it('ignores an upward drag — the sheet is already as far up as it goes', () => {
    const sheet = openSheet();

    drag(sheet, { to: -120, overMs: 300 });

    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument();
    expect(sheet.style.transform).toBe('');
  });

  it('leaves Clear tappable inside the drag zone', () => {
    const onClear = vi.fn();
    render(
      <FilterSheet
        facets={facets}
        filters={{ ...noFilters, level: 'Beginner' }}
        total={30}
        activeCount={1}
        loading={false}
        onFacetChange={vi.fn()}
        onClear={onClear}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Filters 1 active' }));
    const sheet = screen.getByRole('dialog', { name: 'Filters' });

    const clear = screen.getByRole('button', { name: 'Clear' });
    pointer('pointerdown', clear, 0);
    vi.advanceTimersByTime(600);
    pointer('pointermove', dragZone(sheet), 300);
    pointer('pointerup', dragZone(sheet), 300);
    fireEvent.click(clear);

    expect(onClear).toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument();
  });
});
