const { toViews } = require('../export-views');

describe('toViews', () => {
  const window = { since: '2026-09-24', until: '2026-11-02' };

  it('keeps the views file shape and order', () => {
    const v = toViews(
      [
        [
          '/opening/rnbqkbnr%2Fpppppppp%2F8%2F8%2F4P3%2F8%2FPPPP1PPP%2FRNBQKBNR%20b%20KQkq%20-%200%201',
          8,
          5,
        ],
      ],
      window
    );
    expect(v).toEqual({
      source: 'PostHog $pageview, host openingbook.xyz, test devices excluded',
      since: '2026-09-24',
      until: '2026-11-02',
      pages: [
        {
          path: '/opening/rnbqkbnr%2Fpppppppp%2F8%2F8%2F4P3%2F8%2FPPPP1PPP%2FRNBQKBNR%20b%20KQkq%20-%200%201',
          views: 8,
          people: 5,
        },
      ],
    });
  });

  it('re-encodes a path that arrived with literal slashes and spaces', () => {
    const v = toViews([['/opening/8/8/8/8/8/8/8/K6k w - - 0 1', 1, 1]], window);
    expect(v.pages[0].path).toBe('/opening/8%2F8%2F8%2F8%2F8%2F8%2F8%2FK6k%20w%20-%20-%200%201');
  });

  it('passes a path that does not decode through unchanged', () => {
    const v = toViews([['/opening/%E0%A4%A', 1, 1]], window);
    expect(v.pages[0].path).toBe('/opening/%E0%A4%A');
  });
});
