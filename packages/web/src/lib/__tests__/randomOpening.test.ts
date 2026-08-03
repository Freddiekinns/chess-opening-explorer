import { describe, it, expect, afterEach, vi } from 'vitest';
import { fetchRandomOpening } from '../randomOpening';

const stubFetch = (impl: () => unknown) => vi.stubGlobal('fetch', vi.fn(impl));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchRandomOpening', () => {
  it('returns the opening when the route answers', async () => {
    stubFetch(async () => ({
      ok: true,
      json: async () => ({ success: true, data: { fen: 'fen-1', name: 'Sicilian' } }),
    }));

    expect(await fetchRandomOpening()).toMatchObject({ fen: 'fen-1' });
  });

  // Every caller navigates by FEN, so a record without one is not a
  // destination — returning it would route to `/opening/undefined`.
  it.each([
    ['a non-ok response', async () => ({ ok: false, json: async () => ({}) })],
    ['success: false', async () => ({ ok: true, json: async () => ({ success: false }) })],
    [
      'a record with no fen',
      async () => ({
        ok: true,
        json: async () => ({ success: true, data: { name: 'Sicilian' } }),
      }),
    ],
  ])('returns null for %s', async (_label, impl) => {
    stubFetch(impl);
    expect(await fetchRandomOpening()).toBeNull();
  });

  // A surprise that does not arrive is not worth an error state — the search
  // field is right there, and it is what the user came for.
  it('swallows a network failure', async () => {
    stubFetch(() => {
      throw new Error('offline');
    });

    expect(await fetchRandomOpening()).toBeNull();
  });
});
