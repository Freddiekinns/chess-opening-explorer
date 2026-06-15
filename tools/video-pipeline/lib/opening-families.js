/**
 * Opening family detection and compatibility, derived from move prefixes.
 *
 * Replaces the old enumerated "severe incompatibility" pair list: every family
 * is mapped to the move-token prefix that defines it, and two families are
 * incompatible exactly when their prefixes diverge. This means a "Caro-Kann
 * Exchange Variation" video (1.e4 c6) can never land on a Queen's Gambit
 * Declined page (1.d4 d5 2.c4) just because both share the word "Exchange".
 *
 * No database or API dependencies — also consumed by
 * scripts/audit-video-matches.js to measure contamination in the live index.
 */

/**
 * ECO range → family id. Ranges are inclusive and must not overlap.
 */
const ECO_FAMILY_RANGES = [
  ['A00', 'A09', 'irregular'],
  ['A10', 'A39', 'english'],
  ['A40', 'A44', 'queens_pawn'],
  ['A45', 'A49', 'indian_systems'],
  ['A50', 'A55', 'indian_defenses'],
  ['A56', 'A56', 'benoni'],
  ['A57', 'A59', 'benko'],
  ['A60', 'A79', 'benoni'],
  ['A80', 'A99', 'dutch'],
  ['B00', 'B00', 'kings_pawn_misc'],
  ['B01', 'B01', 'scandinavian'],
  ['B02', 'B05', 'alekhine'],
  ['B06', 'B06', 'modern'],
  ['B07', 'B09', 'pirc'],
  ['B10', 'B19', 'caro_kann'],
  ['B20', 'B99', 'sicilian'],
  ['C00', 'C19', 'french'],
  ['C20', 'C24', 'kings_pawn_games'],
  ['C25', 'C29', 'vienna'],
  ['C30', 'C39', 'kings_gambit'],
  ['C40', 'C40', 'open_game'],
  ['C41', 'C41', 'philidor'],
  ['C42', 'C43', 'petrov'],
  ['C44', 'C44', 'open_game_nc6'],
  ['C45', 'C45', 'scotch'],
  ['C46', 'C49', 'four_knights'],
  ['C50', 'C59', 'italian'],
  ['C60', 'C99', 'spanish'],
  ['D00', 'D05', 'queens_pawn_misc'],
  ['D06', 'D09', 'queens_gambit'],
  ['D10', 'D19', 'slav'],
  ['D20', 'D29', 'queens_gambit_accepted'],
  ['D30', 'D42', 'queens_gambit_declined'],
  ['D43', 'D49', 'semi_slav'],
  ['D50', 'D69', 'queens_gambit_declined'],
  ['D70', 'D99', 'grunfeld'],
  ['E00', 'E09', 'catalan'],
  ['E10', 'E19', 'queens_indian'],
  ['E20', 'E59', 'nimzo_indian'],
  ['E60', 'E99', 'kings_indian'],
];

/**
 * Family id → defining move-token prefix (SAN, lowercase, no move numbers).
 * Two families are compatible when one prefix is a prefix of the other.
 * Empty prefix = transpositional/unknown — compatible with everything.
 */
