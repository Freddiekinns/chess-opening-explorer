import type { DashboardData, Platform } from './personalStatsLib';

export type SampleId = 'magnus' | 'hikaru';

export interface SampleReport {
  id: SampleId;
  label: string;
  platform: Platform;
  username: string;
  gamesRequested: number;
  /** ISO date (YYYY-MM-DD) the fixture was generated. */
  generatedAt: string;
  dashboard: DashboardData;
}

export const SAMPLE_REPORTS: ReadonlyArray<{ id: SampleId; label: string }> = [
  { id: 'magnus', label: 'Magnus' },
  { id: 'hikaru', label: 'Hikaru' },
];

// Explicit map, not a template literal — the bundler can only code-split an
// import it can see, and each fixture should be its own chunk that idle
// visitors never download.
const loaders: Record<SampleId, () => Promise<unknown>> = {
  magnus: () => import('../../data/sample-reports/magnus.json'),
  hikaru: () => import('../../data/sample-reports/hikaru.json'),
};

export async function loadSampleReport(id: SampleId): Promise<SampleReport> {
  const module = (await loaders[id]()) as { default: SampleReport };
  return module.default;
}

/** "2026-07-28" → "28 July 2026". Parsed as parts rather than `new Date(iso)`,
    which reads a bare date as UTC midnight and renders as the previous day
    anywhere west of Greenwich. */
export function formatSampleDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return iso;
  const monthName = new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-GB', {
    month: 'long',
    timeZone: 'UTC',
  });
  return `${day} ${monthName} ${year}`;
}
