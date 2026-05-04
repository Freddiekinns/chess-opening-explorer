// tools/family-taxonomy/__tests__/resolve-family.test.js
const { createResolver } = require('../resolve-family');

const families = {
  sicilian: { id: 'sicilian', display_name: 'Sicilian Defense' },
  'caro-kann': { id: 'caro-kann', display_name: 'Caro-Kann Defense' },
  'kings-indian': { id: 'kings-indian', display_name: "King's Indian Defense" },
  london: { id: 'london', display_name: 'London System' },
  'pirc-modern': { id: 'pirc-modern', display_name: 'Pirc & Modern Defense' },
};
const overrides = {
  overrides: [
    { match: { name_prefix: 'London System' }, family_id: 'london' },
    { match: { name_prefix: "Indian Game: King's Indian" }, family_id: 'kings-indian' },
    { match: { name_prefix: 'Pirc Defense' }, family_id: 'pirc-modern' },
    { match: { name_prefix: 'Modern Defense' }, family_id: 'pirc-modern' },
  ],
};

describe('resolveFamily', () => {
  const resolve = createResolver(families, overrides);

  test('colon-prefix match: "Sicilian Defense: Najdorf" → sicilian', () => {
    expect(resolve({ eco: 'B90', name: 'Sicilian Defense: Najdorf Variation' })).toBe('sicilian');
  });

  test('self-named root: "Caro-Kann Defense" → caro-kann', () => {
    expect(resolve({ eco: 'B10', name: 'Caro-Kann Defense' })).toBe('caro-kann');
  });

  test('override beats colon-split: "London System: Reversed" → london', () => {
    expect(resolve({ eco: 'D02', name: 'London System: Reversed' })).toBe('london');
  });

  test('Indian Game split: "Indian Game: King\'s Indian Variation" → kings-indian', () => {
    expect(resolve({ eco: 'A48', name: "Indian Game: King's Indian Variation" })).toBe(
      'kings-indian'
    );
  });

  test('Pirc collapses to pirc-modern via override', () => {
    expect(resolve({ eco: 'B07', name: 'Pirc Defense: Classical' })).toBe('pirc-modern');
  });

  test('Modern collapses to pirc-modern via override', () => {
    expect(resolve({ eco: 'B06', name: 'Modern Defense: Standard' })).toBe('pirc-modern');
  });

  test('case-insensitive display-name match', () => {
    expect(resolve({ eco: 'B20', name: 'sicilian defense: kalashnikov' })).toBe('sicilian');
  });

  test('whitespace tolerance', () => {
    expect(resolve({ eco: 'B20', name: '  Sicilian Defense:Kalashnikov  ' })).toBe('sicilian');
  });

  test('unmatched falls back to uncategorised', () => {
    expect(resolve({ eco: 'A00', name: 'Some Obscure Gambit' })).toBe('uncategorised');
  });

  test('override order: first match wins', () => {
    const ordered = createResolver(families, {
      overrides: [
        { match: { name_prefix: 'Pirc Defense' }, family_id: 'pirc-modern' },
        { match: { name_prefix: 'Pirc' }, family_id: 'sicilian' }, // contradictory; first should win
      ],
    });
    expect(ordered({ eco: 'B07', name: 'Pirc Defense: Classical' })).toBe('pirc-modern');
  });

  test('exact-name override match', () => {
    const r = createResolver(families, {
      overrides: [{ match: { name: 'London System' }, family_id: 'london' }],
    });
    expect(r({ eco: 'D02', name: 'London System' })).toBe('london');
    // Override doesn't match (different name), but colon-split prefix matches the
    // London display name, so the fallback resolves it to london as well.
    expect(r({ eco: 'D02', name: 'London System: Reversed' })).toBe('london');
  });

  test('eco-only override match', () => {
    const r = createResolver(families, {
      overrides: [{ match: { eco: 'A45' }, family_id: 'london' }],
    });
    expect(r({ eco: 'A45', name: 'Anything' })).toBe('london');
  });
});