const FAMILY_MOVE_PREFIXES = {
  irregular: [],
  english: ['c4'],
  queens_pawn: ['d4'],
  indian_systems: ['d4', 'nf6'],
  indian_defenses: ['d4', 'nf6', 'c4'],
  benoni: ['d4', 'nf6', 'c4', 'c5'],
  benko: ['d4', 'nf6', 'c4', 'c5', 'd5', 'b5'],
  dutch: ['d4', 'f5'],
  kings_pawn_misc: ['e4'],
  scandinavian: ['e4', 'd5'],
  alekhine: ['e4', 'nf6'],
  modern: ['e4', 'g6'],
  pirc: ['e4', 'd6'],
  caro_kann: ['e4', 'c6'],
  sicilian: ['e4', 'c5'],
  french: ['e4', 'e6'],
  kings_pawn_games: ['e4', 'e5'],
  vienna: ['e4', 'e5', 'nc3'],
  kings_gambit: ['e4', 'e5', 'f4'],
  open_game: ['e4', 'e5', 'nf3'],
  philidor: ['e4', 'e5', 'nf3', 'd6'],
  petrov: ['e4', 'e5', 'nf3', 'nf6'],
  open_game_nc6: ['e4', 'e5', 'nf3', 'nc6'],
  scotch: ['e4', 'e5', 'nf3', 'nc6', 'd4'],
  four_knights: ['e4', 'e5', 'nf3', 'nc6', 'nc3'],
  italian: ['e4', 'e5', 'nf3', 'nc6', 'bc4'],
  spanish: ['e4', 'e5', 'nf3', 'nc6', 'bb5'],
  queens_pawn_misc: ['d4', 'd5'],
  // London/Trompowsky have flexible move orders; keep their prefixes loose so
  // they demote (moderate penalty) rather than hard-reject across 1.d4 lines.
  london: ['d4'],
  trompowsky: ['d4', 'nf6'],
  queens_gambit: ['d4', 'd5', 'c4'],
  slav: ['d4', 'd5', 'c4', 'c6'],
  queens_gambit_accepted: ['d4', 'd5', 'c4', 'dxc4'],
  queens_gambit_declined: ['d4', 'd5', 'c4', 'e6'],
  // Semi-Slav is reached via both ...e6 and ...c6 move orders.
  semi_slav: ['d4', 'd5', 'c4'],
  grunfeld: ['d4', 'nf6', 'c4', 'g6', 'nc3', 'd5'],
  catalan: ['d4', 'nf6', 'c4', 'e6', 'g3'],
  queens_indian: ['d4', 'nf6', 'c4', 'e6', 'nf3', 'b6'],
  nimzo_indian: ['d4', 'nf6', 'c4', 'e6', 'nc3', 'bb4'],
  kings_indian: ['d4', 'nf6', 'c4', 'g6'],
};

/**
 * Title → family detectors, evaluated in order (most specific first).
 * All patterns are word-boundary anchored so "kid" never matches "kidding"
 * and "english" never matches inside another word.
 */
