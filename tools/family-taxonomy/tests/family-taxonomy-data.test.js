// tools/family-taxonomy/tests/family-taxonomy-data.test.js
//
// The real taxonomy, not a fixture: data/families.json and
// data/family-overrides.json resolve these names to these families. The cases
// are the popular pages the `irregular` split was for — see
// docs/proposals/2026-10-02-irregular-family-split.md.
const fs = require('fs');
const path = require('path');
const { createResolver } = require('../resolve-family');

const ROOT = path.resolve(__dirname, '..', '..', '..');
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

const families = readJson('data/families.json');
const resolve = createResolver(families, readJson('data/family-overrides.json'));

describe('family taxonomy', () => {
  test.each([
    // 1.d4 without the Queen's Gambit
    ['A40', "Queen's Pawn Game", 'queens-pawn'],
    ['A40', 'Horwitz Defense', 'queens-pawn'],
    ['D00', "Queen's Pawn Game: Chigorin Variation", 'queens-pawn'],
    ['D02', "Queen's Pawn Game: Symmetrical Variation", 'queens-pawn'],
    ['D04', 'Colle: 3...c6', 'queens-pawn'],
    ['D00', 'Blackmar-Diemer Gambit', 'queens-pawn'],
    // Queen's Pawn names an existing family already owns
    ['D02', "Queen's Pawn: London", 'london'],
    ['D00', "Queen's Pawn Game: Accelerated London System", 'london'],
    ['A40', "Queen's Pawn: Modern", 'pirc-modern'],
    ['E00', "Queen's Pawn: Neo-Indian", 'nimzo-indian'],
    ['D00', "Queen's Pawn: Veresov Attack", 'trompowsky'],
    // 1.e4 d5 2.Nc3, mislabelled in the source data
    ['B01', "Queen's Pawn Game", 'scandinavian'],
    // 1.e4 e5 sidelines; 2...Nc6 belongs with the Italian and Knights games
    ['C44', "King's Knight Opening: Normal Variation", 'italian'],
    ['C40', "King's Knight Opening", 'kings-pawn'],
    ['B00', "King's Pawn Game", 'kings-pawn'],
    ['C20', "King's Pawn Game: Leonardis Variation", 'kings-pawn'],
    ['C21', 'Danish Gambit Accepted', 'kings-pawn'],
    ['C40', 'Latvian Gambit', 'kings-pawn'],
    // Black declining 1...e5 and 1...c5 on move one
    ['B00', 'Owen Defence', 'offbeat-e4'],
    ['B00', 'Nimzowitsch Defense', 'offbeat-e4'],
    ['B00', 'St. George Defence', 'offbeat-e4'],
    // What irregular is for
    ['A01', 'Nimzowitsch-Larsen: 1...e5 2.Bb2', 'irregular'],
    ['A01', 'Nimzo-Larsen Attack: Modern Variation', 'irregular'],
    ['A02', 'Bird Opening', 'irregular'],
    ['A00', 'Hungarian Opening', 'irregular'],
    ['A40', 'Englund Gambit', 'irregular'],
    ['A51', 'Budapest: 3.dxe5', 'irregular'],
  ])('%s %s → %s', (eco, name, familyId) => {
    expect(resolve({ eco, name })).toBe(familyId);
  });

  test('every family an override names exists', () => {
    const { overrides } = readJson('data/family-overrides.json');
    const missing = overrides.map((rule) => rule.family_id).filter((id) => !families[id]);
    expect(missing).toEqual([]);
  });

  test('api/data/families.json is a copy of data/families.json', () => {
    expect(readJson('api/data/families.json')).toEqual(families);
  });

  // build-family-index.js writes family_id into the ECO files. A rule change
  // without a rebuild leaves dev, tests and the coverage report on the old
  // taxonomy, while the deploy re-resolves and ships the new one.
  test('the committed ECO files carry what the resolver says', () => {
    const drift = [];
    for (const letter of 'ABCDE') {
      const data = readJson(`api/data/eco/eco${letter}.json`);
      for (const opening of Object.values(data)) {
        const expected = resolve({ eco: opening.eco, name: opening.name });
        if (opening.family_id !== expected) {
          drift.push(`${opening.eco} ${opening.name}: ${opening.family_id} → ${expected}`);
        }
      }
    }
    expect(drift.slice(0, 10)).toEqual([]);
  });
});
