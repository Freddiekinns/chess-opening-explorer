import { isChessMove, isEcoCode } from './searchQuery';

/**
 * Ranking against a locally held slice of the search index.
 *
 * This is not the app's search — the server is, and its answer always wins. All
 * this does is paint something the instant a key lands, on the one surface that
 * happens to be holding an index already (the landing hero, which loads it for
 * its own reasons). Lifted out of `SearchBar` so the component owns rendering
 * and this owns ranking, and so the hook every surface calls can reach it
 * without importing a component.
 */

export interface Opening {
  fen: string;
  name: string;
  eco: string;
  moves: string;
  src: string;
  scid?: string;
  aliases?: Record<string, string>;
  analysis_json?: {
    description?: string;
    style_tags?: string[];
    popularity?: number;
  };
  /** Number of games this opening was played */
  games_analyzed?: number;
  /** Rank based on games_analyzed */
  popularity_rank?: number;
  white_win_rate?: number;
  black_win_rate?: number;
  draw_rate?: number;
  /** Attached by the server so the caller can tell a tie from a clear winner. */
  searchScore?: number;
}

export function findAndRankOpenings(query: string, openingsData: Opening[]): Opening[] {
  const lowerCaseQuery = query.toLowerCase();

  // Handle ECO code searches specially
  if (isEcoCode(query)) {
    const ecoCode = query.trim().toUpperCase();
    return openingsData
      .filter((o) => o.eco.toUpperCase().startsWith(ecoCode))
      .sort((a, b) => (b.games_analyzed || 0) - (a.games_analyzed || 0));
  }

  return openingsData
    .map((opening) => {
      let score = 0;
      const lowerCaseName = (opening.name || '').toLowerCase();
      const moves = (opening.moves || '').toLowerCase();
      const eco = (opening.eco || '').toLowerCase();

      // Move sequence matching (highest priority for move queries)
      if (isChessMove(lowerCaseQuery)) {
        if (moves.startsWith(`1. ${lowerCaseQuery}`) || moves.startsWith(`1.${lowerCaseQuery}`)) {
          score += 1000; // Exact opening move match - highest priority
        } else if (
          moves.startsWith(`1. ${lowerCaseQuery} `) ||
          moves.startsWith(`1.${lowerCaseQuery} `)
        ) {
          score += 950; // Opening move with continuation
        } else if (
          moves.includes(`1... ${lowerCaseQuery}`) ||
          moves.includes(`1...${lowerCaseQuery}`)
        ) {
          score += 800; // Black's first response
        } else if (
          moves.includes(`2. ${lowerCaseQuery}`) ||
          moves.includes(`2.${lowerCaseQuery}`)
        ) {
          score += 700; // White's second move
        } else if (
          moves.includes(`2... ${lowerCaseQuery}`) ||
          moves.includes(`2...${lowerCaseQuery}`)
        ) {
          score += 600; // Black's second move
        } else if (moves.includes(` ${lowerCaseQuery} `) || moves.includes(` ${lowerCaseQuery}.`)) {
          score += 400; // Move appears later in sequence
        } else if (moves.includes(lowerCaseQuery)) {
          score += 200; // Move appears somewhere
        }
      }

      // Name matching (high priority for text queries)
      if (lowerCaseName.startsWith(lowerCaseQuery)) {
        score += 500;
      } else if (lowerCaseName.includes(lowerCaseQuery)) {
        score += 250;
      }

      // Improved fuzzy name matching for common variations
      if (!isChessMove(lowerCaseQuery)) {
        // Handle common search variations
        const queryWords = lowerCaseQuery.split(/\s+/).filter((word) => word.length > 0);
        const nameWords = lowerCaseName.split(/\s+/).filter((word) => word.length > 0);

        // Check if all query words appear in the name (any order)
        const allWordsMatch = queryWords.every((queryWord) =>
          nameWords.some((nameWord) => nameWord.includes(queryWord) || queryWord.includes(nameWord))
        );

        if (allWordsMatch && queryWords.length > 1) {
          score += 400; // Multi-word fuzzy match bonus
        }

        // Handle specific common cases
        if (lowerCaseQuery.includes('kings') && lowerCaseName.includes("king's")) {
          score += 300; // Handle apostrophe variations
        }
        if (lowerCaseQuery.includes('queens') && lowerCaseName.includes("queen's")) {
          score += 300; // Handle apostrophe variations
        }
      }

      // ECO code matching
      if (eco.includes(lowerCaseQuery)) {
        score += 150;
      }

      // Move sequence matching for non-chess notation
      if (!isChessMove(lowerCaseQuery) && moves.includes(lowerCaseQuery)) {
        score += 200;
      }

      // Description matching
      if (opening.analysis_json?.description?.toLowerCase().includes(lowerCaseQuery)) {
        score += 50;
      }

      // Style tags matching
      if (
        opening.analysis_json?.style_tags?.some((tag: string) =>
          tag.toLowerCase().includes(lowerCaseQuery)
        )
      ) {
        score += 25;
      }

      // Popularity boost (more significant for move queries to surface popular openings)
      if (score > 0) {
        const gamesAnalyzed = opening.games_analyzed || 0;
        const analysisPopularity = opening.analysis_json?.popularity || 0;

        // Use games_analyzed if available, otherwise analysis popularity
        const popularity = gamesAnalyzed > 0 ? gamesAnalyzed : analysisPopularity * 1000;

        if (isChessMove(lowerCaseQuery)) {
          // For move queries, give significant popularity boost to surface common openings
          score += Math.min(300, popularity / 100);
        } else {
          // For text queries, smaller popularity boost
          score += Math.min(100, popularity / 500);
        }

        // Extra boost for very popular openings (>10k games)
        if (popularity > 10000) {
          score += 100;
        }
      }

      return { opening, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.opening);
}
