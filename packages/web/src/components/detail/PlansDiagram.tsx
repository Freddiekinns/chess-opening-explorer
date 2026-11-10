import React, { useMemo } from 'react';
import { Chessboard } from 'react-chessboard';
import { positionCaption } from '../../lib/openingBook';
import type { PlanReference } from '../../lib/planReferences';
import styles from './PlansDiagram.module.css';

interface PlansDiagramProps {
  /** The page's own position — the one the plans describe. */
  fen: string;
  /** The line's moves in SAN, without numbers, as the page's move list holds them. */
  moves: string[];
  /** The plan reference to draw, if one is picked or previewed. */
  reference?: PlanReference | null;
  /** Whether the plans beside it have references to pick. */
  invite?: boolean;
  /** The small board under a plan: the position goes under the description. */
  compact?: boolean;
  /** Shown beside the caption while a reference is pinned: unpins it. */
  onClear?: () => void;
  className?: string;
}

const ANNOTATION_FALLBACK = '#9bb26a';

/** Arrows are SVG attributes, which can't read a CSS variable, so resolve it. */
function annotationColour(): string {
  if (typeof document === 'undefined') return ANNOTATION_FALLBACK;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-annotation')
    .trim();
  return value || ANNOTATION_FALLBACK;
}

/** The same colour, lighter, for steps later in the plan. Half opacity
 *  disappeared on the light squares, so this keeps about 70%. */
function fainter(hex: string): string {
  return /^#[0-9a-f]{6}$/i.test(hex) ? `${hex}b3` : hex;
}

/**
 * A flat, printed-looking diagram of the final position beside Common plans
 * (#230), so the squares a plan names can be read with the position in view.
 * It has no controls and can't be moved: it is a picture, not a second board.
 * Always the page's final position, because that is what the plans describe —
 * stepping back through the line moves only the main board.
 */
export const PlansDiagram: React.FC<PlansDiagramProps> = ({
  fen,
  moves,
  reference = null,
  invite = false,
  compact = false,
  onClear,
  className = '',
}) => {
  const position = positionCaption(moves);

  const { arrows, squareStyles } = useMemo(() => {
    if (!reference) return { arrows: [], squareStyles: {} };
    const colour = annotationColour();
    const squareStyles: Record<string, React.CSSProperties> = {};
    for (const sq of reference.highlight) {
      squareStyles[sq] = {
        background: 'color-mix(in srgb, var(--color-annotation) 50%, transparent)',
      };
    }
    for (const sq of reference.rings) {
      squareStyles[sq] = {
        ...squareStyles[sq],
        boxShadow: 'inset 0 0 0 3px var(--color-annotation)',
        borderRadius: '50%',
      };
    }
    return {
      arrows: reference.arrows.map((a) => ({
        startSquare: a.from,
        endSquare: a.to,
        color: a.later ? fainter(colour) : colour,
      })),
      squareStyles,
    };
  }, [reference]);

  const caption = reference
    ? reference.description
    : invite
      ? `${position}. Pick a move or square in the plans to see it here.`
      : position;

  return (
    <figure
      className={`${styles.diagram} ${onClear ? styles.withClear : ''} ${className}`}
      aria-label={position}
    >
      <Chessboard
        options={{
          id: 'plans-diagram',
          position: fen,
          allowDragging: false,
          allowDrawingArrows: false,
          showNotation: true,
          arrows,
          squareStyles,
          boardStyle: { borderRadius: '0' },
        }}
      />
      <figcaption className={styles.caption} aria-live="polite">
        {compact && reference ? (
          <>
            <span>{caption}</span>
            <span className={styles.position}>{position}</span>
          </>
        ) : (
          caption
        )}
      </figcaption>
      {onClear && (
        <button type="button" className={`btn btn--secondary ${styles.clear}`} onClick={onClear}>
          Clear
        </button>
      )}
    </figure>
  );
};

export default PlansDiagram;
