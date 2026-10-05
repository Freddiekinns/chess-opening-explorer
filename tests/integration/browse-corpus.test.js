/**
 * Runs the browse service against the real corpus in api/data/. Level and style
 * come from api/data/style-tags.json, which grows as more variations are
 * classified, so those counts are checked against that file rather than pinned:
 * every tagged position has a level, untagged ones have none, and no style
 * covers most of what is tagged.
 */
const BrowseService = require('../../packages/api/src/services/browse-service');
const styleTagsFile = require('../../api/data/style-tags.json');

const TOTAL = 12377;
const TAGGED = Object.keys(styleTagsFile.positions).length;

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

  test('every tagged position has a level, and only those', () => {
    const { facets } = service.browse({});
    expect(facets.level.reduce((a, f) => a + f.count, 0)).toBe(TAGGED);
    expect(facets.level.map((f) => f.value)).toEqual(['Beginner', 'Intermediate', 'Advanced']);
  });

  // The old one-bucket-per-opening styles existed because the LLM tags were on
  // most of the corpus. A style tag that covered most of it would be the same
  // failure; the taxonomy's selectivity check caps shown values by games.
  test('every style filters: none covers half of the tagged positions', () => {
    const { facets } = service.browse({});
    expect(facets.style.map((f) => f.value)).toEqual([
      'solid',
      'sharp',
      'gambit',
      'dubious',
      'system',
      'offbeat',
    ]);
    for (const f of facets.style) {
      expect(f.count).toBeGreaterThan(0);
      expect(f.count).toBeLessThan(TAGGED / 2);
    }
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
    const r = service.browse({ level: 'Beginner', style: 'solid', pageSize: 24 });
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
