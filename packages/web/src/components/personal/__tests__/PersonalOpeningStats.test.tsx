import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { PersonalOpeningStats } from '../PersonalOpeningStats';
import type { OpeningForLookup } from '../../../../../shared/src';

const FORM_STATE_KEY = 'personal-openings:form-state';
const LAST_ANALYSIS_SNAPSHOT_KEY = 'personal-openings:last-analysis-snapshot';

const buildCacheKey = (username: string, platform: string, limit: number) =>
  `personal-openings:v4:${platform}:${username.trim().toLowerCase()}:limit=${limit}:rated=true:perf=rapid,blitz,classical`;

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

// Lazy loader matching the AnalyseGamesPage contract — the component only
// calls it when an analysis starts, never on mount.
const getOpeningsData = async () => mockOpeningsData;

const renderComponent = (prefillUsername = '') =>
  render(
    <MemoryRouter>
      <PersonalOpeningStats getOpeningsData={getOpeningsData} prefillUsername={prefillUsername} />
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

    it('renders the group-by-family toggle pressed by default', async () => {
      renderComponent();

      await waitFor(() => {
        expect(getPlayerHeading('Magnus')).toBeTruthy();
      });

      // Toggle appears in both mobile + desktop dashboards.
      const toggles = screen.getAllByRole('button', { name: /Group by family/ });
      expect(toggles.length).toBeGreaterThan(0);
      toggles.forEach((b) => expect(b).toHaveAttribute('aria-pressed', 'true'));
    });

    it('grouping is per-column: flattening white leaves black grouped', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(getPlayerHeading('Magnus')).toBeTruthy();
      });
      // Wait for /api/families fetch to populate the dictionary.
      await waitFor(() => {
        expect(globalThis.fetch).toHaveBeenCalled();
      });

      // Family view is the default — a family header for the white Sicilian
      // rollup is present.
      await waitFor(() => {
        const headers = screen.getAllByRole('button', { expanded: false });
        expect(
          headers.some((b) =>
            (b.getAttribute('aria-controls') || '').includes('variations-white-sicilian')
          )
        ).toBe(true);
      });

      // Turn off grouping for the white column only (desktop toggle = last).
      const whiteToggles = screen.getAllByRole('button', { name: 'Group by family, White' });
      await user.click(whiteToggles[whiteToggles.length - 1]);

      // White is no longer grouped...
      await waitFor(() => {
        const whiteGrouped = screen
          .queryAllByRole('button')
          .filter((b) => (b.getAttribute('aria-controls') || '').includes('variations-white-'));
        expect(whiteGrouped.length).toBe(0);
      });

      // ...the white toggle reads unpressed, but black is still grouped.
      screen
        .getAllByRole('button', { name: 'Group by family, White' })
        .forEach((b) => expect(b).toHaveAttribute('aria-pressed', 'false'));
      expect(screen.getByRole('button', { name: 'Group by family, Black' })).toHaveAttribute(
        'aria-pressed',
        'true'
      );
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

      // Family view is the default — find the white Sicilian family header.
      const familyHeaders = await screen.findAllByRole('button', { expanded: false });
      const sicilianHeader = familyHeaders.find((b) =>
        (b.getAttribute('aria-controls') || '').includes('variations-white-sicilian')
      );
      expect(sicilianHeader).toBeTruthy();

      await user.click(sicilianHeader!);

      await waitFor(() => {
        expect(sicilianHeader!.getAttribute('aria-expanded')).toBe('true');
      });

      // Variation list now visible — the second variation name appears (stripped of family prefix).
      expect(screen.getAllByText('Open').length).toBeGreaterThan(0);
    });

    it('sort menu opens and selects a sort option', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(getPlayerHeading('Magnus')).toBeTruthy();
      });

      // Every column renders a compact "Sort: <current>" trigger (mobile active
      // tab + both desktop columns), all reading "Most played" initially.
      const triggers = screen.getAllByRole('button', { name: 'Sort: Most played' });
      expect(triggers.length).toBeGreaterThan(0);
      const trigger = triggers[0];
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      await user.click(trigger);
      expect(trigger).toHaveAttribute('aria-expanded', 'true');

      // Pick "Highest win rate" from the open menu.
      const menu = screen.getByRole('menu', { name: 'Sort white openings' });
      await user.click(within(menu).getByRole('menuitemradio', { name: 'Highest win rate' }));

      // The trigger now reflects the new sort and the menu has closed.
      await waitFor(() => {
        expect(
          screen.getAllByRole('button', { name: /Sort: Highest win rate/ }).length
        ).toBeGreaterThan(0);
      });
      expect(screen.queryByRole('menu')).toBeNull();
    });

    it('per-column sort: changing white does not affect black', async () => {
      const user = userEvent.setup();
      renderComponent();

      await waitFor(() => {
        expect(getPlayerHeading('Magnus')).toBeTruthy();
      });

      // All sort triggers start on "Most played" (2 white: mobile + desktop, and
      // 1 black: desktop). Open a white one and switch it.
      const whiteTrigger = screen.getAllByRole('button', { name: 'Sort: Most played' })[1];
      await user.click(whiteTrigger);
      const whiteMenu = screen.getByRole('menu', { name: 'Sort white openings' });
      await user.click(within(whiteMenu).getByRole('menuitemradio', { name: 'Highest win rate' }));

      await waitFor(() => {
        // Both white triggers (mobile + desktop) now read "Highest win rate"...
        expect(screen.getAllByRole('button', { name: 'Sort: Highest win rate' }).length).toBe(2);
      });
      // ...while the black column is untouched.
      expect(screen.getAllByRole('button', { name: 'Sort: Most played' })).toHaveLength(1);
    });
  });
});

