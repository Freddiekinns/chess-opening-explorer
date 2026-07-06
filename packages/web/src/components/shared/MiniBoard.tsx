import React, { useMemo } from 'react';
import { PIECE_SVGS, type PieceCode } from './pieceSvgs';
import styles from './MiniBoard.module.css';

interface MiniBoardProps {
  fen: string;
  size?: number;
  className?: string;
}

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/** "rnbq…" FEN board field → 64-entry array (a8 first), null = empty. */
function parseBoard(fen: string): Array<PieceCode | null> {
  const squares: Array<PieceCode | null> = [];
  const boardField = fen.split(' ')[0] || '';
  for (const rank of boardField.split('/')) {
    for (const ch of rank) {
      if (ch >= '1' && ch <= '8') {
        for (let i = 0; i < Number(ch); i++) squares.push(null);
      } else {
        const colour = ch === ch.toLowerCase() ? 'b' : 'w';
        squares.push(`${colour}${ch.toUpperCase()}` as PieceCode);
      }
    }
  }
  // Malformed FEN: pad/truncate to a full board rather than rendering a
  // ragged grid.
  while (squares.length < 64) squares.push(null);
  return squares.slice(0, 64);
}

/**
 * Static position thumbnail. Renders plain squares + vendored piece SVGs — no
 * interactivity, no drag machinery — so landing/repertoire cards stay cheap.
 * (The interactive react-chessboard put hundreds of nodes per card into the
 * DOM and forced the chess stack into the landing bundle.)
 *
 * Purely decorative: the owning card carries the opening name, so the board
 * is hidden from assistive tech.
 */
export const MiniBoard: React.FC<MiniBoardProps> = ({ fen, size = 120, className = '' }) => {
  const squares = useMemo(() => {
    const valid = fen && fen.includes('/') ? fen : STARTING_FEN;
    return parseBoard(valid);
  }, [fen]);

  return (
    <div
      className={`${styles.miniBoard} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {squares.map((piece, i) => {
        const row = Math.floor(i / 8);
        const col = i % 8;
        const dark = (row + col) % 2 === 1;
        return (
          <div
            key={i}
            className={dark ? styles.darkSquare : styles.lightSquare}
            // Static compile-time SVG strings (see pieceSvgs.ts) — no user input.
            {...(piece ? { dangerouslySetInnerHTML: { __html: PIECE_SVGS[piece] } } : {})}
          />
        );
      })}
    </div>
  );
};
