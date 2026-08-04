import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BottomTabBar from '../BottomTabBar';

beforeEach(() => localStorage.clear());

const renderBar = () =>
  render(
    <MemoryRouter>
      <BottomTabBar />
    </MemoryRouter>
  );

describe('BottomTabBar', () => {
  it('offers three destinations', () => {
    renderBar();

    expect(screen.getByRole('link', { name: /discover/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /repertoire/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /analyse/i })).toBeInTheDocument();
  });

  it('has no Search tab — search lives in the app bar', () => {
    renderBar();

    expect(screen.queryByRole('link', { name: /^search$/i })).not.toBeInTheDocument();
  });

  it('badges the repertoire count once something is saved', () => {
    localStorage.setItem(
      'chess-repertoire',
      JSON.stringify([{ fen: 'a', name: 'X', eco: 'B20', moves: '1. e4', savedAt: 1 }])
    );
    renderBar();

    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows no badge when the repertoire is empty', () => {
    renderBar();

    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('points the repertoire tab at its page', () => {
    renderBar();

    expect(screen.getByRole('link', { name: /repertoire/i })).toHaveAttribute(
      'href',
      '/repertoire'
    );
  });
});
