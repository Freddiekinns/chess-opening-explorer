import React from 'react';
import { FacetSelect, FacetOptionList } from './FacetSelect';
import { FamilyPicker } from './FamilyPicker';
import { resultCountLabel } from './resultCount';
import { SORT_OPTIONS } from '../../hooks/useBrowse';
import type { BrowseFacets, BrowseFilters, FacetKey, FacetValue } from '../../hooks/useBrowse';
import styles from './FilterBar.module.css';

/**
 * Desktop filter bar. Four buttons that each say what they filter and what
 * they are set to, replacing two unlabelled pill rows that read as one row of
 * ten with raw ECO letters as jargon.
 *
 * The count is the filtered total from the same request that produced the
 * grid — the whole point of the browse endpoint. It cannot disagree with what
 * is on screen the way the old two-fetch arrangement could.
 */

/**
 * The label for the current value. The API guarantees an applied value stays
 * in its own facet list even at count 0, so this only falls back to the
 * placeholder when nothing is applied.
 */
export const facetDisplay = (
  options: FacetValue[],
  value: string | null,
  placeholder: string
): string => {
  if (!value) return placeholder;
  return options.find((option) => option.value === value)?.label ?? value;
};

interface FilterBarProps {
  facets: BrowseFacets;
  filters: BrowseFilters;
  total: number;
  activeCount: number;
  loading: boolean;
  onFacetChange: (key: FacetKey, value: string | null) => void;
  onClear: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  facets,
  filters,
  total,
  activeCount,
  loading,
  onFacetChange,
  onClear,
}) => {
  const sortLabel =
    SORT_OPTIONS.find((option) => option.value === filters.sort)?.label ?? SORT_OPTIONS[0].label;

  return (
    <>
      <div className={styles.bar}>
        <FacetSelect
          label="Level"
          display={facetDisplay(facets.level, filters.level, 'All')}
          active={Boolean(filters.level)}
          menuLabel="Filter by level"
        >
          {(close) => (
            <FacetOptionList
              options={facets.level}
              value={filters.level}
              anyLabel="All levels"
              onSelect={(value) => {
                onFacetChange('level', value);
                close();
              }}
            />
          )}
        </FacetSelect>

        <FacetSelect
          label="Style"
          display={facetDisplay(facets.style, filters.style, 'Any')}
          active={Boolean(filters.style)}
          menuLabel="Filter by style"
        >
          {(close) => (
            <FacetOptionList
              options={facets.style}
              value={filters.style}
              anyLabel="Any style"
              onSelect={(value) => {
                onFacetChange('style', value);
                close();
              }}
            />
          )}
        </FacetSelect>

        <FacetSelect
          label="Family"
          display={facetDisplay(facets.family, filters.family, 'Any')}
          active={Boolean(filters.family)}
          menuLabel="Filter by family"
        >
          {(close) => (
            <FamilyPicker
              families={facets.family}
              value={filters.family}
              onSelect={(value) => {
                onFacetChange('family', value);
                close();
              }}
            />
          )}
        </FacetSelect>

        <FacetSelect
          label="Sort"
          display={sortLabel}
          active={false}
          menuLabel="Sort openings"
          align="end"
          className={styles.sortSlot}
        >
          {(close) => (
            <FacetOptionList
              options={SORT_OPTIONS}
              value={filters.sort}
              anyLabel={null}
              onSelect={(value) => {
                onFacetChange('sort', value);
                close();
              }}
            />
          )}
        </FacetSelect>
      </div>

      <div className={styles.meta}>
        {activeCount > 0 && (
          <button type="button" className={styles.clear} onClick={onClear}>
            Clear filters
          </button>
        )}
        <span className={styles.count} aria-live="polite">
          {loading ? 'Counting…' : resultCountLabel(total)}
        </span>
      </div>
    </>
  );
};
