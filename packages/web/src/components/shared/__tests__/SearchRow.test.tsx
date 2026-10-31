/**
 * Openings that share a name read apart.
 *
 * "najdorf" returned five rows called "Sicilian Defense: Najdorf Variation",
 * differing only by an ECO code most players can't read. The server now sends
 * `name_qualifier`, the move that reaches each one, and the row shows it beside
 * the name, where it cannot be cut off with the rest of a long name.
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SearchRow } from '../SearchRow';

const najdorf = {
  fen: 'fen-b96',
  name: 'Sicilian Defense: Najdorf Variation',
  eco: 'B96',
  moves: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Bg5 e6 7. f4',
};

describe('SearchRow name qualifier', () => {
  it('shows what sets an opening apart from others with its name', () => {
    render(<SearchRow opening={{ ...najdorf, name_qualifier: '7.f4' }} onSelect={vi.fn()} />);

    expect(screen.getByText('7.f4')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAccessibleName(/Najdorf Variation.*7\.f4/);
  });

  it('shows nothing extra for an opening whose name is its own', () => {
    const { container } = render(<SearchRow opening={najdorf} onSelect={vi.fn()} />);

    expect(container.querySelector('[class*="rowQualifier"]')).toBeNull();
  });
});
