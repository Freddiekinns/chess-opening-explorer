import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { FamilyPicker } from './FamilyPicker';
import { facetDisplay } from './FilterBar';
import { resultCountLabel } from './resultCount';
import { SORT_OPTIONS } from '../../hooks/useBrowse';
import type { BrowseFacets, BrowseFilters, FacetKey, FacetValue } from '../../hooks/useBrowse';
import styles from './FilterSheet.module.css';

/**
 * Mobile filters: one control with an active count, opening a bottom sheet
 * that holds all four facets as stacked sections.
 *
 * The mock draws a sheet per facet. That would be three taps to set a level
 * (Filters → facet list → facet sheet); stacking the sections is two, and
 * keeps the mock's family search, first-move groups and primary footer button.
 *
 * Choices apply live rather than on a submit, so the footer count is never a
 * stale promise. The footer button reveals the result — it does not apply it.
 *
 * Two things the first cut got wrong, both about the sheet as an object rather
 * than about the facets in it:
 *
 * 1. The grabber was decorative. A 36×4 pill at the top of a bottom sheet is a
 *    promise that the thing can be dragged down, and there was no handler
 *    behind it — the only exits were a 100px strip of backdrop above the sheet
 *    and Escape, which a phone does not have. It now drags and it taps.
 * 2. Twenty-nine families were expanded by default, so opening the sheet cost
 *    2,000px of scroll and every visit began full-height. The family list is
 *    the precision tool; the thirteen level/style/sort pills are the common
 *    case. Collapsed behind a row that states the current family, the whole
 *    common case fits on one screen with nothing to scroll.
 */

/** Past this, or faster than FLING_VELOCITY, letting go dismisses. */
const DISMISS_FRACTION = 0.25;
const DISMISS_CEILING = 120;
/** px per ms — a flick, as opposed to a slow drag that changed its mind. */
const FLING_VELOCITY = 0.5;
/** Movement before a press becomes a drag, so a tap on the grabber stays a tap. */
const DRAG_SLOP = 6;
/** Matches --sheet-close-ms in the stylesheet. */
const CLOSE_MS = 200;

type PillOption = FacetValue | { value: string; label: string };

interface PillRowProps {
  legend: string;
  options: PillOption[];
  value: string | null;
  anyLabel: string | null;
  onSelect: (value: string | null) => void;
}

const PillRow: React.FC<PillRowProps> = ({ legend, options, value, anyLabel, onSelect }) => (
  <div className={styles.section} role="group" aria-label={legend}>
    <p className={styles.sectionLabel}>{legend}</p>
    <div className={styles.pills}>
      {anyLabel !== null && (
        <button
          type="button"
          className={`${styles.pill} ${value === null ? styles.pillActive : ''}`.trim()}
          aria-pressed={value === null}
          onClick={() => onSelect(null)}
        >
          {anyLabel}
        </button>
      )}
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`${styles.pill} ${value === option.value ? styles.pillActive : ''}`.trim()}
          aria-pressed={value === option.value}
          onClick={() => onSelect(option.value)}
        >
          {option.label}
          {'count' in option && (
            <span className={styles.pillCount}>{option.count.toLocaleString()}</span>
          )}
        </button>
      ))}
    </div>
  </div>
);

interface FilterSheetProps {
  facets: BrowseFacets;
  filters: BrowseFilters;
  total: number;
  activeCount: number;
  loading: boolean;
  onFacetChange: (key: FacetKey, value: string | null) => void;
  onClear: () => void;
}

