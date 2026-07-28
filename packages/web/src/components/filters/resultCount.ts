/**
 * One wording for the result count, shared by the desktop bar and the mobile
 * sheet so the same number can never be phrased two ways. "No openings" rather
 * than "0 openings", and the singular is a real case — several families and
 * level/style combinations return exactly one.
 */
export const resultCountLabel = (total: number): string => {
  if (total === 0) return 'No openings';
  if (total === 1) return '1 opening';
  return `${total.toLocaleString()} openings`;
};
