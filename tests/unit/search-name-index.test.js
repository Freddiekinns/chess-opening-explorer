/**
 * Literal name matching.
 *
 * Every text query used to go through Fuse over name, moves, style_tags and
 * description. That cost 850–2,800ms and returned a third of the corpus:
 * "sicilian" scored 4,269 of 12,377 openings, so the ranking work downstream
 * existed to undo the noise the matching had created. The landing hero hid the
 * wait behind a locally held index; the top bar and the mobile overlay had
 * nothing to hide it with, which is the difference users actually reported.
 *
 * These pin the bands, because the bands are the whole of the ranking: how
 * completely the name answers the query, then how often the opening is played.
 */

const { NameIndex, normalise } = require('../../packages/api/src/services/search/NameIndex');

const OPENINGS = [
  { fen: 'f1', name: 'Sicilian', eco: 'B30', games_analyzed: 8_717_736 },
  { fen: 'f2', name: 'Sicilian Defense', eco: 'B20', games_analyzed: 693_122_714 },
  { fen: 'f3', name: 'Sicilian Defence', eco: 'B27', games_analyzed: 370_721_012 },
  {
    fen: 'f4',
    name: 'Sicilian Defense: Najdorf Variation',
    eco: 'B90',
    games_analyzed: 24_382_735,
  },
  { fen: 'f5', name: 'Grünfeld Defense', eco: 'D80', games_analyzed: 8_915_640 },
  { fen: 'f6', name: "King's Indian Defense", eco: 'E61', games_analyzed: 34_746_949 },
  { fen: 'f7', name: 'Neo-Kings Indian', eco: 'A48', games_analyzed: 6_805_883 },
  { fen: 'f8', name: 'French Defense', eco: 'C00', games_analyzed: 389_768_542 },
];

const index = new NameIndex(OPENINGS);
const names = (query) => index.search(query).map((opening) => opening.name);

describe('normalise', () => {
  it('folds the diacritics nobody types', () => {
    expect(normalise('Grünfeld Defense')).toBe('grunfeld defense');
    expect(normalise('Sämisch Variation')).toBe('samisch variation');
  });

  it('drops apostrophes and punctuation, and splits hyphens', () => {
    expect(normalise("King's Indian Defense: Sämisch")).toBe('kings indian defense samisch');
    expect(normalise('Caro-Kann')).toBe('caro kann');
  });

  // The corpus itself carries both spellings on the same opening.
  it('normalises British spelling', () => {
    expect(normalise('Sicilian Defence')).toBe(normalise('Sicilian Defense'));
  });
});

describe('NameIndex — ranking', () => {
  // The single most visible thing the old ranking got wrong. "Sicilian" is the
  // name of a B30 line played 8.7M times and also the first word of the
  // Sicilian Defense played 693M times, and the second is what the user means.
  it('leads a one-word query with the most-played opening, not the exact name', () => {
    expect(names('sicilian')[0]).toBe('Sicilian Defense');
  });

  it('leads a phrase with the opening actually named that', () => {
    expect(names('sicilian defense najdorf variation')[0]).toBe(
      'Sicilian Defense: Najdorf Variation'
    );
  });

  it('finds an opening by a word from the middle of its name', () => {
    expect(names('najdorf')).toEqual(['Sicilian Defense: Najdorf Variation']);
  });

  // The as-you-type band. "kings ind" is not a word match on "King's Indian
  // Defense" but it is the King's Indian being typed, and it has to outrank
  // whatever a bare substring sweeps up.
  it('ranks a half-typed last word above a loose substring match', () => {
    expect(names('kings ind')[0]).toBe("King's Indian Defense");
  });

  it('matches through apostrophes and accents the user did not type', () => {
    expect(names('kings indian defense')).toContain("King's Indian Defense");
    expect(names('grunfeld')).toEqual(['Grünfeld Defense']);
  });

  it('matches British and American spellings against each other', () => {
    expect(names('sicilian defence')).toContain('Sicilian Defense');
  });

  it('orders equally-named openings by how often they are played', () => {
    const sicilians = names('sicilian');
    expect(sicilians.indexOf('Sicilian Defense')).toBeLessThan(sicilians.indexOf('Sicilian'));
  });

  it('says nothing rather than guessing, so the caller can try meaning and spelling', () => {
    expect(index.search('zzzz')).toEqual([]);
    expect(index.search('aggressive openings')).toEqual([]);
    expect(index.search('')).toEqual([]);
  });

  it('scores so that sorting by score is sorting by band then popularity', () => {
    const results = index.search('sicilian');
    const scores = results.map((opening) => opening.searchScore);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(scores.every((score) => Number.isFinite(score))).toBe(true);
  });
});
