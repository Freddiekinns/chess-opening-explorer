import { describe, it, expect, vi } from 'vitest';
import { analyseGames, sortAgg } from '../../../../../shared/src/utils/personal-analysis';
import { buildOpeningsMap } from '../../../../../shared/src/utils/pgn-utils';

// En-passant field is "-", not "e3": chess.js follows the strict FEN rule and
// only names the square when a capture is actually available, and the lookup
// normalises on the first four fields. A fixture written with "e3" silently
// matches nothing.
const openingsMap = buildOpeningsMap([
  {
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
    name: "King's Pawn Game",
    eco: 'B00',
    moves: '1. e4',
    family_id: 'kings-pawn',
  },
  {
    fen: 'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2',
    name: "Queen's Pawn Game",
    eco: 'D00',
    moves: '1. d4 d5',
    family_id: 'queens-pawn',
  },
]);

const game = (white: string, black: string, result: string, moves: string) =>
  `[Event "Rated blitz game"]\n[White "${white}"]\n[Black "${black}"]\n[Result "${result}"]\n\n${moves} ${result}`;

describe('analyseGames', () => {
  it('splits a run by the side the user played and tallies their result', async () => {
    const data = await analyseGames(
      [game('alice', 'bob', '1-0', '1. e4 e5'), game('bob', 'alice', '1-0', '1. e4 e5')],
      'alice',
      openingsMap
    );

    expect(data).not.toBeNull();
    expect(data!.whiteGames).toBe(1);
    expect(data!.whiteWin).toBe(1);
    expect(data!.blackGames).toBe(1);
    expect(data!.blackLoss).toBe(1);
    expect(data!.classifiedGames).toBe(2);
  });

  it('counts a game it cannot attribute to the user as unrecognised, not as a loss', async () => {
    const data = await analyseGames(
      [game('carol', 'dave', '1-0', '1. e4 e5')],
      'alice',
      openingsMap
    );

    expect(data!.unclassifiedGames).toBe(1);
    expect(data!.classifiedGames).toBe(0);
    expect(data!.whiteGames + data!.blackGames).toBe(0);
  });

  it('reports progress for every game, including the ones it cannot classify', async () => {
    const onProgress = vi.fn();
    await analyseGames(
      [game('alice', 'bob', '1-0', '1. e4 e5'), game('carol', 'dave', '0-1', '1. e4 e5')],
      'alice',
      openingsMap,
      { onProgress }
    );

    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenLastCalledWith(2, 2);
  });

  it('resolves null when the caller aborts, rather than returning a partial run', async () => {
    const data = await analyseGames(
      [game('alice', 'bob', '1-0', '1. e4 e5')],
      'alice',
      openingsMap,
      {
        shouldAbort: () => true,
      }
    );

    expect(data).toBeNull();
  });

  it('returns the full opening list, untruncated, ordered by games played', async () => {
    const games = [
      ...Array.from({ length: 3 }, () => game('alice', 'bob', '1-0', '1. e4 e5')),
      game('alice', 'bob', '0-1', '1. d4 d5'),
    ];
    const data = await analyseGames(games, 'alice', openingsMap);

    expect(data!.asWhite).toHaveLength(2);
    expect(data!.asWhite[0].games).toBe(3);
    expect(data!.asWhite[0].name).toBe("King's Pawn Game");
  });
});

describe('sortAgg', () => {
  const agg = (name: string, games: number, win: number) => ({
    fen: name,
    name,
    eco: 'A00',
    moves: '',
    games,
    win,
    draw: 0,
    loss: games - win,
  });

  it('orders by win rate, not volume, when asked for the best', () => {
    expect(sortAgg([agg('a', 10, 5), agg('b', 4, 4)], 'best')[0].name).toBe('b');
  });
});
