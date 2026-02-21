/**
 * Unit Tests for SimpleCacheService and getGlobalCache
 */

const {
  SimpleCacheService,
  getGlobalCache,
} = require('../../packages/api/src/services/cache-service');

describe('cache-service', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('SimpleCacheService', () => {
    let cache;

    beforeEach(() => {
      jest.setSystemTime(1_000_000);
      cache = new SimpleCacheService();
    });

    describe('getOrSet()', () => {
      test('cache miss - calls fetchFunction and returns fresh data', () => {
        const fetchFn = jest.fn().mockReturnValue({ data: 'fresh' });
        const result = cache.getOrSet('key1', fetchFn);
        expect(fetchFn).toHaveBeenCalledTimes(1);
        expect(result).toEqual({ data: 'fresh' });
      });

      test('cache hit - returns cached data without calling fetchFunction again', () => {
        const fetchFn = jest.fn().mockReturnValue({ data: 'fresh' });
        cache.getOrSet('key1', fetchFn);
        const result = cache.getOrSet('key1', fetchFn);
        expect(fetchFn).toHaveBeenCalledTimes(1);
        expect(result).toEqual({ data: 'fresh' });
      });

      test('cache expired - calls fetchFunction again after TTL', () => {
        const fetchFn = jest.fn().mockReturnValue({ data: 'fresh' });
        cache.getOrSet('key1', fetchFn);
        jest.setSystemTime(1_000_000 + cache.cacheTTL + 1);
        cache.getOrSet('key1', fetchFn);
        expect(fetchFn).toHaveBeenCalledTimes(2);
      });

      test('stale data fallback - returns stale data when fetchFunction throws after expiry', () => {
        const fetchFn = jest.fn();
        fetchFn.mockReturnValueOnce({ data: 'stale' });
        fetchFn.mockImplementationOnce(() => {
          throw new Error('fetch failed');
        });
        cache.getOrSet('key1', fetchFn);
        jest.setSystemTime(1_000_000 + cache.cacheTTL + 1);
        const result = cache.getOrSet('key1', fetchFn);
        expect(result).toEqual({ data: 'stale' });
      });

      test('throws when fetchFunction throws and cache is empty', () => {
        const fetchFn = jest.fn().mockImplementation(() => {
          throw new Error('fetch failed');
        });
        expect(() => cache.getOrSet('key1', fetchFn)).toThrow('fetch failed');
      });

      test('respects custom TTL parameter', () => {
        const fetchFn = jest.fn().mockReturnValue('data');
        const customTTL = 5_000;
        cache.getOrSet('key1', fetchFn, customTTL);
        jest.setSystemTime(1_000_000 + customTTL + 1);
        cache.getOrSet('key1', fetchFn, customTTL);
        expect(fetchFn).toHaveBeenCalledTimes(2);
      });

      test('cache hit within default TTL does not call fetchFunction', () => {
        const fetchFn = jest.fn().mockReturnValue('data');
        cache.getOrSet('key1', fetchFn);
        jest.setSystemTime(1_000_000 + cache.cacheTTL - 1);
        cache.getOrSet('key1', fetchFn);
        expect(fetchFn).toHaveBeenCalledTimes(1);
      });
    });

    describe('clear()', () => {
      test('clears a specific key so next access is a cache miss', () => {
        const fetchFn = jest.fn().mockReturnValue('data');
        cache.getOrSet('key1', fetchFn);
        cache.getOrSet('key2', fetchFn);
        cache.clear('key1');
        cache.getOrSet('key1', fetchFn);
        expect(fetchFn).toHaveBeenCalledTimes(3);
      });

      test('clears all keys when called without argument', () => {
        const fetchFn = jest.fn().mockReturnValue('data');
        cache.getOrSet('key1', fetchFn);
        cache.getOrSet('key2', fetchFn);
        cache.clear();
        cache.getOrSet('key1', fetchFn);
        cache.getOrSet('key2', fetchFn);
        expect(fetchFn).toHaveBeenCalledTimes(4);
      });

      test('uncleared key survives after specific-key clear', () => {
        const fetchFn = jest.fn().mockReturnValue('data');
        cache.getOrSet('key1', fetchFn);
        cache.getOrSet('key2', fetchFn);
        cache.clear('key1');
        cache.getOrSet('key2', fetchFn);
        expect(fetchFn).toHaveBeenCalledTimes(2);
      });
    });

    describe('getStats()', () => {
      test('returns correct shape for an empty cache', () => {
        const stats = cache.getStats();
        expect(stats).toMatchObject({
          totalEntries: 0,
          validEntries: 0,
          memoryUsage: expect.any(Number),
          oldestEntry: null,
          entries: [],
        });
      });

      test('reports one total and one valid entry after a cache set', () => {
        const fetchFn = jest.fn().mockReturnValue({ x: 1 });
        cache.getOrSet('key1', fetchFn);
        const stats = cache.getStats();
        expect(stats.totalEntries).toBe(1);
        expect(stats.validEntries).toBe(1);
        expect(stats.oldestEntry).toBe(1_000_000);
        expect(stats.entries[0]).toMatchObject({ key: 'key1', age: 0 });
      });

      test('counts expired entries as total but not valid', () => {
        const fetchFn = jest.fn().mockReturnValue('data');
        cache.getOrSet('key1', fetchFn);
        jest.setSystemTime(1_000_000 + cache.cacheTTL + 1);
        const stats = cache.getStats();
        expect(stats.totalEntries).toBe(1);
        expect(stats.validEntries).toBe(0);
      });
    });

    describe('cleanup()', () => {
      test('removes entries older than 2x TTL', () => {
        const fetchFn = jest.fn().mockReturnValue('data');
        cache.getOrSet('key1', fetchFn);
        jest.setSystemTime(1_000_000 + cache.cacheTTL * 2 + 1);
        cache.cleanup();
        expect(cache.getStats().totalEntries).toBe(0);
      });

      test('keeps entries younger than 2x TTL', () => {
        const fetchFn = jest.fn().mockReturnValue('data');
        cache.getOrSet('key1', fetchFn);
        jest.setSystemTime(1_000_000 + cache.cacheTTL * 2 - 1);
        cache.cleanup();
        expect(cache.getStats().totalEntries).toBe(1);
      });

      test('handles empty cache without error', () => {
        expect(() => cache.cleanup()).not.toThrow();
      });
    });
  });

  describe('getGlobalCache()', () => {
    test('returns a SimpleCacheService instance', () => {
      const instance = getGlobalCache();
      expect(instance).toBeInstanceOf(SimpleCacheService);
    });

    test('returns the same instance on repeated calls (singleton)', () => {
      const first = getGlobalCache();
      const second = getGlobalCache();
      expect(first).toBe(second);
    });
  });
});
