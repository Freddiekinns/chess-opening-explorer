jest.mock('fs');
jest.mock('../../packages/api/src/utils/path-resolver', () => ({
  getECODataPath: jest.fn(() => '/mock/eco'),
  getPopularityStatsPath: jest.fn(() => '/mock/popularity_stats.json'),
  getDataPath: jest.fn((f) => `/mock/${f}`),
}));

const FEN = (n) => `fen-${n}`;

// Nine openings: enough to exercise every bucket, the gambit override, the
// tie-break, the unstyled case and pagination.
const ECO_FIXTURE = {
  [FEN(1)]: {
    name: 'Alpha Gambit',
    eco: 'A01',
    moves: '1. e4 e5',
    family_id: 'sicilian',
    analysis_json: { complexity: 'Beginner', style_tags: ['Gambit', 'Positional'] },
  },
  [FEN(2)]: {
    name: 'Bravo Attack',
    eco: 'B02',
    moves: '1. e4 c5',
    family_id: 'sicilian',
    analysis_json: { complexity: 'Advanced', style_tags: ['Aggressive', 'Sharp', 'Solid'] },
  },
  [FEN(3)]: {
    name: 'Charlie System',
    eco: 'C03',
    moves: '1. d4 d5',
    family_id: 'london',
    analysis_json: {
      complexity: 'Intermediate',
      style_tags: ['System-based', 'Flexible', 'Solid'],
    },
  },
  [FEN(4)]: {
    name: 'Delta Wall',
    eco: 'D04',
    moves: '1. d4 Nf6',
    family_id: 'london',
    analysis_json: { complexity: 'Advanced', style_tags: ['Positional', 'Maneuvering'] },
  },
  [FEN(5)]: {
    name: 'Echo Quiet',
    eco: 'E05',
    moves: '1. c4 e6',
    family_id: 'english',
    analysis_json: { complexity: 'Intermediate', style_tags: ['Solid', 'Quiet'] },
  },
  [FEN(6)]: {
    name: 'Foxtrot Counter',
    eco: 'B06',
    moves: '1. e4 d6',
    family_id: 'uncategorised',
    analysis_json: { complexity: 'Advanced', style_tags: ['Tactical', 'Initiative'] },
  },
  [FEN(7)]: {
    name: 'Golf Tie',
    eco: 'A07',
    moves: '1. Nf3 d5',
    family_id: 'english',
    // One tag from `aggressive` and one from `positional` — a 1-1 tie that must
    // resolve to `aggressive`, which comes first in the config's styles array.
    analysis_json: { complexity: 'Advanced', style_tags: ['Sharp', 'Positional'] },
  },
  [FEN(8)]: {
    name: 'Hotel Nothing',
    eco: 'A08',
    moves: '1. g3',
    family_id: 'english',
    analysis_json: { complexity: 'Advanced', style_tags: ['Strategic', 'Dynamic'] },
  },
  [FEN(9)]: {
    name: 'India Sac',
    eco: 'B09',
    moves: '1. e4 g6',
    family_id: 'sicilian',
    // `Sacrificial` also triggers the gambit override, even alongside a
    // higher-scoring bucket.
    analysis_json: {
      complexity: 'Beginner',
      style_tags: ['Sacrificial', 'Aggressive', 'Sharp', 'Attacking'],
    },
  },
};

const POPULARITY_FIXTURE = {
  positions: {
    [FEN(1)]: {
      games_analyzed: 900,
      white_win_rate: 0.5,
      draw_rate: 0.1,
      black_win_rate: 0.4,
      avg_rating: 1500,
    },
    [FEN(2)]: {
      games_analyzed: 100,
      white_win_rate: 0.4,
      draw_rate: 0.2,
      black_win_rate: 0.4,
      avg_rating: 1600,
    },
    [FEN(3)]: {
      games_analyzed: 700,
      white_win_rate: 0.5,
      draw_rate: 0.2,
      black_win_rate: 0.3,
      avg_rating: 1700,
    },
    [FEN(4)]: {
      games_analyzed: 600,
      white_win_rate: 0.5,
      draw_rate: 0.2,
      black_win_rate: 0.3,
      avg_rating: 1800,
    },
    [FEN(5)]: {
      games_analyzed: 500,
      white_win_rate: 0.5,
      draw_rate: 0.2,
      black_win_rate: 0.3,
      avg_rating: 1900,
    },
    [FEN(6)]: {
      games_analyzed: 400,
      white_win_rate: 0.5,
      draw_rate: 0.2,
      black_win_rate: 0.3,
      avg_rating: 2000,
    },
    [FEN(7)]: {
      games_analyzed: 300,
      white_win_rate: 0.5,
      draw_rate: 0.2,
      black_win_rate: 0.3,
      avg_rating: 2100,
    },
    [FEN(8)]: {
      games_analyzed: 200,
      white_win_rate: 0.5,
      draw_rate: 0.2,
      black_win_rate: 0.3,
      avg_rating: 2200,
    },
    // FEN(9) deliberately absent — an opening with no popularity row must
    // survive indexing with null rates, never zeroes or invented numbers.
  },
};

