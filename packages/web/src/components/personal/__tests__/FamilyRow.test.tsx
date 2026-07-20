import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { FamilyRow } from '../FamilyRow';
import type { FamilyRollupRow } from '../familyAggregation';

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
    variation({ key: 'v1', name: 'Sicilian: Najdorf', games: 6, wins: 4, draws: 1, losses: 1 }),
    variation({ key: 'v2', name: 'Sicilian: Dragon', games: 8, wins: 3, draws: 0, losses: 5 }),
  ],
  best_variation: null,
  weak_variation: null,
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

  test('renders the aggregate games count', () => {
    renderRow();
    expect(screen.getByText('14')).toBeInTheDocument();
  });

  test('renders the line (variation) count in the meta line', () => {
    renderRow();
    expect(screen.getByText(/2 lines/)).toBeInTheDocument();
  });

  test('singularises the line count when there is one variation', () => {
    renderRow({ row: row({ variation_count: 1 }) });
    expect(screen.getByText(/1 line(?!s)/)).toBeInTheDocument();
  });

  test('renders the aggregate W/D/L distribution percentages', () => {
    renderRow();
    // 7/14 = 50%, 1/14 ≈ 7%, 6/14 ≈ 43%
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('7%')).toBeInTheDocument();
    expect(screen.getByText('43%')).toBeInTheDocument();
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

  test('expanded state renders variations as links with stripped names', () => {
    renderRow({ isExpanded: true });
    expect(screen.getByRole('link', { name: /Najdorf/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Dragon/ })).toBeInTheDocument();
    // Family prefix is stripped from variation names.
    expect(screen.queryByText('Sicilian: Najdorf')).toBeNull();
  });

  test('collapsed state does not render variations', () => {
    renderRow({ isExpanded: false });
    expect(screen.queryByRole('link', { name: /Najdorf/ })).toBeNull();
  });

  test('expanded variations render their own distribution percentages', () => {
    renderRow({ isExpanded: true });
    // Najdorf: 6g / 4w 1d 1l → 67% / 17% / 17%
    expect(screen.getByText('67%')).toBeInTheDocument();
    // Dragon: 8g / 3w 0d 5l → 38% / 0% / 63%
    expect(screen.getByText('63%')).toBeInTheDocument();
  });

  test('expanded variations surface their games-played count', () => {
    renderRow({ isExpanded: true });
    // Mobile meta line (hidden on desktop via CSS) — Najdorf 6g, Dragon 8g.
    expect(screen.getByText('6 games')).toBeInTheDocument();
    expect(screen.getByText('8 games')).toBeInTheDocument();
  });

  test('singularises the variation games count when there is one game', () => {
    renderRow({
      isExpanded: true,
      row: row({
        variations: [variation({ key: 'v1', name: 'Sicilian: Najdorf', games: 1 })],
        variation_count: 1,
      }),
    });
    expect(screen.getByText('1 game')).toBeInTheDocument();
  });

  test('variation links point at the opening route', () => {
    renderRow({ isExpanded: true, openingLink: (key) => `/opening/${key}` });
    expect(screen.getByRole('link', { name: /Najdorf/ })).toHaveAttribute('href', '/opening/v1');
    expect(screen.getByRole('link', { name: /Dragon/ })).toHaveAttribute('href', '/opening/v2');
  });
});
