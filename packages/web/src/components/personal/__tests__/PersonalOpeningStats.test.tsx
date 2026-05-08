import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PersonalOpeningStats } from '../PersonalOpeningStats';
import type { OpeningForLookup } from '../../../../../shared/src';

const FORM_STATE_KEY = 'personal-openings:form-state';
const LAST_ANALYSIS_SNAPSHOT_KEY = 'personal-openings:last-analysis-snapshot';

const buildCacheKey = (username: string, platform: string, limit: number) =>
  `personal-openings:v2:${platform}:${username.trim().toLowerCase()}:limit=${limit}:rated=true:perf=rapid,blitz,classical`;

const mockOpeningsData: OpeningForLookup[] = [
  {
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    name: "King's Pawn Game",
    eco: 'B00',
    moves: '1. e4',
  },
];

const mockDashboardData = {
  totalGames: 10,
  classifiedGames: 8,
  unclassifiedGames: 2,
  whiteGames: 5,
  whiteWin: 3,
  whiteDraw: 1,
  whiteLoss: 1,
  blackGames: 5,
  blackWin: 2,
  blackDraw: 2,
  blackLoss: 1,
  asWhite: [
    {
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      name: "King's Pawn Game",
      eco: 'B00',
      moves: '1. e4',
      games: 3,
      win: 2,
      draw: 1,
      loss: 0,
    },
  ],
  asBlack: [],
};

const renderComponent = (prefillUsername = '') =>
  render(
    <MemoryRouter>
      <PersonalOpeningStats openingsData={mockOpeningsData} prefillUsername={prefillUsername} />
    </MemoryRouter>
  );

const getPlayerHeading = (name: string): Element | undefined => {
  const headings = screen.queryAllByRole('heading', { level: 2 });
  return headings.find((h) => h.textContent === name);
};

