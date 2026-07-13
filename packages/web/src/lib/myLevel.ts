/**
 * Site-wide "my level" preference (deviation-trainer PRD §5.2) — the rating
 * band a visitor set once, defaulting every detail page's stats and level
 * check from then on. localStorage only; clearable.
 */

import { BANDS, type BandId } from './lichessExplorer';

const STORAGE_KEY = 'openingbook:my-level';

export function getMyLevel(): BandId | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return BANDS.some((band) => band.id === raw) ? (raw as BandId) : null;
  } catch {
    return null;
  }
}

export function setMyLevel(band: BandId): void {
  try {
    localStorage.setItem(STORAGE_KEY, band);
  } catch {
    // Preference is best-effort.
  }
}

export function clearMyLevel(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
