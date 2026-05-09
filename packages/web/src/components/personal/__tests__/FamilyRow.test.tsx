import { describe, expect, test, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { FamilyRow } from '../FamilyRow';
import type { FamilyRollupRow } from '../familyAggregation';

beforeEach(() => {
  // Force prefers-reduced-motion: reduce so the count-up returns the target immediately
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({
    matches: q.includes('reduce'),
    media: q,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

const variation = (
  overrides: Partial<FamilyRollupRow['variations'][number]> = {}
): FamilyRollupRow['variations'][number] => ({
  key: 'v1',
  name: 'Sicilian: Najdorf',
  eco: 'B90',
  games: 6,
  wins: 4,
  draws: 1,
  losses: 1,
  ...overrides,
});

const row = (overrides: Partial<FamilyRollupRow> = {}): FamilyRollupRow => ({
  family_id: 'sicilian',
  display_name: 'Sicilian Defence',
  games: 14,
  wins: 7,
  draws: 1,
  losses: 6,
  score: (7 + 0.5) / 14,
  variation_count: 2,
  variations: [
    variation({
      key: 'v1',
      name: 'Sicilian: Najdorf',
      games: 6,
      wins: 4,
      draws: 1,
      losses: 1,
    }),
    variation({
      key: 'v2',
      name: 'Sicilian: Dragon',
      games: 8,
      wins: 3,
      draws: 0,
      losses: 5,
    }),
  ],
  best_variation: variation({
    key: 'v1',
    name: 'Sicilian: Najdorf',
    games: 6,
    wins: 4,
    draws: 1,
    losses: 1,
  }),
  weak_variation: variation({
    key: 'v2',
    name: 'Sicilian: Dragon',
    games: 8,
    wins: 3,
    draws: 0,
    losses: 5,
  }),
  ...overrides,
});

const renderRow = (props: Partial<React.ComponentProps<typeof FamilyRow>> = {}) =>
  render(
    <MemoryRouter>
      <FamilyRow
        colour="white"
        row={row()}
        isExpanded={false}
        onToggle={() => {}}
        openingLink={() => '/opening/test'}
        {...props}
      />
    </MemoryRouter>
  );

describe('FamilyRow', () => {
  test('renders family display name', () => {
    renderRow();
    expect(screen.getByText('Sicilian Defence')).toBeInTheDocument();
  });

  test('renders rounded win-rate percentage', () => {
    renderRow();
    // (7 + 0.5) / 14 ≈ 0.5357 → 54%
    expect(screen.getByText(/54%/)).toBeInTheDocument();
  });

  test('renders games count', () => {
    renderRow();
    expect(screen.getByText('14 games')).toBeInTheDocument();
  });

  test('renders best and weak sub-meta when both exist', () => {
    renderRow();
    expect(screen.getByText(/Best/)).toBeInTheDocument();
    expect(screen.getByText(/Najdorf/)).toBeInTheDocument();
    expect(screen.getByText(/75%/)).toBeInTheDocument();
    expect(screen.getByText(/Needs work/)).toBeInTheDocument();
    expect(screen.getByText(/Dragon/)).toBeInTheDocument();
    expect(screen.getByText(/38%/)).toBeInTheDocument();
  });

  test('omits sub-meta entirely when both best and weak are null', () => {
    renderRow({ row: row({ best_variation: null, weak_variation: null }) });
    expect(screen.queryByText(/Best/)).toBeNull();
    expect(screen.queryByText(/Needs work/)).toBeNull();
  });

  test('renders only best when weak is null', () => {
    const r = row({
      best_variation: variation({ name: 'Sicilian: A', games: 4, wins: 3 }),
      weak_variation: null,
    });
    renderRow({ row: r });
    expect(screen.getByText(/Best/)).toBeInTheDocument();
    expect(screen.queryByText(/Needs work/)).toBeNull();
  });

  test('disclosure: aria-expanded reflects isExpanded prop', () => {
    const { rerender } = renderRow({ isExpanded: false });
    expect(screen.getByRole('button', { name: /Sicilian Defence/ })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    rerender(
      <MemoryRouter>
        <FamilyRow
          colour="white"
          row={row()}
          isExpanded={true}
          onToggle={() => {}}
          openingLink={() => '/opening/test'}
        />
      </MemoryRouter>
    );
    expect(screen.getByRole('button', { name: /Sicilian Defence/ })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  test('clicking the row calls onToggle', async () => {
    const onToggle = vi.fn();
    renderRow({ onToggle });
    await userEvent.click(screen.getByRole('button', { name: /Sicilian Defence/ }));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  test('expanded state renders variations with links', () => {
    renderRow({ isExpanded: true });
    expect(screen.getByRole('link', { name: /Najdorf/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Dragon/ })).toBeInTheDocument();
  });

  test('collapsed state does not render variations', () => {
    renderRow({ isExpanded: false });
    expect(screen.queryByRole('link', { name: /Najdorf/ })).toBeNull();
  });

  test('white-side row uses white result-colour token on win-rate', () => {
    renderRow({ colour: 'white' });
    const pct = screen.getByText(/54%/);
    // We assert the class is applied; CSS resolves the variable.
    expect(pct.className).toMatch(/winRateWhite/);
  });

  test('black-side row uses black result-colour token on win-rate', () => {
    renderRow({ colour: 'black' });
    const pct = screen.getByText(/54%/);
    expect(pct.className).toMatch(/winRateBlack/);
  });
});
