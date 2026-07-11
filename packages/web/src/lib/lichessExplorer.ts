/**
 * Lichess opening-explorer client (deviation-trainer PRD §5.3).
 *
 * Normalises the /masters and /lichess endpoints into one shape, with a
 * two-layer cache: an in-memory session map plus a localStorage map keyed
 * `${band}|${fen}` (TTL 7 days for masters, 24 h for lichess bands;
 * LRU-capped at 200 entries). Only public FENs are ever sent to Lichess.
 */

const EXPLORER_BASE = 'https://explorer.lichess.ovh';
const STORAGE_KEY = 'openingbook:explorer-cache';
const MAX_CACHE_ENTRIES = 200;
const MASTERS_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const LICHESS_TTL_MS = 24 * 60 * 60 * 1000;
const SPEEDS = 'blitz,rapid,classical';
const MAX_MOVES = 12;
const MAX_TOP_GAMES = 15;
const NOTABLE_GAMES_CAP = 5;

export const BANDS = [
  { id: 'masters', label: 'Masters', ratings: null },
  { id: '2200', label: '2200+', ratings: '2200,2500' },
  { id: '1800', label: '1800–2200', ratings: '1800,2000' },
  { id: '1400', label: '1400–1800', ratings: '1400,1600' },
  { id: 'u1400', label: 'Under 1400', ratings: '0,1000,1200' },
] as const;

export type BandId = (typeof BANDS)[number]['id'];

export interface ExplorerMove {
  san: string;
  games: number;
  whitePct: number;
  drawPct: number;
  blackPct: number;
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
  const bandDef = BANDS.find((b) => b.id === band);
  if (!bandDef) throw new ExplorerError(`Unknown band: ${band}`);
  if (bandDef.ratings === null) {
    return `${EXPLORER_BASE}/masters?fen=${encodeURIComponent(fen)}&moves=${MAX_MOVES}&topGames=${MAX_TOP_GAMES}`;
  }
  return (
    `${EXPLORER_BASE}/lichess?variant=standard` +
    `&speeds=${encodeURIComponent(SPEEDS)}` +
    `&ratings=${encodeURIComponent(bandDef.ratings)}` +
    `&fen=${encodeURIComponent(fen)}&moves=${MAX_MOVES}&topGames=0&recentGames=0`
  );
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
      return {
        san: typeof m?.san === 'string' ? m.san : '',
        games,
        whitePct: games ? (w / games) * 100 : 0,
        drawPct: games ? (d / games) * 100 : 0,
        blackPct: games ? (b / games) * 100 : 0,
      };
    })
    .filter((m) => m.san !== '');

  const topGames: ExplorerTopGame[] = (Array.isArray(payload.topGames) ? payload.topGames : [])
    .slice(0, MAX_TOP_GAMES)
    .map((g) => ({
      id: typeof g?.id === 'string' ? g.id : '',
      white: {
        name: typeof g?.white?.name === 'string' ? g.white.name : '',
        rating: toCount(g?.white?.rating) || 0,
      },
      black: {
        name: typeof g?.black?.name === 'string' ? g.black.name : '',
        rating: toCount(g?.black?.rating) || 0,
      },
      winner: g?.winner === 'white' || g?.winner === 'black' ? g.winner : null,
      year: typeof g?.year === 'number' ? g.year : null,
    }))
    .filter((g) => g.id !== '');

  return { totalGames: white + draws + black, white, draws, black, moves, topGames };
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
