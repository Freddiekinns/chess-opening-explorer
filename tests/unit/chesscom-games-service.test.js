const {
  fetchChessComArchives,
  fetchChessComMonthlyGames,
  fetchChessComGamesPgn,
  getChessComGamesPgnCached,
  isGameAccepted,
  ACCEPTED_TIME_CLASSES,
} = require('../../packages/api/src/services/chesscom-games-service');

describe('Chess.com Games Service', () => {
  describe('isGameAccepted', () => {
    it('should accept rated rapid chess games with PGN', () => {
      const game = {
        rated: true,
        rules: 'chess',
        time_class: 'rapid',
        pgn: '[Event "Live Chess"]\n1.e4 e5 *',
      };
      expect(isGameAccepted(game)).toBe(true);
    });

    it('should accept rated blitz chess games with PGN', () => {
      const game = {
        rated: true,
        rules: 'chess',
        time_class: 'blitz',
        pgn: '[Event "Live Chess"]\n1.e4 e5 *',
      };
      expect(isGameAccepted(game)).toBe(true);
    });

    it('should accept rated classical chess games with PGN', () => {
      const game = {
        rated: true,
        rules: 'chess',
        time_class: 'classical',
        pgn: '[Event "Live Chess"]\n1.e4 e5 *',
      };
      expect(isGameAccepted(game)).toBe(true);
    });

    it('should reject bullet games', () => {
      const game = {
        rated: true,
        rules: 'chess',
        time_class: 'bullet',
        pgn: '[Event "Live Chess"]\n1.e4 e5 *',
      };
      expect(isGameAccepted(game)).toBe(false);
    });

    it('should reject unrated games', () => {
      const game = {
        rated: false,
        rules: 'chess',
        time_class: 'rapid',
        pgn: '[Event "Live Chess"]\n1.e4 e5 *',
      };
      expect(isGameAccepted(game)).toBe(false);
    });

    it('should reject chess960 games', () => {
      const game = {
        rated: true,
        rules: 'chess960',
        time_class: 'rapid',
        pgn: '[Event "Live Chess"]\n1.e4 e5 *',
      };
      expect(isGameAccepted(game)).toBe(false);
    });

    it('should reject games without PGN', () => {
      const game = {
        rated: true,
        rules: 'chess',
        time_class: 'rapid',
        pgn: '',
      };
      expect(isGameAccepted(game)).toBe(false);
    });

    it('should reject bughouse games', () => {
      const game = {
        rated: true,
        rules: 'bughouse',
        time_class: 'rapid',
        pgn: '[Event "Live Chess"]\n1.e4 e5 *',
      };
      expect(isGameAccepted(game)).toBe(false);
    });
  });

  describe('ACCEPTED_TIME_CLASSES', () => {
    it('should include rapid, blitz, and classical', () => {
      expect(ACCEPTED_TIME_CLASSES.has('rapid')).toBe(true);
      expect(ACCEPTED_TIME_CLASSES.has('blitz')).toBe(true);
      expect(ACCEPTED_TIME_CLASSES.has('classical')).toBe(true);
    });

    it('should not include bullet or daily', () => {
      expect(ACCEPTED_TIME_CLASSES.has('bullet')).toBe(false);
      expect(ACCEPTED_TIME_CLASSES.has('daily')).toBe(false);
    });
  });

  describe('fetchChessComArchives', () => {
    it('should throw error for missing username', async () => {
      await expect(fetchChessComArchives({})).rejects.toThrow('username is required');
    });

    it('should throw error for empty username', async () => {
      await expect(fetchChessComArchives({ username: '' })).rejects.toThrow('username is required');
    });

    it('should return archives array on success', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            archives: [
              'https://api.chess.com/pub/player/testuser/games/2026/01',
              'https://api.chess.com/pub/player/testuser/games/2025/12',
            ],
          }),
      });

      const result = await fetchChessComArchives({ username: 'testuser', fetchImpl: mockFetch });
      expect(result).toEqual([
        'https://api.chess.com/pub/player/testuser/games/2026/01',
        'https://api.chess.com/pub/player/testuser/games/2025/12',
      ]);
    });

    it('should throw 404 error for non-existent user', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      await expect(
        fetchChessComArchives({ username: 'nonexistent', fetchImpl: mockFetch })
      ).rejects.toThrow('User not found on Chess.com');
    });
  });

  describe('fetchChessComMonthlyGames', () => {
    it('should return games array on success', async () => {
      const mockGames = [
        { rated: true, rules: 'chess', time_class: 'rapid', pgn: '1.e4 e5 *' },
        { rated: true, rules: 'chess', time_class: 'blitz', pgn: '1.d4 d5 *' },
      ];

      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ games: mockGames }),
      });

      const result = await fetchChessComMonthlyGames({
        archiveUrl: 'https://api.chess.com/pub/player/test/games/2026/01',
        fetchImpl: mockFetch,
      });

      expect(result).toEqual(mockGames);
    });

    it('should return empty array on failure', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await fetchChessComMonthlyGames({
        archiveUrl: 'https://api.chess.com/pub/player/test/games/2026/01',
        fetchImpl: mockFetch,
      });

      expect(result).toEqual([]);
    });
  });

  describe('fetchChessComGamesPgn', () => {
    it('should throw error for missing username', async () => {
      await expect(fetchChessComGamesPgn({})).rejects.toThrow('username is required');
    });

    it('should return empty array when no archives exist', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ archives: [] }),
      });

      const result = await fetchChessComGamesPgn({ username: 'newuser', fetchImpl: mockFetch });
      expect(result.gamesPgn).toEqual([]);
      expect(result.meta.returned).toBe(0);
    });

    it('should filter and collect games from archives', async () => {
      const mockFetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              archives: ['https://api.chess.com/pub/player/test/games/2026/01'],
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              games: [
                { rated: true, rules: 'chess', time_class: 'rapid', pgn: '1.e4 e5 *' },
                { rated: false, rules: 'chess', time_class: 'rapid', pgn: '1.d4 d5 *' }, // unrated
                { rated: true, rules: 'chess', time_class: 'bullet', pgn: '1.c4 c5 *' }, // bullet
                { rated: true, rules: 'chess', time_class: 'blitz', pgn: '1.Nf3 Nf6 *' },
              ],
            }),
        });

      const result = await fetchChessComGamesPgn({
        username: 'test',
        limit: 10,
        fetchImpl: mockFetch,
      });

      expect(result.gamesPgn).toHaveLength(2);
      expect(result.gamesPgn).toContain('1.Nf3 Nf6 *'); // Most recent first (reversed)
      expect(result.gamesPgn).toContain('1.e4 e5 *');
      expect(result.meta.returned).toBe(2);
    });

    it('should respect the limit parameter', async () => {
      const games = Array.from({ length: 50 }, (_, i) => ({
        rated: true,
        rules: 'chess',
        time_class: 'rapid',
        pgn: `1.e4 e5 ${i} *`,
      }));

      const mockFetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              archives: ['https://api.chess.com/pub/player/test/games/2026/01'],
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ games }),
        });

      const result = await fetchChessComGamesPgn({
        username: 'test',
        limit: 10,
        fetchImpl: mockFetch,
      });

      expect(result.gamesPgn).toHaveLength(10);
      expect(result.meta.requested).toBe(10);
      expect(result.meta.returned).toBe(10);
    });
  });

  describe('getChessComGamesPgnCached', () => {
    it('should cache results', async () => {
      const mockFetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              archives: ['https://api.chess.com/pub/player/cachetest/games/2026/01'],
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              games: [{ rated: true, rules: 'chess', time_class: 'rapid', pgn: '1.e4 *' }],
            }),
        });

      // First call - should fetch
      const result1 = await getChessComGamesPgnCached({
        username: 'cachetest',
        limit: 10,
        fetchImpl: mockFetch,
      });
      expect(result1.cacheHit).toBe(false);
      expect(result1.gamesPgn).toHaveLength(1);

      // Second call - should use cache
      const result2 = await getChessComGamesPgnCached({
        username: 'cachetest',
        limit: 10,
        fetchImpl: mockFetch,
      });
      expect(result2.cacheHit).toBe(true);
      expect(result2.gamesPgn).toHaveLength(1);

      // Fetch should only be called once (for archives) + once (for games)
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
