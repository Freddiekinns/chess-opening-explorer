/**
 * Site-wide "my level" preference (deviation-trainer PRD §5.2) — the rating
 * band a visitor set once, defaulting every detail page's stats and level
 * check from then on. localStorage only; clearable.
 */

import { BANDS, type BandId } from './lichessExplorer';

export const STORAGE_KEY = 'openingbook:my-level';
/** Fired on window after every in-tab write, so mounted readers update. */
export const MY_LEVEL_CHANGE = 'my-level-change';

function broadcast(): void {
  window.dispatchEvent(new Event(MY_LEVEL_CHANGE));
}

// Where storage is blocked the level still holds for this page, so the level
// lens and the Discover and search menus keep working; it just isn't saved.
let unsaved: BandId | null = null;

export function getMyLevel(): BandId | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return BANDS.some((band) => band.id === raw) ? (raw as BandId) : null;
  } catch {
    return unsaved;
  }
}

export function setMyLevel(band: BandId): void {
  unsaved = band;
  try {
    localStorage.setItem(STORAGE_KEY, band);
  } catch {
    // Preference is best-effort.
  }
  broadcast();
}

export function clearMyLevel(): void {
  unsaved = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  broadcast();
}