describe('PersonalOpeningStats - blank state', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('carries the payoff in one header, with no second prompt beneath it', () => {
    renderComponent();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Analyse your games' })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'See which openings you actually play, and how they score — from your recent rated games.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('Ready to analyse your openings?')).not.toBeInTheDocument();
  });

  it('states its scope and that it keeps nothing', () => {
    renderComponent();

    expect(
      screen.getByText(
        'Reads your public rated games — rapid, blitz & classical. Bullet excluded. Nothing is stored.'
      )
    ).toBeInTheDocument();
  });

  it('offers the platform choice as a radio group, not two unlabelled buttons', async () => {
    const user = userEvent.setup();
    renderComponent();

    const group = screen.getByRole('radiogroup', { name: 'Platform' });
    const chesscom = within(group).getByRole('radio', { name: 'Chess.com' });
    const lichess = within(group).getByRole('radio', { name: 'Lichess' });

    expect(chesscom).toBeChecked();
    await user.click(lichess);
    expect(lichess).toBeChecked();
    expect(chesscom).not.toBeChecked();
  });

  it('gives the username field a real label, not just a placeholder', () => {
    renderComponent();

    expect(screen.getByLabelText('Username')).toBe(
      screen.getByPlaceholderText('Enter username...')
    );
  });

  it('does not put the games-count control on the blank screen', () => {
    renderComponent();

    expect(screen.queryByRole('button', { name: 'Settings' })).not.toBeInTheDocument();
  });
});

describe('PersonalOpeningStats - transient states', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const failTheFetch = () =>
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, message: 'We could not load your games.' }),
    } as Response);

  it('keeps the error in the centred column, under the input it describes', async () => {
    const user = userEvent.setup();
    failTheFetch();

    renderComponent();
    await user.type(screen.getByLabelText('Username'), 'someone');
    await user.click(screen.getByRole('button', { name: 'Analyse' }));

    const alert = await screen.findByRole('alert');
    const note = screen.getByText(/Reads your public rated games/);
    // Same column as the note it follows — not stranded below a 65vh block.
    expect(note.parentElement).toBe(alert.parentElement);
  });

  it('returns the button to Analyse after a failure and keeps what was typed', async () => {
    const user = userEvent.setup();
    failTheFetch();

    renderComponent();
    await user.type(screen.getByLabelText('Username'), 'chessstudnt99');
    await user.click(screen.getByRole('button', { name: 'Analyse' }));

    await screen.findByRole('alert');
    expect(screen.getByRole('button', { name: 'Analyse' })).toBeEnabled();
    expect(screen.getByLabelText('Username')).toHaveValue('chessstudnt99');
  });
});

describe('PersonalOpeningStats - dashboard honesty', () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem(
      FORM_STATE_KEY,
      JSON.stringify({ username: 'tester', platform: 'chess.com', limit: 500, activeTab: 'white' })
    );
    sessionStorage.setItem(
      buildCacheKey('tester', 'chess.com', 500),
      JSON.stringify({ dashboard: mockDashboardData, cachedAt: Date.now() })
    );
  });

  it('scopes the record to this run rather than a lifetime', async () => {
    renderComponent();

    expect(await screen.findByText('This analysis')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Your record' })).toBeInTheDocument();
    expect(screen.queryByText('Career totals')).not.toBeInTheDocument();
    expect(screen.queryByText('Overall performance')).not.toBeInTheDocument();
    expect(screen.queryByText('Total wins')).not.toBeInTheDocument();
  });

  it('states an overall win rate, the only rate on the panel with a sample behind it', async () => {
    // The headline cards read 100% off four games. This one covers the run.
    renderComponent();

    await screen.findByRole('heading', { name: 'Your record' });
    const { whiteWin, blackWin, whiteDraw, blackDraw, whiteLoss, blackLoss } = mockDashboardData;
    const wins = whiteWin + blackWin;
    const decided = wins + whiteDraw + blackDraw + whiteLoss + blackLoss;
    const expected = `${Math.round((wins / decided) * 100)}% win rate`;
    expect(screen.getAllByText(expected).length).toBeGreaterThan(0);
  });

  it('names the games column in full, matching mobile', async () => {
    renderComponent();

    await screen.findByRole('heading', { name: 'Your record' });
    expect(screen.queryByText('GP')).not.toBeInTheDocument();
    expect(screen.getAllByText('Games').length).toBeGreaterThan(0);
  });
});

