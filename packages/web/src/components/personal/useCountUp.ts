import { useEffect, useState } from 'react';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Animate a numeric value from 0 to `target` over `durationMs` using rAF.
 * Honours `prefers-reduced-motion: reduce` by returning the target immediately.
 * Restarts the animation when `target` changes.
 */
export function useCountUp(target: number, durationMs: number): number {
  const reduced = prefersReducedMotion();
  const [value, setValue] = useState<number>(reduced ? target : 0);

  useEffect(() => {
    if (reduced) {
      setValue(target);
      return;
    }
    if (target === 0) {
      setValue(0);
      return;
    }

    let rafId = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - progress, 2); // ease-out quadratic
      setValue(target * eased);
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        setValue(target);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, durationMs, reduced]);

  return value;
}
