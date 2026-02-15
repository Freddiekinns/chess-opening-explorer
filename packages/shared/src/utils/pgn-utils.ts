/**
 * PGN parsing and opening identification utilities
 */

import { Chess } from 'chess.js';

/**
 * Represents a matched opening from PGN lookup
 */
export interface OpeningMatch {
  fen: string;
  name: string;
  eco: string;
  matchedAtMove: number;
}

/**
 * Result of PGN lookup operation
 */
export interface PGNLookupResult {
  success: boolean;
  error?: string;
  bestMatch: {
    fen: string;
    name: string;
    eco: string;
    matchedAtMove: number;
    isExactEndMatch: boolean;
  } | null;
  lastKnownOpening: OpeningMatch | null;
  totalMoves: number;
}

/**
 * Minimal opening interface for the lookup map
 */
export interface OpeningForLookup {
  fen: string;
  name: string;
  eco: string;
}

/**
 * Extracts move text from PGN, stripping headers, comments, and result markers
 */
export function extractMoveText(pgnText: string): string {
  if (!pgnText || typeof pgnText !== 'string') {
    return '';
  }

  let text = pgnText.trim();

  // Remove PGN headers (lines starting with [ and ending with ])
  text = text.replace(/^\s*\[[^\]]*\]\s*$/gm, '');

  // Remove comments in curly braces (can be multi-line)
  text = text.replace(/\{[^}]*\}/g, '');

  // Remove comments starting with semicolon
  text = text.replace(/;[^\n]*/g, '');

  // Remove NAG (Numeric Annotation Glyph) like $1, $2, etc.
  text = text.replace(/\$\d+/g, '');

  // Remove result markers
  text = text.replace(/\s*(1-0|0-1|1\/2-1\/2|\*)\s*$/g, '');

  // Remove variation markers (parentheses with content)
  // This handles nested variations by iteratively removing them
  let prevText = '';
  while (prevText !== text) {
    prevText = text;
    text = text.replace(/\([^()]*\)/g, '');
  }

  // Collapse multiple whitespace into single spaces
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Validates PGN move text by attempting to play through the moves
 */
export function validatePGN(pgnText: string): { valid: boolean; error?: string } {
  if (!pgnText || typeof pgnText !== 'string') {
    return { valid: false, error: 'PGN text is required' };
  }

  const moveText = extractMoveText(pgnText);

  if (!moveText) {
    return { valid: false, error: 'No moves found in PGN' };
  }

  const chess = new Chess();

  // Parse individual moves from the move text
  // Handles formats like "1. e4 e5 2. Nf3" or "1.e4 e5 2.Nf3" or just "e4 e5 Nf3"
  const movePattern = /([KQRBN]?[a-h]?[1-8]?x?[a-h][1-8](?:=[QRBN])?|O-O-O|O-O)(?:\+|#)?/gi;
  const moves = moveText.match(movePattern);

  if (!moves || moves.length === 0) {
    return { valid: false, error: 'No valid chess moves found' };
  }

  for (const move of moves) {
    try {
      const result = chess.move(move);
      if (!result) {
        return { valid: false, error: `Invalid move: ${move}` };
      }
    } catch {
      return { valid: false, error: `Invalid move: ${move}` };
    }
  }

  return { valid: true };
}

/**
 * Generates an array of FEN positions from PGN, one after each move
 */
export function generateFENsFromPGN(pgnText: string): string[] {
  if (!pgnText || typeof pgnText !== 'string') {
    return [];
  }

  const moveText = extractMoveText(pgnText);

  if (!moveText) {
    return [];
  }

  const chess = new Chess();
  const fens: string[] = [];

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
        // Stop on invalid move
        break;
      }
    } catch {
      // Stop on invalid move
      break;
    }
  }

  return fens;
}

/**
 * Builds a Map of FEN -> Opening for efficient lookup
 * Only uses the position portion of FEN (first part before space)
 * to match regardless of move counters
 */
export function buildOpeningsMap(openings: OpeningForLookup[]): Map<string, OpeningForLookup> {
  const map = new Map<string, OpeningForLookup>();

  for (const opening of openings) {
    if (opening.fen) {
      // Normalize FEN by extracting position part only (up to castling rights)
      // FEN format: position turn castling enpassant halfmove fullmove
      // We use position + turn + castling + enpassant for matching
      const fenParts = opening.fen.split(' ');
      const normalizedFen = fenParts.slice(0, 4).join(' ');
      map.set(normalizedFen, opening);
    }
  }

  return map;
}

/**
 * Normalizes a FEN for lookup (strips move counters)
 */
function normalizeFEN(fen: string): string {
  const parts = fen.split(' ');
  return parts.slice(0, 4).join(' ');
}

/**
 * Finds the deepest matching opening by searching backwards from the last position
 */
export function findDeepestMatch(
  fens: string[],
  openingsMap: Map<string, OpeningForLookup>
): PGNLookupResult {
  if (fens.length === 0) {
    return {
      success: false,
      error: 'No positions to search',
      bestMatch: null,
      lastKnownOpening: null,
      totalMoves: 0,
    };
  }

  // Search backwards from the last position to find the deepest match
  let bestMatch: PGNLookupResult['bestMatch'] = null;
  let lastKnownOpening: OpeningMatch | null = null;

  for (let i = fens.length - 1; i >= 0; i--) {
    const normalizedFen = normalizeFEN(fens[i]);
    const opening = openingsMap.get(normalizedFen);

    if (opening) {
      const match: OpeningMatch = {
        fen: opening.fen,
        name: opening.name,
        eco: opening.eco,
        matchedAtMove: i + 1,
      };

      if (!bestMatch) {
        // This is the deepest match (closest to end of game)
        bestMatch = {
          ...match,
          isExactEndMatch: i === fens.length - 1,
        };
      }

      // Track the last known opening (deepest match)
      if (!lastKnownOpening) {
        lastKnownOpening = match;
      }
    }
  }

  return {
    success: bestMatch !== null,
    bestMatch,
    lastKnownOpening,
    totalMoves: fens.length,
  };
}

/**
 * Processes PGN text and returns the lookup result
 * Convenience function that combines all steps
 */
export function lookupOpeningFromPGN(
  pgnText: string,
  openingsMap: Map<string, OpeningForLookup>
): PGNLookupResult {
  // Validate first
  const validation = validatePGN(pgnText);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
      bestMatch: null,
      lastKnownOpening: null,
      totalMoves: 0,
    };
  }

  // Generate FENs
  const fens = generateFENsFromPGN(pgnText);

  // Find matches
  return findDeepestMatch(fens, openingsMap);
}