describe('PersonalOpeningStats - Player Name Persistence', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('Basic navigation: form state + cache key both unchanged', () => {
    it('restores the player name heading when returning to the page', async () => {
      const username = 'Magnus';
      const platform = 'chess.com';
      const limit = 500;
      const cacheKey = buildCacheKey(username, platform, limit);

      sessionStorage.setItem(
        FORM_STATE_KEY,
        JSON.stringify({ username, platform, limit, activeTab: 'white' })
      );
      sessionStorage.setItem(
        cacheKey,
        JSON.stringify({ dashboard: mockDashboardData, cachedAt: Date.now() })
      );

      renderComponent();

      await waitFor(() => {
        expect(getPlayerHeading('Magnus')).toBeTruthy();
      });
    });

    it('restores player name and platform label together', async () => {
      const username = 'Hikaru';
      const platform = 'chess.com';
      const limit = 500;
      const cacheKey = buildCacheKey(username, platform, limit);

      sessionStorage.setItem(
        FORM_STATE_KEY,
        JSON.stringify({ username, platform, limit, activeTab: 'white' })
      );
      sessionStorage.setItem(
        cacheKey,
        JSON.stringify({ dashboard: mockDashboardData, cachedAt: Date.now() })
      );

      renderComponent();

      await waitFor(() => {
        expect(getPlayerHeading('Hikaru')).toBeTruthy();
        // Both mobile and desktop views render the platform label
        const platformLabels = screen.getAllByText('Chess.com');
        expect(platformLabels.length).toBeGreaterThan(0);
      });
    });

    it('preserves player name through unmount/remount cycle', async () => {
      const username = 'TestPlayer';
      const platform = 'chess.com';
      const limit = 500;
      const cacheKey = buildCacheKey(username, platform, limit);

      sessionStorage.setItem(
        FORM_STATE_KEY,
        JSON.stringify({ username, platform, limit, activeTab: 'white' })
      );
      sessionStorage.setItem(
        cacheKey,
        JSON.stringify({ dashboard: mockDashboardData, cachedAt: Date.now() })
      );

      const { unmount } = renderComponent();
      await waitFor(() => {
        expect(getPlayerHeading('TestPlayer')).toBeTruthy();
      });

      unmount();

      renderComponent();
      await waitFor(() => {
        expect(getPlayerHeading('TestPlayer')).toBeTruthy();
      });
    });

    it('does not render the dashboard when no cache exists', async () => {
      // Form state present but no cached analysis data
      sessionStorage.setItem(
        FORM_STATE_KEY,
        JSON.stringify({
          username: 'Magnus',
          platform: 'chess.com',
          limit: 500,
          activeTab: 'white',
        })
      );

      renderComponent();

      // Give effects time to run
      await new Promise((r) => setTimeout(r, 50));

      expect(getPlayerHeading('Magnus')).toBeUndefined();
    });
  });

  describe('Bug: player name lost when form field changes after analysis', () => {
    // This is the main regression test. Before the fix, the mount-time cache
    // lookup used the derived cache key (username+platform+limit from the
    // current form state). If the user changed the limit (or any other field)
    // after analysis but before navigating away, the derived key no longer
    // matched the stored cache, so neither the dashboard nor the player name
    // was restored.

    it('restores player name even when limit was changed after analysis', async () => {
      const username = 'Magnus';
      const platform = 'chess.com';
      const analysisLimit = 500; // limit at analysis time
      const changedLimit = 100; // limit changed after analysis, before navigating away
      const analysisCacheKey = buildCacheKey(username, platform, analysisLimit);

      // Simulate: analysis ran with limit=500, cache saved under that key
      sessionStorage.setItem(
        analysisCacheKey,
        JSON.stringify({ dashboard: mockDashboardData, cachedAt: Date.now() })
      );
      // Simulate: snapshot saved alongside cache when analysis completed
      sessionStorage.setItem(
        LAST_ANALYSIS_SNAPSHOT_KEY,
        JSON.stringify({
          cacheKey: analysisCacheKey,
          displayedUsername: username,
          displayedPlatform: platform,
        })
      );
      // Simulate: form state saved with new limit=100 (user changed slider after analysis)
      sessionStorage.setItem(
        FORM_STATE_KEY,
        JSON.stringify({ username, platform, limit: changedLimit, activeTab: 'white' })
      );

      renderComponent();

      // Should still restore the player name via the snapshot fallback
      await waitFor(() => {
        expect(getPlayerHeading('Magnus')).toBeTruthy();
      });
    });

    it('restores player name even when platform was switched after analysis', async () => {
      const username = 'Carlsen';
      const analysisLimit = 500;
      const analysisCacheKey = buildCacheKey(username, 'chess.com', analysisLimit);

      sessionStorage.setItem(
        analysisCacheKey,
        JSON.stringify({ dashboard: mockDashboardData, cachedAt: Date.now() })
      );
      sessionStorage.setItem(
        LAST_ANALYSIS_SNAPSHOT_KEY,
        JSON.stringify({
          cacheKey: analysisCacheKey,
          displayedUsername: username,
          displayedPlatform: 'chess.com',
        })
      );
      // User switched to lichess tab after analysis
      sessionStorage.setItem(
        FORM_STATE_KEY,
        JSON.stringify({ username, platform: 'lichess', limit: analysisLimit, activeTab: 'white' })
      );

      renderComponent();

      await waitFor(() => {
        expect(getPlayerHeading('Carlsen')).toBeTruthy();
      });
    });

    it('restores the analysed username even when input field was edited after analysis', async () => {
      const analysisUsername = 'Magnus';
      const platform = 'chess.com';
      const limit = 500;
      const analysisCacheKey = buildCacheKey(analysisUsername, platform, limit);

      sessionStorage.setItem(
        analysisCacheKey,
        JSON.stringify({ dashboard: mockDashboardData, cachedAt: Date.now() })
      );
      sessionStorage.setItem(
        LAST_ANALYSIS_SNAPSHOT_KEY,
        JSON.stringify({
          cacheKey: analysisCacheKey,
          displayedUsername: analysisUsername,
          displayedPlatform: platform,
        })
      );
      // User started typing a different name in the input before navigating
      sessionStorage.setItem(
        FORM_STATE_KEY,
        JSON.stringify({ username: 'MagnusCarlsen', platform, limit, activeTab: 'white' })
      );

      renderComponent();

      // The heading should show the ANALYSED name, not the half-typed input value
      await waitFor(() => {
        expect(getPlayerHeading('Magnus')).toBeTruthy();
      });
    });
  });

  describe('Username input field persistence', () => {
    it('pre-fills username input from saved form state', async () => {
      sessionStorage.setItem(
        FORM_STATE_KEY,
        JSON.stringify({
          username: 'SavedUser',
          platform: 'chess.com',
          limit: 500,
          activeTab: 'white',
        })
      );

      renderComponent();

      await waitFor(() => {
        const input = screen.getByPlaceholderText('Enter username...') as HTMLInputElement;
        expect(input.value).toBe('SavedUser');
      });
    });

    it('uses prefillUsername prop over saved form state', async () => {
      sessionStorage.setItem(
        FORM_STATE_KEY,
        JSON.stringify({
          username: 'SavedUser',
          platform: 'chess.com',
          limit: 500,
          activeTab: 'white',
        })
      );

      renderComponent('PropUser');

      await waitFor(() => {
        const input = screen.getByPlaceholderText('Enter username...') as HTMLInputElement;
        expect(input.value).toBe('PropUser');
      });
    });
  });

  describe('Analyse button interaction', () => {
    it('enables analyse button when username is present', async () => {
      renderComponent();

      const user = userEvent.setup();
      const input = screen.getByPlaceholderText('Enter username...');
      await user.type(input, 'Magnus');

      const analyseBtn = screen.getByRole('button', { name: /analyse/i });
      expect(analyseBtn).not.toBeDisabled();
    });

    it('disables analyse button when username is empty', () => {
      renderComponent();

      const analyseBtn = screen.getByRole('button', { name: /analyse/i });
      expect(analyseBtn).toBeDisabled();
    });
  });

  describe('family rollup', () => {
    const username = 'Magnus';
    const platform = 'chess.com';
    const limit = 500;
    const cacheKey = buildCacheKey(username, platform, limit);

    const mockDashboardWithFamily = {
      ...mockDashboardData,
      asWhite: [
        {
          fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2',
          name: 'Sicilian Defense',
          eco: 'B20',
          moves: '1. e4 c5',
          family_id: 'sicilian',
          games: 4,
          win: 2,
          draw: 1,
          loss: 1,
        },
        {
          fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
          name: 'Sicilian Defense: Open',
          eco: 'B27',
          moves: '1. e4 c5 2. Nf3',
          family_id: 'sicilian',
          games: 2,
          win: 1,
          draw: 0,
          loss: 1,
        },
      ],
    };

    let originalFetch: typeof globalThis.fetch;

    beforeEach(() => {
      originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url.includes('/api/families')) {
          return new Response(
            JSON.stringify({
              success: true,
              data: [
                {
                  id: 'sicilian',
                  display_name: 'Sicilian Defense',
                  slug: 'sicilian-defense',
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response('{}', { status: 200 });
      }) as unknown as typeof globalThis.fetch;

      sessionStorage.setItem(
        FORM_STATE_KEY,
        JSON.stringify({ username, platform, limit, activeTab: 'white' })
      );
      sessionStorage.setItem(
        cacheKey,
        JSON.stringify({ dashboard: mockDashboardWithFamily, cachedAt: Date.now() })
      );
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('renders both Variation and Family tabs with Variation selected by default', async () => {
      renderComponent();

      await waitFor(() => {
        expect(getPlayerHeading('Magnus')).toBeTruthy();
      });

      const variationTabs = screen.getAllByRole('tab', { name: /variation/i });
      const familyTabs = screen.getAllByRole('tab', { name: /^family$/i });

      expect(variationTabs.length).toBeGreaterThan(0);
      expect(familyTabs.length).toBeGreaterThan(0);
      // Default groupBy is 'variation' — every variation tab is selected, no family tab is.
      variationTabs.forEach((tab) => expect(tab.getAttribute('aria-selected')).toBe('true'));
      familyTabs.forEach((tab) => expect(tab.getAttribute('aria-selected')).toBe('false'));
    });

    it('renders the family display name after toggling to Family view', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(getPlayerHeading('Magnus')).toBeTruthy();
      });

      // Wait for /api/families fetch to populate the dictionary.
      await waitFor(() => {
        expect(globalThis.fetch).toHaveBeenCalled();
      });

      const familyTabs = screen.getAllByRole('tab', { name: /^family$/i });
      await user.click(familyTabs[0]);

      // After click, that tab is aria-selected.
      await waitFor(() => {
        expect(familyTabs[0].getAttribute('aria-selected')).toBe('true');
      });

      // Family display name appears at least once (mobile + desktop dashboards both render it).
      await waitFor(() => {
        expect(screen.getAllByText('Sicilian Defense').length).toBeGreaterThan(0);
      });
    });

    it('expands a family row to reveal its variations', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(getPlayerHeading('Magnus')).toBeTruthy();
      });
      await waitFor(() => {
        expect(globalThis.fetch).toHaveBeenCalled();
      });

      const familyTabs = screen.getAllByRole('tab', { name: /^family$/i });
      await user.click(familyTabs[0]);

      // Family header buttons (mobile + desktop). Find the ones whose aria-controls
      // points at the white-side variations list.
      const familyHeaders = await screen.findAllByRole('button', { expanded: false });
      const sicilianHeader = familyHeaders.find((b) =>
        (b.getAttribute('aria-controls') || '').includes('variations-white-sicilian')
      );
      expect(sicilianHeader).toBeTruthy();

      await user.click(sicilianHeader!);

      await waitFor(() => {
        expect(sicilianHeader!.getAttribute('aria-expanded')).toBe('true');
      });

      // Variation list now visible — the second variation name appears.
      expect(screen.getAllByText('Sicilian Defense: Open').length).toBeGreaterThan(0);
    });
  });
});
