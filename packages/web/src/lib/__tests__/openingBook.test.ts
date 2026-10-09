import { describe, it, expect } from 'vitest';
import { formatCount } from '../openingBook';

describe('formatCount', () => {
  it('writes billions as B, not thousands of millions', () => {
    // 1.e4 at the "All" level is in the billions; this printed "3778.2M".
    expect(formatCount(3_778_178_876)).toBe('3.8B');
    expect(formatCount(1_000_000_000)).toBe('1B');
  });

  it('keeps the millions and thousands it already wrote', () => {
    expect(formatCount(1_250_000)).toBe('1.3M');
    expect(formatCount(54_321)).toBe('54.3k');
    expect(formatCount(999)).toBe('999');
  });
});
