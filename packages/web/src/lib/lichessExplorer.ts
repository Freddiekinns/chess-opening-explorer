/**
 * Lichess opening-explorer client (deviation-trainer PRD §5.3).
 *
 * Fetches through our own /api/explorer proxy — since March 2026 the Lichess
 * explorer rejects anonymous requests, so the server attaches its API token
 * (packages/api/src/routes/explorer.routes.js) and the CDN caches responses.
 * Normalises masters and club-band payloads into one shape, with a two-layer
 * cache: an in-memory session map plus a localStorage map keyed
 * `${band}|${fen}` (TTL 7 days for masters, 24 h for lichess bands;
 * LRU-capped at 200 entries). Only public FENs are ever sent.
 */

const STORAGE_KEY = 'openingbook:explorer-cache';
const MAX_CACHE_ENTRIES = 200;
const MASTERS_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const LICHESS_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_MOVES = 12;
const MAX_TOP_GAMES = 15;
const NOTABLE_GAMES_CAP = 5;

/**
 * Level bands: learner-facing names first, Lichess Elo ranges as secondary
 * detail (tooltips, source lines) — most visitors don't know what a Lichess
 * 1400 means, but everyone knows what "Intermediate" means. Ids are stable
 * (they key localStorage and the proxy's band→rating mapping); only labels
 * are presentational.
 */
export const BANDS = [
  { id: 'u1400', label: 'Beginner', range: 'under 1400' },
  { id: '1400', label: 'Intermediate', range: '1400–1800' },
  { id: '1800', label: 'Advanced', range: '1800–2200' },
  { id: '2200', label: 'Expert', range: '2200+' },
  { id: 'masters', label: 'Masters', range: null },
] as const;

export type BandId = (typeof BANDS)[number]['id'];
export type Band = (typeof BANDS)[number];

export function getBand(id: BandId): Band {
  return BANDS.find((band) => band.id === id) ?? BANDS[0];
}

/** Hover/aria detail for a band pill — where the games come from. */
export function bandTooltip(band: Band): string {
  return band.range ? `Lichess games, ratings ${band.range}` : 'Over-the-board master games';
}

export interface ExplorerMove {
  san: string;
  games: number;
  whitePct: number;
  drawPct: number;
  blackPct: number;
  /** Average player Elo for this move, when the explorer reports it. */
  averageRating?: number;
}

export interface ExplorerTopGame {
  id: string;
  white: { name: string; rating: number };
  black: { name: string; rating: number };
  winner: 'white' | 'black' | null;
  year: number | null;
}

export interface ExplorerResult {
  totalGames: number;
  white: number;
  draws: number;
  black: number;
  moves: ExplorerMove[];
  topGames: ExplorerTopGame[];
  /**
   * Games-weighted average player Elo across the returned moves, or null when
   * the explorer reports no ratings. A real position-level figure — the
   * Lichess explorer has no top-level average, so we derive it from the moves.
   */
  averageRating: number | null;
}

export class ExplorerError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ExplorerError';
    this.status = status;
  }
}

export function buildExplorerUrl(fen: string, band: BandId): string {
  if (!BANDS.some((b) => b.id === band)) throw new ExplorerError(`Unknown band: ${band}`);
  return `/api/explorer?fen=${encodeURIComponent(fen)}&band=${encodeURIComponent(band)}`;
}

type CacheEntry = { t: number; u: number; d: ExplorerResult };
type CacheMap = Record<string, CacheEntry>;

let memoryCache = new Map<string, ExplorerResult>();
let inFlight = new Map<string, Promise<ExplorerResult>>();

function readStorage(): CacheMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? (parsed as CacheMap) : {};
  } catch {
    return {};
  }
}

function writeStorage(map: CacheMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Storage full or unavailable — the cache is best-effort.
  }
}

function ttlFor(band: BandId): number {
  return band === 'masters' ? MASTERS_TTL_MS : LICHESS_TTL_MS;
}

function readCache(key: string, band: BandId): ExplorerResult | null {
  const memory = memoryCache.get(key);
  if (memory) return memory;

  const map = readStorage();
  const entry = map[key];
  if (!entry || typeof entry.t !== 'number') return null;
  if (Date.now() - entry.t > ttlFor(band)) return null;

  entry.u = Date.now();
  writeStorage(map);
  memoryCache.set(key, entry.d);
  return entry.d;
}

function writeCache(key: string, result: ExplorerResult): void {
  memoryCache.set(key, result);
  const map = readStorage();
  map[key] = { t: Date.now(), u: Date.now(), d: result };

  const keys = Object.keys(map);
  if (keys.length > MAX_CACHE_ENTRIES) {
    keys
      .sort((a, b) => (map[a].u || 0) - (map[b].u || 0))
      .slice(0, keys.length - MAX_CACHE_ENTRIES)
      .forEach((k) => delete map[k]);
  }
  writeStorage(map);
}

function toCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : NaN;
}

interface RawMove {
  san?: unknown;
  white?: unknown;
  draws?: unknown;
  black?: unknown;
  averageRating?: unknown;
}

