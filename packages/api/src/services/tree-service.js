const ECOService = require('./eco-service');
const { getGlobalCache } = require('./cache-service');

class TreeService {
  constructor() {
    this.ecoService = new ECOService();
    this.cache = getGlobalCache();
  }

  /**
   * Build the move index and children map from ECO data.
   * Cached for 1 hour (same TTL as eco-data).
   */
  _buildIndex() {
    return this.cache.getOrSet(
      'tree-index',
      () => {
        const ecoData = this.ecoService.loadECOData();

        // moveIndex: normalizedMoves → { fen, name, eco, moves, isEcoRoot }
        const moveIndex = new Map();
        // childrenMap: parentMoves → [childEntry, ...]
        const childrenMap = new Map();
        // descendantCount: moves → number of descendants
        const descendantCount = new Map();

        // First pass: populate moveIndex
        for (const [fen, opening] of Object.entries(ecoData)) {
          const moves = opening.moves || '';
          const normalized = this._normalizeMoves(moves);

          // Some FENs may map to the same moves; prefer isEcoRoot or first seen
          if (!moveIndex.has(normalized) || opening.isEcoRoot) {
            moveIndex.set(normalized, {
              fen,
              name: opening.name,
              eco: opening.eco,
              moves,
              isEcoRoot: opening.isEcoRoot === true,
            });
          }
        }

        // Second pass: build childrenMap
        for (const [normalizedMoves, entry] of moveIndex) {
          const parentMoves = this._getParentMovesNormalized(normalizedMoves);
          if (parentMoves === null) continue; // root opening, no parent

          if (!childrenMap.has(parentMoves)) {
            childrenMap.set(parentMoves, []);
          }
          childrenMap.get(parentMoves).push(entry);
        }

        // Third pass: count descendants (bottom-up via memoization)
        const countDescendants = (normalizedMoves) => {
          if (descendantCount.has(normalizedMoves)) {
            return descendantCount.get(normalizedMoves);
          }
          const children = childrenMap.get(normalizedMoves) || [];
          let count = children.length;
          for (const child of children) {
            count += countDescendants(this._normalizeMoves(child.moves));
          }
          descendantCount.set(normalizedMoves, count);
          return count;
        };

        for (const normalizedMoves of moveIndex.keys()) {
          countDescendants(normalizedMoves);
        }

        return { moveIndex, childrenMap, descendantCount };
      },
      3600000
    );
  }

