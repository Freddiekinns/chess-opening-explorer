import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Chess } from 'chess.js';
import PlayThrough from '../PlayThrough';
import { readFileSync } from 'fs';
import { resolve } from 'path';

type DropHandler = (move: { sourceSquare: string; targetSquare: string | null }) => boolean;
let onPieceDrop: DropHandler | undefined;
let position: string | undefined;
vi.mock('react-chessboard', () => ({
  Chessboard: ({ options }: { options: { onPieceDrop?: DropHandler; position?: string } }) => {
    onPieceDrop = options.onPieceDrop;
    position = options.position;
    return <div data-testid="board" />;
  },
}));

const PUZZLES: Record<string, Record<'white' | 'black', { moves: string[] }[]>> = JSON.parse(
  readFileSync(resolve(__dirname, '../../../../public/lab/play-through-puzzles.json'), 'utf8')
);

// The Caro-Kann Advance: a Black opening, and one with puzzles in the file.
const CARO = ['e4', 'c6', 'd4', 'd5', 'e5'];
const CARO_FEN = 'rnbqkbnr/pp2pppp/2p5/3pP3/3P4/8/PPP2PPP/RNBQKBNR b KQkq - 0 3';

const fensOf = (moves: string[]) => {
  const g = new Chess();
  return [g.fen(), ...moves.map((m) => (g.move(m), g.fen()))];
};

const band = (moves: [string, number][]) => ({
  totalGames: 10000,
  white: 4800,
  draws: 400,
  black: 4800,
  averageRating: 1600,
  topGames: [],
  moves: moves.map(([san, games]) => ({ san, games, whitePct: 48, drawPct: 4, blackPct: 48 })),
});

// White splits before 2.d4 (index 2); every other step has a clear favourite.
function bandsFor(moves: string[]) {
  return fensOf(moves).map((fen, i) => ({
    fen,
    bands: {
      1400:
        i === 2
          ? band([
              ['d4', 4000],
              ['Nf3', 3500],
              ['Nc3', 2500],
            ])
          : band([
              [moves[i] ?? 'Bf5', 8000],
              ['a3', 2000],
            ]),
    },
  }));
}

// One opponent move off the Caro-Kann line: 2.Nf3 instead of 2.d4.
const BRANCHES = {
  [CARO_FEN]: {
    side: 'black',
    items: [
      {
        ply: 2,
        dev: 'Nf3',
        devShare: 0.35,
        reply: 'd5',
        replyShare: 0.6,
        common: [],
        top: ['d5'],
        ok: ['d5', 'g6'],
      },
    ],
  },
};

function mockFetch(moves: string[]) {
  global.fetch = vi.fn((url: string) =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve(
          url.includes('line-bands')
            ? { data: bandsFor(moves) }
            : url.includes('branches')
              ? BRANCHES
              : PUZZLES
        ),
    })
  ) as unknown as typeof fetch;
}

const drop = (from: string, to: string) => {
  let ok = false;
  act(() => {
    ok = onPieceDrop!({ sourceSquare: from, targetSquare: to });
  });
  return ok;
};
// One step per act: each timer is scheduled by the effect of the render before it.
const tick = async (ms: number) => {
  for (let t = 0; t < ms; t += 300) await act(async () => void vi.advanceTimersByTime(300));
};

async function mount(name: string, fen: string, moves: string[]) {
  mockFetch(moves);
  await act(async () => {
    render(<PlayThrough name={name} fen={fen} moves={moves} band="1400" onClose={vi.fn()} />);
  });
}

async function watchToTheEnd() {
  fireEvent.click(screen.getByRole('button', { name: /Play the line/ }));
  await tick(5000);
  if (screen.queryByRole('button', { name: 'Continue' })) {
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await tick(5000);
  }
}

