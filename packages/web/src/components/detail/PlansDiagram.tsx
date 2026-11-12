import React from 'react';
import { Chessboard } from 'react-chessboard';
import { positionCaption } from '../../lib/openingBook';
import styles from './PlansDiagram.module.css';

interface PlansDiagramProps {
  /** The page's own position — the one the plans describe. */
  fen: string;
  /** The line's moves in SAN, without numbers, as the page's move list holds them. */
  moves: string[];
  className?: string;
}

/**
 * A flat, printed-looking diagram of the final position beside Common plans
 * (#230), so the squares a plan names can be read with the position in view.
 * It has no controls and can't be moved: it is a picture, not a second board.
 * Always the page's final position, because that is what the plans describe —
 * stepping back through the line moves only the main board.
 */
export const PlansDiagram: React.FC<PlansDiagramProps> = ({ fen, moves, className = '' }) => {
  const caption = positionCaption(moves);
  return (
    <figure className={`${styles.diagram} ${className}`} aria-label={caption}>
      <Chessboard
        options={{
          id: 'plans-diagram',
          position: fen,
          allowDragging: false,
          allowDrawingArrows: false,
          showNotation: true,
          boardStyle: { borderRadius: '0' },
        }}
      />
      <figcaption className={styles.caption}>{caption}</figcaption>
    </figure>
  );
};

export default PlansDiagram;
