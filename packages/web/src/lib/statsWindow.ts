/** The months a set of Lichess counts covers, as the API reports it. */
export interface StatsWindow {
  since: string; // YYYY-MM
  until: string; // YYYY-MM
}

// Fixed, not Intl: en-GB writes "Sept", and the date must not change with
// the reader's locale.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parts(month: string): [string, string] {
  const [year, number] = month.split('-');
  return [MONTHS[Number(number) - 1], year];
}

/** "Apr–Sep 2026", "Nov 2025–Apr 2026", or "Sep 2026" for one month. */
export function formatWindow({ since, until }: StatsWindow): string {
  const [fromMonth, fromYear] = parts(since);
  const [toMonth, toYear] = parts(until);
  if (since === until) return `${toMonth} ${toYear}`;
  if (fromYear === toYear) return `${fromMonth}–${toMonth} ${toYear}`;
  return `${fromMonth} ${fromYear}–${toMonth} ${toYear}`;
}
