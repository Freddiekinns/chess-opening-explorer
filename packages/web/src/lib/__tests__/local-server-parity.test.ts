/**
 * Guard: the list drawn on the keystroke and the list that replaces it are the
 * same list.
 *
 * Every search surface now draws local results immediately from a shared slice
 * of the search index, then swaps in the server's answer a few hundred
 * milliseconds later. Those two rankings have to agree, or the results visibly
 * reshuffle under the cursor while the user is reading them — which is worse
 * than the wait it replaced, and is what would happen with the ranking this
 * replaced: `findAndRankOpenings` scored by additive bonuses (name prefix 500,
 * contains 250, popularity capped at 100) while the server banded and ordered
 * by play count.
 *
 * So this imports the server's ranker directly — `NameIndex.js` is plain
 * CommonJS with no Express or filesystem dependencies — and runs both over the
 * same openings. Two implementations of one rule, checked against each other
 * rather than trusted to drift apart quietly.
 */
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { findAndRankOpenings, type Opening } from '../localSearch';

const require = createRequire(import.meta.url);
const { NameIndex, normalise } = require('../../../../api/src/services/search/NameIndex.js');

const opening = (
  fen: string,
  name: string,
  eco: string,
  moves: string,
  games: number
): Opening => ({ fen, name, eco, moves, src: 'test', games_analyzed: games });

const OPENINGS: Opening[] = [
  opening('f1', 'Sicilian', 'B30', '1. e4 c5', 8_717_736),
  opening('f2', 'Sicilian Defense', 'B20', '1. e4 c5', 693_122_714),
  opening('f3', 'Sicilian Defence', 'B27', '1. e4 c5 2. Nf3', 370_721_012),
  opening('f4', 'Sicilian Defense: Najdorf Variation', 'B90', '1. e4 c5 2. Nf3 d6', 24_382_735),
  opening('f5', 'Grünfeld Defense', 'D80', '1. d4 Nf6 2. c4 g6', 8_915_640),
  opening('f6', "King's Indian Defense", 'E61', '1. d4 Nf6 2. c4 g6', 34_746_949),
  opening('f7', 'Neo-Kings Indian', 'A48', '1. d4 Nf6 2. Nf3 g6', 6_805_883),
  opening('f8', 'French Defense', 'C00', '1. e4 e6', 389_768_542),
  opening('f9', "Queen's Gambit Declined", 'D30', '1. d4 d5 2. c4 e6', 97_838_923),
  opening('f10', "Queen's Gambit Declined: Normal Defense", 'D35', '1. d4 d5 2. c4 e6', 53_227_670),
];

const serverIndex = new NameIndex(OPENINGS);

const localNames = (query: string) =>
  findAndRankOpenings(query, OPENINGS).map((result) => result.name);
const serverNames = (query: string) =>
  serverIndex.search(query).map((result: Opening) => result.name);

/** The shapes a name query comes in, as the placeholder advertises them. */
const QUERIES = [
  'sicilian',
  'sicilian defence',
  "queen's gambit declined",
  'queens gambit declined',
  'kings ind',
  'kings indian defense',
  'najdorf',
  'grunfeld',
  'grünfeld',
  'french',
  'neo',
  'zzzz',
  'defense',
  'd', // one character: below MIN_QUERY_LENGTH, but nothing may throw on it
];

describe('local ranking matches the server it is standing in for', () => {
  it.each(QUERIES)('ranks "%s" the same way', (query) => {
    expect(localNames(query)).toEqual(serverNames(query));
  });

  it('normalises names the same way', () => {
    for (const { name } of OPENINGS) {
      // Reached through ranking rather than exported twice: an opening found by
      // its folded name on one side must be found by it on the other.
      expect(localNames(name)).toEqual(serverNames(name));
    }
    expect(normalise("King's Indian Defence")).toBe('kings indian defense');
  });

  // Names alone cannot tell this apart: five rows share one. Compared by
  // position, so the two halves must agree on which Najdorf comes where.
  it('orders openings that share a name the same way', () => {
    const line = '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6';
    const najdorf = 'Sicilian Defense: Najdorf Variation';
    const najdorfs = [
      opening('b98', najdorf, 'B98', `${line} 6. Bg5 e6 7. f4 Be7`, 1_247_877),
      opening('b94', najdorf, 'B94', `${line} 6. Bg5`, 6_011_780),
      opening('b96', najdorf, 'B96', `${line} 6. Bg5 e6 7. f4`, 1_992_132),
      opening('b90', najdorf, 'B90', line, 24_382_735),
      opening('b95', najdorf, 'B95', `${line} 6. Bg5 e6`, 4_085_939),
    ];
    const local = findAndRankOpenings('najdorf', najdorfs).map((result) => result.fen);
    const server = new NameIndex(najdorfs).search('najdorf').map((result: Opening) => result.fen);

    expect(local).toEqual(['b90', 'b94', 'b95', 'b96', 'b98']);
    expect(local).toEqual(server);
  });

  // ECO codes and moves have their own branches on both sides. They are not in
  // NameIndex, so they are checked against the rule rather than the module.
  it('returns every opening carrying an ECO code, most-played first, as flat ties', () => {
    const results = findAndRankOpenings('b20', OPENINGS);
    expect(results.map((result) => result.name)).toEqual(['Sicilian Defense']);
    expect(results.every((result) => result.searchScore === 1)).toBe(true);
  });

  it('leads a move query with the most-played opening that starts with it', () => {
    expect(localNames('e4')[0]).toBe('Sicilian Defense');
    expect(localNames('d4')[0]).toBe("Queen's Gambit Declined");
  });
});
