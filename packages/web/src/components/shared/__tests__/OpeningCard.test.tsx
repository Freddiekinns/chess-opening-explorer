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
});
