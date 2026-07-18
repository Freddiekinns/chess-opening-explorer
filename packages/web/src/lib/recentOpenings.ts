/**
 * Recently viewed openings (mobile search overlay, design 2a): the empty
 * search state answers "where was I?" before the user types. Stored in
 * localStorage, newest first, deduped by FEN. Storage failures degrade to
 * an empty list — recents are a convenience, never load-bearing.
 */

const STORAGE_KEY = 'chess-recent-openings';
const MAX_STORED = 8;

export interface RecentOpening {
  fen: string;
  name: string;
  eco: string;
  moves: string;
  viewedAt: number;
}

export function getRecentOpenings(): RecentOpening[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentOpening[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordRecentOpening(opening: {
  fen: string;
  name: string;
  eco: string;
  moves: string;
}): void {
  try {
    const next = [
      { ...opening, viewedAt: Date.now() },
      ...getRecentOpenings().filter((entry) => entry.fen !== opening.fen),
    ].slice(0, MAX_STORED);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private browsing / quota — recents simply stay empty.
  }
}
