/**
 * Unit Tests for Lichess Fetcher
 * Tests NDJSON parsing, rate limiting, and API interaction
 */

const fetcher = require('../../tools/course-discovery/lib/lichess-fetcher');
const { fetchStudyList, fetchStudyPGN, fetchStudyMetadata, parseNDJSON, resetRateLimiter } =
  fetcher;

// Mock global fetch
const originalFetch = global.fetch;

beforeEach(() => {
  resetRateLimiter();
  // Mock sleep to be instant - avoids 60s+ real delays in rate limit tests
  jest.spyOn(fetcher, 'sleep').mockResolvedValue(undefined);
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

describe('parseNDJSON', () => {
  test('should parse multiple NDJSON lines', () => {
    const text = '{"id":"abc","name":"Study 1"}\n{"id":"def","name":"Study 2"}\n';
    const result = parseNDJSON(text);
    expect(result).toEqual([
      { id: 'abc', name: 'Study 1' },
      { id: 'def', name: 'Study 2' },
    ]);
  });

  test('should handle single line', () => {
    const text = '{"id":"abc","name":"Study 1"}';
    const result = parseNDJSON(text);
    expect(result).toEqual([{ id: 'abc', name: 'Study 1' }]);
  });

  test('should skip empty lines', () => {
    const text = '{"id":"abc"}\n\n\n{"id":"def"}\n';
    const result = parseNDJSON(text);
    expect(result).toHaveLength(2);
  });

  test('should skip malformed lines', () => {
    const text = '{"id":"abc"}\nnot valid json\n{"id":"def"}';
    const result = parseNDJSON(text);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('abc');
    expect(result[1].id).toBe('def');
  });

  test('should return empty array for null input', () => {
    expect(parseNDJSON(null)).toEqual([]);
    expect(parseNDJSON('')).toEqual([]);
    expect(parseNDJSON(undefined)).toEqual([]);
  });
});

describe('fetchStudyList', () => {
  test('should fetch and parse study list', async () => {
    const ndjson =
      '{"id":"abc123","name":"French Defense","createdAt":1609459200,"updatedAt":1609545600}\n{"id":"def456","name":"Sicilian","createdAt":1609459200,"updatedAt":1609545600}\n';

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(ndjson),
    });

    const result = await fetchStudyList('TestUser');

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: 'abc123',
      name: 'French Defense',
      createdAt: 1609459200,
      updatedAt: 1609545600,
    });
    expect(global.fetch).toHaveBeenCalledWith('https://lichess.org/api/study/by/TestUser', {
      headers: { Accept: 'application/x-ndjson' },
    });
  });

  test('should return empty array for 404 (user not found)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    const result = await fetchStudyList('NonexistentUser');
    expect(result).toEqual([]);
  });

  test('should throw on server error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(fetchStudyList('TestUser')).rejects.toThrow('Failed to fetch studies');
  });

  test('should throw on null username', async () => {
    await expect(fetchStudyList(null)).rejects.toThrow('Username is required');
    await expect(fetchStudyList('')).rejects.toThrow('Username is required');
  });

  test('should handle empty study list', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(''),
    });

    const result = await fetchStudyList('EmptyUser');
    expect(result).toEqual([]);
  });
});

describe('fetchStudyPGN', () => {
  test('should fetch PGN for a study', async () => {
    const pgn =
      '[Event "Chapter 1"]\n[Site "https://lichess.org/study/abc123/ch1"]\n\n1. e4 e6 *\n';

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve(pgn),
    });

    const result = await fetchStudyPGN('abc123');

    expect(result).toBe(pgn);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://lichess.org/api/study/abc123.pgn?comments=false&variations=false&clocks=false',
      {}
    );
  });

  test('should return null for 404 (study not found)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    const result = await fetchStudyPGN('nonexistent');
    expect(result).toBeNull();
  });

  test('should throw on server error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(fetchStudyPGN('abc123')).rejects.toThrow('Failed to fetch PGN');
  });

  test('should throw on null study ID', async () => {
    await expect(fetchStudyPGN(null)).rejects.toThrow('Study ID is required');
  });
});

describe('fetchStudyMetadata', () => {
  test('should fetch metadata for a study', async () => {
    const responseData = {
      study: {
        id: 'abc123',
        name: 'French Defense Study',
        likes: 42,
        ownerId: 'TestAuthor',
        members: { TestAuthor: { user: { name: 'TestAuthor' }, role: 'w' } },
      },
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(responseData),
    });

    const result = await fetchStudyMetadata('abc123');

    expect(result).toEqual({
      id: 'abc123',
      name: 'French Defense Study',
      likes: 42,
      owner: 'TestAuthor',
    });
    expect(global.fetch).toHaveBeenCalledWith('https://lichess.org/study/abc123', {
      headers: { Accept: 'application/json' },
    });
  });

  test('should return null for 404', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    const result = await fetchStudyMetadata('nonexistent');
    expect(result).toBeNull();
  });

  test('should throw on server error', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(fetchStudyMetadata('abc123')).rejects.toThrow('Failed to fetch metadata');
  });

  test('should throw on null study ID', async () => {
    await expect(fetchStudyMetadata(null)).rejects.toThrow('Study ID is required');
  });

  test('should handle missing ownerId gracefully', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ study: { id: 'abc', name: 'Test', likes: 10 } }),
    });

    const result = await fetchStudyMetadata('abc');
    expect(result.owner).toBe('');
    expect(result.likes).toBe(10);
  });

  test('should handle missing likes field', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ study: { id: 'abc', name: 'Test', ownerId: 'User' } }),
    });

    const result = await fetchStudyMetadata('abc');
    expect(result.likes).toBe(0);
    expect(result.owner).toBe('User');
  });

  test('should handle flat response format (no study wrapper)', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: 'abc', name: 'Test', likes: 5, ownerId: 'FlatUser' }),
    });

    const result = await fetchStudyMetadata('abc');
    expect(result.name).toBe('Test');
    expect(result.likes).toBe(5);
    expect(result.owner).toBe('FlatUser');
  });
});

describe('rate limiting', () => {
  test('should handle 429 with backoff and retry', async () => {
    let callCount = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ ok: false, status: 429, statusText: 'Too Many Requests' });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve('{"id":"abc"}'),
      });
    });

    const result = await fetchStudyList('TestUser');

    expect(result).toHaveLength(1);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    // Verify sleep was called for the backoff
    expect(fetcher.sleep).toHaveBeenCalled();
  });

  test('should throw after max retries on persistent 429', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    });

    await expect(fetchStudyList('TestUser')).rejects.toThrow('Rate limited after');
    // 3 retries = 3 fetch calls
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });
});