describe('PlayThrough (experiment prototype)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('pauses where the opponents split, then shows what comes next at the end', async () => {
    await mount('Caro-Kann Defense: Advance Variation', CARO_FEN, CARO);
    expect(screen.getByText(/Watch the line as/).textContent).toContain('Black');
    fireEvent.click(screen.getByRole('button', { name: /Play the line/ }));
    await tick(5000);
    expect(screen.getByText(/White has a choice here/)).toBeTruthy();
    expect(screen.getByText('This line follows 2.d4.')).toBeTruthy();
    expect(screen.getByText('40%')).toBeTruthy(); // of all 10,000 games, not of the top moves
    expect(screen.getAllByText('White wins 48%')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await tick(5000);
    expect(screen.getByText(/The line ends here/)).toBeTruthy();
    expect(screen.getByText('Bf5')).toBeTruthy();
    expect(position).toBe(CARO_FEN);
  });

  it('plays the line from memory, naming the move after a second miss', async () => {
    await mount('Caro-Kann Defense: Advance Variation', CARO_FEN, CARO);
    await watchToTheEnd();
    fireEvent.click(screen.getByRole('button', { name: /Your turn/ }));
    await tick(600); // White's 1.e4 plays itself
    expect(drop('e7', 'e5')).toBe(false);
    expect(screen.getByText('e5 is not this line. Try again.')).toBeTruthy();
    expect(drop('e7', 'e6')).toBe(false);
    expect(screen.getByText('The line plays 1...c6.')).toBeTruthy();
    expect(drop('c7', 'c6')).toBe(true);
    await tick(600);
    expect(drop('d7', 'd5')).toBe(true);
    // A miss means the part again, from the start, until it is clean.
    expect(screen.getByText('Again from the start, until it is clean.')).toBeTruthy();
    await tick(1800);
    expect(drop('c7', 'c6')).toBe(true);
    await tick(600);
    expect(drop('d7', 'd5')).toBe(true);
    await tick(600);
    expect(screen.getByText('You played the line from memory.')).toBeTruthy();
    expect(screen.getByText(/1 part repeated on the way/)).toBeTruthy();
  });

  it('repeats only the part with a miss, then plays the whole line once through', async () => {
    const moves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'c3', 'Nf6', 'd4', 'exd4'];
    const white = [
      ['e2', 'e4'],
      ['g1', 'f3'],
      ['f1', 'c4'],
      ['c2', 'c3'],
      ['d2', 'd4'],
    ];
    await mount('Italian Game: Center Attack', fensOf(moves)[10], moves);
    await watchToTheEnd();
    await tick(6000); // ten plies take longer than the Caro's five
    fireEvent.click(screen.getByRole('button', { name: /Your turn/ }));
    expect(screen.getByText(/Part 1 of 2 · Move 1 of 5/)).toBeTruthy();
    for (const [f, t] of white.slice(0, 3)) {
      expect(drop(f, t)).toBe(true);
      await tick(600);
    }
    expect(screen.getByText(/Part 2 of 2 · Move 4 of 5/)).toBeTruthy();
    expect(drop('d2', 'd3')).toBe(false); // the miss
    expect(drop('c2', 'c3')).toBe(true);
    await tick(600);
    expect(drop('d2', 'd4')).toBe(true);
    expect(screen.getByText('Part 2 again, until it is clean.')).toBeTruthy();
    await tick(1800); // back to the position before 2...Nc6, which replays
    expect(position).toBe(fensOf(moves)[4]);
    for (const [f, t] of white.slice(2)) {
      expect(drop(f, t)).toBe(true);
      await tick(600);
    }
    expect(screen.getByText('Every part is clean. Now the whole line, once through.')).toBeTruthy();
    await tick(1800);
    expect(position).toBe(fensOf(moves)[0]);
    for (const [f, t] of white) {
      expect(drop(f, t)).toBe(true);
      await tick(600);
    }
    expect(screen.getByText('You played the line from memory, once through.')).toBeTruthy();
  });

  it('says when a miss is a move many players at this level play', async () => {
    const moves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'];
    await mount('Italian Game', fensOf(moves)[6], moves);
    await watchToTheEnd();
    await tick(3000);
    fireEvent.click(screen.getByRole('button', { name: /Your turn/ }));
    expect(drop('a2', 'a3')).toBe(false); // 2,000 of 10,000 games in the mock
    expect(
      screen.getByText(
        'a3 is played in 20% of games here at your level, but it is another line. Try again.'
      )
    ).toBeTruthy();
    expect(drop('h2', 'h3')).toBe(false);
    expect(screen.getByText('The line plays 1.e4.')).toBeTruthy();
  });

  it('ends at once through when the first pass is clean', async () => {
    await mount('Caro-Kann Defense: Advance Variation', CARO_FEN, CARO);
    await watchToTheEnd();
    fireEvent.click(screen.getByRole('button', { name: /Your turn/ }));
    await tick(600);
    drop('c7', 'c6');
    await tick(600);
    drop('d7', 'd5');
    await tick(600);
    expect(screen.getByText('You played the line from memory, first time.')).toBeTruthy();
  });

  it('runs the variation puzzles after memory and counts the solved ones', async () => {
    const puzzles = PUZZLES[CARO_FEN].black; // the Caro-Kann learner is Black
    await mount('Caro-Kann Defense: Advance Variation', CARO_FEN, CARO);
    await watchToTheEnd();
    fireEvent.click(screen.getByRole('button', { name: /Your turn/ }));
    await tick(600);
    drop('c7', 'c6');
    await tick(600);
    drop('d7', 'd5');
    await tick(600);
    fireEvent.click(screen.getByRole('button', { name: 'Test it: 1 off the line, 3 puzzles →' }));
    await tick(1200);
    expect(screen.getByText(/White leaves the line: 2.Nf3 instead of 2.d4./)).toBeTruthy();
    expect(position).toBe(fensOf(['e4', 'c6', 'Nf3'])[3]);
    expect(drop('g7', 'g6')).toBe(false);
    expect(
      screen.getByText(
        'g6 is playable, the engine says, but it is rare here at your level. Try again.'
      )
    ).toBeTruthy();
    expect(drop('d7', 'd5')).toBe(true);
    expect(
      screen.getByText(
        'Yes. 2...d5 is played in 60% of games here at your level, and the engine rates it sound.'
      )
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '3 puzzles →' }));
    for (const p of puzzles) {
      await tick(900);
      expect(screen.getByText(/The last move was a mistake/)).toBeTruthy();
      expect(screen.getByText(/Lichess game in the Advance Variation/)).toBeTruthy();
      for (let j = 1; j < p.moves.length; j += 2) {
        expect(drop(p.moves[j].slice(0, 2), p.moves[j].slice(2, 4))).toBe(true);
        await tick(600);
      }
      expect(screen.getByText('Solved.')).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: /Next puzzle|Finish/ }));
    }
    expect(
      screen.getByText(/found 1 of 1 replies off the line, solved 3 of 3 puzzles/)
    ).toBeTruthy();
  });

  it('ends at memory when no puzzles fit the line', async () => {
    const moves = ['e4', 'c6', 'd4', 'd5', 'Nc3'];
    const g = new Chess();
    moves.forEach((m) => g.move(m));
    await mount('Caro-Kann Defense: Main Line', g.fen(), moves);
    await watchToTheEnd();
    fireEvent.click(screen.getByRole('button', { name: /Your turn/ }));
    await tick(600);
    drop('c7', 'c6');
    await tick(600);
    drop('d7', 'd5');
    await tick(600);
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    expect(screen.getByText(/You watched the line and played it from memory\./)).toBeTruthy();
    expect(screen.getByText(/No test fits this line/)).toBeTruthy();
  });

  it.each([
    ['Italian Game: Classical Variation, Center Attack', 'White'],
    ['Italian Game: Two Knights Defense, Traxler Counterattack', 'Black'],
    ["Queen's Gambit Declined: Modern Variation", 'Black'],
    ['Sicilian Defense: Smith-Morra Gambit', 'White'],
  ])('picks the side from the name: %s → %s', async (name, side) => {
    const moves = ['e4', 'e5', 'Nf3'];
    await mount(name, fensOf(moves)[3], moves);
    expect(screen.getByText(/Watch the line as/).textContent).toContain(side);
  });

  it('shows the line move at a pause even when it is not in the top three', async () => {
    const moves = ['e4', 'c6', 'h4'];
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: fensOf(moves).map((fen, i) => ({
              fen,
              bands: {
                1400:
                  i === 2
                    ? band([
                        ['d4', 4000],
                        ['Nf3', 3000],
                        ['Nc3', 2000],
                        ['h4', 300],
                      ])
                    : band([[moves[i] ?? 'd5', 9000]]),
              },
            })),
          }),
      })
    ) as unknown as typeof fetch;
    await act(async () => {
      render(
        <PlayThrough
          name="Caro-Kann Defense"
          fen={fensOf(moves)[3]}
          moves={moves}
          band="1400"
          onClose={vi.fn()}
        />
      );
    });
    fireEvent.click(screen.getByRole('button', { name: /Play the line/ }));
    await tick(3000);
    expect(screen.getByText('This line follows 2.h4.')).toBeTruthy();
    expect(screen.getByText('h4')).toBeTruthy();
    expect(screen.getByText('3%')).toBeTruthy();
  });

  it('plays White by default for a White opening, and can switch sides', async () => {
    const moves = ['e4', 'e5', 'Nf3'];
    await mount("King's Knight Opening", fensOf(moves)[3], moves);
    expect(screen.getByText(/Watch the line as/).textContent).toContain('White');
    fireEvent.click(screen.getByRole('button', { name: /Play as Black instead/ }));
    expect(screen.getByText(/Watch the line as/).textContent).toContain('Black');
  });
});
