/**
 * Schema definitions for chess opening data validation
 */

import type { OpeningAnalysis, ComplexityLevel } from '../types/chess.js';

// Database schema for openings table
export const OPENINGS_TABLE_SCHEMA = `
  CREATE TABLE IF NOT EXISTS openings (
    fen TEXT PRIMARY KEY,
    eco TEXT NOT NULL,
    name TEXT NOT NULL,
    moves TEXT NOT NULL,
    isEcoRoot BOOLEAN NOT NULL DEFAULT FALSE,
    analysis_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`;

// Database indexes for performance
export const OPENINGS_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_openings_eco ON openings(eco);',
  'CREATE INDEX IF NOT EXISTS idx_openings_name ON openings(name);',
  'CREATE INDEX IF NOT EXISTS idx_openings_eco_root ON openings(isEcoRoot);',
  'CREATE INDEX IF NOT EXISTS idx_openings_created_at ON openings(created_at);'
];

// JSON schema for opening analysis
export const OPENING_ANALYSIS_SCHEMA = {
  type: 'object',
  properties: {
    description: { type: 'string', maxLength: 2000 },
    complexity: { 
      type: 'string', 
      enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'] 
    },
    styleTags: { 
      type: 'array', 
      items: { type: 'string' },
      maxItems: 10
    },
    books: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', maxLength: 200 },
          author: { type: 'string', maxLength: 100 },
          level: { 
            type: 'string', 
            enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'] 
          },
          url: { type: 'string', format: 'uri' }
        },
        required: ['title', 'author', 'level']
      }
    },
    courses: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', maxLength: 200 },
          author: { type: 'string', maxLength: 100 },
          platform: { type: 'string', maxLength: 50 },
          url: { type: 'string', format: 'uri' },
          level: { 
            type: 'string', 
            enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'] 
          }
        },
        required: ['title', 'author', 'platform', 'url', 'level']
      }
    },
    videos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', maxLength: 200 },
          author: { type: 'string', maxLength: 100 },
          platform: { 
            type: 'string', 
            enum: ['YouTube', 'Twitch', 'Other'] 
          },
          url: { type: 'string', format: 'uri' },
          duration: { type: 'number', minimum: 0 }
        },
        required: ['title', 'author', 'platform', 'url']
      }
    }
  },
  additionalProperties: false
};

// Schema for opening data validation
export const OPENING_SCHEMA = {
  type: 'object',
  properties: {
    fen: { type: 'string', pattern: '^[rnbqkpRNBQKP1-8/\\s]+[wb]\\s[KQkq-]+\\s[a-h][36-]\\s\\d+\\s\\d+$' },
    eco: { type: 'string', pattern: '^[A-E][0-9]{2}$' },
    name: { type: 'string', minLength: 1, maxLength: 200 },
    moves: { type: 'string', minLength: 1, maxLength: 1000 },
    isEcoRoot: { type: 'boolean' },
    analysis: OPENING_ANALYSIS_SCHEMA
  },
  required: ['fen', 'eco', 'name', 'moves', 'isEcoRoot'],
  additionalProperties: false
};

// Default opening analysis structure
export const DEFAULT_OPENING_ANALYSIS: OpeningAnalysis = {
  description: '',
  complexity: 'Intermediate',
  styleTags: [],
  courses: [],
  videos: []
};

// Complexity level order for sorting
export const COMPLEXITY_ORDER: Record<ComplexityLevel, number> = {
  'Beginner': 1,
  'Intermediate': 2,
  'Advanced': 3,
  'Expert': 4
};

// Common style tags
export const COMMON_STYLE_TAGS = [
  'aggressive',
  'positional',
  'tactical',
  'strategic',
  'solid',
  'sharp',
  'gambit',
  'defense',
  'counterattack',
  'development',
  'control',
  'sacrifice'
];

// ECO code ranges
export const ECO_RANGES = {
  A: { start: 'A00', end: 'A99', description: 'Flank openings' },
  B: { start: 'B00', end: 'B99', description: 'Semi-open games' },
  C: { start: 'C00', end: 'C99', description: 'Open games' },
  D: { start: 'D00', end: 'D99', description: 'Closed games' },
  E: { start: 'E00', end: 'E99', description: 'Indian defenses' }
};
