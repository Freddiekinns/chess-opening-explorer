import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LevelLens } from '../LevelLens';

vi.mock('../../../lib/analytics', () => ({
  trackEvent: vi.fn(),
  getAnonId: () => 'test-anon',
}));

import { trackEvent } from '../../../lib/analytics';

describe('LevelLens', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(trackEvent).mockClear();
  });

  it('renders All plus the named levels lowest to highest', () => {
    render(<LevelLens band={null} onChange={() => {}} />);
    const pills = screen.getAllByRole('button').map((b) => b.textContent);
    expect(pills).toEqual(['All', 'Beginner', 'Intermediate', 'Advanced', 'Expert', 'Masters']);
  });

  it('keeps the Elo range discoverable via the pill tooltip', () => {
    render(<LevelLens band={null} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Intermediate' })).toHaveAttribute(
      'title',
      'Lichess games, ratings 1400–1800'
    );
    expect(screen.getByRole('button', { name: 'Masters' })).toHaveAttribute(
      'title',
      'Over-the-board master games'
    );
  });

  it('selecting a level persists it, tracks it and notifies the page', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<LevelLens band={null} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Intermediate' }));

    expect(onChange).toHaveBeenCalledWith('1400');
    expect(localStorage.getItem('openingbook:my-level')).toBe('1400');
    expect(trackEvent).toHaveBeenCalledWith('band_select', { band: '1400' });
  });

  it('marks the active level via aria-pressed', () => {
    render(<LevelLens band="1800" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Advanced' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('selecting All persists it as the broadest level', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<LevelLens band="1800" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'All' }));
    expect(onChange).toHaveBeenCalledWith('all');
    expect(localStorage.getItem('openingbook:my-level')).toBe('all');
  });
});