const FAMILIES_FIXTURE = {
  sicilian: { id: 'sicilian', display_name: 'Sicilian Defense' },
  london: { id: 'london', display_name: 'London System' },
  english: { id: 'english', display_name: 'English Opening' },
};

let BrowseService;
let service;

beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
  const fs = require('fs');
  fs.existsSync = jest.fn(() => true);
  fs.readFileSync = jest.fn((p) => {
    const file = String(p);
    if (file.includes('ecoA.json')) return JSON.stringify(ECO_FIXTURE);
    if (/eco[BCDE]\.json/.test(file)) return JSON.stringify({});
    if (file.includes('popularity_stats.json')) return JSON.stringify(POPULARITY_FIXTURE);
    if (file.includes('families.json')) return JSON.stringify(FAMILIES_FIXTURE);
    throw new Error(`unexpected read: ${file}`);
  });
  // cache-service's getOrSet logs on every hit and miss; the index build logs
  // its timing. Silence both or the suite output is unreadable.
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
  BrowseService = require('../../packages/api/src/services/browse-service');
  service = new BrowseService();
  service.clearCache();
});

describe('BrowseService.primaryStyle', () => {
  test('gambit wins outright, even against a higher-scoring bucket', () => {
    expect(service.primaryStyle(['Gambit', 'Positional'])).toBe('gambit');
    expect(service.primaryStyle(['Sacrificial', 'Aggressive', 'Sharp', 'Attacking'])).toBe(
      'gambit'
    );
  });

  test('highest tag-match count wins', () => {
    expect(service.primaryStyle(['Aggressive', 'Sharp', 'Solid'])).toBe('aggressive');
    expect(service.primaryStyle(['System-based', 'Flexible', 'Solid'])).toBe('system');
  });

  test('a tie breaks by config order — aggressive before positional', () => {
    expect(service.primaryStyle(['Sharp', 'Positional'])).toBe('aggressive');
  });

  test('no bucket match is null, not a default bucket', () => {
    expect(service.primaryStyle(['Strategic', 'Dynamic'])).toBeNull();
    expect(service.primaryStyle([])).toBeNull();
  });
});

describe('BrowseService.buildIndex', () => {
  test('projects every opening with resolved level, style and family name', () => {
    const index = service.buildIndex();
    expect(index).toHaveLength(9);

    const alpha = index.find((o) => o.fen === FEN(1));
    expect(alpha).toMatchObject({
      name: 'Alpha Gambit',
      eco: 'A01',
      level: 'Beginner',
      style: 'gambit',
      family_id: 'sicilian',
      family_name: 'Sicilian Defense',
      games_analyzed: 900,
      white_win_rate: 0.5,
    });
  });

  test('uncategorised gets the label "Other", never the raw id', () => {
    const foxtrot = service.buildIndex().find((o) => o.fen === FEN(6));
    expect(foxtrot.family_name).toBe('Other');
  });

  test('an opening with no popularity row keeps null rates and zero games', () => {
    const india = service.buildIndex().find((o) => o.fen === FEN(9));
    expect(india.games_analyzed).toBe(0);
    expect(india.white_win_rate).toBeNull();
    expect(india.draw_rate).toBeNull();
    expect(india.black_win_rate).toBeNull();
    expect(india.avg_rating).toBeNull();
  });
});

describe('BrowseService.browse — sorting', () => {
  test('sort=popular orders by games_analyzed descending', () => {
    const { items } = service.browse({ sort: 'popular', pageSize: 48 });
    const games = items.map((o) => o.games_analyzed);
    expect(games).toEqual([...games].sort((a, b) => b - a));
    expect(items[0].fen).toBe(FEN(1));
  });

  test('sort=popular breaks ties by name so paging is stable', () => {
    const { items } = service.browse({ sort: 'popular', pageSize: 48 });
    // FEN(9) has no popularity row (0 games) and sorts last on its own.
    expect(items[items.length - 1].fen).toBe(FEN(9));
  });

  test('sort=name orders alphabetically', () => {
    const { items } = service.browse({ sort: 'name', pageSize: 48 });
    expect(items.map((o) => o.name)).toEqual([...items.map((o) => o.name)].sort());
  });

  test('sort never changes which openings are in the set', () => {
    const byPopular = service.browse({ sort: 'popular', pageSize: 48 });
    const byName = service.browse({ sort: 'name', pageSize: 48 });
    expect(byPopular.total).toBe(byName.total);
    expect(new Set(byPopular.items.map((o) => o.fen))).toEqual(
      new Set(byName.items.map((o) => o.fen))
    );
  });
});

