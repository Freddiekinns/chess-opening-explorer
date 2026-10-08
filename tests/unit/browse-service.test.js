jest.mock('fs');
jest.mock('../../packages/api/src/utils/path-resolver', () => ({
  getECODataPath: jest.fn(() => '/mock/eco'),
  getPopularityStatsPath: jest.fn(() => '/mock/popularity_stats.json'),
  getDataPath: jest.fn((f) => `/mock/${f}`),
  getAPIDataPath: jest.fn((f) => `/mock/${f}`),
}));

const FEN = (n) => `fen-${n}`;

// Nine openings: enough to exercise every style, an opening under two styles,
// one under none, an untagged one, and pagination. Their old LLM tags
// (analysis_json) are deliberately at odds with their style tags: browsing must
// read only the latter.
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
    analysis_json: {
      complexity: 'Beginner',
      style_tags: ['Sacrificial', 'Aggressive', 'Sharp', 'Attacking'],
    },
  },
};

const MIDDLE = {
  character: 'balanced',
  gambit: 'none',
  soundness: 'sound',
  structure: 'flexible',
  approach: 'standard',
  level: 'intermediate',
  plans: [],
};
const tags = (axes) => ({ ...MIDDLE, ...axes });

// FEN(9) is not in it: a variation not classified yet.
const STYLE_FIXTURE = {
  labels: {
    gambit: { white: { label: 'White gambit', glossary: 'g' } },
    character: {
      solid: { label: 'Solid', glossary: 's' },
      sharp: { label: 'Sharp', glossary: 'x' },
    },
    level: { beginner: { label: 'Beginner', glossary: 'b' } },
  },
  plans: { fianchetto: { label: 'Fianchetto', glossary: 'f' } },
  variations: {
    alpha: tags({ gambit: 'white', level: 'beginner', plans: ['fianchetto'] }),
    bravo: tags({ character: 'sharp', level: 'advanced' }),
    charlie: tags({ character: 'solid', approach: 'system' }),
    delta: tags({ character: 'solid', structure: 'closed', level: 'advanced' }),
    echo: tags({ character: 'solid' }),
    foxtrot: tags({ character: 'sharp', soundness: 'dubious', level: 'advanced' }),
    golf: tags({ approach: 'offbeat', level: 'advanced' }),
    hotel: tags({}),
  },
  positions: {
    [FEN(1)]: 'alpha',
    [FEN(2)]: 'bravo',
    [FEN(3)]: 'charlie',
    [FEN(4)]: 'delta',
    [FEN(5)]: 'echo',
    [FEN(6)]: 'foxtrot',
    [FEN(7)]: 'golf',
    [FEN(8)]: 'hotel',
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
    if (file.includes('style-tags.json')) return JSON.stringify(STYLE_FIXTURE);
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

describe('BrowseService.stylesOf', () => {
  test('an opening is under every style its axes match', () => {
    expect(service.stylesOf(tags({ character: 'sharp', gambit: 'black' }))).toEqual([
      'sharp',
      'gambit',
    ]);
    expect(service.stylesOf(tags({ character: 'solid', approach: 'system' }))).toEqual([
      'solid',
      'system',
    ]);
  });

  test('middle values put an opening under no style', () => {
    expect(service.stylesOf(tags({}))).toEqual([]);
  });

  test('a position with no style tags is under none, not a default', () => {
    expect(service.stylesOf(null)).toEqual([]);
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
      styles: ['gambit'],
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

  test('an untagged opening has no level and no styles', () => {
    const india = service.buildIndex().find((o) => o.fen === FEN(9));
    expect(india.level).toBeNull();
    expect(india.styles).toEqual([]);
  });

  test('a hidden middle level is still stored for filtering', () => {
    const hotel = service.buildIndex().find((o) => o.fen === FEN(8));
    expect(hotel.level).toBe('Intermediate');
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
  test('level filters on the style tags, never the old complexity', () => {
    const { items, total } = service.browse({ level: 'Beginner', pageSize: 48 });
    expect(total).toBe(1);
    expect(items.map((o) => o.fen)).toEqual([FEN(1)]);
  });

  test('style filters on the style tags', () => {
    expect(service.browse({ style: 'gambit', pageSize: 48 }).total).toBe(1);
    expect(service.browse({ style: 'solid', pageSize: 48 }).total).toBe(3);
  });

  test('an opening under two styles is found by either', () => {
    const solid = service.browse({ style: 'solid', pageSize: 48 }).items.map((o) => o.fen);
    const system = service.browse({ style: 'system', pageSize: 48 }).items.map((o) => o.fen);
    expect(solid).toContain(FEN(3));
    expect(system).toEqual([FEN(3)]);
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
    expect(total).toBe(1);
    expect(items.map((o) => o.fen)).toEqual([FEN(1)]);
  });

  test('unstyled and untagged openings survive an unfiltered browse', () => {
    const { items } = service.browse({ pageSize: 48 });
    expect(items.find((o) => o.fen === FEN(8)).styles).toEqual([]);
    expect(items.find((o) => o.fen === FEN(9)).style_profile).toBeNull();
  });

  test('items carry the style profile a card draws, words in taxonomy order', () => {
    const { items } = service.browse({ pageSize: 48 });
    expect(items.find((o) => o.fen === FEN(1)).style_profile).toEqual({
      words: [
        { axis: 'gambit', value: 'white', label: 'White gambit', glossary: 'g' },
        { axis: 'level', value: 'beginner', label: 'Beginner', glossary: 'b' },
      ],
      plans: [{ key: 'fianchetto', label: 'Fianchetto', glossary: 'f' }],
    });
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
  test('with no filters, level and family sum to the tagged and total counts', () => {
    const { facets, total } = service.browse({ pageSize: 48 });
    expect(total).toBe(9);
    const sum = (f) => f.reduce((acc, x) => acc + x.count, 0);
    // 8, not 9 — the untagged opening has no level.
    expect(sum(facets.level)).toBe(8);
    expect(sum(facets.family)).toBe(9);
  });

  test('styles are counted under each style an opening has, so they need not partition', () => {
    const { facets } = service.browse({ pageSize: 48 });
    const count = (v) => facets.style.find((f) => f.value === v).count;
    expect(count('solid')).toBe(3);
    expect(count('sharp')).toBe(2);
    expect(count('system')).toBe(1);
    expect(count('dubious')).toBe(1);
  });

  test('a facet is counted with its own filter excluded', () => {
    const { facets } = service.browse({ level: 'Beginner', pageSize: 48 });
    const advanced = facets.level.find((f) => f.value === 'Advanced');
    // Still visible and non-zero, so the user can switch to it.
    expect(advanced.count).toBe(4);
  });

  test('other dimensions are counted with the active filter applied', () => {
    const { facets } = service.browse({ level: 'Beginner', pageSize: 48 });
    const sicilian = facets.family.find((f) => f.value === 'sicilian');
    expect(sicilian.count).toBe(1);
    const english = facets.family.find((f) => f.value === 'english');
    expect(english).toBeUndefined();
  });

  test('facets carry display labels, not raw ids', () => {
    const { facets } = service.browse({ pageSize: 48 });
    expect(facets.style.find((f) => f.value === 'gambit').label).toBe('Gambit');
    expect(facets.family.find((f) => f.value === 'london').label).toBe('London System');
    expect(facets.family.find((f) => f.value === 'uncategorised').label).toBe('Other');
  });
});

describe('BrowseService.browse — facet zero handling', () => {
  test('zero-count values are omitted from dimensions the user has not chosen', () => {
    const { facets } = service.browse({ family: 'london', pageSize: 48 });
    expect(facets.level.every((f) => f.count > 0)).toBe(true);
    expect(facets.style.every((f) => f.count > 0)).toBe(true);
  });

  test('the applied value survives at zero so the bar can still label it', () => {
    // No Beginner opening in the english family, but the user chose Beginner:
    // dropping it would leave the trigger unable to name its own selection.
    const { facets, total } = service.browse({
      level: 'Beginner',
      family: 'english',
      pageSize: 48,
    });
    expect(total).toBe(0);
    expect(facets.level.find((f) => f.value === 'Beginner')).toMatchObject({
      label: 'Beginner',
      count: 0,
    });
  });

  test('style facets do not leak the axis rules from config', () => {
    const { facets } = service.browse({ pageSize: 48 });
    expect(facets.style.every((f) => f.axis === undefined && f.values === undefined)).toBe(true);
  });
});

describe('BrowseService.browse — family first moves', () => {
  test('a family whose openings share a first move reports it', () => {
    const { facets } = service.browse({ pageSize: 48 });
    expect(facets.family.find((f) => f.value === 'sicilian').first_move).toBe('e4');
    expect(facets.family.find((f) => f.value === 'london').first_move).toBe('d4');
  });

  test('a family with no dominant first move reports null, not a guess', () => {
    // The three english fixture rows are 1. c4, 1. Nf3 and 1. g3 — a 33% modal
    // share is not a first move, and asserting one would be an invented fact.
    const { facets } = service.browse({ pageSize: 48 });
    expect(facets.family.find((f) => f.value === 'english').first_move).toBeNull();
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
