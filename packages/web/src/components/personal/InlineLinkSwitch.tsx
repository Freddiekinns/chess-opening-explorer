import React, { useRef } from 'react';
import styles from './InlineLinkSwitch.module.css';

export interface InlineLinkSwitchOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  label: string;
  options: ReadonlyArray<InlineLinkSwitchOption<T>>;
  value: T;
  onChange: (value: T) => void;
  /** Accessible name announced for the radiogroup. */
  ariaLabel: string;
}

export function InlineLinkSwitch<T extends string>({
  label,
  options,
  value,
  onChange,
  ariaLabel,
}: Props<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const indexOf = (v: T) => options.findIndex((o) => o.value === v);

  const focusAndSelect = (newIndex: number) => {
    const wrapped = (newIndex + options.length) % options.length;
    const next = options[wrapped];
    refs.current[wrapped]?.focus();
    if (next.value !== value) onChange(next.value);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const current = indexOf(value);
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        focusAndSelect(current + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        focusAndSelect(current - 1);
        break;
      case 'Home':
        e.preventDefault();
        focusAndSelect(0);
        break;
      case 'End':
        e.preventDefault();
        focusAndSelect(options.length - 1);
        break;
    }
  };

  return (
    <div className={styles.root} role="radiogroup" aria-label={ariaLabel}>
      <span className={styles.label}>{label}</span>
      <span className={styles.options}>
        {options.map((opt, i) => {
          const active = opt.value === value;
          return (
            <React.Fragment key={opt.value}>
              {i > 0 && (
                <span className={styles.separator} aria-hidden="true">
                  ·
                </span>
              )}
              <button
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="button"
                role="radio"
                aria-checked={active}
                tabIndex={active ? 0 : -1}
                className={active ? styles.optionActive : styles.option}
                onClick={() => {
                  if (!active) onChange(opt.value);
                }}
                onKeyDown={onKeyDown}
              >
                {opt.label}
              </button>
            </React.Fragment>
          );
        })}
      </span>
    </div>
  );
}
