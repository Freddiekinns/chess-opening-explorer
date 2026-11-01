import { describe, expect, test } from 'vitest';
import { formatWindow } from '../statsWindow';

describe('formatWindow', () => {
  test('names the year once when the window sits in one year', () => {
    expect(formatWindow({ since: '2026-04', until: '2026-09' })).toBe('Apr–Sep 2026');
  });

  test('names both years when the window crosses one', () => {
    expect(formatWindow({ since: '2025-11', until: '2026-04' })).toBe('Nov 2025–Apr 2026');
  });

  test('a one-month window is just that month', () => {
    expect(formatWindow({ since: '2026-09', until: '2026-09' })).toBe('Sep 2026');
  });
});
