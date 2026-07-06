import { useEffect, useMemo, useState } from 'react';
import { groupByFamily, type SortMode } from './familyAggregation';
import { toAggInput, type DashboardData } from './personalStatsLib';

export type FamiliesDict = Record<string, { id: string; display_name: string }>;

/**
 * Loads the family display-name dictionary, retrying a couple of times on
 * failure. If it never loads, groupByFamily falls back to a prettified slug,
 * so rows are still readable — this just upgrades them to the canonical names.
 */
export function useFamiliesDict(): FamiliesDict {
  const [familiesDict, setFamiliesDict] = useState<FamiliesDict>({});

  useEffect(() => {
    let alive = true;
    const load = (attempt: number) => {
      fetch('/api/families')
        .then((r) => r.json())
        .then((j) => {
          if (!alive || !j?.success) throw new Error('families unavailable');
          const dict: FamiliesDict = {};
          for (const f of j.data) dict[f.id] = { id: f.id, display_name: f.display_name };
          if (alive) setFamiliesDict(dict);
        })
        .catch(() => {
          if (alive && attempt < 2) setTimeout(() => load(attempt + 1), 1500 * (attempt + 1));
        });
    };
    load(0);
    return () => {
      alive = false;
    };
  }, []);

  return familiesDict;
}

/**
 * Memoised per-side family rollups for the dashboard lists.
 */
export function useFamilyRollups(
  dashboard: DashboardData | null,
  familiesDict: FamiliesDict,
  whiteSortMode: SortMode,
  blackSortMode: SortMode
) {
  const whiteFamily = useMemo(
    () =>
      dashboard
        ? groupByFamily(dashboard.asWhite.map(toAggInput), familiesDict, whiteSortMode)
        : null,
    [dashboard, familiesDict, whiteSortMode]
  );
  const blackFamily = useMemo(
    () =>
      dashboard
        ? groupByFamily(dashboard.asBlack.map(toAggInput), familiesDict, blackSortMode)
        : null,
    [dashboard, familiesDict, blackSortMode]
  );
  return { whiteFamily, blackFamily };
}
