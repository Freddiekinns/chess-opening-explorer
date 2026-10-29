import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OpeningCard } from '../OpeningCard';

const opening = {
  fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
  name: 'Sicilian Defence',
  eco: 'B20',
  moves: '1. e4 c5',
  src: 'eco',
  white_win_rate: 0.31,
  draw_rate: 0.39,
  black_win_rate: 0.3,
};

const renderCard = (props = {}) =>
  render(
    <MemoryRouter>
      <OpeningCard opening={opening} {...props} />
    </MemoryRouter>
  );

describe('OpeningCard game count', () => {
  it('writes billions as B, not thousands of millions', () => {
    renderCard({ opening: { ...opening, games_analyzed: 3_778_178_876 } });

    expect(screen.getByText('3.8B games')).toBeInTheDocument();
  });
});

describe('OpeningCard result bars', () => {
  it('names the segments on the card variant', () => {
    renderCard();

    expect(screen.getByText('White 31%')).toBeInTheDocument();
    expect(screen.getByText('Draw 39%')).toBeInTheDocument();
    expect(screen.getByText('Black 30%')).toBeInTheDocument();
  });

  it('names the segments on the list-item variant', () => {
    renderCard({ variant: 'list-item' });

    expect(screen.getByText('White 31%')).toBeInTheDocument();
  });

  it('omits the bar entirely when rates are missing', () => {
    render(
      <MemoryRouter>
        <OpeningCard
          opening={{
            ...opening,
            white_win_rate: undefined,
            draw_rate: undefined,
            black_win_rate: undefined,
          }}
        />
      </MemoryRouter>
    );

    expect(screen.queryByText(/White \d+%/)).not.toBeInTheDocument();
  });

  /* /api/openings/browse reports a position with no games as an explicit null
     rather than omitting the key. `!== undefined` let those through and
     `Math.round(null * 100)` printed a "White 0% · Draw 0% · Black 0%" bar —
     numbers for openings we have no data on. */
  it('omits the bar when the rates are null, not just undefined', () => {
    render(
      <MemoryRouter>
        <OpeningCard
          opening={{ ...opening, white_win_rate: null, draw_rate: null, black_win_rate: null }}
        />
      </MemoryRouter>
    );

    expect(screen.queryByText(/White \d+%/)).not.toBeInTheDocument();
    expect(screen.queryByText('White 0%')).not.toBeInTheDocument();
  });
});

describe('OpeningCard name qualifier', () => {
  const najdorf = {
    ...opening,
    name: 'Sicilian Defense: Najdorf Variation',
    eco: 'B96',
    moves: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Bg5 e6 7. f4',
    name_qualifier: '7.f4',
  };

  it.each(['card', 'list-item'] as const)(
    'tells a shared name apart on the %s variant',
    (variant) => {
      renderCard({ opening: najdorf, variant });

      expect(screen.getByRole('heading')).toHaveTextContent(/Najdorf Variation.*7\.f4/);
    }
  );

  it('adds nothing to a name that is its own', () => {
    renderCard();

    expect(screen.getByRole('heading')).toHaveTextContent(/^Sicilian Defence$/);
  });
});
