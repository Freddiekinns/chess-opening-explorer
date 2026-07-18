import { describe, expect, test, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaQuery, MOBILE_QUERY } from '../useMediaQuery';

type Listener = (event: { matches: boolean }) => void;

function installMatchMedia(initialMatches: boolean) {
  const listeners: Listener[] = [];
  const mql = {
    matches: initialMatches,
    addEventListener: (_: string, listener: Listener) => listeners.push(listener),
    removeEventListener: (_: string, listener: Listener) => {
      const i = listeners.indexOf(listener);
      if (i >= 0) listeners.splice(i, 1);
    },
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mql)
  );
  return {
    fire(matches: boolean) {
      mql.matches = matches;
      listeners.forEach((listener) => listener({ matches }));
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useMediaQuery', () => {
  test('defaults to false when matchMedia is unavailable (jsdom/SSR)', () => {
    const { result } = renderHook(() => useMediaQuery(MOBILE_QUERY));
    expect(result.current).toBe(false);
  });

  test('reflects the initial match state', () => {
    installMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery(MOBILE_QUERY));
    expect(result.current).toBe(true);
  });

  test('updates when the media query flips', () => {
    const media = installMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery(MOBILE_QUERY));
    expect(result.current).toBe(false);

    act(() => media.fire(true));
    expect(result.current).toBe(true);

    act(() => media.fire(false));
    expect(result.current).toBe(false);
  });
});
