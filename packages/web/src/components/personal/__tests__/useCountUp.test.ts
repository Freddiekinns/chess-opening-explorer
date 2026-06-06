import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCountUp } from '../useCountUp';

describe('useCountUp', () => {
  let originalMatchMedia: typeof window.matchMedia;
  let rafCallbacks: FrameRequestCallback[] = [];

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    rafCallbacks = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    vi.restoreAllMocks();
  });

  const mockMatchMedia = (reduced: boolean) => {
    window.matchMedia = vi.fn().mockImplementation((q: string) => ({
      matches: q.includes('reduce') ? reduced : false,
      media: q,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  };

  test('returns target immediately when prefers-reduced-motion is reduce', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useCountUp(67, 350));
    expect(result.current).toBe(67);
  });

  test('starts at 0 and ramps to target over duration', () => {
    mockMatchMedia(false);
    let now = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    const { result } = renderHook(() => useCountUp(100, 350));
    expect(result.current).toBe(0);

    act(() => {
      now = 1000 + 175; // halfway
      rafCallbacks.shift()?.(now);
    });
    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThan(100);

    act(() => {
      now = 1000 + 350;
      rafCallbacks.shift()?.(now);
    });
    expect(result.current).toBe(100);
  });

  test('returns 0 when target is 0', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useCountUp(0, 350));
    expect(result.current).toBe(0);
  });

  test('cancels raf on unmount', () => {
    mockMatchMedia(false);
    const cancel = vi.mocked(window.cancelAnimationFrame);
    const { unmount } = renderHook(() => useCountUp(100, 350));
    unmount();
    expect(cancel).toHaveBeenCalled();
  });
});
