const { normalise } = require('./search/NameIndex');

/**
 * What tells apart openings that share a name.
 *
 * 2,170 positions share their name, as search reads names, with at least one
 * other: "najdorf" returns five rows called "Sicilian Defense: Najdorf
 * Variation", which are five points along one line. The ECO code is the only
 * thing that differed on screen, and it means nothing to most players.
 *
 * So each of them gets the end of its own line: the fewest moves, numbered,
 * that no other opening with the same name ends on. One move does it for 93% of
 * them, because a different move number is already a difference ("6.Bg5" and
 * "7.f4"); two lines of equal length that end alike reach back until they part.
 *
 * Grouped by `normalise`, not the raw name: "Pirc Defense" and "Pirc Defence"
 * are one name to search and to a reader.
 */

/** "1. e4 c5 2. Nf3" → ['e4', 'c5', 'Nf3']. Some move strings carry stray spaces. */
function plies(moves) {
  return (moves || '')
    .replace(/\d+\.(\.\.)?/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/** The plies from `start` on, numbered the way the opening book numbers them. */
function format(line, start) {
  return line
    .slice(start)
    .map((san, offset) => {
      const ply = start + offset;
      const moveNumber = Math.floor(ply / 2) + 1;
      if (ply % 2 === 0) return `${moveNumber}.${san}`;
      return offset === 0 ? `${moveNumber}...${san}` : san;
    })
    .join(' ');
}

function sameEnding(a, b, length) {
  if (a.length !== b.length) return false;
  for (let i = a.length - length; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * @param {Array<{fen: string, name: string, moves: string}>} openings
 * @returns {Map<string, string>} fen → qualifier, for shared names only
 */
function nameQualifiers(openings) {
  const groups = new Map();
  for (const opening of openings) {
    const key = normalise(opening.name);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ fen: opening.fen, line: plies(opening.moves) });
  }

  const qualifiers = new Map();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    for (const { fen, line } of group) {
      let length = 1;
      while (
        length < line.length &&
        group.some((other) => other.fen !== fen && sameEnding(other.line, line, length))
      ) {
        length++;
      }
      qualifiers.set(fen, format(line, Math.max(line.length - length, 0)));
    }
  }
  return qualifiers;
}

module.exports = { nameQualifiers };
