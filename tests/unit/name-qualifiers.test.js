/**
 * Telling apart openings that share a name.
 *
 * 700 names (as search normalises them) are shared by 2,170 positions. Search
 * for "najdorf" and five rows read "Sicilian Defense: Najdorf Variation",
 * different only by an ECO code most players can't read. They are five points
 * along one line, so the qualifier is the end of that line: the fewest moves,
 * numbered, that no other opening with the same name ends on.
 */

const { nameQualifiers } = require('../../packages/api/src/services/name-qualifiers');
const ECOService = require('../../packages/api/src/services/eco-service');
const { normalise } = require('../../packages/api/src/services/search/NameIndex');

const NAJDORF = 'Sicilian Defense: Najdorf Variation';
const NAJDORF_LINE = '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6';

const najdorfs = [
  { fen: 'b90', name: NAJDORF, moves: NAJDORF_LINE },
  { fen: 'b94', name: NAJDORF, moves: `${NAJDORF_LINE} 6. Bg5` },
  { fen: 'b95', name: NAJDORF, moves: `${NAJDORF_LINE} 6. Bg5 e6` },
  { fen: 'b96', name: NAJDORF, moves: `${NAJDORF_LINE} 6. Bg5 e6 7. f4` },
  { fen: 'b98', name: NAJDORF, moves: `${NAJDORF_LINE} 6. Bg5 e6 7. f4 Be7` },
];

describe('nameQualifiers', () => {
  test('qualifies each Najdorf by the move that reaches it', () => {
    const qualifiers = nameQualifiers(najdorfs);

    expect(najdorfs.map((opening) => qualifiers.get(opening.fen))).toEqual([
      '5...a6',
      '6.Bg5',
      '6...e6',
      '7.f4',
      '7...Be7',
    ]);
  });

  test('leaves an opening whose name is its own unqualified', () => {
    const qualifiers = nameQualifiers([
      ...najdorfs,
      { fen: 'c00', name: 'French Defense', moves: '1. e4 e6' },
    ]);

    expect(qualifiers.has('c00')).toBe(false);
  });

  test('reaches back as far as it takes when two lines end on the same move', () => {
    const qualifiers = nameQualifiers([
      { fen: 'a', name: 'Test Opening', moves: '1. e4 e5 2. Nf3 Nc6' },
      { fen: 'b', name: 'Test Opening', moves: '1. d4 e5 2. Nf3 Nc6' },
      { fen: 'c', name: 'Test Opening', moves: '1. e4 d5 2. Nf3 Nc6' },
    ]);

    expect(qualifiers.get('a')).toBe('1.e4 e5 2.Nf3 Nc6');
    expect(qualifiers.get('b')).toBe('1.d4 e5 2.Nf3 Nc6');
    expect(qualifiers.get('c')).toBe('1...d5 2.Nf3 Nc6');
  });

  test('groups names the way search reads them, so Defence and Defense are one name', () => {
    const qualifiers = nameQualifiers([
      { fen: 'a', name: 'Pirc Defense', moves: '1. e4 d6' },
      { fen: 'b', name: 'Pirc Defence', moves: '1. e4 d6 2. d4' },
    ]);

    expect(qualifiers.get('a')).toBe('1...d6');
    expect(qualifiers.get('b')).toBe('2.d4');
  });

  test('copes with the stray spaces some move strings carry', () => {
    const qualifiers = nameQualifiers([
      { fen: 'a', name: 'Hungarian Opening', moves: '1. g3  b6 ' },
      { fen: 'b', name: 'Hungarian Opening', moves: '1. g3  b6 2. Bg2 ' },
    ]);

    expect(qualifiers.get('a')).toBe('1...b6');
    expect(qualifiers.get('b')).toBe('2.Bg2');
  });

  test('no two openings in the corpus read the same once qualified', () => {
    const openings = new ECOService().getAllOpenings();
    const qualifiers = nameQualifiers(openings);

    const seen = new Map();
    for (const opening of openings) {
      const label = `${normalise(opening.name)} · ${qualifiers.get(opening.fen) || ''}`;
      expect(seen.get(label)).toBeUndefined();
      seen.set(label, opening.fen);
    }
    expect(qualifiers.size).toBe(2170);
  });
});
