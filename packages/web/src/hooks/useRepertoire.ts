import { useMemo, useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'chess-repertoire';

const subscribers = new Set<() => void>();

let cachedStorageValue: string | null | undefined;
let cachedEntries: RepertoireEntry[] = [];

export interface RepertoireEntry {
  fen: string;
  name: string;
  eco: string;
  moves: string;
  savedAt: number;
  complexity?: string;
  color?: 'white' | 'black';
}

export interface UseRepertoireReturn {
  repertoire: RepertoireEntry[];
  isSaved: (fen: string) => boolean;
  toggle: (opening: {
    fen: string;
    name: string;
    eco: string;
    moves: string;
    complexity?: string;
  }) => void;
  remove: (fen: string) => void;
  count: number;
}

function getRawStorage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function parseEntries(raw: string | null): RepertoireEntry[] {
  if (!raw) return [];

  try {
    return JSON.parse(raw) as RepertoireEntry[];
  } catch {
    return [];
  }
}

function updateCache(raw: string | null, entries?: RepertoireEntry[]): RepertoireEntry[] {
  cachedStorageValue = raw;
  cachedEntries = entries ?? parseEntries(raw);
  return cachedEntries;
}

function getSnapshot(): RepertoireEntry[] {
  const raw = getRawStorage();

  if (raw !== cachedStorageValue) {
    return updateCache(raw);
  }

  return cachedEntries;
}

function notifySubscribers(): void {
  subscribers.forEach((callback) => callback());
}

function handleStorage(event: StorageEvent): void {
  if (event.key !== STORAGE_KEY && event.key !== null) {
    return;
  }

  updateCache(getRawStorage());
  notifySubscribers();
}

function subscribe(callback: () => void): () => void {
  subscribers.add(callback);

  if (subscribers.size === 1) {
    window.addEventListener('storage', handleStorage);
  }

  return () => {
    subscribers.delete(callback);

    if (subscribers.size === 0) {
      window.removeEventListener('storage', handleStorage);
    }
  };
}

function writeStorage(entries: RepertoireEntry[]): boolean {
  const raw = JSON.stringify(entries);

  try {
    localStorage.setItem(STORAGE_KEY, raw);
    updateCache(raw, entries);
    notifySubscribers();
    return true;
  } catch {
    return false;
  }
}

export function useRepertoire(): UseRepertoireReturn {
  const repertoire = useSyncExternalStore(subscribe, getSnapshot, () => []);

  const savedFens = useMemo(() => new Set(repertoire.map((e) => e.fen)), [repertoire]);

  const isSaved = useCallback((fen: string) => savedFens.has(fen), [savedFens]);

  const toggle = useCallback(
    (opening: { fen: string; name: string; eco: string; moves: string; complexity?: string }) => {
      const next = repertoire.some((entry) => entry.fen === opening.fen)
        ? repertoire.filter((entry) => entry.fen !== opening.fen)
        : [{ ...opening, savedAt: Date.now() }, ...repertoire];

      writeStorage(next);
    },
    [repertoire]
  );

  const remove = useCallback(
    (fen: string) => {
      const next = repertoire.filter((entry) => entry.fen !== fen);

      if (next.length !== repertoire.length) {
        writeStorage(next);
      }
    },
    [repertoire]
  );

  const sorted = useMemo(() => [...repertoire].sort((a, b) => b.savedAt - a.savedAt), [repertoire]);

  return {
    repertoire: sorted,
    isSaved,
    toggle,
    remove,
    count: repertoire.length,
  };
}