// Vitest does not apply CSS modules, so no render-based test can see a colour.
// This ordering bug shipped once already: `.statsValueWin` sat *before*
// `.statsValue`, and at equal specificity the base rule won — the tints simply
// did not appear, with every unit test green.
describe('PersonalOpeningStats - stylesheet ordering', () => {
  it('declares the win/loss tints after the base value rule that would override them', async () => {
    // Read from disk, not via import: Vitest stubs CSS-module imports with a
    // class-name proxy, and `?raw` is stubbed the same way.
    const { readWebSource } = await import('../../../test/readSource');
    const css = readWebSource('src/components/personal/PersonalOpeningStats.module.css');

    expect(css.indexOf('.statsValue {')).toBeGreaterThan(-1);
    expect(css.indexOf('.statsValueWin {')).toBeGreaterThan(css.indexOf('.statsValue {'));
    expect(css.indexOf('.statsValueDraw {')).toBeGreaterThan(css.indexOf('.statsValue {'));
    expect(css.indexOf('.statsValueLoss {')).toBeGreaterThan(css.indexOf('.statsValue {'));
  });

  it('tints the mobile stat tiles after the base value rule, for the same reason', async () => {
    const { readWebSource } = await import('../../../test/readSource');
    const css = readWebSource('src/components/personal/PersonalOpeningStats.module.css');

    expect(css.indexOf('.triStatValue {')).toBeGreaterThan(-1);
    for (const modifier of ['.triStatValueWin {', '.triStatValueDraw {', '.triStatValueLoss {']) {
      expect(css.indexOf(modifier)).toBeGreaterThan(css.indexOf('.triStatValue {'));
    }
  });
});

// The summary cards are three cards drawn by two rules in two files, and every
// complaint about them has been about the pieces disagreeing rather than about
// any one piece. These assert the agreements, not the values.
describe('PersonalOpeningStats - summary card row', () => {
  const readCss = async (path: string) => {
    const { readWebSource } = await import('../../../test/readSource');
    return readWebSource(path);
  };

  const blockOf = (css: string, selector: string) => {
    const start = css.indexOf(`${selector} {`);
    expect(start, `${selector} missing`).toBeGreaterThan(-1);
    return css.slice(start, css.indexOf('}', start));
  };

  it('draws every summary-card bar at one height', async () => {
    // The record card's bar is PerfBar; the two opening cards keep their own
    // single-fill bar. Different components, one row — so the heights have to
    // be stated the same. `.winRateBar` was 6px against PerfBar's 8px.
    const cardCss = await readCss('src/components/personal/PersonalOpeningStats.module.css');
    const perfCss = await readCss('src/components/personal/PerfBar.module.css');

    const height = /height:\s*([^;]+);/;
    expect(blockOf(cardCss, '.winRateBar').match(height)?.[1].trim()).toBe(
      blockOf(perfCss, '.track').match(height)?.[1].trim()
    );
  });

  it('anchors the record card figures to the bottom so the bars share a baseline', async () => {
    // Without this the record card's shorter content floats at the top of an
    // equal-height grid cell, leaving its bar above its siblings' and a void
    // under it — the original complaint.
    const css = await readCss('src/components/personal/PersonalOpeningStats.module.css');
    expect(blockOf(css, '.statsRows')).toMatch(/margin-top:\s*auto/);
  });

  it('gives every small data label in the row the same treatment', async () => {
    // "WINS/DRAWS/LOSSES" were tracked uppercase while the neighbouring card
    // said "win rate" in sentence case, one card width apart.
    const css = await readCss('src/components/personal/PersonalOpeningStats.module.css');
    for (const selector of ['.statsLabel', '.winRateLabel', '.triStatLabel']) {
      expect(blockOf(css, selector)).toMatch(/text-transform:\s*uppercase/);
      expect(blockOf(css, selector)).toMatch(/letter-spacing:\s*0\.05em/);
    }
  });
});
