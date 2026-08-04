import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { FacetValue } from '../../hooks/useBrowse';
import styles from './FamilyPicker.module.css';

/**
 * Twenty-nine families is too many for a flat list, so they are grouped by
 * their first move — the one property a chess player can navigate by. The
 * server decides the grouping (see BrowseService.familyFirstMoves): families
 * with no dominant first move report null and land in a trailing catch-all
 * rather than being filed under a move that is not theirs.
 *
 * Rows are toggle buttons rather than listbox options: a listbox with a search
 * field inside it is not a listbox, and the option set is not stable.
 *
 * Shared verbatim by the desktop dropdown and the mobile sheet — the spec's
 * risk table calls out desktop/mobile filter drift, and one component cannot
 * drift from itself.
 */

interface FamilyGroup {
  key: string;
  heading: string;
  total: number;
  families: FacetValue[];
}

const groupByFirstMove = (families: FacetValue[]): FamilyGroup[] => {
  const groups = new Map<string, FamilyGroup>();

  for (const family of families) {
    const key = family.first_move || '';
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        heading: key ? `1. ${key}` : 'Other openings',
        total: 0,
        families: [],
      });
    }
    const group = groups.get(key)!;
    group.total += family.count;
    group.families.push(family);
  }

  return [...groups.values()].sort((a, b) => {
    if (a.key && !b.key) return -1;
    if (!a.key && b.key) return 1;
    return b.total - a.total;
  });
};

interface FamilyPickerProps {
  families: FacetValue[];
  value: string | null;
  onSelect: (value: string | null) => void;
}

export const FamilyPicker: React.FC<FamilyPickerProps> = ({ families, value, onSelect }) => {
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matching = needle
      ? families.filter((family) => family.label.toLowerCase().includes(needle))
      : families;
    return groupByFirstMove(matching);
  }, [families, query]);

  return (
    <div className={styles.picker}>
      <div className={styles.searchWrap}>
        <Search size={15} className={styles.searchIcon} aria-hidden="true" />
        <input
          type="search"
          className={styles.search}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search families…"
          aria-label="Search families"
        />
      </div>

      <button
        type="button"
        className={`${styles.row} ${value === null ? styles.rowActive : ''}`.trim()}
        aria-pressed={value === null}
        onClick={() => onSelect(null)}
      >
        <span>Any family</span>
      </button>

      {groups.map((group) => (
        <div key={group.key} className={styles.group}>
          <p className={styles.groupHeading} data-testid="family-group-heading">
            {group.heading}
          </p>
          {group.families.map((family) => (
            <button
              key={family.value}
              type="button"
              className={`${styles.row} ${value === family.value ? styles.rowActive : ''}`.trim()}
              aria-pressed={value === family.value}
              onClick={() => onSelect(family.value)}
            >
              <span className={styles.rowLabel}>{family.label}</span>
              <span className={styles.rowCount}>{family.count.toLocaleString()}</span>
            </button>
          ))}
        </div>
      ))}

      {groups.length === 0 && <p className={styles.noMatch}>No families match “{query}”.</p>}
    </div>
  );
};
