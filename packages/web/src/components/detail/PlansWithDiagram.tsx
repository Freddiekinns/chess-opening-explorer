import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { parsePlan, type ParsedPlan, type PlanReference } from '../../lib/planReferences';
import { CommonPlans } from './CommonPlans';
import { PlansDiagram } from './PlansDiagram';
import styles from './PlansWithDiagram.module.css';

interface PlansWithDiagramProps {
  fen: string;
  moves: string[];
  plans: string[];
  variant: 'desktop' | 'mobile';
  /** False in Practice mode: the plans read as plain text. */
  interactive?: boolean;
}

/** Hovering waits this long, so reading across the text doesn't flicker the board. */
const HOVER_DELAY_MS = 200;

/**
 * Common plans beside a diagram of the position (#228). On desktop the diagram
 * sits beside the plans and stays in view. Each move, route, square or piece in
 * a plan that passes the check against the position is a button: hover or focus
 * previews it on the diagram, click pins it, and the caption says it in plain
 * English. References that fail stay plain text, so nothing impossible is ever
 * drawn.
 *
 * On a phone the drawing opens in a small board under the plan that was tapped,
 * not on a diagram that has scrolled away. Only a tap changes anything there: a
 * preview on focus would move the layout between touch-down and click, and the
 * click would land on the paragraph. A page with no references keeps the static
 * diagram above its plans (#230).
 */
export const PlansWithDiagram: React.FC<PlansWithDiagramProps> = ({
  fen,
  moves,
  plans,
  variant,
  interactive = true,
}) => {
  const parsed = useMemo(() => {
    const byRaw = new Map<string, ParsedPlan>();
    for (const raw of plans) byRaw.set(raw, parsePlan(fen, raw));
    return byRaw;
  }, [fen, plans]);

  const references = useMemo(() => {
    const byId = new Map<string, PlanReference>();
    parsed.forEach((plan, raw) =>
      plan.segments.forEach((seg, i) => {
        if (typeof seg !== 'string' && seg.status !== 'invalid') byId.set(`${raw}#${i}`, seg);
      })
    );
    return byId;
  }, [parsed]);

  const [pinned, setPinned] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clearTimer, []);
  // A new position or Practice clears whatever was drawn.
  useEffect(() => {
    setPinned(null);
    setPreview(null);
  }, [fen, interactive]);

  const mobile = variant === 'mobile';
  const boardInPlan = mobile && interactive && references.size > 0;
  const active = interactive ? (boardInPlan ? pinned : (preview ?? pinned)) : null;
  const activeRef = active ? (references.get(active) ?? null) : null;

  // Pinning closes a board that may be above the tapped button, which would
  // pull the button up the screen: put the page back so the reader keeps their
  // place. Not left to the browser's scroll anchoring, which Safari lacks.
  const anchor = useRef<{ el: HTMLElement; top: number } | null>(null);
  useLayoutEffect(() => {
    const held = anchor.current;
    anchor.current = null;
    if (!held || !held.el.isConnected) return;
    const drift = held.el.getBoundingClientRect().top - held.top;
    if (Math.abs(drift) > 0.5) window.scrollBy(0, drift);
  }, [pinned]);

  const renderPlanText = useCallback(
    (raw: string, text: string): React.ReactNode => {
      const plan = parsed.get(raw);
      if (!interactive || !plan) return text;
      return plan.segments.map((seg, i) => {
        if (typeof seg === 'string' || seg.status === 'invalid') {
          return (
            <React.Fragment key={i}>{typeof seg === 'string' ? seg : seg.text}</React.Fragment>
          );
        }
        const id = `${raw}#${i}`;
        const area = seg.kind === 'square';
        return (
          <button
            key={i}
            type="button"
            className={`${styles.reference} ${area ? styles.area : ''} ${
              active === id ? styles.active : ''
            }`}
            aria-pressed={pinned === id}
            {...(boardInPlan
              ? {}
              : {
                  onMouseEnter: () => {
                    clearTimer();
                    timer.current = setTimeout(() => setPreview(id), HOVER_DELAY_MS);
                  },
                  onMouseLeave: () => {
                    clearTimer();
                    setPreview(null);
                  },
                  onFocus: () => setPreview(id),
                  onBlur: () => setPreview(null),
                })}
            onClick={(event) => {
              clearTimer();
              setPreview(null);
              anchor.current = {
                el: event.currentTarget,
                top: event.currentTarget.getBoundingClientRect().top,
              };
              setPinned((current) => (current === id ? null : id));
            }}
          >
            {seg.text}
          </button>
        );
      });
    },
    [parsed, interactive, active, pinned, boardInPlan]
  );

  /** The small board under the tapped plan (phone only). */
  const renderPlanExtra = useCallback(
    (raw: string): React.ReactNode => {
      if (!pinned || pinned.slice(0, pinned.lastIndexOf('#')) !== raw) return null;
      const reference = references.get(pinned);
      if (!reference) return null;
      return (
        <PlansDiagram
          fen={fen}
          moves={moves}
          reference={reference}
          compact
          className={styles.planBoard}
        />
      );
    },
    [pinned, references, fen, moves]
  );

  const diagram = (
    <PlansDiagram
      fen={fen}
      moves={moves}
      reference={activeRef}
      invite={interactive && references.size > 0}
      className={mobile ? styles.mobileDiagram : undefined}
    />
  );

  if (mobile) {
    return (
      <div className={styles.mobilePlans}>
        {!boardInPlan && diagram}
        <CommonPlans
          plans={plans}
          layout="mobileGroups"
          hideTitle
          renderPlanText={renderPlanText}
          renderPlanExtra={boardInPlan ? renderPlanExtra : undefined}
        />
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      <div className={styles.diagramColumn}>{diagram}</div>
      <CommonPlans
        plans={plans}
        layout="byColour"
        hideTitle
        className={styles.plansText}
        renderPlanText={renderPlanText}
      />
    </div>
  );
};

export default PlansWithDiagram;
