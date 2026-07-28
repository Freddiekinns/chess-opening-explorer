/**
 * Runs the browse service against the real corpus in api/data/. Guards the
 * measured distribution recorded in the phase-2 plan — if enrichment reruns
 * and the numbers move, this fails loudly rather than the filter bar quietly
 * showing different counts than the plan assumed.
 */
const BrowseService = require('../../packages/api/src/services/browse-service');

const TOTAL = 12377;

describe('browse over the real corpus', () => {
  let service;
  let spies;

  beforeAll(() => {
    spies = [
      jest.spyOn(console, 'warn').mockImplementation(() => {}),
      jest.spyOn(console, 'log').mockImplementation(() => {}),
    ];
    service = new BrowseService();
  });

  afterAll(() => spies.forEach((s) => s.mockRestore()));

  test('indexes every opening', () => {
    expect(service.buildIndex()).toHaveLength(TOTAL);
  });

  test('unfiltered total is the whole corpus', () => {
    expect(service.browse({}).total).toBe(TOTAL);
  });

  test('level facet matches the measured distribution and sums to the total', () => {
    const { facets } = service.browse({});
    const byValue = Object.fromEntries(facets.level.map((f) => [f.value, f.count]));
    expect(byValue).toEqual({ Beginner: 179, Intermediate: 4587, Advanced: 7611 });
    expect(facets.level.reduce((a, f) => a + f.count, 0)).toBe(TOTAL);
  });

  test('style facet partitions the corpus, leaving only the 3 unstyled', () => {
    const { facets } = service.browse({});
    const byValue = Object.fromEntries(facets.style.map((f) => [f.value, f.count]));
    expect(byValue).toEqual({
      positional: 3585,
      aggressive: 3168,
      gambit: 2182,
      solid: 1271,
      tactical: 1100,
      system: 1068,
    });
    expect(facets.style.reduce((a, f) => a + f.count, 0)).toBe(TOTAL - 3);
  });

  test('family facet sums to the total and labels uncategorised as Other', () => {
    const { facets } = service.browse({});
    expect(facets.family.reduce((a, f) => a + f.count, 0)).toBe(TOTAL);
    expect(facets.family.find((f) => f.value === 'sicilian')).toMatchObject({
      label: 'Sicilian Defense',
      count: 1710,
    });
    expect(facets.family.find((f) => f.value === 'uncategorised')).toMatchObject({
      label: 'Other',
      count: 192,
    });
  });

  test('the reconciliation invariant holds across a real filtered set', () => {
    let page = 1;
    let seen = 0;
    let guard = 0;
    let result;
    do {
      result = service.browse({ family: 'sicilian', page, pageSize: 48 });
      expect(result.total).toBe(result.offset + result.items.length + result.remaining);
      seen += result.items.length;
      page += 1;
      guard += 1;
    } while (result.remaining > 0 && guard < 100);

    expect(seen).toBe(1710);
    expect(result.remaining).toBe(0);
  });

  test('a combined filter still reconciles', () => {
    const r = service.browse({ level: 'Beginner', style: 'gambit', pageSize: 24 });
    expect(r.total).toBe(r.offset + r.items.length + r.remaining);
    expect(r.total).toBeGreaterThan(0);
  });

  test('no item carries a fabricated win rate', () => {
    const { items } = service.browse({ pageSize: 48 });
    for (const item of items) {
      const hasAll =
        item.white_win_rate !== null && item.draw_rate !== null && item.black_win_rate !== null;
      const hasNone =
        item.white_win_rate === null && item.draw_rate === null && item.black_win_rate === null;
      expect(hasAll || hasNone).toBe(true);
    }
  });

  test('a page of 48 stays well under 100 kB', () => {
    const bytes = Buffer.byteLength(JSON.stringify(service.browse({ pageSize: 48 })), 'utf8');
    expect(bytes).toBeLessThan(100_000);
  });
});
