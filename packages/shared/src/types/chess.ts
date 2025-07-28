/**
 * Chess-related type definitions
 */

// ECO (Encyclopedia of Chess Openings) codes
export type ECOCode = string;

// Chess piece types
export type PieceType = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king';
export type PieceColor = 'white' | 'black';

// Chess position representation
export interface ChessPosition {
  fen: string;
  turn: PieceColor;
  castling: string;
  enPassant: string | null;
  halfmove: number;
  fullmove: number;
}

// Chess opening data structure
export interface ChessOpening {
  fen: string;
  eco: ECOCode;
  name: string;
  moves: string;
  isEcoRoot: boolean;
  analysis?: OpeningAnalysis;
}

// Opening analysis structure
export interface OpeningAnalysis {
  description?: string;
  complexity?: ComplexityLevel;
  styleTags?: string[];
  courses?: CourseRecommendation[];
  videos?: VideoRecommendation[];
}

// Complexity levels
export type ComplexityLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

// Resource recommendations
export interface BookRecommendation {
  title: string;
  author: string;
  publisher?: string;
  isbn?: string;
  url?: string;
  level: ComplexityLevel;
}

export interface CourseRecommendation {
  title: string;
  author: string;
  platform: string;
  url: string;
  level: ComplexityLevel;
}

export interface VideoRecommendation {
  title: string;
  author: string;
  platform: 'YouTube' | 'Twitch' | 'Other';
  url: string;
  duration?: number;
}

// Search and filtering types
export interface SearchFilters {
  complexity?: ComplexityLevel;
  eco?: ECOCode;
  tags?: string[];
  hasAnalysis?: boolean;
}

export interface SearchResult {
  openings: ChessOpening[];
  total: number;
  page: number;
  limit: number;
}

// API response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Error types
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
