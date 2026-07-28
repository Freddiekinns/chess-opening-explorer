import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { SlidersHorizontal } from 'lucide-react';
import { FamilyPicker } from './FamilyPicker';
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
 */

/**
 * A union of element types, not a union of arrays: `FacetValue[] | Plain[]`
 * would make `options.map` unresolvable, because TypeScript cannot pick one
 * signature for the callback.
 */
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

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);

    // A bottom sheet over a page that still scrolls behind it feels broken.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

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
            <div className={styles.backdrop} aria-hidden="true" onClick={() => setOpen(false)} />
            <div className={styles.sheet} role="dialog" aria-modal="true" aria-label="Filters">
              <div className={styles.grabber} aria-hidden="true" />

              <div className={styles.header}>
                <h2 className={styles.title}>Filters</h2>
                {activeCount > 0 && (
                  <button type="button" className={styles.clear} onClick={onClear}>
                    Clear
                  </button>
                )}
              </div>

              <div className={styles.body}>
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

                <div className={styles.section}>
                  <p className={styles.sectionLabel}>Family</p>
                  <FamilyPicker
                    families={facets.family}
                    value={filters.family}
                    onSelect={(value) => onFacetChange('family', value)}
                  />
                </div>
              </div>

              <button type="button" className={styles.done} onClick={() => setOpen(false)}>
                {total === 0 ? 'No openings match' : `Show ${resultCountLabel(total)}`}
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