  /**
   * Normalize a moves string for consistent lookup.
   * Handles both "1. e4 c5" and "1.e4 c5" formats.
   */
  _normalizeMoves(movesStr) {
    if (!movesStr) return '';
    return movesStr
      .replace(/(\d+)\.\s*/g, '$1. ') // normalize "1.e4" → "1. e4"
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Parse a moves string into individual tokens (move numbers + moves).
   * "1. e4 c5 2. Nf3" → ["1.", "e4", "c5", "2.", "Nf3"]
   */
  _parseMovesTokens(movesStr) {
    if (!movesStr) return [];
    const normalized = this._normalizeMoves(movesStr);
    return normalized.split(/\s+/).filter((t) => t !== '');
  }

  /**
   * Get the parent moves string by removing the last move token.
   * Works on normalized moves strings.
   * Returns null if there is no parent (root or single move).
   */
  _getParentMovesNormalized(normalizedMoves) {
    if (!normalizedMoves) return null;
    const tokens = normalizedMoves.split(/\s+/).filter((t) => t !== '');
    if (tokens.length === 0) return null;

    // Remove last token (which is a move like "e4" or "c5")
    tokens.pop();

    // If the last remaining token is a move number (e.g. "2."), also remove it
    // because "1. e4 c5 2." is not meaningful
    if (tokens.length > 0 && /^\d+\.$/.test(tokens[tokens.length - 1])) {
      tokens.pop();
    }

    if (tokens.length === 0) return null;
    return tokens.join(' ');
  }

  /**
   * Get the parent moves string from a raw moves string.
   */
  _getParentMoves(movesStr) {
    return this._getParentMovesNormalized(this._normalizeMoves(movesStr));
  }

  /**
   * Extract the last move for display purposes.
   * "1. e4 c5 2. Nf3 d6 3. d4" → "3. d4"
   * "1. e4 c5" → "1...c5"
   */
  _getLastMoveDisplay(movesStr) {
    const tokens = this._parseMovesTokens(movesStr);
    if (tokens.length === 0) return '';

    // Find the last actual move (non-number token)
    let lastMove = '';
    let lastMoveNum = '';

    for (let i = tokens.length - 1; i >= 0; i--) {
      if (/^\d+\.$/.test(tokens[i])) {
        lastMoveNum = tokens[i];
        break;
      }
      if (!lastMove) {
        lastMove = tokens[i];
      }
    }

    if (!lastMoveNum) return lastMove;

    // Determine if it's a white or black move
    // Count non-number tokens after the move number
    const moveNumIndex = tokens.lastIndexOf(lastMoveNum);
    const movesAfterNum = tokens.slice(moveNumIndex + 1);

    if (movesAfterNum.length === 1) {
      // White's move: "3. d4"
      return `${lastMoveNum} ${lastMove}`;
    } else {
      // Black's move: "1...c5"
      return `${lastMoveNum.replace('.', '...')}${lastMove}`;
    }
  }

  /**
   * Format a tree node for API response.
   * @param {object} entry - opening entry from moveIndex
   * @param {Map} descendantCount - pre-computed descendant counts
   * @param {Map} childrenMap - pre-computed children map
   */
  _formatNode(entry, descendantCount, childrenMap) {
    const normalizedMoves = this._normalizeMoves(entry.moves);
    const hasChildren = (childrenMap.get(normalizedMoves) || []).length > 0;

    return {
      fen: entry.fen,
      name: entry.name,
      eco: entry.eco,
      move: this._getLastMoveDisplay(entry.moves),
      moves: entry.moves,
      descendantCount: descendantCount.get(normalizedMoves) || 0,
      hasChildren,
    };
  }

  /**
   * Get the full tree context for a given FEN.
   * Returns ancestors (named openings only), siblings, children.
   */
  getTreeContext(fen) {
    const { moveIndex, childrenMap, descendantCount } = this._buildIndex();

    // Find current opening by FEN
    const ecoData = this.ecoService.loadECOData();
    const opening = ecoData[fen];
    if (!opening) return null;

    const currentMoves = this._normalizeMoves(opening.moves || '');
    const currentEntry = moveIndex.get(currentMoves);
    if (!currentEntry) return null;

    // Build ancestor chain: walk up, collecting all named intermediates
    const ancestors = [];
    let walkMoves = currentMoves;

    while (true) {
      const parentMoves = this._getParentMovesNormalized(walkMoves);
      if (parentMoves === null) break;

      const parentEntry = moveIndex.get(parentMoves);
      if (parentEntry) {
        // This is a named opening — include it as an ancestor
        const parentNode = this._formatNode(parentEntry, descendantCount, childrenMap);

        // Get siblings of this ancestor (other children of its parent)
        const grandparentMoves = this._getParentMovesNormalized(parentMoves);
        const siblingEntries =
          grandparentMoves !== null ? childrenMap.get(grandparentMoves) || [] : [];

        parentNode.siblings = siblingEntries
          .filter((s) => this._normalizeMoves(s.moves) !== parentMoves)
          .map((s) => this._formatNode(s, descendantCount, childrenMap));

        ancestors.unshift(parentNode); // prepend so root is first
      }
      walkMoves = parentMoves;
    }

    // Current node
    const current = this._formatNode(currentEntry, descendantCount, childrenMap);

    // Children of current
    const childEntries = childrenMap.get(currentMoves) || [];
    const children = childEntries.map((c) => this._formatNode(c, descendantCount, childrenMap));

    // Siblings of current (other children of current's parent)
    const parentMoves = this._getParentMovesNormalized(currentMoves);
    let siblings = [];
    if (parentMoves !== null) {
      const siblingEntries = childrenMap.get(parentMoves) || [];
      siblings = siblingEntries
        .filter((s) => this._normalizeMoves(s.moves) !== currentMoves)
        .map((s) => this._formatNode(s, descendantCount, childrenMap));
    }

    return { current, ancestors, children, siblings };
  }

  /**
   * Get children of a given FEN (for lazy loading).
   */
  getChildren(fen) {
    const { moveIndex, childrenMap, descendantCount } = this._buildIndex();

    const ecoData = this.ecoService.loadECOData();
    const opening = ecoData[fen];
    if (!opening) return null;

    const normalizedMoves = this._normalizeMoves(opening.moves || '');
    const childEntries = childrenMap.get(normalizedMoves) || [];
    const children = childEntries.map((c) => this._formatNode(c, descendantCount, childrenMap));

    return { children };
  }
}

module.exports = TreeService;
