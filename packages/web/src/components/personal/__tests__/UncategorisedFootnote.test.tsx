import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UncategorisedFootnote } from '../UncategorisedFootnote';

describe('UncategorisedFootnote', () => {
  test('renders nothing when summary is null', () => {
    const { container } = render(<UncategorisedFootnote summary={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('renders count, games, percentage when summary has 1 variation', () => {
    render(
      <UncategorisedFootnote
        summary={{
          games: 4,
          wins: 2,
          draws: 0,
          losses: 2,
          variation_count: 1,
          win_rate: 0.5,
        }}
      />
    );
    expect(screen.getByText(/1 uncategorised opening/)).toBeInTheDocument();
    expect(screen.getByText(/4 games/)).toBeInTheDocument();
    expect(screen.getByText(/50%/)).toBeInTheDocument();
  });

  test('uses plural "openings" when more than one', () => {
    render(
      <UncategorisedFootnote
        summary={{
          games: 6,
          wins: 3,
          draws: 0,
          losses: 3,
          variation_count: 12,
          win_rate: 0.5,
        }}
      />
    );
    expect(screen.getByText(/12 uncategorised openings/)).toBeInTheDocument();
  });

  test('rounds the percentage to nearest integer', () => {
    render(
      <UncategorisedFootnote
        summary={{
          games: 7,
          wins: 4,
          draws: 1,
          losses: 2,
          variation_count: 5,
          win_rate: (4 + 0.5 * 1) / 7,
        }}
      />
    );
    // (4 + 0.5) / 7 ≈ 64.28% → 64%
    expect(screen.getByText(/64%/)).toBeInTheDocument();
  });
});