export const FilterSheet: React.FC<FilterSheetProps> = ({
  facets,
  filters,
  total,
  activeCount,
  loading,
  onFacetChange,
  onClear,
}) => {
  const [open, setOpen] = useState(false);
  const [familyOpen, setFamilyOpen] = useState(false);
  // How far the sheet has been dragged from its resting place, in px.
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);

  const sheetRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const familyRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<{ pointerId: number; startY: number; startTime: number } | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const close = useCallback(() => {
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
    setOpen(false);
  }, []);

  /**
   * A dismissing drag has to finish the journey it started — the sheet keeps
   * following the finger past the threshold and off the bottom, then unmounts.
   * Taps (backdrop, grabber, Escape, "Show N") close immediately instead:
   * a decision that has already been made should not cost 200ms.
   */
  const closeBySliding = useCallback(() => {
    setDragging(false);
    setDragY(sheetRef.current?.offsetHeight ?? 0);
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      setOpen(false);
    }, CLOSE_MS);
  }, []);

  useEffect(() => {
    if (!open) return;

    setDragY(0);
    setDragging(false);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleKeyDown);

    // A bottom sheet over a page that still scrolls behind it feels broken.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, close]);

  useEffect(
    () => () => {
      if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current);
    },
    []
  );

  // Every visit starts compact: the family list is opt-in, not a state the
  // sheet remembers into a session where the user only wanted a level.
  useEffect(() => {
    if (!open) setFamilyOpen(false);
  }, [open]);

  /**
   * Expanding the family list adds ~1,500px below the fold, so the section has
   * to come to the user. Setting the scroller's own scrollTop, never
   * scrollIntoView — that walks every scrollable ancestor.
   */
  useEffect(() => {
    if (!familyOpen) return;
    const body = bodyRef.current;
    const section = familyRef.current;
    if (!body || !section) return;
    body.scrollTop = section.offsetTop - body.offsetTop;
  }, [familyOpen]);

  /**
   * Drag-to-dismiss lives on the grabber and title row only, not on the
   * scrolling body. Starting a drag inside the body would mean deciding, on
   * every touchmove, whether the user meant to scroll a 44px-tall pill row or
   * to close the sheet — and getting it wrong either steals a tap on a filter
   * or eats a scroll. The handle is the part that advertises the gesture.
   */
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest('[data-no-drag]')) return;
    gestureRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      // Date.now, not event.timeStamp: the two clocks have different origins,
      // and only one of them is a wall clock a test can advance.
      startTime: Date.now(),
    };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    const delta = event.clientY - gesture.startY;
    if (!dragging) {
      if (delta < DRAG_SLOP) return;
      setDragging(true);
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    // Upward is a no-op: the sheet is already as far up as it goes.
    setDragY(Math.max(0, delta));
  };

  const endGesture = (event: React.PointerEvent<HTMLDivElement>) => {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    gestureRef.current = null;
    if (!dragging) return;

    const delta = Math.max(0, event.clientY - gesture.startY);
    const elapsed = Math.max(1, Date.now() - gesture.startTime);
    const height = sheetRef.current?.offsetHeight ?? 0;
    const threshold = Math.min(DISMISS_CEILING, height * DISMISS_FRACTION) || DISMISS_CEILING;

    if (delta >= threshold || delta / elapsed >= FLING_VELOCITY) {
      closeBySliding();
      return;
    }

    setDragging(false);
    setDragY(0);
  };

  const familyLabel = facetDisplay(facets.family, filters.family, 'Any family');

  return (
    <div className={styles.root}>
      <div className={styles.triggerRow}>
        <button
          type="button"
          className={`${styles.trigger} ${activeCount > 0 ? styles.triggerActive : ''}`.trim()}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          <SlidersHorizontal size={15} aria-hidden="true" />
          <span>Filters</span>
          {activeCount > 0 && (
            <span className={styles.badge}>
              {activeCount}
              <span className={styles.srOnly}> active</span>
            </span>
          )}
        </button>
        <span className={styles.count} aria-live="polite">
          {loading ? 'Counting…' : resultCountLabel(total)}
        </span>
      </div>

      {/* Portalled to <body> deliberately. `position: fixed` resolves against
          the nearest ancestor carrying a transform, and the grid's parent
          (.popular-openings-section) animates `sectionReveal`, whose keyframes
          include translateY. Rendered in place, the sheet is positioned
          relative to that section instead of the viewport and lands roughly a
          thousand pixels down the page. A portal makes the sheet immune to
          whatever any ancestor does with transforms, now or later. */}
      {open &&
        createPortal(
          <div className={styles.overlay}>
            <div className={styles.backdrop} aria-hidden="true" onClick={close} />
            <div
              ref={sheetRef}
              className={`${styles.sheet} ${dragging ? styles.sheetDragging : ''}`.trim()}
              role="dialog"
              aria-modal="true"
              aria-label="Filters"
              style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
            >
              <div
                className={styles.dragZone}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endGesture}
                onPointerCancel={endGesture}
              >
                <button
                  type="button"
                  className={styles.grabber}
                  aria-label="Close filters"
                  onClick={close}
                >
                  <span className={styles.grabberBar} aria-hidden="true" />
                </button>

                <div className={styles.header}>
                  <h2 className={styles.title}>Filters</h2>
                  {activeCount > 0 && (
                    <button type="button" className={styles.clear} data-no-drag onClick={onClear}>
                      Clear
                    </button>
                  )}
                </div>
              </div>

              <div className={styles.body} ref={bodyRef}>
                <PillRow
                  legend="Level"
                  options={facets.level}
                  value={filters.level}
                  anyLabel="All levels"
                  onSelect={(value) => onFacetChange('level', value)}
                />
                <PillRow
                  legend="Style"
                  options={facets.style}
                  value={filters.style}
                  anyLabel="Any style"
                  onSelect={(value) => onFacetChange('style', value)}
                />
                <PillRow
                  legend="Sort"
                  options={SORT_OPTIONS}
                  value={filters.sort}
                  anyLabel={null}
                  onSelect={(value) => onFacetChange('sort', value)}
                />

                <div className={styles.section} ref={familyRef}>
                  <p className={styles.sectionLabel} id="filter-sheet-family">
                    Family
                  </p>
                  <button
                    type="button"
                    className={`${styles.disclosure} ${filters.family ? styles.disclosureActive : ''}`.trim()}
                    aria-expanded={familyOpen}
                    aria-describedby="filter-sheet-family"
                    onClick={() => setFamilyOpen((wasOpen) => !wasOpen)}
                  >
                    <span className={styles.disclosureValue}>{familyLabel}</span>
                    <ChevronDown
                      size={16}
                      className={`${styles.chevron} ${familyOpen ? styles.chevronOpen : ''}`.trim()}
                      aria-hidden="true"
                    />
                  </button>
                  {familyOpen && (
                    <FamilyPicker
                      className={styles.familyPicker}
                      families={facets.family}
                      value={filters.family}
                      onSelect={(value) => {
                        onFacetChange('family', value);
                        // Collapsing states the choice back in the row and
                        // returns the sheet to one screen — the same thing the
                        // desktop dropdown does on select.
                        setFamilyOpen(false);
                      }}
                    />
                  )}
                </div>
              </div>

              <button type="button" className={styles.done} onClick={close}>
                {total === 0 ? 'No openings match' : `Show ${resultCountLabel(total)}`}
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
