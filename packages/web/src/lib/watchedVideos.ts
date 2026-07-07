/**
 * Watched-video tracking (video experience review V3) — localStorage only,
 * no account required. Stores id -> timestamp so the map can be pruned
 * oldest-first when it grows past the cap.
 */

const STORAGE_KEY = 'openingbook:watched-videos';
const MAX_ENTRIES = 500;

type WatchedMap = Record<string, number>;

function readMap(): WatchedMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed && typeof parsed === 'object' ? (parsed as WatchedMap) : {};
  } catch {
    return {};
  }
}

function writeMap(map: WatchedMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Storage full or unavailable — watched state is best-effort.
  }
}

export function isVideoWatched(videoId: string): boolean {
  if (!videoId) return false;
  return Boolean(readMap()[videoId]);
}

export function markVideoWatched(videoId: string): void {
  if (!videoId) return;
  const map = readMap();
  map[videoId] = Date.now();

  const ids = Object.keys(map);
  if (ids.length > MAX_ENTRIES) {
    ids
      .sort((a, b) => map[a] - map[b])
      .slice(0, ids.length - MAX_ENTRIES)
      .forEach((id) => delete map[id]);
  }

  writeMap(map);
}
