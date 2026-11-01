import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getMyLevel, setMyLevel, clearMyLevel } from '../myLevel';

describe('myLevel preference', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when unset', () => {
    expect(getMyLevel()).toBeNull();
  });

  it('round-trips a band id', () => {
    setMyLevel('1400');
    expect(getMyLevel()).toBe('1400');
  });

  it('clears the preference', () => {
    setMyLevel('2200');
    clearMyLevel();
    expect(getMyLevel()).toBeNull();
  });

  it('keeps the level for this page when storage is blocked', () => {
    const blocked = () => {
      throw new DOMException('blocked', 'SecurityError');
    };
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(blocked);
    const set = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(blocked);
    try {
      setMyLevel('1400');
      expect(getMyLevel()).toBe('1400');
    } finally {
      get.mockRestore();
      set.mockRestore();
    }
  });

  it('returns null for an invalid stored value', () => {
    localStorage.setItem('openingbook:my-level', 'grandmaster');
    expect(getMyLevel()).toBeNull();
  });
});
