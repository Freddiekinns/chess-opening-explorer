import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { StyleTags } from '../StyleTags';
import { levelLabel, type StyleProfile } from '../../../lib/styleProfile';
import { OpeningCard } from '../OpeningCard';

const dragon: StyleProfile = {
  words: [
    { axis: 'character', value: 'sharp', label: 'Sharp', glossary: 'Concrete, forcing play.' },
    { axis: 'structure', value: 'semi_open', label: 'Semi-open', glossary: 'Partly open.' },
    { axis: 'level', value: 'advanced', label: 'Advanced', glossary: 'Long forcing lines.' },
  ],
  plans: [
    { key: 'opposite_side_castling', label: 'Opposite-side castling', glossary: 'A race.' },
    { key: 'pawn_storm', label: 'Pawn storm', glossary: 'Pawns at the king.' },
  ],
};

describe('StyleTags', () => {
  it('draws the words, then the plans, each with its glossary as the tooltip', () => {
    render(<StyleTags profile={dragon} showPlans />);
    const pills = screen.getByTestId('style-tags').children;
    expect([...pills].map((p) => p.textContent)).toEqual([
      'Sharp',
      'Semi-open',
      'Advanced',
      'Opposite-side castling',
      'Pawn storm',
    ]);
    expect(screen.getByText('Sharp')).toHaveAttribute('title', 'Concrete, forcing play.');
  });

  it('leaves plans out unless asked, and caps the words', () => {
    render(<StyleTags profile={dragon} maxWords={2} />);
    expect(screen.getByText('Semi-open')).toBeInTheDocument();
    expect(screen.queryByText('Advanced')).not.toBeInTheDocument();
    expect(screen.queryByText('Pawn storm')).not.toBeInTheDocument();
  });

  it('draws nothing for a position with no tags', () => {
    const { container } = render(<StyleTags profile={null} showPlans />);
    expect(container).toBeEmptyDOMElement();
  });

  it('draws nothing when every axis sits on its hidden middle value', () => {
    const { container } = render(<StyleTags profile={{ words: [], plans: [] }} showPlans />);
    expect(container).toBeEmptyDOMElement();
  });

  it('levelLabel gives the shown level word or nothing', () => {
    expect(levelLabel(dragon)).toBe('Advanced');
    expect(levelLabel({ words: [], plans: [] })).toBeUndefined();
    expect(levelLabel(null)).toBeUndefined();
  });
});

describe('OpeningCard style words', () => {
  const opening = {
    fen: 'fen',
    name: 'Sicilian Defense: Dragon Variation',
    eco: 'B70',
    moves: '1. e4 c5 2. Nf3 d6',
    src: 'eco',
  };

  it('shows three style words on a card and two on a list item, never plans', () => {
    const { unmount } = render(
      <MemoryRouter>
        <OpeningCard opening={{ ...opening, style_profile: dragon }} />
      </MemoryRouter>
    );
    expect(screen.getByText('Advanced')).toBeInTheDocument();
    expect(screen.queryByText('Pawn storm')).not.toBeInTheDocument();
    unmount();

    render(
      <MemoryRouter>
        <OpeningCard opening={{ ...opening, style_profile: dragon }} variant="list-item" />
      </MemoryRouter>
    );
    expect(screen.getByText('Semi-open')).toBeInTheDocument();
    expect(screen.queryByText('Advanced')).not.toBeInTheDocument();
  });

  // It used to fall back to "Beginner" for any opening with no level, stating
  // something nobody had judged.
  it('shows no level for an opening with no tags, never a default', () => {
    render(
      <MemoryRouter>
        <OpeningCard opening={{ ...opening, style_profile: null }} />
      </MemoryRouter>
    );
    expect(screen.queryByText('Beginner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('style-tags')).not.toBeInTheDocument();
  });
});
