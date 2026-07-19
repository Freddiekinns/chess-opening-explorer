/**
 * Shared opening-book presentation helpers, used by the desktop
 * OpeningNavigator and the mobile data surface so both render the same
 * move lists from the same rules.
 */

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}

/** Strip move numbers like "1. ", "1... ", "12." from a move string */
export function stripMoveNumber(move: string): string {
  return move.replace(/^\d+\.+\s*/, '').trim();
}

/** Get the move number prefix for display (e.g. "1." or "2...") */
export function getMoveNumber(plyIndex: number): string {
  const moveNum = Math.floor(plyIndex / 2) + 1;
  const isBlack = plyIndex % 2 === 1;
  return isBlack ? `${moveNum}...` : `${moveNum}.`;
}

/**
 * Plies played to reach a position, read straight from the FEN (side to move
 * + fullmove number). The tree's ancestors array is one node per ply but has
 * been observed one short of the true ply, so the FEN is the source of
 * truth; callers fall back to the ancestors count for malformed FENs.
 */
export function pliesFromFen(fen: string): number | null {
  const parts = fen.trim().split(/\s+/);
  if (parts.length < 6) return null;
  const side = parts[1];
  const fullmove = parseInt(parts[5], 10);
  if (!Number.isFinite(fullmove) || fullmove < 1 || (side !== 'w' && side !== 'b')) return null;
  return (fullmove - 1) * 2 + (side === 'b' ? 1 : 0);
}

export function sortNodesByPopularity<
  T extends { name: string; move: string; gamesPlayed?: number; descendantCount?: number },
>(nodes: T[], getCount: (node: T) => number): T[] {
  return [...nodes].sort((left, right) => {
    const countDelta = getCount(right) - getCount(left);
    if (countDelta !== 0) {
      return countDelta;
    }

    const nameDelta = left.name.localeCompare(right.name);
    if (nameDelta !== 0) {
      return nameDelta;
    }

    return left.move.localeCompare(right.move);
  });
}

/** Deduplicate ancestor breadcrumbs — collapse consecutive ancestors with the same name */
export function deduplicateAncestors(
  ancestors: { fen: string; name: string; move: string }[]
): { fen: string; name: string; move: string }[] {
  const result: { fen: string; name: string; move: string }[] = [];
  for (const ancestor of ancestors) {
    if (result.length === 0 || result[result.length - 1].name !== ancestor.name) {
      result.push(ancestor);
    } else {
      // Same name — keep the later one (deeper position)
      result[result.length - 1] = ancestor;
    }
  }
  return result;
}