describe('BrowseService.browse — filtering', () => {
  test('level filters on complexity', () => {
    const { items, total } = service.browse({ level: 'Beginner', pageSize: 48 });
    expect(total).toBe(2);
    expect(items.map((o) => o.fen).sort()).toEqual([FEN(1), FEN(9)].sort());
  });

  test('style filters on the resolved primary style', () => {
    const { total } = service.browse({ style: 'gambit', pageSize: 48 });
    expect(total).toBe(2);
  });

  test('family filters on family_id', () => {
    const { total } = service.browse({ family: 'sicilian', pageSize: 48 });
    expect(total).toBe(3);
  });

  test('filters combine with AND', () => {
    const { total, items } = service.browse({
      level: 'Beginner',
      style: 'gambit',
      family: 'sicilian',
      pageSize: 48,
    });
    expect(total).toBe(2);
    expect(items.map((o) => o.fen).sort()).toEqual([FEN(1), FEN(9)].sort());
  });

  test('an unstyled opening survives an unfiltered browse', () => {
    const { items } = service.browse({ pageSize: 48 });
    expect(items.find((o) => o.fen === FEN(8)).style).toBeNull();
  });
});

describe('BrowseService.browse — the reconciliation invariant', () => {
  test('total === offset + items.length + remaining, on every page', () => {
    for (const page of [1, 2, 3, 4, 5]) {
      const r = service.browse({ page, pageSize: 2 });
      expect(r.total).toBe(r.offset + r.items.length + r.remaining);
    }
  });

  test('remaining is 0 on the last page and never negative', () => {
    const last = service.browse({ page: 5, pageSize: 2 });
    expect(last.items).toHaveLength(1);
    expect(last.remaining).toBe(0);

    const past = service.browse({ page: 99, pageSize: 2 });
    expect(past.items).toHaveLength(0);
    expect(past.remaining).toBe(0);
    expect(past.total).toBe(9);
  });

  test('the invariant holds under a filter too', () => {
    const r = service.browse({ family: 'sicilian', page: 1, pageSize: 2 });
    expect(r.total).toBe(3);
    expect(r.remaining).toBe(1);
    expect(r.total).toBe(r.offset + r.items.length + r.remaining);
  });

  test('paging through covers the set exactly once, no gaps or repeats', () => {
    const seen = [];
    for (let page = 1; page <= 5; page += 1) {
      seen.push(...service.browse({ page, pageSize: 2 }).items.map((o) => o.fen));
    }
    expect(seen).toHaveLength(9);
    expect(new Set(seen).size).toBe(9);
  });
});

describe('BrowseService.browse — facet semantics', () => {
  test('with no filters, each facet dimension sums to the total', () => {
    const { facets, total } = service.browse({ pageSize: 48 });
    expect(total).toBe(9);
    const sum = (f) => f.reduce((acc, x) => acc + x.count, 0);
    expect(sum(facets.level)).toBe(9);
    expect(sum(facets.family)).toBe(9);
    // 8, not 9 — one opening has no style and is counted in no bucket.
    expect(sum(facets.style)).toBe(8);
  });

  test('a facet is counted with its own filter excluded', () => {
    const { facets } = service.browse({ level: 'Beginner', pageSize: 48 });
    const advanced = facets.level.find((f) => f.value === 'Advanced');
    // Still visible and non-zero, so the user can switch to it.
    expect(advanced.count).toBe(5);
  });

  test('other dimensions are counted with the active filter applied', () => {
    const { facets } = service.browse({ level: 'Beginner', pageSize: 48 });
    const sicilian = facets.family.find((f) => f.value === 'sicilian');
    expect(sicilian.count).toBe(2);
    const english = facets.family.find((f) => f.value === 'english');
    expect(english).toBeUndefined();
  });

  test('facets carry display labels, not raw ids', () => {
    const { facets } = service.browse({ pageSize: 48 });
    expect(facets.style.find((f) => f.value === 'gambit').label).toBe('Gambit');
    expect(facets.family.find((f) => f.value === 'london').label).toBe('London System');
    expect(facets.family.find((f) => f.value === 'uncategorised').label).toBe('Other');
  });

  test('zero-count facet values are omitted, not sent as zeroes', () => {
    const { facets } = service.browse({ family: 'london', pageSize: 48 });
    expect(facets.level.every((f) => f.count > 0)).toBe(true);
    expect(facets.style.every((f) => f.count > 0)).toBe(true);
  });
});

describe('BrowseService.browse — clamping', () => {
  test('pageSize is clamped to the configured max', () => {
    expect(service.browse({ pageSize: 5000 }).pageSize).toBe(48);
  });

  test('a bad page falls back to 1', () => {
    expect(service.browse({ page: 0 }).page).toBe(1);
    expect(service.browse({ page: -3 }).page).toBe(1);
    expect(service.browse({ page: 'abc' }).page).toBe(1);
  });

  test('applied echoes what the server actually used', () => {
    const { applied } = service.browse({ family: 'sicilian' });
    expect(applied).toEqual({
      level: null,
      style: null,
      family: 'sicilian',
      sort: 'popular',
    });
  });
});
