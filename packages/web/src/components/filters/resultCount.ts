import type { FacetValue } from '../../hooks/useBrowse';

/**
 * The wording the desktop bar and the mobile sheet share, so the same facet can
 * never be phrased two ways.
 */

/**
 * One wording for the result count. "No openings" rather than "0 openings", and
 * the singular is a real case — several families and level/style combinations
 * return exactly one.
 */
export const resultCountLabel = (total: number): string => {
  if (total === 0) return 'No openings';
  if (total === 1) return '1 opening';
  return `${total.toLocaleString()} openings`;
};

/**
 * The label for the current value. The API guarantees an applied value stays
 * in its own facet list even at count 0, so this only falls back to the
 * placeholder when nothing is applied.
 *
 * Lives beside `resultCountLabel` rather than in `FilterBar`: a component file
 * that also exports a helper breaks Fast Refresh, which `react-refresh/only-
 * export-components` fails the build over.
 */
export const facetDisplay = (
  options: FacetValue[],
  value: string | null,
  placeholder: string
): string => {
  if (!value) return placeholder;
  return options.find((option) => option.value === value)?.label ?? value;
};
