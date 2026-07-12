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

  it('renders the five named levels lowest to highest', () => {
    render(<LevelLens band={null} onChange={() => {}} />);
    const pills = screen.getAllByRole('button').map((b) => b.textContent);
    expect(pills).toEqual(['Beginner', 'Intermediate', 'Advanced', 'Expert', 'Masters']);
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

  it('marks the active level and offers a reset that clears the preference', async () => {
    localStorage.setItem('openingbook:my-level', '1800');
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<LevelLens band="1800" onChange={onChange} />);

    expect(screen.getByRole('button', { name: 'Advanced' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(onChange).toHaveBeenCalledWith(null);
    expect(localStorage.getItem('openingbook:my-level')).toBeNull();
  });

  it('shows no reset pill until a level is chosen', () => {
    render(<LevelLens band={null} onChange={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Reset' })).toBeNull();
  });
});
