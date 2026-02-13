/**
 * PGN parsing and opening matching
 * Splits multi-chapter PGN, generates FENs, matches against ECO database
 *
 * Logic ported from packages/shared/src/utils/pgn-utils.ts (ESM)
 * to CommonJS for use in pipeline tools
 */

const { Chess } = require('chess.js');
const fs = require('fs');
const path = require('path');

/**
 * Split a multi-chapter PGN into individual chapters
 * Lichess study PGN contains all chapters separated by headers
 *
 * @param {string} pgnText - Full PGN text from a Lichess study
 * @returns {Array<{chapterId: string|null, chapterName: string, studyId: string|null, pgn: string}>}
 */
function splitPGNIntoChapters(pgnText) {
  if (!pgnText || typeof pgnText !== 'string') {
    return [];
  }

  // Split on [Event "..."] headers - each one starts a new chapter
  // Use a regex that matches the [Event line and captures subsequent content
  const chapters = [];
  const chapterBlocks = pgnText.split(/(?=\[Event\s)/);

  for (const block of chapterBlocks) {
    const trimmed = block.trim();
    if (!trimmed || !trimmed.startsWith('[Event')) {
      continue;
    }

    const chapterName = extractHeader(trimmed, 'Event') || 'Untitled';
    // Lichess PGN exports include the chapter URL in either [Site] or [ChapterURL]
    const siteUrl = extractHeader(trimmed, 'Site') || '';
    const chapterUrl = extractHeader(trimmed, 'ChapterURL') || '';

    // Extract studyId and chapterId from Site or ChapterURL
    // Format: https://lichess.org/study/{studyId}/{chapterId}
    let studyId = null;
    let chapterId = null;
    const urlToMatch = siteUrl || chapterUrl;
    const siteMatch = urlToMatch.match(/lichess\.org\/study\/([^/]+)\/([^/\s"]+)/);
    if (siteMatch) {
      studyId = siteMatch[1];
      chapterId = siteMatch[2];
    }

    chapters.push({
      chapterId,
      chapterName,
      studyId,
      pgn: trimmed
    });
  }

  return chapters;
}

/**
 * Extract a PGN header value
 * @param {string} pgn
 * @param {string} headerName
 * @returns {string|null}
 */
function extractHeader(pgn, headerName) {
  const regex = new RegExp(`\\[${headerName}\\s+"([^"]*)"\\]`);
  const match = pgn.match(regex);
  return match ? match[1] : null;
}

/**
 * Extract move text from PGN, stripping headers, comments, and result markers
 * Ported from packages/shared/src/utils/pgn-utils.ts:extractMoveText
 *
 * @param {string} pgnText
 * @returns {string}
 */
function extractMoveText(pgnText) {
  if (!pgnText || typeof pgnText !== 'string') {
    return '';
  }

  let text = pgnText.trim();

  // Remove PGN headers
  text = text.replace(/^\s*\[[^\]]*\]\s*$/gm, '');

  // Remove comments in curly braces
  text = text.replace(/\{[^}]*\}/g, '');

  // Remove semicolon comments
  text = text.replace(/;[^\n]*/g, '');

  // Remove NAG (Numeric Annotation Glyph)
  text = text.replace(/\$\d+/g, '');

  // Remove result markers
  text = text.replace(/\s*(1-0|0-1|1\/2-1\/2|\*)\s*$/g, '');

  // Remove variations (parentheses) - handle nested
  let prevText = '';
  while (prevText !== text) {
    prevText = text;
    text = text.replace(/\([^()]*\)/g, '');
  }

  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Generate an array of FEN positions from PGN by replaying moves
 * Ported from packages/shared/src/utils/pgn-utils.ts:generateFENsFromPGN
 *
 * @param {string} pgnText
 * @returns {string[]} Array of FEN strings, one per move
 */
function generateFENsFromPGN(pgnText) {
  if (!pgnText || typeof pgnText !== 'string') {
    return [];
  }

  const moveText = extractMoveText(pgnText);
  if (!moveText) {
    return [];
  }

  const chess = new Chess();
  const fens = [];

  // Parse individual moves
  const movePattern = /([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?|O-O-O|O-O)(?:\+|#)?/gi;
  const moves = moveText.match(movePattern);

  if (!moves || moves.length === 0) {
    return [];
  }

  for (const move of moves) {
    try {
      const result = chess.move(move);
      if (result) {
        fens.push(chess.fen());
      } else {
        break;
      }
    } catch {
      break;
    }
  }

  return fens;
}

/**
 * Normalize a FEN for matching - strip halfmove and fullmove counters
 * Uses first 4 parts: position, turn, castling, en passant
 *
 * @param {string} fen
 * @returns {string}
 */
function normalizeFEN(fen) {
  const parts = fen.split(' ');
  return parts.slice(0, 4).join(' ');
}

/**
 * Match an array of FENs against an ECO index, returning the deepest match
 * The deepest match is the FEN furthest into the line that matches a known opening
 *
 * @param {string[]} fens - Array of FENs from replaying a chapter
 * @param {Map<string, object>} ecoIndex - Normalized FEN -> opening data
 * @returns {{fen: string, name: string, eco: string, matchedAtMove: number}|null}
 */
function matchFENsToOpenings(fens, ecoIndex) {
  if (!fens || fens.length === 0) {
    return null;
  }

  // Search backwards from last position to find the deepest match
  for (let i = fens.length - 1; i >= 0; i--) {
    const normalizedFen = normalizeFEN(fens[i]);
    const opening = ecoIndex.get(normalizedFen);

    if (opening) {
      return {
        fen: opening.fen || fens[i],
        name: opening.name,
        eco: opening.eco,
        matchedAtMove: i + 1
      };
    }
  }

  return null;
}

/**
 * Load and merge ECO data files into a normalized FEN lookup Map
 *
 * @param {string} [ecoDir] - Path to ECO directory (defaults to api/data/eco)
 * @returns {Map<string, {fen: string, name: string, eco: string}>}
 */
function loadECOIndex(ecoDir) {
  const defaultDir = path.join(process.cwd(), 'api', 'data', 'eco');
  const dir = ecoDir || defaultDir;

  const ecoFiles = ['ecoA.json', 'ecoB.json', 'ecoC.json', 'ecoD.json', 'ecoE.json'];
  const index = new Map();

  for (const file of ecoFiles) {
    const filePath = path.join(dir, file);
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    for (const [fen, opening] of Object.entries(data)) {
      const normalizedFen = normalizeFEN(fen);
      index.set(normalizedFen, {
        fen,
        name: opening.name,
        eco: opening.eco
      });
    }
  }

  return index;
}

module.exports = {
  splitPGNIntoChapters,
  extractHeader,
  extractMoveText,
  generateFENsFromPGN,
  normalizeFEN,
  matchFENsToOpenings,
  loadECOIndex
};
