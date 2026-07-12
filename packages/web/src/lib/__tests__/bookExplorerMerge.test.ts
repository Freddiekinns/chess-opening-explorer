import { describe, it, expect } from 'vitest';
import {
  normaliseSan,
  mergeExplorerMoves,
  MIN_MOVE_SAMPLE,
  type BookMoveInput,
} from '../bookExplorerMerge';
import type { ExplorerMove } from '../lichessExplorer';

function bookMove(san: string, name: string, count: number): BookMoveInput {
  return { san, name, fen: `fen-${san}`, count };
}

function explorerMove(san: string, games: number, overrides: Partial<ExplorerMove> = {}) {
  return { san, games, whitePct: 48, drawPct: 5, blackPct: 47, ...overrides };
}

describe('normaliseSan', () => {
  it('strips check, mate and annotation suffixes', () => {
    expect(normaliseSan('Nf3+')).toBe('Nf3');
    expect(normaliseSan('Qxf7#')).toBe('Qxf7');
    expect(normaliseSan('e4!?')).toBe('e4');
    expect(normaliseSan('e8=Q#')).toBe('e8=Q');
  });

  it('unifies castling glyphs to letter O', () => {
    expect(normaliseSan('0-0')).toBe('O-O');
    expect(normaliseSan('0-0-0')).toBe('O-O-O');
    expect(normaliseSan('O-O+')).toBe('O-O');
  });

  it('trims whitespace and leaves plain SAN untouched', () => {
    expect(normaliseSan(' Nf6 ')).toBe('Nf6');
    expect(normaliseSan('cxd4')).toBe('cxd4');
  });
});

describe('mergeExplorerMoves', () => {
  const book = [
    bookMove('Nf3', 'Some Variation', 900),
    bookMove('Nc3', 'Main Line', 5000),
    bookMove('g3', 'Fianchetto Line', 200),
  ];

  it('returns book rows untouched, in order, when explorer data is absent', () => {
    const rows = mergeExplorerMoves(book, null);
    expect(rows.map((r) => r.san)).toEqual(['Nf3', 'Nc3', 'g3']);
    expect(rows.every((r) => r.stats === null)).toBe(true);
    expect(rows.every((r) => r.fen !== null)).toBe(true);
  });

  it('attaches stats to matched rows and re-ranks by explorer games', () => {
    const rows = mergeExplorerMoves(book, [
      explorerMove('Nf3', 40_000),
      explorerMove('Nc3', 10_000),
      explorerMove('g3', 2_000),
    ]);
    expect(rows.map((r) => r.san)).toEqual(['Nf3', 'Nc3', 'g3']);
    expect(rows[0].stats?.games).toBe(40_000);
    expect(rows[0].name).toBe('Some Variation');
  });

  it('matches explorer SAN with check suffix against a bare book SAN', () => {
    const rows = mergeExplorerMoves(
      [bookMove('Bb5', 'Ruy Lopez', 100)],
      [explorerMove('Bb5+', 3_000)]
    );
    expect(rows[0].stats?.games).toBe(3_000);
  });

  it('adds popular unmatched moves as off-book rows (no fen, no name)', () => {
    const rows = mergeExplorerMoves(book, [explorerMove('Nc3', 10_000), explorerMove('a3', 6_000)]);
    const offBook = rows.filter((r) => r.fen === null);
    expect(offBook).toHaveLength(1);
    expect(offBook[0].san).toBe('a3');
    expect(offBook[0].name).toBeNull();
    expect(offBook[0].stats?.games).toBe(6_000);
  });

  it('caps off-book rows at 3, keeping the most played', () => {
    const rows = mergeExplorerMoves(book, [
      explorerMove('h3', 1_000),
      explorerMove('a3', 5_000),
      explorerMove('b3', 4_000),
      explorerMove('h4', 3_000),
      explorerMove('a4', 2_000),
    ]);
    const offBook = rows.filter((r) => r.fen === null);
    expect(offBook.map((r) => r.san)).toEqual(['a3', 'b3', 'h4']);
  });

  it('drops explorer moves below the minimum sample entirely', () => {
    const rows = mergeExplorerMoves(book, [
      explorerMove('Nc3', 10_000),
      explorerMove('Nf3', MIN_MOVE_SAMPLE - 1),
      explorerMove('a3', MIN_MOVE_SAMPLE - 1),
    ]);
    const nf3 = rows.find((r) => r.san === 'Nf3');
    expect(nf3?.stats).toBeNull();
    expect(rows.filter((r) => r.fen === null)).toHaveLength(0);
  });

  it('drops off-book moves under the minimum share of total games', () => {
    // Total 100k; 500 games = 0.5% < 2% share threshold.
    const rows = mergeExplorerMoves(book, [explorerMove('Nc3', 99_500), explorerMove('a3', 500)]);
    expect(rows.filter((r) => r.fen === null)).toHaveLength(0);
  });

  it('never creates an off-book row for excluded SANs (the move just played)', () => {
    const rows = mergeExplorerMoves(book, [explorerMove('e3+', 50_000)], {
      excludeSans: ['e3'],
    });
    expect(rows.filter((r) => r.fen === null)).toHaveLength(0);
  });

  it('sinks unmatched book rows below ranked rows, preserving their order', () => {
    const rows = mergeExplorerMoves(book, [explorerMove('g3', 8_000)]);
    expect(rows.map((r) => r.san)).toEqual(['g3', 'Nf3', 'Nc3']);
    expect(rows[1].stats).toBeNull();
    expect(rows[2].stats).toBeNull();
  });
});