const TITLE_FAMILY_DETECTORS = [
  // Specific names that contain a more generic family name — must come first.
  ['english', /\breversed\s+sicilian\b/i],
  ['english', /\banglo[\s-]\w+/i],
  ['semi_slav', /\bsemi[\s-]slav\b/i],
  ['four_knights', /\bfour\s+knights\b/i],
  ['queens_gambit_accepted', /\bqueen'?s\s+gambit\s+accepted\b|\bqga\b/i],
  ['queens_gambit_declined', /\bqueen'?s\s+gambit\s+declined\b|\bqgd\b/i],
  ['kings_indian', /\bking'?s\s+indian\b|\bkid\b/i],
  ['kings_gambit', /\bking'?s\s+gambit\b/i],
  ['nimzo_indian', /\bnimzo[\s-]?indian\b|\bnimzo\b/i],
  ['queens_indian', /\bqueen'?s\s+indian\b|\bqid\b/i],
  ['queens_gambit', /\bqueen'?s\s+gambit\b/i],
  ['sicilian', /\bsicilian\b/i],
  ['french', /\bfrench\b/i],
  ['caro_kann', /\bcaro[\s-]?kann\b/i],
  ['spanish', /\bruy\s+lopez\b|\bspanish\s+(?:game|opening)\b|\bberlin\s+defen[sc]e\b/i],
  ['italian', /\bitalian\s+(?:game|opening)\b|\bgiuoco\s+piano\b/i],
  ['scotch', /\bscotch\b/i],
  ['petrov', /\bpetrov\b|\bpetroff\b|\brussian\s+(?:game|defen[sc]e)\b/i],
  ['philidor', /\bphilidor\b/i],
  ['vienna', /\bvienna\b/i],
  ['scandinavian', /\bscandinavian\b|\bcenter\s+counter\b/i],
  ['alekhine', /\balekhine'?s?\s+defen[sc]e\b/i],
  ['pirc', /\bpirc\b/i],
  ['modern', /\bmodern\s+defen[sc]e\b/i],
  ['dutch', /\bdutch\s+defen[sc]e\b|\bdutch\s+opening\b|\bstonewall\b|\bleningrad\b/i],
  ['slav', /\bslav\b/i],
  ['grunfeld', /\bgr[uü]nfeld\b/i],
  ['catalan', /\bcatalan\b/i],
  ['benko', /\bbenko\b/i],
  ['benoni', /\bbenoni\b/i],
  ['london', /\blondon\s+system\b|\bjobava\b/i],
  ['trompowsky', /\btrompowsky\b|\btromp\b/i],
  ['english', /\benglish\s+opening\b/i],
];

/**
 * Get the family id for an ECO code, or null if unmapped.
 */
function getFamilyFromEco(ecoCode) {
  if (!ecoCode || typeof ecoCode !== 'string' || ecoCode.length < 3) return null;

  const code = ecoCode.toUpperCase();
  const letter = code[0];
  const num = parseInt(code.substring(1, 3), 10);
  if (Number.isNaN(num)) return null;

  for (const [start, end, family] of ECO_FAMILY_RANGES) {
    if (letter !== start[0]) continue;
    if (num >= parseInt(start.substring(1), 10) && num <= parseInt(end.substring(1), 10)) {
      return family;
    }
  }
  return null;
}

/**
 * Detect every opening family a video title names, in detector order.
 * Speedrun/compilation titles routinely cover several openings
 * ("Owen's Defense + Ruy Lopez", "Indian, Scandinavian") — callers should
 * treat a video as conflicting only when ALL its families conflict.
 */
function getFamiliesFromTitle(title) {
  if (!title) return [];

  const families = [];
  // Mask each match before trying later detectors, so a compound name's
  // components can't re-fire ("Reversed Sicilian" must not also yield
  // 'sicilian', "Anglo-Scandinavian" must not also yield 'scandinavian').
  let working = title;
  for (const [family, pattern] of TITLE_FAMILY_DETECTORS) {
    if (pattern.test(working)) {
      if (!families.includes(family)) {
        families.push(family);
      }
      working = working.replace(new RegExp(pattern.source, `${pattern.flags}g`), ' ');
    }
  }
  return families;
}

/**
 * Detect the most specific opening family a video title names, or null.
 */
function getFamilyFromTitle(title) {
  const families = getFamiliesFromTitle(title);
  return families.length > 0 ? families[0] : null;
}

/**
 * Compare two families by their defining move prefixes.
 *
 * @returns 'same' | 'compatible' | 'conflict'
 *   - same: identical family
 *   - compatible: one move prefix is a prefix of the other (related lines)
 *   - conflict: the move sequences diverge — cannot be the same opening
 */
function compareFamilies(familyA, familyB) {
  if (!familyA || !familyB) return 'compatible';
  if (familyA === familyB) return 'same';

  const prefixA = FAMILY_MOVE_PREFIXES[familyA];
  const prefixB = FAMILY_MOVE_PREFIXES[familyB];
  if (!prefixA || !prefixB) return 'compatible';

  const overlap = Math.min(prefixA.length, prefixB.length);
  for (let i = 0; i < overlap; i++) {
    if (prefixA[i] !== prefixB[i]) return 'conflict';
  }
  return 'compatible';
}

module.exports = {
  ECO_FAMILY_RANGES,
  FAMILY_MOVE_PREFIXES,
  TITLE_FAMILY_DETECTORS,
  getFamilyFromEco,
  getFamilyFromTitle,
  getFamiliesFromTitle,
  compareFamilies,
};
