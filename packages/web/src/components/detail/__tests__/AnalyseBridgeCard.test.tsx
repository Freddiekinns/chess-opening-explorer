import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AnalyseBridgeCard } from '../AnalyseBridgeCard';

vi.mock('../../../lib/analytics', () => ({
  trackEvent: vi.fn(),
  getAnonId: () => 'test-anon',
}));

import { trackEvent } from '../../../lib/analytics';

function renderCard(props: { gamesAnalyzed: number; openingName: string }) {
  return render(
    <MemoryRouter>
      <AnalyseBridgeCard {...props} />
    </MemoryRouter>
  );
}

describe('AnalyseBridgeCard', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.mocked(trackEvent).mockClear();
  });

  it('renders nothing under 1,000 snapshot games', () => {
    const { container } = renderCard({ gamesAnalyzed: 999, openingName: 'Sicilian Defense' });
    expect(container).toBeEmptyDOMElement();
  });

  it('renders with the family name at 1,000+ games', () => {
    renderCard({ gamesAnalyzed: 5000, openingName: 'Sicilian Defense: Najdorf Variation' });
    expect(
      screen.getByText(/See how you actually play the Sicilian Defense — free, no account\./)
    ).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/analyse');
  });

  it('tracks the click-through', async () => {
    const user = userEvent.setup();
    renderCard({ gamesAnalyzed: 5000, openingName: 'Caro-Kann Defense' });
    await user.click(screen.getByRole('link'));
    expect(trackEvent).toHaveBeenCalledWith('bridge_click');
  });

  it('dismisses for the session', async () => {
    const user = userEvent.setup();
    const { container, unmount } = renderCard({
      gamesAnalyzed: 5000,
      openingName: 'French Defense',
    });

    await user.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(container).toBeEmptyDOMElement();
    unmount();

    // Remount in the same session: stays dismissed.
    const { container: remounted } = renderCard({
      gamesAnalyzed: 5000,
      openingName: 'French Defense',
    });
    expect(remounted).toBeEmptyDOMElement();
  });
});
