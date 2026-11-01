import { describe, expect, test, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMyLevel } from '../useMyLevel';
import { setMyLevel } from '../../lib/myLevel';

vi.mock('../../lib/analytics', () => ({
  trackEvent: vi.fn(),
  getAnonId: () => 'test-anon',
}));

import { trackEvent } from '../../lib/analytics';

describe('useMyLevel', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(trackEvent).mockClear();
  });

  test('reads the saved level on mount', () => {
    localStorage.setItem('openingbook:my-level', '1800');
    const { result } = renderHook(() => useMyLevel());
    expect(result.current[0]).toBe('1800');
  });

  test('is null with nothing saved', () => {
    const { result } = renderHook(() => useMyLevel());
    expect(result.current[0]).toBeNull();
  });

  test('updates on my-level-change', () => {
    const { result } = renderHook(() => useMyLevel());
    act(() => setMyLevel('2200'));
    expect(result.current[0]).toBe('2200');
  });

  test('updates on storage event from another tab', () => {
    const { result } = renderHook(() => useMyLevel());
    act(() => {
      localStorage.setItem('openingbook:my-level', 'u1400');
      window.dispatchEvent(new StorageEvent('storage', { key: 'openingbook:my-level' }));
    });
    expect(result.current[0]).toBe('u1400');
  });

  test('a change in one component reaches another', () => {
    const first = renderHook(() => useMyLevel());
    const second = renderHook(() => useMyLevel());
    act(() => first.result.current[1]('1400', 'landing'));
    expect(second.result.current[0]).toBe('1400');
  });

  test('setter tracks band and surface', () => {
    const { result } = renderHook(() => useMyLevel());
    act(() => result.current[1]('1400', 'search'));
    expect(localStorage.getItem('openingbook:my-level')).toBe('1400');
    expect(trackEvent).toHaveBeenCalledWith('band_select', { band: '1400', surface: 'search' });
  });
});
