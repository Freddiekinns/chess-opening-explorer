/**
 * Analysis data structure for LLM-enriched opening metadata
 * Location: packages/shared/src/types/analysis.ts
 */

export interface Analysis {
  version: string;
  description: string;
  style_tags: string[];
  complexity: 'Beginner' | 'Intermediate' | 'Advanced';
  strategic_themes: string[];
  common_plans: string[];
  last_enriched_at: string;
  // Additional fields added during implementation:
  tactical_tags?: string[];
  positional_tags?: string[];
  player_style_tags?: string[];
  phase_tags?: string[];
}

// Export type for the JSON string stored in database
export type AnalysisJSON = string;

// Utility type for opening with analysis
export interface OpeningWithAnalysis {
  fen: string;
  eco: string;
  name: string;
  moves: string;
  src: string;
  analysis_json?: AnalysisJSON;
  scid?: string;
  aliases?: Record<string, string>;
}

/**
 * Popularity statistics for chess openings based on Lichess data
 * Feature 1.5: Game Data Popularity Analysis
 */
export interface PopularityStats {
  popularity_score: number;        // 1-10 scale (0 for zero games)
  frequency_count: number;         // Raw count from all sources
  white_win_rate?: number;         // 0-1 (if sufficient data)
  black_win_rate?: number;         // 0-1 (if sufficient data)
  draw_rate?: number;              // 0-1 (if sufficient data)
  games_analyzed: number;          // Total games found
  avg_rating?: number;             // Average player rating
  confidence_score: number;        // Statistical confidence (0-1)
  analysis_date: string;           // ISO date string
}

/**
 * API response for popularity statistics
 */
export interface PopularityStatsResponse {
  success: boolean;
  data: PopularityStats;
  message?: string;
  error?: string;
}
