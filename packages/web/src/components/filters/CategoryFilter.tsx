import React, { useEffect, useState } from 'react';
import styles from './CategoryFilter.module.css';

export interface CategoryOption {
  id: string;
  label: string;
  count?: number;
}

interface CategoryFilterProps {
  categories: CategoryOption[];
  selectedCategory: string;
  onCategoryChange: (categoryId: string) => void;
  className?: string;
}

/**
 * Mobile-only category selector. Collapses the long ECO category labels — which
 * clip inside a horizontal-scroll pill row at phone widths — into a single
 * "Category" button that opens a full-size dropdown menu. Desktop keeps the
 * wrapped pill row (see PopularOpeningsGrid).
 */
export const CategoryFilter: React.FC<CategoryFilterProps> = ({
  categories,
  selectedCategory,
  onCategoryChange,
  className = '',
}) => {
  const [open, setOpen] = useState(false);

  const isActive = selectedCategory !== 'all';
  // When a category is active the trigger shows its full name (matching the
  // menu); otherwise it's the neutral "Category" placeholder.
  const activeLabel = categories.find((c) => c.id === selectedCategory)?.label;
  const buttonLabel = isActive ? (activeLabel ?? 'Category') : 'Category';

  // Close the menu when Escape is pressed while it's open.
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  const handleSelect = (categoryId: string) => {
    onCategoryChange(categoryId);
    setOpen(false);
  };

  return (
    <div className={`${styles.categoryFilter} ${className}`.trim()}>
      <button
        type="button"
        className={`${styles.trigger} ${isActive ? styles.triggerActive : ''}`.trim()}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <svg
          className={styles.filterIcon}
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="7" y1="12" x2="17" y2="12" />
          <line x1="10" y1="18" x2="14" y2="18" />
        </svg>
        <span className={styles.triggerLabel}>{buttonLabel}</span>
        <svg
          className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`.trim()}
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <>
          <div className={styles.backdrop} aria-hidden="true" onClick={() => setOpen(false)} />
          <ul className={styles.menu} role="listbox" aria-label="Opening category">
            {categories.map((category) => {
              const active = selectedCategory === category.id;
              return (
                <li key={category.id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`${styles.item} ${active ? styles.itemActive : ''}`.trim()}
                    onClick={() => handleSelect(category.id)}
                  >
                    <span>{category.label}</span>
                    <svg
                      className={`${styles.check} ${active ? styles.checkVisible : ''}`.trim()}
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
};

export default CategoryFilter;
