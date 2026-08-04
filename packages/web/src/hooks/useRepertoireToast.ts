import { useCallback, useEffect, useRef, useState } from 'react';
import { useRepertoire } from './useRepertoire';

/** Long enough to read and reach the Undo button one-handed. */
const TOAST_DURATION_MS = 4000;

interface OpeningInput {
  fen: string;
  name: string;
  eco: string;
  moves: string;
  complexity?: string;
}

export interface RepertoireToastState {
  message: string;
  onUndo: () => void;
}

export interface UseRepertoireToastReturn {
  isSaved: (fen: string) => boolean;
  count: number;
  toggleWithToast: (opening: OpeningInput) => void;
  toast: RepertoireToastState | null;
}

/**
 * Toggle-with-feedback. Every star in the product goes through this so the
 * grid, the detail page and the repertoire page cannot drift on wording or
 * timing. Undo matters because a star is a single tap on a scrolling list.
 */
export function useRepertoireToast(): UseRepertoireToastReturn {
  const { isSaved, toggle, count } = useRepertoire();
  const [toast, setToast] = useState<RepertoireToastState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // `toggle` closes over the repertoire array from its own render. An undo
  // closure built at save time would therefore capture the state as it was
  // *before* the save, and toggling against that stale list re-adds the
  // opening instead of removing it. Undo reads the ref so it always toggles
  // against current state.
  const toggleRef = useRef(toggle);
  toggleRef.current = toggle;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const toggleWithToast = useCallback(
    (opening: OpeningInput) => {
      const wasSaved = isSaved(opening.fen);
      toggleRef.current(opening);

      clearTimer();
      setToast({
        message: wasSaved ? 'Removed from your repertoire' : 'Added to your repertoire',
        onUndo: () => {
          toggleRef.current(opening);
          clearTimer();
          setToast(null);
        },
      });

      timerRef.current = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    },
    [clearTimer, isSaved]
  );

  return { isSaved, count, toggleWithToast, toast };
}
