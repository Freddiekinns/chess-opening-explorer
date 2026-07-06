import React, { useEffect, useRef, useState } from 'react';
import type { SortMode } from './familyAggregation';
import type { SideTab } from './personalStatsLib';
import styles from './PersonalOpeningStats.module.css';

/* ==============================
   SVG Icons
   ============================== */
export const UserIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export const GearIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

/* ==============================
   PILL CONTROLS (sort filters + segmented toggles)
   ============================== */
export const SORT_LABELS: Record<SortMode, string> = {
  frequency: 'Most played',
  best: 'Highest win rate',
  worst: 'Lowest win rate',
};

export const SORT_ORDER: ReadonlyArray<SortMode> = ['frequency', 'best', 'worst'];

/** Full-width segmented pill — used for the mobile As White / As Black switch
    (a primary mode switch). aria-pressed buttons in a labelled group. */
export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className={styles.pillToggle} role="group" aria-label={ariaLabel}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            className={`${styles.pillBtn} ${active ? styles.pillBtnActive : ''}`}
            aria-pressed={active}
            onClick={() => {
              if (!active) onChange(opt.value);
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Grouped-list mark — signals the "group by family" action without leaning on
    the segmented-control idiom that clashed with the sort pills. */
const GroupIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M2.5 3.5h11" />
    <path d="M6 8h7.5" />
    <path d="M6 12h7.5" />
    <path d="M3 7.5v5" />
  </svg>
);

/** Single toggle chip in the sort-pill style — grouping is binary (family vs
    flat), so one filled-when-on chip is lighter and more consistent than a
    segmented two-option control. The icon distinguishes it from sort pills. */
export const GroupToggle: React.FC<{
  grouped: boolean;
  onChange: (grouped: boolean) => void;
  /** Side suffix keeps the accessible name unique while still containing the
      visible "Group by family" text (WCAG 2.5.3 Label in Name). */
  sideLabel: string;
}> = ({ grouped, onChange, sideLabel }) => (
  <button
    type="button"
    className={`${styles.groupPill} ${grouped ? styles.groupPillActive : ''}`}
    aria-pressed={grouped}
    aria-label={`Group by family, ${sideLabel}`}
    onClick={() => onChange(!grouped)}
  >
    <GroupIcon />
    <span>Group by family</span>
  </button>
);

/** Descending-bars sort glyph. */
const SortGlyph = () => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M3 4.5h10" />
    <path d="M3 8h6.5" />
    <path d="M3 11.5h3.5" />
  </svg>
);

/** Sort control — a compact "Sort: <current>" pill that opens a small
    single-select menu. Used on both breakpoints so the filter row stays two
    pills (group chip + sort) on one line; three visible sort pills wrapped even
    at desktop column widths (~452px). */
export const SortMenu: React.FC<{
  value: SortMode;
  onChange: (mode: SortMode) => void;
  ariaLabel: string;
}> = ({ value, onChange, ariaLabel }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const idx = Math.max(0, SORT_ORDER.indexOf(value));
    optionRefs.current[idx]?.focus();
  }, [open, value]);

  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  const onOptionKeyDown = (e: React.KeyboardEvent, i: number) => {
    const last = SORT_ORDER.length - 1;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      optionRefs.current[i === last ? 0 : i + 1]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      optionRefs.current[i === 0 ? last : i - 1]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      optionRefs.current[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      optionRefs.current[last]?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  };

  return (
    <div className={styles.sortMenu} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.sortTrigger}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <SortGlyph />
        <span>Sort: {SORT_LABELS[value]}</span>
        <svg
          className={open ? styles.sortChevronOpen : styles.sortChevron}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
      {open && (
        <div className={styles.sortPopover} role="menu" aria-label={ariaLabel}>
          {SORT_ORDER.map((mode, i) => {
            const active = mode === value;
            return (
              <button
                key={mode}
                ref={(el) => {
                  optionRefs.current[i] = el;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                className={`${styles.sortOption} ${active ? styles.sortOptionActive : ''}`}
                onClick={() => {
                  onChange(mode);
                  close();
                }}
                onKeyDown={(e) => onOptionKeyDown(e, i)}
              >
                <span>{SORT_LABELS[mode]}</span>
                {active && (
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M3.5 8.5l3 3 6-7" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const SIDE_OPTIONS: ReadonlyArray<{ value: SideTab; label: string }> = [
  { value: 'white', label: 'As White' },
  { value: 'black', label: 'As Black' },
];
