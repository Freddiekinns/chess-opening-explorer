import React, { useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import styles from './MiniBoard.module.css';

interface MiniBoardProps {
  fen: string;
  size?: number;
  className?: string;
}

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export const MiniBoard: React.FC<MiniBoardProps> = ({ fen, size = 120, className = '' }) => {
  const position = useMemo(() => {
    if (!fen || !fen.includes('/')) return STARTING_FEN;
    return fen;
  }, [fen]);

  return (
    <div className={`${styles.miniBoard} ${className}`} style={{ width: size, height: size }}>
      <Chessboard
        options={{
          position,
          allowDragging: false,
          showNotation: false,
          boardStyle: {
            borderRadius: '0',
            boxShadow: 'none',
          },
        }}
      />
    </div>
  );
};