interface RawGame {
  id?: unknown;
  winner?: unknown;
  white?: { name?: unknown; rating?: unknown };
  black?: { name?: unknown; rating?: unknown };
  year?: unknown;
}

function normalise(raw: unknown): ExplorerResult {
  const payload = raw as {
    white?: unknown;
    draws?: unknown;
    black?: unknown;
    moves?: RawMove[];
    topGames?: RawGame[];
  };
  const white = toCount(payload?.white);
  const draws = toCount(payload?.draws);
  const black = toCount(payload?.black);
  if ([white, draws, black].some(Number.isNaN)) {
    throw new ExplorerError('Malformed explorer payload');
  }

  const moves: ExplorerMove[] = (Array.isArray(payload.moves) ? payload.moves : [])
    .slice(0, MAX_MOVES)
    .map((m) => {
      const w = toCount(m?.white) || 0;
      const d = toCount(m?.draws) || 0;
      const b = toCount(m?.black) || 0;
      const games = w + d + b;
      const rating = toCount(m?.averageRating);
      return {
        san: typeof m?.san === 'string' ? m.san : '',
        games,
        whitePct: games ? (w / games) * 100 : 0,
        drawPct: games ? (d / games) * 100 : 0,
        blackPct: games ? (b / games) * 100 : 0,
        ...(Number.isFinite(rating) ? { averageRating: rating } : {}),
      };
    })
    .filter((m) => m.san !== '');

  const topGames: ExplorerTopGame[] = (Array.isArray(payload.topGames) ? payload.topGames : [])
    .slice(0, MAX_TOP_GAMES)
    .map((g) => {
      const winner: 'white' | 'black' | null =
        g?.winner === 'white' ? 'white' : g?.winner === 'black' ? 'black' : null;
      return {
        id: typeof g?.id === 'string' ? g.id : '',
        white: {
          name: typeof g?.white?.name === 'string' ? g.white.name : '',
          rating: toCount(g?.white?.rating) || 0,
        },
        black: {
          name: typeof g?.black?.name === 'string' ? g.black.name : '',
          rating: toCount(g?.black?.rating) || 0,
        },
        winner,
        year: typeof g?.year === 'number' ? g.year : null,
      };
    })
    .filter((g) => g.id !== '');

  // Position-level average Elo: games-weighted mean over moves that carry a
  // rating. The explorer gives no top-level average, so derive it here.
  let ratingWeight = 0;
  let ratingSum = 0;
  for (const move of moves) {
    if (move.averageRating !== undefined && move.games > 0) {
      ratingWeight += move.games;
      ratingSum += move.averageRating * move.games;
    }
  }
  const averageRating = ratingWeight > 0 ? Math.round(ratingSum / ratingWeight) : null;

  return { totalGames: white + draws + black, white, draws, black, moves, topGames, averageRating };
}

export async function fetchExplorer(fen: string, band: BandId): Promise<ExplorerResult> {
  const trimmedFen = fen.trim();
  if (!trimmedFen) throw new ExplorerError('Missing FEN');

  const key = `${band}|${trimmedFen}`;
  const cached = readCache(key, band);
  if (cached) return cached;

  const pending = inFlight.get(key);
  if (pending) return pending;

  const request = (async () => {
    const response = await fetch(buildExplorerUrl(trimmedFen, band));
    if (!response.ok) {
      throw new ExplorerError(`Explorer request failed (${response.status})`, response.status);
    }
    const result = normalise(await response.json());
    writeCache(key, result);
    return result;
  })();

  inFlight.set(key, request);
  try {
    return await request;
  } finally {
    inFlight.delete(key);
  }
}

/**
 * Points percentage for a side: wins plus half of draws — the chess scoring
 * convention behind "White scores 56% here".
 */
export function sideScorePct(result: ExplorerResult, side: 'w' | 'b'): number {
  if (!result.totalGames) return 0;
  const wins = side === 'w' ? result.white : result.black;
  return ((wins + result.draws / 2) / result.totalGames) * 100;
}

/**
 * Notable-games ranking (PRD §5.2): average rating descending, max one game
 * per player so a prolific super-GM doesn't fill the list, capped at 5.
 */
export function rankNotableGames(
  games: ExplorerTopGame[],
  cap: number = NOTABLE_GAMES_CAP
): ExplorerTopGame[] {
  const seenPlayers = new Set<string>();
  return [...games]
    .sort((a, b) => (b.white.rating + b.black.rating) / 2 - (a.white.rating + a.black.rating) / 2)
    .filter((game) => {
      if (seenPlayers.has(game.white.name) || seenPlayers.has(game.black.name)) return false;
      seenPlayers.add(game.white.name);
      seenPlayers.add(game.black.name);
      return true;
    })
    .slice(0, cap);
}

/** Test hook: clear the in-memory caches (and optionally keep localStorage). */
export function __resetExplorerCacheForTests(opts?: { keepLocalStorage?: boolean }): void {
  memoryCache = new Map();
  inFlight = new Map();
  if (!opts?.keepLocalStorage) {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
