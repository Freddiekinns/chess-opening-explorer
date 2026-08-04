import React, { useEffect, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import styles from './FacetSelect.module.css';

/**
 * A facet button that states its own value — "Level: All", "Style: Gambit" —
 * instead of the unlabelled pill row it replaces, where ten pills read as one
 * row of ten and nothing said what any of them filtered.
 *
 * The menu body is a render prop so Family can supply a searchable list while
 * Level, Style and Sort supply a plain option list, without this component
 * knowing about either.
 */

export interface FacetOption {
  value: string;
  label: string;
  count?: number;
}

interface FacetSelectProps {
  label: string;
  display: string;
  active: boolean;
  menuLabel: string;
  align?: 'start' | 'end';
  className?: string;
  children: (close: () => void) => React.ReactNode;
}

export const FacetSelect: React.FC<FacetSelectProps> = ({
  label,
  display,
  active,
  menuLabel,
  align = 'start',
  className = '',
  children,
}) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  return (
    <div className={`${styles.root} ${className}`.trim()}>
      <button
        type="button"
        className={`${styles.trigger} ${active ? styles.triggerActive : ''}`.trim()}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span className={styles.label}>{label}</span>
        <span className={active ? styles.valueActive : styles.value}>{display}</span>
        <ChevronDown size={13} className={styles.chevron} aria-hidden="true" />
      </button>

      {open && (
        <>
          <div className={styles.backdrop} aria-hidden="true" onClick={() => setOpen(false)} />
          <div
            className={`${styles.menu} ${align === 'end' ? styles.menuEnd : ''}`.trim()}
            role="dialog"
            aria-label={menuLabel}
          >
            {children(() => setOpen(false))}
          </div>
        </>
      )}
    </div>
  );
};

interface FacetOptionListProps {
  options: FacetOption[];
  value: string | null;
  /** Label for the reset row, or null for a facet that always has a value. */
  anyLabel: string | null;
  onSelect: (value: string | null) => void;
}

export const FacetOptionList: React.FC<FacetOptionListProps> = ({
  options,
  value,
  anyLabel,
  onSelect,
}) => (
  <ul className={styles.optionList} role="listbox">
    {anyLabel !== null && (
      <li role="presentation">
        <button
          type="button"
          role="option"
          aria-selected={value === null}
          className={`${styles.option} ${value === null ? styles.optionActive : ''}`.trim()}
          onClick={() => onSelect(null)}
        >
          <span>{anyLabel}</span>
          {value === null && <Check size={15} className={styles.check} aria-hidden="true" />}
        </button>
      </li>
    )}
    {options.map((option) => (
      <li key={option.value} role="presentation">
        <button
          type="button"
          role="option"
          aria-selected={value === option.value}
          className={`${styles.option} ${value === option.value ? styles.optionActive : ''}`.trim()}
          onClick={() => onSelect(option.value)}
        >
          <span>{option.label}</span>
          {option.count !== undefined && (
            <span className={styles.optionCount}>{option.count.toLocaleString()}</span>
          )}
          {value === option.value && (
            <Check size={15} className={styles.check} aria-hidden="true" />
          )}
        </button>
      </li>
    ))}
  </ul>
);
