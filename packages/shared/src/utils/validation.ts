/**
 * Validation utilities for chess data
 */

import type { ChessOpening, ECOCode, ComplexityLevel } from '../types/chess.js';

// FEN validation
export function isValidFEN(fen: string): boolean {
  if (!fen || typeof fen !== 'string') {
    return false;
  }

  const parts = fen.trim().split(' ');
  if (parts.length !== 6) {
    return false;
  }

  // Basic FEN structure validation
  const [position, turn, castling, enPassant, halfmove, fullmove] = parts;

  // Validate position part
  const ranks = position.split('/');
  if (ranks.length !== 8) {
    return false;
  }

  // Validate turn
  if (turn !== 'w' && turn !== 'b') {
    return false;
  }

  // Validate castling
  if (!/^[KQkq-]*$/.test(castling)) {
    return false;
  }

  // Validate en passant
  if (enPassant !== '-' && !/^[a-h][36]$/.test(enPassant)) {
    return false;
  }

  // Validate move numbers
  const halfmoveNum = parseInt(halfmove, 10);
  const fullmoveNum = parseInt(fullmove, 10);
  
  if (isNaN(halfmoveNum) || isNaN(fullmoveNum) || halfmoveNum < 0 || fullmoveNum < 1) {
    return false;
  }

  return true;
}

// ECO code validation
export function isValidECO(eco: string): eco is ECOCode {
  return /^[A-E][0-9]{2}$/.test(eco);
}

// Complexity level validation
export function isValidComplexity(complexity: string): complexity is ComplexityLevel {
  return ['Beginner', 'Intermediate', 'Advanced', 'Expert'].includes(complexity);
}

// Opening data validation
export function validateOpening(opening: Partial<ChessOpening>): string[] {
  const errors: string[] = [];

  if (!opening.fen) {
    errors.push('FEN is required');
  } else if (!isValidFEN(opening.fen)) {
    errors.push('Invalid FEN format');
  }

  if (!opening.eco) {
    errors.push('ECO code is required');
  } else if (!isValidECO(opening.eco)) {
    errors.push('Invalid ECO code format');
  }

  if (!opening.name) {
    errors.push('Opening name is required');
  }

  if (!opening.moves) {
    errors.push('Moves are required');
  }

  if (opening.isEcoRoot === undefined) {
    errors.push('isEcoRoot flag is required');
  }

  return errors;
}

// URL validation
export function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// Search query sanitization
export function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== 'string') {
    return '';
  }
  
  return query
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .slice(0, 100); // Limit length
}

// Safe string parsing
export function safeParseJSON<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}
