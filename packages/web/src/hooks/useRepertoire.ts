import { useState, useEffect, useMemo, useCallback } from 'react';

const STORAGE_KEY = 'chess-repertoire';

export interface RepertoireEntry {
  fen: string;
  name: string;
  eco: string;
  moves: string;
  savedAt: number;
  color?: 'white' | 'black';
}

export interface UseRepertoireReturn {
  repertoire: RepertoireEntry[];
  isSaved: (fen: string) => boolean;
  toggle: (opening: { fen: string; name: string; eco: string; moves: string }) => void;
  remove: (fen: string) => void;
  count: number;
}

function readStorage(): RepertoireEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RepertoireEntry[];
  } catch {
    return [];
  }
}

function writeStorage(entries: RepertoireEntry[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function useRepertoire(): UseRepertoireReturn {
  const [repertoire, setRepertoire] = useState<RepertoireEntry[]>(readStorage);

  // Cross-tab sync
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setRepertoire(readStorage());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const savedFens = useMemo(() => new Set(repertoire.map((e) => e.fen)), [repertoire]);

  const isSaved = useCallback((fen: string) => savedFens.has(fen), [savedFens]);

  const toggle = useCallback(
    (opening: { fen: string; name: string; eco: string; moves: string }) => {
      setRepertoire((prev) => {
        let next: RepertoireEntry[];
        if (prev.some((e) => e.fen === opening.fen)) {
          next = prev.filter((e) => e.fen !== opening.fen);
        } else {
          next = [{ ...opening, savedAt: Date.now() }, ...prev];
        }
        writeStorage(next);
        return next;
      });
    },
    []
  );

  const remove = useCallback((fen: string) => {
    setRepertoire((prev) => {
      const next = prev.filter((e) => e.fen !== fen);
      writeStorage(next);
      return next;
    });
  }, []);

  // Sort by savedAt descending
  const sorted = useMemo(() => [...repertoire].sort((a, b) => b.savedAt - a.savedAt), [repertoire]);

  return {
    repertoire: sorted,
    isSaved,
    toggle,
    remove,
    count: repertoire.length,
  };
}
