import { describe, it, expect, beforeEach } from 'vitest';
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

  it('returns null for an invalid stored value', () => {
    localStorage.setItem('openingbook:my-level', 'grandmaster');
    expect(getMyLevel()).toBeNull();
  });
});
