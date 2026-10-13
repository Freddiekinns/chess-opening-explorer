const { plies, replay } = require('../select-roots');

describe('style-tags select-roots move parsing', () => {
  test('reads double-spaced move text to the end (wiki_b)', () => {
    expect(plies('1. e4  e5 2. Nf3  Nc6 3. Bb5  Qf6 ')).toEqual([
      'e4',
      'e5',
      'Nf3',
      'Nc6',
      'Bb5',
      'Qf6',
    ]);
  });

  test('reads move numbers written without a space (icsbot, eco_wikip)', () => {
    expect(plies('1.e4 e5 2.Nf3 Nc6 3.Bb5 a6')).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6']);
    expect(plies('1.e4 e5 2.Nf3 Nc6 3...Nf6')).toEqual(['e4', 'e5', 'Nf3', 'Nc6', 'Nf6']);
  });

  test('replays a wiki_b line past the first ply', () => {
    const boards = replay(
      plies('1. e4  e5 2. Nf3  Nc6 3. Bc4  Nf6 4. Ng5  Bc5 5. Nxf7  Bxf2 6. Kxf2  Nxe4 7. Kg1 ')
    );
    expect(boards).toHaveLength(13);
  });
});
